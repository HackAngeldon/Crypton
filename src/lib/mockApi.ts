import type { Announcement, CoinId, Db, DbMeta, Role, Tx, TxType, User, Wallet } from '@/types'
import { COIN_MAP, FALLBACK_PRICES } from '@/data/coins'
import { delay, genAddress, genId, hashSeed } from './sim'

const DB_KEY = 'crypton.db.v2'
const SESSION_KEY = 'crypton.session.v1'

/* ------------------------------- session ------------------------------- */

export interface Session {
  userId: string
  role: Role
  unlockedAt: number
  locked: boolean
}

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Session
  } catch {
    return null
  }
}

function saveSession(s: Session | null) {
  if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s))
  else localStorage.removeItem(SESSION_KEY)
}

/* --------------------------------- db ---------------------------------- */

const EMPTY_META: DbMeta = {
  seeded: false,
  adminId: '',
  announcements: [],
  priceOverrides: {},
  hiddenCoins: [],
  spreadPct: 0.4,
  lastTxSeq: 0,
}

let db: Db | null = null

export function getDb(): Db {
  if (db) return db
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) {
      db = JSON.parse(raw) as Db
      if (!db.meta) db.meta = { ...EMPTY_META }
      return db
    }
  } catch {
    /* corrupt -> reseed */
  }
  db = { users: {}, wallets: {}, txs: [], meta: { ...EMPTY_META } }
  seed()
  persist()
  return db as Db
}

function persist() {
  if (db) localStorage.setItem(DB_KEY, JSON.stringify(db))
}

export function resetDb() {
  localStorage.removeItem(DB_KEY)
  localStorage.removeItem(SESSION_KEY)
  db = null
}

/* -------------------------------- seeding ------------------------------- */

function pinHash(pin: string): string {
  // mock-only obfuscation
  return `p$${hashSeed(pin + 'crypton').toString(36)}`
}

function makeTx(userId: string, partial: Partial<Tx>): Tx {
  return {
    id: genId('tx'),
    userId,
    type: 'receive',
    asset: 'bitcoin',
    amount: 0,
    direction: 'in',
    fee: 0,
    usdValue: 0,
    status: 'confirmed',
    timestamp: Date.now(),
    ...partial,
  }
}

function emptyWallet(userId: string, coins?: CoinId[]): Wallet {
  const wallet: Wallet = { userId, balances: {}, fiat: 0, addresses: {} }
  for (const c of coins ?? ['tether', 'usd-coin']) {
    wallet.addresses[c] = genAddress(COIN_MAP[c].chain, c)
  }
  return wallet
}

