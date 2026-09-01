import { Pool } from "pg";
import { scryptSync, randomBytes } from "node:crypto";
import type { Announcement } from "../types.js";
import { genAddress, genId } from "../lib/sim.js";

export type Row = Record<string, unknown>;

export interface Prepared {
  get(...params: unknown[]): Promise<Row | undefined>;
  all(...params: unknown[]): Promise<Row[]>;
  run(...params: unknown[]): Promise<{ changes: number; lastInsertRowid: number }>;
}

export interface Db {
  prepare(sql: string): Prepared;
  exec(sql: string): Promise<void>;
  tx<T>(fn: (cx: Db) => Promise<T>): Promise<T>;
}

export interface Driver {
  query(text: string, params: unknown[]): Promise<{ rows: Row[]; rowCount: number }>;
  exec(text: string): Promise<void>;
  withTx<T>(fn: (driver: Driver) => Promise<T>): Promise<T>;
}

let pool: Pool | null = null;
function getPool(): Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL is not set. Add a Postgres/Neon connection string to .env.local (or Vercel env).");
    }
    pool = new Pool({ connectionString: url, max: 5, connectionTimeoutMillis: 10_000 });
  }
  return pool;
}

const driver: Driver = {
  async query(text, params) {
    const res = await getPool().query({ text, values: params });
    return { rows: (res.rows ?? []) as Row[], rowCount: res.rowCount ?? 0 };
  },
  async exec(text) {
    await getPool().query(text);
  },
  async withTx(fn) {
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const txDriver: Driver = {
        async query(text, params) {
          const res = await client.query({ text, values: params });
          return { rows: (res.rows ?? []) as Row[], rowCount: res.rowCount ?? 0 };
        },
        async exec(text) {
          await client.query(text);
        },
        withTx: (nested) => nested(txDriver),
      };
      const out = await fn(txDriver);
      await client.query("COMMIT");
      return out;
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  },
};

function toPgSql(sql: string): string {
  let out = "";
  let n = 0;
  let i = 0;
  while (i < sql.length) {
    const ch = sql[i];
    if (ch === "'") {
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === "'") {
          if (sql[j + 1] === "'") {
            j += 2;
            continue;
          }
          j += 1;
          break;
        }
        j += 1;
      }
      out += sql.slice(i, j);
      i = j;
    } else if (ch === "?") {
      n += 1;
      out += `$${n}`;
      i += 1;
    } else {
      out += ch;
      i += 1;
    }
  }
  return out;
}

function normalizeValue(v: unknown): unknown {
  if (typeof v === "bigint") return Number(v);
  if (v instanceof Date) return v.toISOString();
  return v;
}

function normalizeRow(row: Row): Row {
  const out: Row = {};
  for (const key of Object.keys(row)) {
    out[key] = normalizeValue(row[key]);
  }
  return out;
}

function makePrepared(d: Driver, sql: string): Prepared {
  const pgSql = toPgSql(sql);
  return {
    async get(...params) {
      const { rows } = await d.query(pgSql, params);
      const row = rows[0];
      return row === undefined ? undefined : normalizeRow(row);
    },
    async all(...params) {
      const { rows } = await d.query(pgSql, params);
      return rows.map(normalizeRow);
    },
    async run(...params) {
      const { rowCount } = await d.query(pgSql, params);
      return { changes: rowCount, lastInsertRowid: 0 };
    },
  };
}

