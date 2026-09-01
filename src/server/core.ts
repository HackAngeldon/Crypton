import { randomBytes } from "node:crypto";
import type { Announcement, CoinId, Tx, User, Wallet } from "../types.js";
import { COIN_CATALOG, COIN_MAP } from "../data/coins.js";
import { getDb, loadMeta, verifyPinStored, type Db, type DbMeta, type Row } from "./db.js";
import { genAddress, genId } from "../lib/sim.js";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  pinLen: number;
  role: "user" | "admin";
  frozen: boolean;
  verified: boolean;
  kycLevel: number;
  color: string;
  createdAt: number;
  lastSeen: number;
}

export type { DbMeta };

function rowToUser(r: Row): SessionUser {
  return {
    id: String(r.id),
    name: String(r.name),
    email: String(r.email),
    pinLen: Number(r.pin_len),
    role: r.role === "admin" ? "admin" : "user",
    frozen: Number(r.frozen) === 1,
    verified: Number(r.verified) === 1,
    kycLevel: Number(r.kyc_level) as SessionUser["kycLevel"],
    color: String(r.color),
    createdAt: Number(r.created_at),
    lastSeen: Number(r.last_seen),
  };
}

function rowToWallet(r: Row): Wallet {
  return {
    userId: String(r.user_id),
    balances: (r.balances as Partial<Record<CoinId, number>>) ?? {},
    fiat: Number(r.fiat ?? 0),
    addresses: (r.addresses as Partial<Record<CoinId, string>>) ?? {},
  };
}

/**
 * Master-wallet derivation: every user gets a unique deposit address for every
 * catalog coin, seeded from the user id so addresses are deterministic per
 * wallet while the master (admin) wallet holds the underlying funds.
 */
async function ensureWalletAddresses(db: Db, wallet: Wallet): Promise<void> {
  let changed = false;
  for (const c of COIN_CATALOG) {
    if (!wallet.addresses[c.id]) {
      wallet.addresses[c.id] = genAddress(c.chain, c.id + wallet.userId);
      changed = true;
    }
  }
  if (changed) {
    await db
      .prepare("UPDATE crypton_wallets SET addresses = ? WHERE user_id = ?")
      .run(JSON.stringify(wallet.addresses), wallet.userId);
  }
}

function rowToTx(r: Row): Tx {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    type: r.type as Tx["type"],
    asset: r.asset as CoinId,
    amount: Number(r.amount),
    direction: r.direction === "out" ? "out" : "in",
    counterparty: (r.counterparty as string) ?? undefined,
    fee: Number(r.fee ?? 0),
    usdValue: Number(r.usd_value ?? 0),
    status: r.status as Tx["status"],
    timestamp: Number(r.timestamp),
    note: (r.note as string) ?? undefined,
  };
}

function makeTxRow(
  partial: {
    userId: string; type: string; asset: string; amount: number; direction: string;
    counterparty?: string; fee?: number; usdValue?: number; status?: string; timestamp: number; note?: string;
  }
): Row {
  return {
    id: genId("tx"),
    user_id: partial.userId,
    type: partial.type,
    asset: partial.asset,
    amount: partial.amount,
    direction: partial.direction,
    counterparty: partial.counterparty ?? null,
    fee: partial.fee ?? 0,
    usd_value: partial.usdValue ?? 0,
    status: partial.status ?? "confirmed",
    timestamp: partial.timestamp,
    note: partial.note ?? null,
  };
}

