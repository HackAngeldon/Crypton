import type { Announcement, CoinId, Tx, User, Wallet } from '@/types'
import { FALLBACK_PRICES } from '@/data/coins'

export interface Session {
  userId: string
  role: 'user' | 'admin'
  unlockedAt: number
  locked: boolean
}

export interface DbMeta {
  seeded: boolean
  adminId: string
  announcements: Announcement[]
  priceOverrides: Partial<Record<CoinId, number>>
  hiddenCoins: CoinId[]
  spreadPct: number
  lastTxSeq: number
}

export interface AdminWalletRow {
  user: User
  wallet: Wallet
}

/* ------------------------------ transport ------------------------------- */

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (init?.body) headers.set('Content-Type', 'application/json')
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers })
  let data: unknown = null
  try {
    data = await res.json()
  } catch {
    /* empty body */
  }
  if (!res.ok) {
    const message = (data as { error?: string })?.error ?? `Request failed (${res.status})`
    throw new Error(message)
  }
  return data as T
}

const get = <T>(path: string) => request<T>(path)
const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) })

/* ------------------------------- session -------------------------------- */

const SESSION_KEY = 'crypton.session.v2'

interface StoredSession {
  token: string
  session: Session
}

function getToken(): string {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null')?.token ?? ''
  } catch {
    return ''
  }
}

function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const stored = JSON.parse(raw) as StoredSession
    return stored?.session ?? null
  } catch {
    return null
  }
}

function saveSession(token: string, session: Session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ token, session }))
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

function makeSession(user: { id: string; role: 'user' | 'admin' }, locked = false): Session {
  return { userId: user.id, role: user.role, unlockedAt: Date.now(), locked }
}

interface ServerUser {
  id: string
  name: string
  email: string
  pinLen: number
  role: 'user' | 'admin'
  frozen: boolean
  verified: boolean
  kycLevel: 0 | 1 | 2
  color: string
  createdAt: number
  lastSeen: number
}

function mapUser(u: ServerUser): User {
  return { ...u, pin: '' }
}

/* ------------------------------ meta cache ------------------------------ */

let metaCache: DbMeta = {
  seeded: false,
  adminId: '',
  announcements: [],
  priceOverrides: {},
  hiddenCoins: [],
  spreadPct: 0.4,
  lastTxSeq: 0,
}

export function setMeta(m: DbMeta) {
  metaCache = m
}

export function getMetaSync(): DbMeta {
  return metaCache
}

/* ---------------------------------- api --------------------------------- */

