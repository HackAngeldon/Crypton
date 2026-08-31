import type { CoinId, CoinMeta } from '@/types'

export const COIN_CATALOG: CoinMeta[] = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', color: '#F7931A', glow: 'rgba(247,147,26,0.35)', decimals: 8, chain: 'Bitcoin', icon: 'btc' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', color: '#818CF8', glow: 'rgba(129,140,248,0.35)', decimals: 18, chain: 'Ethereum', icon: 'eth' },
  { id: 'solana', symbol: 'SOL', name: 'Solana', color: '#14F195', glow: 'rgba(20,241,149,0.35)', decimals: 9, chain: 'Solana', icon: 'sol' },
  { id: 'tether', symbol: 'USDT', name: 'Tether', color: '#26A17B', glow: 'rgba(38,161,123,0.35)', decimals: 6, chain: 'Ethereum', stable: true, icon: 'usdt' },
  { id: 'usd-coin', symbol: 'USDC', name: 'USD Coin', color: '#2775CA', glow: 'rgba(39,117,202,0.35)', decimals: 6, chain: 'Ethereum', stable: true, icon: 'usdc' },
  { id: 'binancecoin', symbol: 'BNB', name: 'BNB', color: '#F0B90B', glow: 'rgba(240,185,11,0.35)', decimals: 8, chain: 'BNB Chain', icon: 'bnb' },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano', color: '#0033AD', glow: 'rgba(0,51,173,0.5)', decimals: 6, chain: 'Cardano', icon: 'ada' },
  { id: 'xrp', symbol: 'XRP', name: 'XRP', color: '#00A9E0', glow: 'rgba(0,169,224,0.35)', decimals: 6, chain: 'XRP Ledger', icon: 'xrp' },
  { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', color: '#C2A633', glow: 'rgba(194,166,51,0.35)', decimals: 8, chain: 'Dogecoin', icon: 'doge' },
  { id: 'polkadot', symbol: 'DOT', name: 'Polkadot', color: '#E6007A', glow: 'rgba(230,0,122,0.35)', decimals: 10, chain: 'Polkadot', icon: 'dot' },
  { id: 'chainlink', symbol: 'LINK', name: 'Chainlink', color: '#2A5ADA', glow: 'rgba(42,90,218,0.4)', decimals: 18, chain: 'Ethereum', icon: 'link' },
  { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche', color: '#E84142', glow: 'rgba(232,65,66,0.35)', decimals: 18, chain: 'Avalanche', icon: 'avax' },
  { id: 'litecoin', symbol: 'LTC', name: 'Litecoin', color: '#BEBEBE', glow: 'rgba(190,190,190,0.35)', decimals: 8, chain: 'Litecoin', icon: 'ltc' },
  { id: 'shiba-inu', symbol: 'SHIB', name: 'Shiba Inu', color: '#FFA500', glow: 'rgba(255,165,0,0.35)', decimals: 18, chain: 'Ethereum', icon: 'shib' },
  { id: 'near', symbol: 'NEAR', name: 'NEAR Protocol', color: '#00EC97', glow: 'rgba(0,236,151,0.35)', decimals: 24, chain: 'NEAR', icon: 'near' },
  { id: 'polygon-ecosystem-token', symbol: 'POL', name: 'Polygon', color: '#8247E5', glow: 'rgba(130,71,229,0.4)', decimals: 18, chain: 'Polygon', icon: 'matic' },
]

export const COIN_MAP: Record<CoinId, CoinMeta> = Object.fromEntries(
  COIN_CATALOG.map((c) => [c.id, c]),
) as Record<CoinId, CoinMeta>

export const DEFAULT_COINS: CoinId[] = COIN_CATALOG.map((c) => c.id)

/** Stablecoins always reference their pegged fiat; used for fiat conversions. */
export const STABLES: CoinId[] = ['tether', 'usd-coin']

/** How many seconds a CoinGecko chart cache stays fresh. */
export const CHART_TTL = 10 * 60 * 1000

export const FALLBACK_PRICES: Record<CoinId, number> = {
  bitcoin: 64120.5,
  ethereum: 3420.1,
  solana: 158.4,
  tether: 1,
  'usd-coin': 1,
  binancecoin: 582.3,
  cardano: 0.462,
  xrp: 0.612,
  dogecoin: 0.125,
  polkadot: 6.44,
  chainlink: 14.82,
  'avalanche-2': 28.9,
  litecoin: 84.2,
  'shiba-inu': 0.0000182,
  near: 4.92,
  'polygon-ecosystem-token': 0.53,
}

export const FALLBACK_CHANGE: Record<CoinId, number> = {
  bitcoin: 3.42,
  ethereum: 4.1,
  solana: -1.8,
  tether: 0.02,
  'usd-coin': 0.01,
  binancecoin: 2.2,
  cardano: -2.4,
  xrp: 5.1,
  dogecoin: -4.2,
  polkadot: 1.4,
  chainlink: -0.9,
  'avalanche-2': 6.3,
  litecoin: 0.8,
  'shiba-inu': -5.6,
  near: 3.9,
  'polygon-ecosystem-token': -1.2,
}