function seed() {
  const now = Date.now()
  const admin: User = {
    id: genId('u'),
    name: 'Crypto Ops',
    email: 'admin@crypton.app',
    pin: pinHash('000000'),
    pinLen: 6,
    role: 'admin',
    frozen: false,
    verified: true,
    kycLevel: 2,
    color: 'from-violet-500 to-fuchsia-500',
    createdAt: now - 1000 * 60 * 60 * 24 * 300,
    lastSeen: now,
  }
  const alex: User = {
    id: genId('u'),
    name: 'Alex Carter',
    email: 'alex@crypton.app',
    pin: pinHash('1234'),
    pinLen: 4,
    role: 'user',
    frozen: false,
    verified: true,
    kycLevel: 1,
    color: 'from-cyan-400 to-violet-500',
    createdAt: now - 1000 * 60 * 60 * 24 * 92,
    lastSeen: now,
  }

  const wallet: Wallet = {
    userId: alex.id,
    balances: {
      bitcoin: 0.05234,
      ethereum: 1.242,
      solana: 18.6,
      tether: 1250,
      'usd-coin': 480,
      dogecoin: 8000,
      cardano: 920,
      'polygon-ecosystem-token': 340,
    },
    fiat: 342.75,
    addresses: {},
  }
  for (const c of Object.keys(wallet.balances) as CoinId[]) {
    wallet.addresses[c] = genAddress(COIN_MAP[c].chain, c)
  }
  const adminWallet = emptyWallet(admin.id, ['bitcoin', 'ethereum', 'tether'])
  adminWallet.balances = { bitcoin: 0.12, ethereum: 4.5, tether: 5000 }
  adminWallet.fiat = 1250
  for (const c of Object.keys(adminWallet.balances) as CoinId[]) {
    adminWallet.addresses[c] = genAddress(COIN_MAP[c].chain, c)
  }

  const demo = db as Db
  demo.users[admin.id] = admin
  demo.users[alex.id] = alex
  demo.wallets[admin.id] = adminWallet
  demo.wallets[alex.id] = wallet
  demo.meta.seeded = true
  demo.meta.adminId = admin.id

  demo.txs = [
    makeTx(alex.id, { type: 'buy', asset: 'bitcoin', amount: 0.021, direction: 'in', usdValue: 1298, timestamp: now - 3600e3 * 2 }),
    makeTx(alex.id, { type: 'receive', asset: 'ethereum', amount: 0.85, direction: 'in', usdValue: 2907, counterparty: 'Metamask (0x4f…9b3c)', timestamp: now - 3600e3 * 7 }),
    makeTx(alex.id, { type: 'swap_out', asset: 'solana', amount: 12.4, direction: 'out', usdValue: 1963, fee: 0.0002, timestamp: now - 3600e3 * 26, note: 'Swapped to USDC' }),
    makeTx(alex.id, { type: 'swap_in', asset: 'usd-coin', amount: 1885, direction: 'in', usdValue: 1885, fee: 0, timestamp: now - 3600e3 * 26, note: 'Swapped from SOL' }),
    makeTx(alex.id, { type: 'send', asset: 'tether', amount: 220, direction: 'out', usdValue: 220, fee: 0.62, counterparty: '0x8c…4d21', status: 'confirmed', timestamp: now - 3600e3 * 40 }),
    makeTx(alex.id, { type: 'buy', asset: 'ethereum', amount: 0.4, direction: 'in', usdValue: 1368, timestamp: now - 3600e3 * 60 }),
    makeTx(alex.id, { type: 'receive', asset: 'solana', amount: 5.2, direction: 'in', usdValue: 823, counterparty: 'Binance (deposit)', timestamp: now - 3600e3 * 90 }),
    makeTx(alex.id, { type: 'send', asset: 'dogecoin', amount: 1500, direction: 'out', usdValue: 187, fee: 0.5, counterparty: 'DExnQj…xw9P', timestamp: now - 3600e3 * 140 }),
    makeTx(alex.id, { type: 'receive', asset: 'bitcoin', amount: 0.0105, direction: 'in', usdValue: 673, counterparty: 'Kraken (withdraw)', timestamp: now - 3600e3 * 200 }),
    makeTx(alex.id, { type: 'send', asset: 'cardano', amount: 250, direction: 'out', usdValue: 115, fee: 0.18, counterparty: 'addr1qx…p3a8', status: 'confirmed', timestamp: now - 3600e3 * 260 }),
  ]
}

/* ------------------------------ auth helpers ----------------------------- */

export function hashPin(pin: string): string {
  return pinHash(pin)
}

export function verifyPin(user: User, pin: string): boolean {
  return user.pin === hashPin(pin) || user.pin === pin
}

/* --------------------------------- api --------------------------------- */

