export type Role = 'user' | 'admin'

export interface User {
  id: string
  name: string
  email: string
  pin: string
  pinLen: number
  role: Role
  frozen: boolean
  verified: boolean
  kycLevel: 0 | 1 | 2
  color: string
  restrictions: Record<string, boolean>
  createdAt: number
  lastSeen: number
}

export type CoinId =
  | 'bitcoin'
  | 'ethereum'
  | 'solana'
  | 'tether'
  | 'usd-coin'
  | 'binancecoin'
  | 'cardano'
  | 'xrp'
  | 'dogecoin'
  | 'polkadot'
  | 'chainlink'
  | 'avalanche-2'
  | 'litecoin'
  | 'shiba-inu'
  | 'near'
  | 'polygon-ecosystem-token'

export interface CoinMeta {
  id: CoinId
  symbol: string
  name: string
  color: string
  glow: string
  decimals: number
  stable?: boolean
  chain: string
  icon: 'btc' | 'eth' | 'sol' | 'usdt' | 'usdc' | 'bnb' | 'ada' | 'xrp' | 'doge' | 'dot' | 'link' | 'avax' | 'ltc' | 'shib' | 'near' | 'matic'
}

export interface Wallet {
  userId: string
  balances: Partial<Record<CoinId, number>>
  fiat: number
  addresses: Partial<Record<CoinId, string>>
}

export type TxType = 'send' | 'receive' | 'swap_in' | 'swap_out' | 'buy' | 'admin_credit' | 'admin_debit'
export type TxStatus = 'pending' | 'confirmed' | 'failed'

export interface Tx {
  id: string
  userId: string
  type: TxType
  asset: CoinId
  amount: number
  direction: 'in' | 'out'
  counterparty?: string
  fee: number
  usdValue: number
  status: TxStatus
  timestamp: number
  note?: string
}

export interface Announcement {
  id: string
  text: string
  severity: 'info' | 'success' | 'warning' | 'danger'
  createdAt: number
  active: boolean
}

export interface MarketSnapshot {
  price: number
  change24h: number
  marketCap: number
  volume24h: number
  high24h: number
  low24h: number
}

export type Period = '1H' | '24H' | '7D' | '1M' | '1Y'

export interface DbMeta {
  seeded: boolean
  adminId: string
  announcements: Announcement[]
  priceOverrides: Partial<Record<CoinId, number>>
  hiddenCoins: CoinId[]
  spreadPct: number
  lastTxSeq: number
}

export interface Db {
  users: Record<string, User>
  wallets: Record<string, Wallet>
  txs: Tx[]
  meta: DbMeta
}