async function insertTx(db: Db, t: Row): Promise<void> {
  await db
    .prepare(
      `INSERT INTO crypton_transactions (id, user_id, type, asset, amount, direction, counterparty, fee, usd_value, status, timestamp, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(t.id, t.user_id, t.type, t.asset, t.amount, t.direction, t.counterparty, t.fee, t.usd_value, t.status, t.timestamp, t.note);
}

async function touchMeta(db: Db, fn: (m: DbMeta) => DbMeta): Promise<DbMeta> {
  const m = await loadMeta(db);
  const next = fn(m);
  await db
    .prepare(
      `UPDATE crypton_meta SET announcements = ?, price_overrides = ?, hidden_coins = ?, spread_pct = ?, last_tx_seq = ? WHERE id = 1`
    )
    .run(JSON.stringify(next.announcements), JSON.stringify(next.priceOverrides), JSON.stringify(next.hiddenCoins), next.spreadPct, next.lastTxSeq);
  return next;
}

/* ------------------------------- sessions ------------------------------ */

function newToken(): string {
  return randomBytes(32).toString("hex");
}

async function userByToken(db: Db, token: string): Promise<SessionUser | null> {
  if (!token) return null;
  const row = (await db
    .prepare(
      `SELECT u.* FROM crypton_sessions s JOIN crypton_users u ON u.id = s.user_id WHERE s.token = ?`
    )
    .get(token)) as Row | undefined;
  return row ? rowToUser(row) : null;
}

/* -------------------------------- public ------------------------------- */

export async function register(name: string, email: string, pin: string): Promise<{ token: string; user: SessionUser }> {
  const db = await getDb();
  const norm = email.trim().toLowerCase();
  if (!name.trim()) throw new Error("Please enter your full name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(norm)) throw new Error("That email address does not look right.");
  if (!/^\d{4,6}$/.test(pin)) throw new Error("Your PIN must be 4–6 digits.");

  const exists = await db.prepare("SELECT 1 FROM crypton_users WHERE email = ?").get(norm);
  if (exists) throw new Error("An account with that email already exists. Try signing in instead.");

  const { scryptSync, randomBytes: rb } = await import("node:crypto");
  const salt = rb(16).toString("hex");
  const pinHash = scryptSync(pin, salt, 32).toString("hex");
  const now = Date.now();
  const user = { id: genId("u"), name: name.trim(), email: norm, pinLen: pin.length, role: "user" as const, frozen: false, verified: false, kycLevel: 0, color: "from-cyan-400 to-violet-500", createdAt: now, lastSeen: now };

  await db.tx(async (cx) => {
    await cx
      .prepare(
        `INSERT INTO crypton_users (id, name, email, pin_salt, pin_hash, pin_len, role, frozen, verified, kyc_level, color, created_at, last_seen)
         VALUES (?, ?, ?, ?, ?, ?, 'user', 0, 0, 0, ?, ?, ?)`
      )
      .run(user.id, user.name, user.email, salt, pinHash, user.pinLen, user.color, user.createdAt, user.lastSeen);

    const wallet: Wallet = { userId: user.id, balances: { tether: 25, "usd-coin": 25 }, fiat: 0, addresses: {} };
    await ensureWalletAddresses(cx, wallet);
    await cx
      .prepare("INSERT INTO crypton_wallets (user_id, balances, fiat, addresses) VALUES (?, ?, 0, ?)")
      .run(user.id, JSON.stringify(wallet.balances), JSON.stringify(wallet.addresses));

    await insertTx(cx, makeTxRow({ userId: user.id, type: "receive", asset: "tether", amount: 25, direction: "in", usdValue: 25, timestamp: now, note: "Welcome bonus" }));
    await insertTx(cx, makeTxRow({ userId: user.id, type: "receive", asset: "usd-coin", amount: 25, direction: "in", usdValue: 25, timestamp: now, note: "Welcome bonus" }));
  });

  const token = newToken();
  await db.prepare("INSERT INTO crypton_sessions (token, user_id, created_at) VALUES (?, ?, ?)").run(token, user.id, now);
  return { token, user };
}

export async function login(email: string, pin: string): Promise<{ token: string; user: SessionUser }> {
  const db = await getDb();
  const row = (await db
    .prepare("SELECT * FROM crypton_users WHERE email = ?")
    .get(email.trim().toLowerCase())) as Row | undefined;
  if (!row) throw new Error("No account found for that email.");
  const user = rowToUser(row);
  if (user.frozen) throw new Error("This account has been frozen. Contact support.");
  if (!verifyPinStored(pin, String(row.pin_salt), String(row.pin_hash))) throw new Error("Incorrect PIN. Please try again.");
  await db.prepare("UPDATE crypton_users SET last_seen = ? WHERE id = ?").run(Date.now(), user.id);
  const token = newToken();
  await db.prepare("INSERT INTO crypton_sessions (token, user_id, created_at) VALUES (?, ?, ?)").run(token, user.id, Date.now());
  return { token, user };
}

export async function logout(token: string): Promise<void> {
  const db = await getDb();
  await db.prepare("DELETE FROM crypton_sessions WHERE token = ?").run(token);
}

export async function unlock(token: string, pin: string): Promise<SessionUser> {
  const db = await getDb();
  const row = (await db
    .prepare("SELECT u.* FROM crypton_sessions s JOIN crypton_users u ON u.id = s.user_id WHERE s.token = ?")
    .get(token)) as Row | undefined;
  if (!row) throw new Error("No active session.");
  const user = rowToUser(row);
  if (user.frozen) throw new Error("This account has been frozen.");
  if (!verifyPinStored(pin, String(row.pin_salt), String(row.pin_hash))) throw new Error("Incorrect PIN.");
  return user;
}

export async function changePin(token: string, current: string, next: string): Promise<void> {
  const db = await getDb();
  const row = (await db
    .prepare("SELECT u.* FROM crypton_sessions s JOIN crypton_users u ON u.id = s.user_id WHERE s.token = ?")
    .get(token)) as Row | undefined;
  if (!row) throw new Error("Not signed in.");
  if (!verifyPinStored(current, String(row.pin_salt), String(row.pin_hash))) throw new Error("Current PIN is incorrect.");
  if (!/^\d{4,6}$/.test(next)) throw new Error("New PIN must be 4–6 digits.");
  const { scryptSync, randomBytes: rb } = await import("node:crypto");
  const salt = rb(16).toString("hex");
  const pinHash = scryptSync(next, salt, 32).toString("hex");
  await db
    .prepare("UPDATE crypton_users SET pin_salt = ?, pin_hash = ?, pin_len = ? WHERE id = ?")
    .run(salt, pinHash, next.length, String(row.id));
}

export async function pinLength(email: string): Promise<number> {
  const db = await getDb();
  const row = (await db
    .prepare("SELECT pin_len FROM crypton_users WHERE email = ?")
    .get(email.trim().toLowerCase())) as { pin_len: number } | undefined;
  return Number(row?.pin_len ?? 6);
}

export async function me(token: string): Promise<{ user: SessionUser; wallet: Wallet }> {
  const db = await getDb();
  const user = await userByToken(db, token);
  if (!user) throw new Error("Not signed in.");
  const w = (await db.prepare("SELECT * FROM crypton_wallets WHERE user_id = ?").get(user.id)) as Row | undefined;
  const wallet = w ? rowToWallet(w) : { userId: user.id, balances: {}, fiat: 0, addresses: {} };
  await ensureWalletAddresses(db, wallet);
  return { user, wallet };
}

export async function listTxs(token: string, limit?: number): Promise<Tx[]> {
  const db = await getDb();
  const user = await userByToken(db, token);
  if (!user) throw new Error("Not signed in.");
  const rows = await db
    .prepare("SELECT * FROM crypton_transactions WHERE user_id = ? ORDER BY timestamp DESC LIMIT 200")
    .all(user.id);
  const txs = rows.map(rowToTx);
  return typeof limit === "number" ? txs.slice(0, limit) : txs;
}

export async function send(
  token: string,
  params: { asset: CoinId; amount: number; address: string; feeTier: "low" | "standard" | "fast"; price?: number }
): Promise<Tx> {
  const db = await getDb();
  const user = await userByToken(db, token);
  if (!user) throw new Error("Not signed in.");
  const w = (await db.prepare("SELECT * FROM crypton_wallets WHERE user_id = ?").get(user.id)) as Row | undefined;
  if (!w) throw new Error("Wallet not found.");
  const wallet = rowToWallet(w);
  const bal = wallet.balances[params.asset] ?? 0;
  if (params.amount <= 0) throw new Error("Amount must be greater than zero.");
  if (bal < params.amount) throw new Error(`Insufficient ${COIN_MAP[params.asset].symbol} balance.`);

  const feeMultiplier = { low: 0.0004, standard: 0.0009, fast: 0.0018 }[params.feeTier];
  const fee = COIN_MAP[params.asset].stable ? 0.5 : params.amount * feeMultiplier;
  const total = params.amount + fee;
  if (bal < total) throw new Error(`Insufficient balance to cover the network fee (${fee.toFixed(6)} ${COIN_MAP[params.asset].symbol}).`);

  const nextBalances = { ...wallet.balances, [params.asset]: bal - total };
  const price = params.price ?? 0;
  const txRow = makeTxRow({
    userId: user.id, type: "send", asset: params.asset, amount: params.amount, direction: "out",
    counterparty: params.address, fee, usdValue: params.amount * price, timestamp: Date.now(),
  });

  await db.tx(async (cx) => {
    await cx.prepare("UPDATE crypton_wallets SET balances = ? WHERE user_id = ?").run(JSON.stringify(nextBalances), user.id);
    await insertTx(cx, txRow);
  });
  return rowToTx(txRow);
}

export async function lookupUserPublic(
  token: string,
  email: string
): Promise<{ found: boolean; name: string | null; email: string }> {
  const db = await getDb();
  const user = await userByToken(db, token);
  if (!user) throw new Error("Not signed in.");
  const norm = email.trim().toLowerCase();
  const row = (await db.prepare("SELECT name, email FROM crypton_users WHERE email = ?").get(norm)) as
    | { name: string; email: string }
    | undefined;
  if (!row) return { found: false, name: null, email: norm };
  return { found: true, name: row.name, email: row.email };
}

/** Instant off-chain transfer between two Crypton wallets (funds already sit in the master wallet). */
export async function internalSend(
  token: string,
  params: { toEmail: string; asset: CoinId; amount: number; price?: number }
): Promise<Tx> {
  const db = await getDb();
  const sender = await userByToken(db, token);
  if (!sender) throw new Error("Not signed in.");
  if (params.amount <= 0) throw new Error("Amount must be greater than zero.");

  const recipient = (await db
    .prepare("SELECT * FROM crypton_users WHERE email = ?")
    .get(params.toEmail.trim().toLowerCase())) as Row | undefined;
  if (!recipient) throw new Error("No Crypton account found for that email.");
  if (recipient.id === sender.id) throw new Error("You can't send a transfer to yourself.");

  const sw = (await db.prepare("SELECT * FROM crypton_wallets WHERE user_id = ?").get(sender.id)) as Row;
  const senderWallet = rowToWallet(sw);
  const bal = senderWallet.balances[params.asset] ?? 0;
  if (bal < params.amount) throw new Error(`Insufficient ${COIN_MAP[params.asset].symbol} balance.`);

  const rw = (await db.prepare("SELECT * FROM crypton_wallets WHERE user_id = ?").get(String(recipient.id))) as Row | undefined;
  const recipientWallet = rw ? rowToWallet(rw) : { userId: String(recipient.id), balances: {}, fiat: 0, addresses: {} };

  senderWallet.balances[params.asset] = bal - params.amount;
  recipientWallet.balances[params.asset] = (recipientWallet.balances[params.asset] ?? 0) + params.amount;

  const price = params.price ?? 0;
  const ts = Date.now();
  const txOut = makeTxRow({
    userId: sender.id, type: "send", asset: params.asset, amount: params.amount, direction: "out",
    counterparty: String(recipient.email), fee: 0, usdValue: params.amount * price, timestamp: ts,
    note: `Crypton transfer to ${String(recipient.name)}`,
  });
  const txIn = makeTxRow({
    userId: String(recipient.id), type: "receive", asset: params.asset, amount: params.amount, direction: "in",
    counterparty: sender.email, fee: 0, usdValue: params.amount * price, timestamp: ts,
    note: `Crypton transfer from ${sender.name}`,
  });

  await db.tx(async (cx) => {
    await cx.prepare("UPDATE crypton_wallets SET balances = ? WHERE user_id = ?").run(JSON.stringify(senderWallet.balances), sender.id);
    await cx.prepare("UPDATE crypton_wallets SET balances = ? WHERE user_id = ?").run(JSON.stringify(recipientWallet.balances), String(recipient.id));
    await insertTx(cx, txOut);
    await insertTx(cx, txIn);
  });
  return rowToTx(txOut);
}

function creditBuy(
  wallet: Wallet,
  userId: string,
  params: { asset: CoinId; fiatAmount: number; price?: number },
  note: string
): Row {
  const meta = COIN_MAP[params.asset];
  const price = params.price && params.price > 0 ? params.price : 0;
  const amount = price > 0 ? params.fiatAmount / price : 0;
  const bonus = meta.stable ? 0 : params.fiatAmount > 1000 ? 1.02 : 1.01;
  wallet.balances[params.asset] = (wallet.balances[params.asset] ?? 0) + amount * bonus;
  return makeTxRow({
    userId, type: "buy", asset: params.asset, amount: amount * bonus, direction: "in",
    usdValue: params.fiatAmount, timestamp: Date.now(), note,
  });
}

export async function buy(token: string, params: { asset: CoinId; fiatAmount: number; price?: number }): Promise<Tx> {
  const db = await getDb();
  const user = await userByToken(db, token);
  if (!user) throw new Error("Not signed in.");
  const w = (await db.prepare("SELECT * FROM crypton_wallets WHERE user_id = ?").get(user.id)) as Row | undefined;
  if (!w) throw new Error("Wallet not found.");
  const wallet = rowToWallet(w);
  if (params.fiatAmount <= 0) throw new Error("Amount must be greater than zero.");
  const FEE = 0.99;
  const totalFiat = params.fiatAmount + FEE;
  if (wallet.fiat < totalFiat) throw new Error("Insufficient cash balance to cover the purchase and network fee.");

  wallet.fiat = Math.max(0, wallet.fiat - totalFiat);
  const meta = COIN_MAP[params.asset];
  const amount = params.price && params.price > 0 ? params.fiatAmount / params.price : 0;
  const row = creditBuy(wallet, user.id, params, `Purchased ${amount.toFixed(meta.decimals)} ${meta.symbol}`);

  await db.tx(async (cx) => {
    await cx.prepare("UPDATE crypton_wallets SET balances = ?, fiat = ? WHERE user_id = ?").run(JSON.stringify(wallet.balances), wallet.fiat, user.id);
    await insertTx(cx, row);
  });
  return rowToTx(row);
}

export async function buyWithCard(token: string, params: { asset: CoinId; fiatAmount: number; price?: number; last4: string }): Promise<Tx> {
  const db = await getDb();
  const user = await userByToken(db, token);
  if (!user) throw new Error("Not signed in.");
  const w = (await db.prepare("SELECT * FROM crypton_wallets WHERE user_id = ?").get(user.id)) as Row | undefined;
  if (!w) throw new Error("Wallet not found.");
  const wallet = rowToWallet(w);
  if (params.fiatAmount <= 0) throw new Error("Amount must be greater than zero.");
  const row = creditBuy(wallet, user.id, params, `Paid via Maritime card •••• ${params.last4}`);

  await db.tx(async (cx) => {
    await cx.prepare("UPDATE crypton_wallets SET balances = ? WHERE user_id = ?").run(JSON.stringify(wallet.balances), user.id);
    await insertTx(cx, row);
  });
  return rowToTx(row);
}

export async function depositFiat(token: string, amount: number): Promise<Tx> {
  const db = await getDb();
  const user = await userByToken(db, token);
  if (!user) throw new Error("Not signed in.");
  const w = (await db.prepare("SELECT * FROM crypton_wallets WHERE user_id = ?").get(user.id)) as Row | undefined;
  if (!w) throw new Error("Wallet not found.");
  const wallet = rowToWallet(w);
  wallet.fiat += amount;
  const row = makeTxRow({
    userId: user.id, type: "receive", asset: "usd-coin", amount, direction: "in", usdValue: amount, timestamp: Date.now(), note: "Card top-up",
  });
  await db.tx(async (cx) => {
    await cx.prepare("UPDATE crypton_wallets SET fiat = ? WHERE user_id = ?").run(wallet.fiat, user.id);
    await insertTx(cx, row);
  });
  return rowToTx(row);
}

export async function swap(
  token: string,
  params: { from: CoinId; to: CoinId; amount: number; rate: number; priceFrom?: number; priceTo?: number }
): Promise<{ rate: number; received: number }> {
  const db = await getDb();
  const user = await userByToken(db, token);
  if (!user) throw new Error("Not signed in.");
  const w = (await db.prepare("SELECT * FROM crypton_wallets WHERE user_id = ?").get(user.id)) as Row | undefined;
  if (!w) throw new Error("Wallet not found.");
  const wallet = rowToWallet(w);
  const bal = wallet.balances[params.from] ?? 0;
  if (params.amount <= 0) throw new Error("Amount must be greater than zero.");
  if (bal < params.amount) throw new Error(`Insufficient ${COIN_MAP[params.from].symbol}.`);

  const rate = params.rate > 0 ? params.rate : 0;
  const received = params.amount * rate;
  wallet.balances[params.from] = bal - params.amount;
  wallet.balances[params.to] = (wallet.balances[params.to] ?? 0) + received;
  const ts = Date.now();

  const txOut = makeTxRow({ userId: user.id, type: "swap_out", asset: params.from, amount: params.amount, direction: "out", usdValue: params.amount * (params.priceFrom ?? 0), status: "confirmed", timestamp: ts, note: `Swapped to ${COIN_MAP[params.to].symbol}` });
  const txIn = makeTxRow({ userId: user.id, type: "swap_in", asset: params.to, amount: received, direction: "in", usdValue: received * (params.priceTo ?? 0), status: "confirmed", timestamp: ts + 1, note: `Swapped from ${COIN_MAP[params.from].symbol}` });

  await db.tx(async (cx) => {
    await cx.prepare("UPDATE crypton_wallets SET balances = ? WHERE user_id = ?").run(JSON.stringify(wallet.balances), user.id);
    await insertTx(cx, txOut);
    await insertTx(cx, txIn);
  });
  return { rate, received };
}

export async function updateProfile(token: string, patch: Partial<Pick<User, "name" | "email" | "verified" | "kycLevel">>): Promise<SessionUser> {
  const db = await getDb();
  const user = await userByToken(db, token);
  if (!user) throw new Error("Not signed in.");
  const sets: string[] = [];
  const params: unknown[] = [];
  if (patch.name !== undefined) { sets.push("name = ?"); params.push(patch.name); }
  if (patch.email !== undefined) { sets.push("email = ?"); params.push(patch.email.trim().toLowerCase()); }
  if (patch.verified !== undefined) { sets.push("verified = ?"); params.push(patch.verified ? 1 : 0); }
  if (patch.kycLevel !== undefined) { sets.push("kyc_level = ?"); params.push(patch.kycLevel); }
  if (sets.length) {
    params.push(user.id);
    await db.prepare(`UPDATE crypton_users SET ${sets.join(", ")} WHERE id = ?`).run(...params);
  }
  const fresh = (await db.prepare("SELECT * FROM crypton_users WHERE id = ?").get(user.id)) as Row;
  return rowToUser(fresh);
}

export async function announcements(): Promise<Announcement[]> {
  const db = await getDb();
  const m = await loadMeta(db);
  return m.announcements.filter((a) => a.active);
}

export async function meta(): Promise<DbMeta> {
  const db = await getDb();
  return loadMeta(db);
}

/* --------------------------------- admin -------------------------------- */

async function requireAdmin(db: Db, token: string): Promise<SessionUser> {
  const user = await userByToken(db, token);
  if (!user || user.role !== "admin") throw new Error("Admins only");
  return user;
}

export async function adminListUsers(token: string): Promise<SessionUser[]> {
  const db = await getDb();
  await requireAdmin(db, token);
  const rows = await db.prepare("SELECT * FROM crypton_users ORDER BY created_at ASC").all();
  return rows.map(rowToUser);
}

export async function adminGetWallet(token: string, userId: string): Promise<Wallet> {
  const db = await getDb();
  await requireAdmin(db, token);
  const w = (await db.prepare("SELECT * FROM crypton_wallets WHERE user_id = ?").get(userId)) as Row | undefined;
  const wallet = w ? rowToWallet(w) : { userId, balances: {}, fiat: 0, addresses: {} };
  await ensureWalletAddresses(db, wallet);
  return wallet;
}

export async function adminSetBalance(token: string, params: { userId: string; asset: CoinId; amount: number; note?: string; price?: number }): Promise<Tx> {
  const db = await getDb();
  await requireAdmin(db, token);
  const w = (await db.prepare("SELECT * FROM crypton_wallets WHERE user_id = ?").get(params.userId)) as Row | undefined;
  if (!w) throw new Error("Wallet not found.");
  const wallet = rowToWallet(w);
  const prev = wallet.balances[params.asset] ?? 0;
  const delta = params.amount - prev;
  wallet.balances[params.asset] = params.amount;
  const type = delta >= 0 ? "admin_credit" : "admin_debit";
  const row = makeTxRow({
    userId: params.userId, type, asset: params.asset, amount: Math.abs(delta), direction: delta >= 0 ? "in" : "out",
    usdValue: Math.abs(delta) * (params.price ?? 0), timestamp: Date.now(), note: params.note ?? (delta >= 0 ? "Admin credit" : "Admin adjustment"),
  });
  await db.tx(async (cx) => {
    await cx.prepare("UPDATE crypton_wallets SET balances = ? WHERE user_id = ?").run(JSON.stringify(wallet.balances), params.userId);
    await insertTx(cx, row);
  });
  return rowToTx(row);
}

export async function adminDeposit(
  token: string,
  params: { userId: string; asset: CoinId; amount: number; note?: string; price?: number }
): Promise<Tx> {
  const db = await getDb();
  const admin = await requireAdmin(db, token);
  if (params.amount <= 0) throw new Error("Amount must be greater than zero.");
  const userRow = (await db.prepare("SELECT * FROM crypton_users WHERE id = ?").get(params.userId)) as Row | undefined;
  if (!userRow) throw new Error("User not found.");
  const userWallet = rowToWallet((await db.prepare("SELECT * FROM crypton_wallets WHERE user_id = ?").get(params.userId)) as Row);
  await ensureWalletAddresses(db, userWallet);
  const masterRow = (await db.prepare("SELECT * FROM crypton_wallets WHERE user_id = ?").get(admin.id)) as Row | undefined;
  const masterWallet = masterRow ? rowToWallet(masterRow) : { userId: admin.id, balances: {}, fiat: 0, addresses: {} };
  await ensureWalletAddresses(db, masterWallet);

  const price = params.price ?? 0;
  userWallet.balances[params.asset] = (userWallet.balances[params.asset] ?? 0) + params.amount;
  masterWallet.balances[params.asset] = (masterWallet.balances[params.asset] ?? 0) + params.amount;

  const ts = Date.now();
  const userTx = makeTxRow({
    userId: params.userId, type: "receive", asset: params.asset, amount: params.amount, direction: "in",
    usdValue: params.amount * price, timestamp: ts, note: params.note ?? "Deposit received",
  });
  const masterTx = makeTxRow({
    userId: admin.id, type: "receive", asset: params.asset, amount: params.amount, direction: "in",
    usdValue: params.amount * price, timestamp: ts, note: `Holding for ${String(userRow.name)}`,
  });

  await db.tx(async (cx) => {
    await cx.prepare("UPDATE crypton_wallets SET balances = ? WHERE user_id = ?").run(JSON.stringify(userWallet.balances), params.userId);
    await cx.prepare("UPDATE crypton_wallets SET balances = ? WHERE user_id = ?").run(JSON.stringify(masterWallet.balances), admin.id);
    await insertTx(cx, userTx);
    await insertTx(cx, masterTx);
  });
  return rowToTx(userTx);
}

export async function adminToggleFreeze(token: string, userId: string, frozen: boolean): Promise<SessionUser> {
  const db = await getDb();
  const admin = await requireAdmin(db, token);
  const target = (await db.prepare("SELECT * FROM crypton_users WHERE id = ?").get(userId)) as Row | undefined;
  if (!target) throw new Error("User not found.");
  if (target.role === "admin") throw new Error("Cannot freeze an admin account.");
  if (target.id === admin.id) throw new Error("Cannot freeze your own account.");
  await db.prepare("UPDATE crypton_users SET frozen = ? WHERE id = ?").run(frozen ? 1 : 0, userId);
  const fresh = (await db.prepare("SELECT * FROM crypton_users WHERE id = ?").get(userId)) as Row;
  return rowToUser(fresh);
}

export async function adminSetSpread(token: string, pct: number): Promise<DbMeta> {
  const db = await getDb();
  await requireAdmin(db, token);
  const clamped = Math.min(10, Math.max(0, pct));
  return touchMeta(db, (m) => ({ ...m, spreadPct: clamped }));
}

export async function adminOverridePrice(token: string, asset: CoinId, price: number | null): Promise<DbMeta> {
  const db = await getDb();
  await requireAdmin(db, token);
  return touchMeta(db, (m) => {
    const next = { ...m.priceOverrides };
    if (price === null) delete next[asset];
    else next[asset] = price;
    return { ...m, priceOverrides: next };
  });
}

export async function adminToggleCoin(token: string, asset: CoinId, hidden: boolean): Promise<DbMeta> {
  const db = await getDb();
  await requireAdmin(db, token);
  return touchMeta(db, (m) => {
    const next = hidden ? (m.hiddenCoins.includes(asset) ? m.hiddenCoins : [...m.hiddenCoins, asset]) : m.hiddenCoins.filter((c) => c !== asset);
    return { ...m, hiddenCoins: next };
  });
}

export async function adminAnnounce(token: string, text: string, severity: Announcement["severity"]): Promise<DbMeta> {
  const db = await getDb();
  await requireAdmin(db, token);
  return touchMeta(db, (m) => ({
    ...m,
    announcements: [{ id: genId("ann"), text, severity, createdAt: Date.now(), active: true }, ...m.announcements],
  }));
}

export async function adminClearAnnounce(token: string, id: string): Promise<DbMeta> {
  const db = await getDb();
  await requireAdmin(db, token);
  return touchMeta(db, (m) => ({
    ...m,
    announcements: m.announcements.map((a) => (a.id === id ? { ...a, active: false } : a)),
  }));
}

export async function adminLedger(token: string): Promise<Tx[]> {
  const db = await getDb();
  await requireAdmin(db, token);
  const rows = await db.prepare("SELECT * FROM crypton_transactions ORDER BY timestamp DESC LIMIT 400").all();
  return rows.map(rowToTx);
}

export async function adminAllWallets(token: string): Promise<Array<{ user: SessionUser; wallet: Wallet }>> {
  const db = await getDb();
  await requireAdmin(db, token);
  const users = await db.prepare("SELECT * FROM crypton_users").all();
  const out: Array<{ user: SessionUser; wallet: Wallet }> = [];
  for (const u of users) {
    const w = (await db.prepare("SELECT * FROM crypton_wallets WHERE user_id = ?").get(String(u.id))) as Row | undefined;
    out.push({ user: rowToUser(u), wallet: w ? rowToWallet(w) : { userId: String(u.id), balances: {}, fiat: 0, addresses: {} } });
  }
  return out;
}

export async function getUserByEmailPublic(email: string): Promise<SessionUser | null> {
  const db = await getDb();
  const row = (await db.prepare("SELECT * FROM crypton_users WHERE email = ?").get(email.trim().toLowerCase())) as Row | undefined;
  return row ? rowToUser(row) : null;
}