export const api = {
  async init(): Promise<Db> {
    await delay(220)
    return getDb()
  },

  async register(name: string, email: string, pin: string): Promise<{ user: User; session: Session }> {
    await delay(650)
    const d = getDb()
    const norm = email.trim().toLowerCase()
    if (!name.trim()) throw new Error('Please enter your full name.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(norm)) throw new Error('That email address does not look right.')
    if (pin.length < 4) throw new Error('Your PIN must be at least 4 digits.')
    if (Object.values(d.users).some((u) => u.email.toLowerCase() === norm)) {
      throw new Error('An account with that email already exists. Try signing in instead.')
    }
    const user: User = {
      id: genId('u'),
      name: name.trim(),
      email: norm,
      pin: hashPin(pin),
      pinLen: pin.length,
      role: 'user',
      frozen: false,
      verified: false,
      kycLevel: 0,
      color: 'from-cyan-400 to-violet-500',
      createdAt: Date.now(),
      lastSeen: Date.now(),
    }
    const wallet: Wallet = { userId: user.id, balances: { tether: 25, 'usd-coin': 25 }, fiat: 0, addresses: {} }
    for (const c of ['tether', 'usd-coin'] as CoinId[]) {
      wallet.addresses[c] = genAddress(COIN_MAP[c].chain, c)
    }
    d.users[user.id] = user
    d.wallets[user.id] = wallet
    d.txs.unshift(makeTx(user.id, { type: 'receive', asset: 'tether', amount: 25, direction: 'in', usdValue: 25, status: 'confirmed', note: 'Welcome bonus', timestamp: Date.now() }))
    d.txs.unshift(makeTx(user.id, { type: 'receive', asset: 'usd-coin', amount: 25, direction: 'in', usdValue: 25, status: 'confirmed', note: 'Welcome bonus', timestamp: Date.now() }))
    persist()
    const session: Session = { userId: user.id, role: 'user', unlockedAt: Date.now(), locked: false }
    saveSession(session)
    return { user, session }
  },

  async login(email: string, pin: string): Promise<Session> {
    await delay(650)
    const d = getDb()
    const user = Object.values(d.users).find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
    if (!user) throw new Error('No account found for that email.')
    if (user.frozen) throw new Error('This account has been frozen. Contact support.')
    if (!verifyPin(user, pin)) throw new Error('Incorrect PIN. Please try again.')
    user.lastSeen = Date.now()
    persist()
    const session: Session = { userId: user.id, role: user.role, unlockedAt: Date.now(), locked: false }
    saveSession(session)
    return session
  },

  async lock(): Promise<void> {
    const s = loadSession()
    if (s) {
      s.locked = true
      saveSession(s)
    }
  },

  async unlock(pin: string): Promise<Session> {
    await delay(420)
    const s = loadSession()
    if (!s) throw new Error('No active session.')
    const d = getDb()
    const user = d.users[s.userId]
    if (!user) throw new Error('Session expired. Sign in again.')
    if (user.frozen) throw new Error('This account has been frozen.')
    if (!verifyPin(user, pin)) throw new Error('Incorrect PIN.')
    s.locked = false
    s.unlockedAt = Date.now()
    saveSession(s)
    return s
  },

  async changePin(current: string, next: string): Promise<void> {
    await delay(400)
    const s = loadSession()
    if (!s) throw new Error('Not signed in.')
    const d = getDb()
    const user = d.users[s.userId]
    if (!verifyPin(user, current)) throw new Error('Current PIN is incorrect.')
    if (next.length < 4) throw new Error('New PIN must be at least 4 digits.')
    user.pin = hashPin(next)
    user.pinLen = next.length
    persist()
  },

  pinLengthFor(email: string): number {
    const d = getDb()
    const user = Object.values(d.users).find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
    return user?.pinLen ?? 6
  },

  async logout(): Promise<void> {
    saveSession(null)
  },

  getSession(): Session | null {
    return loadSession()
  },

  async me(userId: string): Promise<{ user: User; wallet: Wallet }> {
    const d = getDb()
    const user = d.users[userId]
    if (!user) throw new Error('User not found.')
    if (!d.wallets[userId]) d.wallets[userId] = emptyWallet(userId)
    return { user, wallet: d.wallets[userId] }
  },

  async updateProfile(userId: string, patch: Partial<Pick<User, 'name' | 'email' | 'verified' | 'kycLevel'>>): Promise<User> {
    await delay(300)
    const d = getDb()
    const user = d.users[userId]
    if (!user) throw new Error('User not found.')
    Object.assign(user, patch)
    persist()
    return user
  },

  /* ------------------------------ transactions ----------------------------- */

  listTxs(userId?: string, limit?: number): Tx[] {
    const d = getDb()
    let txs = userId ? d.txs.filter((t) => t.userId === userId) : [...d.txs]
    txs.sort((a, b) => b.timestamp - a.timestamp)
    return typeof limit === 'number' ? txs.slice(0, limit) : txs
  },

  async send(params: { userId: string; asset: CoinId; amount: number; address: string; feeTier: 'low' | 'standard' | 'fast' }): Promise<Tx> {
    await delay(1400)
    const d = getDb()
    const wallet = d.wallets[params.userId]
    const bal = wallet.balances[params.asset] ?? 0
    if (params.amount <= 0) throw new Error('Amount must be greater than zero.')
    if (bal < params.amount) throw new Error(`Insufficient ${COIN_MAP[params.asset].symbol} balance.`)

    const feeMultiplier = { low: 0.0004, standard: 0.0009, fast: 0.0018 }[params.feeTier]
    const fee = COIN_MAP[params.asset].stable ? 0.5 : params.amount * feeMultiplier
    const total = params.amount + fee
    if (bal < total) throw new Error(`Insufficient balance to cover the network fee (${fee.toFixed(6)} ${COIN_MAP[params.asset].symbol}).`)

    wallet.balances[params.asset] = bal - total
    const price = priceNow(params.asset)
    const tx = makeTx(params.userId, {
      type: 'send',
      asset: params.asset,
      amount: params.amount,
      direction: 'out',
      counterparty: params.address,
      fee,
      usdValue: params.amount * price,
      status: 'confirmed',
      timestamp: Date.now(),
    })
    d.txs.unshift(tx)
    persist()
    return tx
  },

  async buy(params: { userId: string; asset: CoinId; fiatAmount: number }): Promise<Tx> {
    await delay(1200)
    const d = getDb()
    const wallet = d.wallets[params.userId]
    if (params.fiatAmount <= 0) throw new Error('Amount must be greater than zero.')
    const FEE = 0.99
    const totalFiat = params.fiatAmount + FEE
    if (wallet.fiat < totalFiat) throw new Error('Insufficient cash balance to cover the purchase and network fee.')
    wallet.fiat = Math.max(0, wallet.fiat - totalFiat)
    const tx = creditBuy(wallet, params, true)
    d.txs.unshift(tx)
    persist()
    return tx
  },

  async buyWithCard(params: { userId: string; asset: CoinId; fiatAmount: number; last4: string }): Promise<Tx> {
    await delay(700)
    const d = getDb()
    const wallet = d.wallets[params.userId]
    if (params.fiatAmount <= 0) throw new Error('Amount must be greater than zero.')
    const tx = creditBuy(wallet, params, false)
    tx.note = `Paid via Maritime card •••• ${params.last4}`
    d.txs.unshift(tx)
    persist()
    return tx
  },

  async depositFiat(params: { userId: string; amount: number }): Promise<Tx> {
    await delay(800)
    const d = getDb()
    const wallet = d.wallets[params.userId]
    wallet.fiat += params.amount
    const tx = makeTx(params.userId, {
      type: 'receive',
      asset: 'usd-coin',
      amount: params.amount,
      direction: 'in',
      usdValue: params.amount,
      status: 'confirmed',
      note: 'Card top-up',
    })
    d.txs.unshift(tx)
    persist()
    return tx
  },

  async swap(params: { userId: string; from: CoinId; to: CoinId; amount: number }): Promise<{ txOut: Tx; txIn: Tx; rate: number; received: number }> {
    await delay(1500)
    const d = getDb()
    const wallet = d.wallets[params.userId]
    const bal = wallet.balances[params.from] ?? 0
    if (params.amount <= 0) throw new Error('Amount must be greater than zero.')
    if (bal < params.amount) throw new Error(`Insufficient ${COIN_MAP[params.from].symbol}.`)

    const rate = swapRate(params.from, params.to)
    const received = params.amount * rate
    wallet.balances[params.from] = bal - params.amount
    wallet.balances[params.to] = (wallet.balances[params.to] ?? 0) + received

    const ts = Date.now()
    const txOut = makeTx(params.userId, { type: 'swap_out', asset: params.from, amount: params.amount, direction: 'out', usdValue: params.amount * priceNow(params.from), status: 'confirmed', timestamp: ts, note: `Swapped to ${COIN_MAP[params.to].symbol}` })
    const txIn = makeTx(params.userId, { type: 'swap_in', asset: params.to, amount: received, direction: 'in', usdValue: received * priceNow(params.to), status: 'confirmed', timestamp: ts + 1, note: `Swapped from ${COIN_MAP[params.from].symbol}` })
    d.txs.unshift(txOut, txIn)
    persist()
    return { txOut, txIn, rate, received }
  },

  /* ------------------------------ admin ops -------------------------------- */

  listUsers(): User[] {
    const d = getDb()
    return Object.values(d.users).sort((a, b) => a.createdAt - b.createdAt)
  },

  async adminSetBalance(params: { userId: string; asset: CoinId; amount: number; note?: string }): Promise<Tx> {
    await delay(500)
    const d = getDb()
    const wallet = d.wallets[params.userId]
    const prev = wallet.balances[params.asset] ?? 0
    const delta = params.amount - prev
    wallet.balances[params.asset] = params.amount
    const type: TxType = delta >= 0 ? 'admin_credit' : 'admin_debit'
    const tx = makeTx(params.userId, {
      type,
      asset: params.asset,
      amount: Math.abs(delta),
      direction: delta >= 0 ? 'in' : 'out',
      usdValue: Math.abs(delta) * priceNow(params.asset),
      status: 'confirmed',
      timestamp: Date.now(),
      note: params.note ?? (delta >= 0 ? 'Admin credit' : 'Admin adjustment'),
    })
    d.txs.unshift(tx)
    persist()
    return tx
  },

  async adminToggleFreeze(userId: string, frozen: boolean): Promise<User> {
    await delay(350)
    const d = getDb()
    const user = d.users[userId]
    if (user.role === 'admin') throw new Error('Cannot freeze an admin account.')
    user.frozen = frozen
    persist()
    return user
  },

  async adminSetSpread(pct: number): Promise<void> {
    await delay(250)
    const d = getDb()
    d.meta.spreadPct = Math.min(10, Math.max(0, pct))
    persist()
  },

  async adminOverridePrice(asset: CoinId, price: number | null): Promise<void> {
    await delay(250)
    const d = getDb()
    if (price === null) delete d.meta.priceOverrides[asset]
    else d.meta.priceOverrides[asset] = price
    persist()
  },

  async adminToggleCoin(asset: CoinId, hidden: boolean): Promise<void> {
    await delay(250)
    const d = getDb()
    if (hidden) {
      if (!d.meta.hiddenCoins.includes(asset)) d.meta.hiddenCoins.push(asset)
    } else {
      d.meta.hiddenCoins = d.meta.hiddenCoins.filter((c) => c !== asset)
    }
    persist()
  },

  async adminAnnounce(text: string, severity: Announcement['severity']): Promise<void> {
    await delay(250)
    const d = getDb()
    d.meta.announcements.unshift({ id: genId('ann'), text, severity, createdAt: Date.now(), active: true })
    persist()
  },

  async adminClearAnnounce(id: string): Promise<void> {
    await delay(200)
    const d = getDb()
    const ann = d.meta.announcements.find((a) => a.id === id)
    if (ann) ann.active = false
    persist()
  },

  async adminAddFiat(userId: string, amount: number): Promise<void> {
    await delay(400)
    const d = getDb()
    const wallet = d.wallets[userId]
    wallet.fiat += amount
    persist()
  },

  announcements(): Announcement[] {
    return getDb().meta.announcements.filter((a) => a.active)
  },

  async adminGetWallet(userId: string): Promise<Wallet> {
    const d = getDb()
    if (!d.wallets[userId]) d.wallets[userId] = emptyWallet(userId)
    return d.wallets[userId]
  },

  adminAllWallets(): Array<{ user: User; wallet: Wallet }> {
    const d = getDb()
    return Object.values(d.users).map((user) => ({ user, wallet: d.wallets[user.id] ?? emptyWallet(user.id) }))
  },
}

/* ------------------------------ credit helper ----------------------------- */

function creditBuy(
  wallet: Wallet,
  params: { userId: string; asset: CoinId; fiatAmount: number },
  showPurchased: boolean,
): Tx {
  const meta = COIN_MAP[params.asset]
  const price = priceNow(params.asset)
  const amount = params.fiatAmount / price
  const bonus = meta.stable ? 0 : params.fiatAmount > 1000 ? 1.02 : 1.01 // tiny "promo" on buys

  wallet.balances[params.asset] = (wallet.balances[params.asset] ?? 0) + amount * bonus
  return makeTx(params.userId, {
    type: 'buy',
    asset: params.asset,
    amount: amount * bonus,
    direction: 'in',
    usdValue: params.fiatAmount,
    status: 'confirmed',
    timestamp: Date.now(),
    note: showPurchased ? `Purchased ${amount.toFixed(meta.decimals)} ${meta.symbol}` : '',
  })
}

/* ------------------------------ price glue ------------------------------- */

let priceLookup: (id: CoinId) => number = (id) => FALLBACK_PRICES[id]
export function bindPriceResolver(fn: (id: CoinId) => number) {
  priceLookup = fn
}

export function priceNow(id: CoinId): number {
  return priceLookup(id)
}

export function swapRate(from: CoinId, to: CoinId): number {
  const d = getDb()
  const spread = 1 - d.meta.spreadPct / 100
  const pFrom = priceNow(from)
  const pTo = priceNow(to)
  if (pTo <= 0) return 0
  return (pFrom / pTo) * spread
}

export function swapPreview(from: CoinId, to: CoinId, amount: number): { rate: number; received: number; spread: number } {
  const d = getDb()
  const rate = swapRate(from, to)
  return {
    rate,
    received: amount * rate,
    spread: d.meta.spreadPct,
  }
}