function makeDb(d: Driver): Db {
  return {
    prepare: (sql: string) => makePrepared(d, sql),
    exec: (sql: string) => d.exec(toPgSql(sql)),
    tx: <T>(fn: (cx: Db) => Promise<T>) => d.withTx((inner) => fn(makeDb(inner))),
  };
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS crypton_users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  pin_salt TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  pin_len INTEGER NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  frozen INTEGER NOT NULL DEFAULT 0,
  verified INTEGER NOT NULL DEFAULT 0,
  kyc_level INTEGER NOT NULL DEFAULT 0,
  color TEXT NOT NULL,
  restrictions JSONB NOT NULL DEFAULT '{}',
  created_at BIGINT NOT NULL,
  last_seen BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS crypton_wallets (
  user_id TEXT PRIMARY KEY REFERENCES crypton_users(id) ON DELETE CASCADE,
  balances JSONB NOT NULL DEFAULT '{}',
  fiat DOUBLE PRECISION NOT NULL DEFAULT 0,
  addresses JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS crypton_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  asset TEXT NOT NULL,
  amount DOUBLE PRECISION NOT NULL,
  direction TEXT NOT NULL,
  counterparty TEXT,
  fee DOUBLE PRECISION NOT NULL DEFAULT 0,
  usd_value DOUBLE PRECISION NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'confirmed',
  timestamp BIGINT NOT NULL,
  note TEXT
);
CREATE INDEX IF NOT EXISTS idx_crypton_tx_user ON crypton_transactions(user_id, timestamp DESC);

CREATE TABLE IF NOT EXISTS crypton_sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS crypton_reset_codes (
  email TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  expires_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS crypton_support_conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  unread_user INTEGER NOT NULL DEFAULT 0,
  unread_admin INTEGER NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_crypton_support_user ON crypton_support_conversations(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS crypton_support_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  sender TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_crypton_support_msgs ON crypton_support_messages(conversation_id, created_at ASC);

CREATE TABLE IF NOT EXISTS crypton_emails (
  id TEXT PRIMARY KEY,
  from_addr TEXT NOT NULL,
  to_addrs JSONB NOT NULL DEFAULT '[]',
  cc JSONB NOT NULL DEFAULT '[]',
  bcc JSONB NOT NULL DEFAULT '[]',
  subject TEXT NOT NULL DEFAULT '',
  html TEXT NOT NULL DEFAULT '',
  text TEXT NOT NULL DEFAULT '',
  folder TEXT NOT NULL DEFAULT 'draft',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_crypton_emails_folder ON crypton_emails(folder, updated_at DESC);

CREATE TABLE IF NOT EXISTS crypton_meta (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  seed_version TEXT,
  admin_id TEXT,
  announcements JSONB NOT NULL DEFAULT '[]',
  price_overrides JSONB NOT NULL DEFAULT '{}',
  hidden_coins JSONB NOT NULL DEFAULT '[]',
  spread_pct DOUBLE PRECISION NOT NULL DEFAULT 0.4,
  last_tx_seq BIGINT NOT NULL DEFAULT 0
);
`;

async function migrate(): Promise<void> {
  const cols = await driver.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'crypton_users'",
    []
  );
  if (!cols.rows.some((r) => String(r.column_name) === "restrictions")) {
    await driver.exec("ALTER TABLE crypton_users ADD COLUMN restrictions JSONB NOT NULL DEFAULT '{}'");
  }
}

let initPromise: Promise<void> | null = null;

export function ensureInit(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await driver.exec(SCHEMA);
      await migrate();
      await seedIfNeeded();
    })().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

export async function getDb(): Promise<Db> {
  await ensureInit();
  return makeDb(driver);
}

/* -------------------------------- seeding ------------------------------- */

export interface DbMeta {
  seeded: boolean;
  adminId: string;
  announcements: Announcement[];
  priceOverrides: Record<string, number>;
  hiddenCoins: string[];
  spreadPct: number;
  lastTxSeq: number;
}

function hashPin(pin: string): { salt: string; hash: string } {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, 32).toString("hex");
  return { salt, hash };
}

export function verifyPinStored(pin: string, salt: string, storedHash: string): boolean {
  const hash = scryptSync(pin, salt, 32).toString("hex");
  return hash === storedHash;
}

async function seedIfNeeded(): Promise<void> {
  const db = makeDb(driver);
  const meta = (await db.prepare("SELECT seed_version, admin_id FROM crypton_meta WHERE id = 1").get()) as
    | { seed_version: string | null; admin_id: string | null }
    | undefined;
  if (meta?.seed_version) return;

  const now = Date.now();
  const day = 1000 * 60 * 60 * 24;

  const adminId = genId("u");
  const adminPin = hashPin("000000");
  const alexId = genId("u");
  const alexPin = hashPin("1234");

  await db.tx(async (cx) => {
    await cx
      .prepare(
        `INSERT INTO crypton_users (id, name, email, pin_salt, pin_hash, pin_len, role, frozen, verified, kyc_level, color, created_at, last_seen)
         VALUES (?, ?, ?, ?, ?, 6, 'admin', 0, 1, 2, ?, ?, ?)`
      )
      .run(adminId, "Crypto Ops", "admin@crypton.app", adminPin.salt, adminPin.hash, "from-violet-500 to-fuchsia-500", now - 300 * day, now);

    await cx
      .prepare(
        `INSERT INTO crypton_users (id, name, email, pin_salt, pin_hash, pin_len, role, frozen, verified, kyc_level, color, created_at, last_seen)
         VALUES (?, ?, ?, ?, ?, 4, 'user', 0, 1, 1, ?, ?, ?)`
      )
      .run(alexId, "Alex Carter", "alex@crypton.app", alexPin.salt, alexPin.hash, "from-cyan-400 to-violet-500", now - 92 * day, now);

    const alexBalances: Record<string, number> = {
      bitcoin: 0.05234,
      ethereum: 1.242,
      solana: 18.6,
      tether: 1250,
      "usd-coin": 480,
      dogecoin: 8000,
      cardano: 920,
      "polygon-ecosystem-token": 340,
    };
    const alexAddrs: Record<string, string> = {};
    const adminBalances: Record<string, number> = { bitcoin: 0.12, ethereum: 4.5, tether: 5000 };
    const adminAddrs: Record<string, string> = {};

    for (const [chain, coinId] of [
      ["Bitcoin", "bitcoin"],
      ["Ethereum", "ethereum"],
      ["Solana", "solana"],
      ["Ethereum", "tether"],
      ["Ethereum", "usd-coin"],
      ["Dogecoin", "dogecoin"],
      ["Cardano", "cardano"],
      ["Polygon", "polygon-ecosystem-token"],
    ] as Array<[string, string]>) {
      if (alexBalances[coinId]) alexAddrs[coinId] = genAddress(chain, coinId);
    }
    for (const [chain, coinId] of [
      ["Bitcoin", "bitcoin"],
      ["Ethereum", "ethereum"],
      ["Ethereum", "tether"],
    ] as Array<[string, string]>) {
      adminAddrs[coinId] = genAddress(chain, coinId);
    }

    await cx
      .prepare("INSERT INTO crypton_wallets (user_id, balances, fiat, addresses) VALUES (?, ?, ?, ?)")
      .run(alexId, JSON.stringify(alexBalances), 342.75, JSON.stringify(alexAddrs));
    await cx
      .prepare("INSERT INTO crypton_wallets (user_id, balances, fiat, addresses) VALUES (?, ?, ?, ?)")
      .run(adminId, JSON.stringify(adminBalances), 1250, JSON.stringify(adminAddrs));

    const makeTx = (partial: {
      userId: string; type: string; asset: string; amount: number; direction: string;
      counterparty?: string; fee?: number; usdValue?: number; timestamp: number; note?: string;
    }) => {
      return cx
        .prepare(
          `INSERT INTO crypton_transactions (id, user_id, type, asset, amount, direction, counterparty, fee, usd_value, status, timestamp, note)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?)`
        )
        .run(
          genId("tx"), partial.userId, partial.type, partial.asset, partial.amount, partial.direction,
          partial.counterparty ?? null, partial.fee ?? 0, partial.usdValue ?? 0, partial.timestamp, partial.note ?? null
        );
    };

    const seedTxs: Array<Parameters<typeof makeTx>[0]> = [
      { userId: alexId, type: "buy", asset: "bitcoin", amount: 0.021, direction: "in", usdValue: 1298, timestamp: now - 3600e3 * 2 },
      { userId: alexId, type: "receive", asset: "ethereum", amount: 0.85, direction: "in", usdValue: 2907, counterparty: "Metamask (0x4f…9b3c)", timestamp: now - 3600e3 * 7 },
      { userId: alexId, type: "swap_out", asset: "solana", amount: 12.4, direction: "out", usdValue: 1963, fee: 0.0002, timestamp: now - 3600e3 * 26, note: "Swapped to USDC" },
      { userId: alexId, type: "swap_in", asset: "usd-coin", amount: 1885, direction: "in", usdValue: 1885, timestamp: now - 3600e3 * 26, note: "Swapped from SOL" },
      { userId: alexId, type: "send", asset: "tether", amount: 220, direction: "out", usdValue: 220, fee: 0.62, counterparty: "0x8c…4d21", timestamp: now - 3600e3 * 40 },
      { userId: alexId, type: "buy", asset: "ethereum", amount: 0.4, direction: "in", usdValue: 1368, timestamp: now - 3600e3 * 60 },
      { userId: alexId, type: "receive", asset: "solana", amount: 5.2, direction: "in", usdValue: 823, counterparty: "Binance (deposit)", timestamp: now - 3600e3 * 90 },
      { userId: alexId, type: "send", asset: "dogecoin", amount: 1500, direction: "out", usdValue: 187, fee: 0.5, counterparty: "DExnQj…xw9P", timestamp: now - 3600e3 * 140 },
      { userId: alexId, type: "receive", asset: "bitcoin", amount: 0.0105, direction: "in", usdValue: 673, counterparty: "Kraken (withdraw)", timestamp: now - 3600e3 * 200 },
      { userId: alexId, type: "send", asset: "cardano", amount: 250, direction: "out", usdValue: 115, fee: 0.18, counterparty: "addr1qx…p3a8", timestamp: now - 3600e3 * 260 },
    ];
    for (const t of seedTxs) await makeTx(t);

    await cx
      .prepare(
        `INSERT INTO crypton_meta (id, seed_version, admin_id, announcements, price_overrides, hidden_coins, spread_pct, last_tx_seq)
         VALUES (1, '1', ?, '[]', '{}', '[]', 0.4, 0)`
      )
      .run(adminId);
  });
}

/* -------------------------------- helpers ------------------------------- */

export async function loadMeta(db: Db): Promise<DbMeta> {
  const row = (await db.prepare("SELECT * FROM crypton_meta WHERE id = 1").get()) as Row | undefined;
  if (!row) throw new Error("Meta not seeded");
  return {
    seeded: true,
    adminId: String(row.admin_id ?? ""),
    announcements: (row.announcements as Announcement[]) ?? [],
    priceOverrides: (row.price_overrides as Record<string, number>) ?? {},
    hiddenCoins: (row.hidden_coins as string[]) ?? [],
    spreadPct: Number(row.spread_pct ?? 0.4),
    lastTxSeq: Number(row.last_tx_seq ?? 0),
  };
}