export const api = {
  async init(): Promise<DbMeta> {
    const m = await get<DbMeta>('/meta')
    setMeta(m)
    return m
  },

  getSession,

  async register(name: string, email: string, pin: string): Promise<{ user: User; session: Session }> {
    const { token, user } = await post<{ token: string; user: ServerUser }>('/auth/register', { name, email, pin })
    const session = makeSession(user)
    saveSession(token, session)
    return { user: mapUser(user), session }
  },

  async login(email: string, pin: string): Promise<Session> {
    const { token, user } = await post<{ token: string; user: ServerUser }>('/auth/login', { email, pin })
    const session = makeSession(user)
    saveSession(token, session)
    return session
  },

  async logout(): Promise<void> {
    try {
      await post('/auth/logout')
    } catch {
      /* ignore */
    }
    clearSession()
  },

  async lock(): Promise<void> {
    const s = getSession()
    if (s) saveSession(getToken(), { ...s, locked: true })
  },

  async unlock(pin: string): Promise<Session> {
    const user = await post<ServerUser>('/auth/unlock', { pin })
    const s = getSession()
    const session = s ? { ...s, locked: false, unlockedAt: Date.now() } : makeSession(user)
    saveSession(getToken(), session)
    return session
  },

  async changePin(current: string, next: string): Promise<void> {
    await post('/auth/change-pin', { current, next })
  },

  pinLengthFor(email: string): Promise<number> {
    return get<{ pinLen: number }>(`/auth/pin-length?email=${encodeURIComponent(email)}`).then((d) => d.pinLen)
  },

  async me(_userId: string): Promise<{ user: User; wallet: Wallet }> {
    const d = await get<{ user: ServerUser; wallet: Wallet }>('/me')
    return { user: mapUser(d.user), wallet: d.wallet }
  },

  async updateProfile(_userId: string, patch: Partial<Pick<User, 'name' | 'email' | 'verified' | 'kycLevel'>>): Promise<User> {
    const user = await post<ServerUser>('/profile', patch)
    return mapUser(user)
  },

  async listTxs(_userId: string, limit?: number): Promise<Tx[]> {
    const q = limit ? `?limit=${limit}` : ''
    return get<Tx[]>(`/transactions${q}`)
  },

  async send(params: { asset: CoinId; amount: number; address: string; feeTier: 'low' | 'standard' | 'fast'; price?: number }): Promise<Tx> {
    return post<Tx>('/send', params)
  },

  async sendInternal(params: { toEmail: string; asset: CoinId; amount: number; price?: number }): Promise<Tx> {
    return post<Tx>('/send-internal', params)
  },

  lookupUser(email: string): Promise<{ found: boolean; name: string | null; email: string }> {
    return get(`/lookup?email=${encodeURIComponent(email)}`)
  },

  async buy(params: { asset: CoinId; fiatAmount: number; price?: number }): Promise<Tx> {
    return post<Tx>('/buy', params)
  },

  async buyWithCard(params: { asset: CoinId; fiatAmount: number; price?: number; last4: string }): Promise<Tx> {
    return post<Tx>('/buy-card', params)
  },

  async depositFiat(params: { amount: number }): Promise<void> {
    await post('/deposit-fiat', { amount: params.amount })
  },

  async swap(params: { from: CoinId; to: CoinId; amount: number; rate: number; priceFrom?: number; priceTo?: number }): Promise<{ rate: number; received: number }> {
    return post<{ rate: number; received: number }>('/swap', params)
  },

  announcements(): Promise<Announcement[]> {
    return get<Announcement[]>('/announcements')
  },

  getMeta(): Promise<DbMeta> {
    return get<DbMeta>('/meta')
  },

  /* --------------------------------- admin -------------------------------- */

  listUsers(): Promise<User[]> {
    return get<ServerUser[]>('/admin/users').then((u) => u.map(mapUser))
  },

  async adminGetWallet(userId: string): Promise<Wallet> {
    return get<Wallet>(`/admin/wallet?userId=${encodeURIComponent(userId)}`)
  },

  async adminSetBalance(params: { userId: string; asset: CoinId; amount: number; note?: string; price?: number }): Promise<Tx> {
    return post<Tx>('/admin/balance', params)
  },

  async adminToggleFreeze(userId: string, frozen: boolean): Promise<User> {
    const u = await post<ServerUser>('/admin/freeze', { userId, frozen })
    return mapUser(u)
  },

  async adminSetSpread(pct: number): Promise<void> {
    await post('/admin/spread', { pct })
  },

  async adminOverridePrice(asset: CoinId, price: number | null): Promise<void> {
    await post('/admin/override-price', { asset, price })
  },

  async adminToggleCoin(asset: CoinId, hidden: boolean): Promise<void> {
    await post('/admin/coin', { asset, hidden })
  },

  async adminAnnounce(text: string, severity: Announcement['severity']): Promise<void> {
    await post('/admin/announce', { text, severity })
  },

  async adminClearAnnounce(id: string): Promise<void> {
    await post('/admin/announce', { id })
  },

  async adminDeposit(params: { userId: string; asset: CoinId; amount: number; note?: string; price?: number }): Promise<Tx> {
    return post<Tx>('/admin/deposit', params)
  },

  async adminLedger(): Promise<Tx[]> {
    return get<Tx[]>('/admin/ledger')
  },

  async adminAllWallets(): Promise<AdminWalletRow[]> {
    return get<AdminWalletRow[]>('/admin/all-wallets')
  },
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
  const spread = 1 - metaCache.spreadPct / 100
  const pFrom = priceNow(from)
  const pTo = priceNow(to)
  if (pTo <= 0) return 0
  return (pFrom / pTo) * spread
}

export function swapPreview(from: CoinId, to: CoinId, amount: number): { rate: number; received: number; spread: number } {
  const rate = swapRate(from, to)
  return { rate, received: amount * rate, spread: metaCache.spreadPct }
}
