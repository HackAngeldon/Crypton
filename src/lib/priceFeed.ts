import { create } from 'zustand'
import type { CoinId, MarketSnapshot, Period } from '@/types'
import { COIN_CATALOG, COIN_MAP, FALLBACK_CHANGE, FALLBACK_PRICES } from '@/data/coins'
import { bindPriceResolver, getDb } from './mockApi'
import { clamp, delay, mulberry32, randomWalkSeries } from './sim'

const CHART_CACHE_KEY = 'crypton.charts.v1'
const PRICE_CACHE_KEY = 'crypton.prices.v1'
const MAX_CHART_POINTS = 160

const API_BASE = 'https://api.coingecko.com/api/v3'
const POLL_MS = 20_000
const TICK_MS = 2500

type ChartCache = Record<string, { at: number; points: number[] }>

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function writeJson(key: string, val: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(val))
  } catch {
    /* ignore quota */
  }
}

function seededRnd(key: string) {
  return mulberry32(hashTo32(key))
}
function hashTo32(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function initMarkets(): Record<CoinId, MarketSnapshot> {
  const out = {} as Record<CoinId, MarketSnapshot>
  for (const c of COIN_CATALOG) {
    out[c.id] = {
      price: FALLBACK_PRICES[c.id],
      change24h: FALLBACK_CHANGE[c.id],
      marketCap: 0,
      volume24h: 0,
      high24h: FALLBACK_PRICES[c.id] * 1.03,
      low24h: FALLBACK_PRICES[c.id] * 0.97,
    }
  }
  return out
}

async function fetchWithTimeout(url: string, ms = 8000): Promise<Response> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, { signal: ctrl.signal })
  } finally {
    clearTimeout(t)
  }
}

function downsample(points: number[], target = MAX_CHART_POINTS): number[] {
  if (points.length <= target) return points
  const step = points.length / target
  const out: number[] = []
  for (let i = 0; i < target; i++) out.push(points[Math.floor(i * step)])
  return out
}

interface PriceFeedState {
  markets: Record<CoinId, MarketSnapshot>
  live: boolean
  lastUpdated: number
  sparklines: Record<string, number[]>
  fetchSparkline: (id: CoinId, period: Period) => Promise<number[]>
  refresh: () => Promise<void>
  start: () => void
  stop: () => void
  applyOverride: (id: CoinId, price: number | null) => void
  currentPrice: (id: CoinId) => number
}

let pollTimer: ReturnType<typeof setInterval> | null = null
let tickTimer: ReturnType<typeof setInterval> | null = null

function applyOverrides(markets: Record<CoinId, MarketSnapshot>): Record<CoinId, MarketSnapshot> {
  const next = { ...markets }
  try {
    const overrides = getDb().meta.priceOverrides
    for (const [id, price] of Object.entries(overrides)) {
      const cid = id as CoinId
      if (price && next[cid]) {
        next[cid] = {
          ...next[cid],
          price,
          high24h: Math.max(next[cid].high24h, price),
          low24h: Math.min(next[cid].low24h, price),
        }
      }
    }
  } catch {
    /* ignore */
  }
  return next
}

export const usePriceFeed = create<PriceFeedState>((set, get) => ({
  markets: initMarkets(),
  live: false,
  lastUpdated: 0,
  sparklines: {},

  currentPrice: (id) => {
    const m = get().markets[id]
    return m ? m.price : FALLBACK_PRICES[id]
  },

  applyOverride: (id, price) => {
    set((s) => {
      const markets = { ...s.markets }
      if (price !== null) markets[id] = { ...markets[id], price, high24h: Math.max(markets[id].high24h, price), low24h: Math.min(markets[id].low24h, price) }
      return { markets }
    })
  },

  refresh: async () => {
    const ids = COIN_CATALOG.map((c) => c.id).join(',')
    try {
      const res = await fetchWithTimeout(
        `${API_BASE}/coins/markets?vs_currency=usd&ids=${ids}&price_change_percentage=24h&sparkline=false&per_page=100&page=1`,
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as Array<{ id: string; current_price: number; price_change_percentage_24h_in_currency: number | null; market_cap: number | null; total_volume: number | null; high_24h: number | null; low_24h: number | null }>
      const markets = { ...get().markets }
      for (const row of json) {
        const id = row.id as CoinId
        if (!COIN_MAP[id]) continue
        markets[id] = {
          price: row.current_price ?? markets[id].price,
          change24h: row.price_change_percentage_24h_in_currency ?? markets[id].change24h,
          marketCap: row.market_cap ?? 0,
          volume24h: row.total_volume ?? 0,
          high24h: row.high_24h ?? markets[id].high24h,
          low24h: row.low_24h ?? markets[id].low24h,
        }
      }
      writeJson(PRICE_CACHE_KEY, { markets, at: Date.now() })
      set({ markets: applyOverrides(markets), live: true, lastUpdated: Date.now() })
    } catch {
      // simulation fallback
      const cached = readJson<{ markets: Record<CoinId, MarketSnapshot> }>(PRICE_CACHE_KEY)
      const base = cached?.markets ?? get().markets
      const markets = { ...base }
      for (const c of COIN_CATALOG) {
        const rnd = seededRnd(`${c.id}:${Math.floor(Date.now() / 4000)}`)
        const drift = (rnd() * 2 - 1) * 0.0008
        markets[c.id] = {
          ...markets[c.id],
          price: clamp(markets[c.id].price * (1 + drift), 1e-8, 1e7),
        }
      }
      set({ markets: applyOverrides(markets), live: false, lastUpdated: Date.now() })
    }
  },

  fetchSparkline: async (id, period) => {
    const key = `${id}|${period}`
    const cached = readJson<ChartCache>(CHART_CACHE_KEY)
    const hit = cached?.[key]
    if (hit && Date.now() - hit.at < 10 * 60 * 1000) {
      set((s) => ({ sparklines: { ...s.sparklines, [key]: hit.points } }))
      return hit.points
    }
    const days = { '1H': 1, '24H': 1, '7D': 7, '1M': 30, '1Y': 365 }[period]
    const interval = period === '1H' ? 'minutely' : period === '24H' ? 'hourly' : period === '7D' ? 'hourly' : 'daily'
    try {
      const res = await fetchWithTimeout(`${API_BASE}/coins/${id}/market_chart?vs_currency=usd&days=${days}&interval=${interval}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as { prices: Array<[number, number]> }
      let points = json.prices.map((p) => p[1])
      if (period === '1H' && points.length > MAX_CHART_POINTS) points = downsample(points)
      points = points.map((p) => (isFinite(p) ? p : get().markets[id]?.price ?? FALLBACK_PRICES[id]))
      const next = { ...(cached ?? {}), [key]: { at: Date.now(), points } }
      writeJson(CHART_CACHE_KEY, next)
      set((s) => ({ sparklines: { ...s.sparklines, [key]: points } }))
      return points
    } catch {
      const price = get().markets[id]?.price ?? FALLBACK_PRICES[id]
      const vol = period === '1H' ? 0.0015 : period === '24H' ? 0.004 : period === '7D' ? 0.006 : 0.012
      const points = randomWalkSeries(`${id}:${period}`, price, 96, vol)
      set((s) => ({ sparklines: { ...s.sparklines, [key]: points } }))
      return points
    }
  },

  start: () => {
    if (pollTimer) return
    get().refresh()
    pollTimer = setInterval(() => get().refresh(), POLL_MS)
    tickTimer = setInterval(() => {
      const { markets, live } = get()
      if (live) return // real feed already moving; skip micro-tick when API healthy
      const next = { ...markets }
      for (const c of COIN_CATALOG) {
        const rnd = seededRnd(`${c.id}:${Math.floor(Date.now() / 2000)}`)
        const drift = (rnd() * 2 - 1) * 0.001
        next[c.id] = { ...next[c.id], price: clamp(next[c.id].price * (1 + drift), 1e-8, 1e7) }
      }
      set({ markets: next, lastUpdated: Date.now() })
    }, TICK_MS)
  },

  stop: () => {
    if (pollTimer) clearInterval(pollTimer)
    if (tickTimer) clearInterval(tickTimer)
    pollTimer = null
    tickTimer = null
  },
}))

bindPriceResolver((id) => usePriceFeed.getState().currentPrice(id))

export function primePrices() {
  // hydrate from cache instantly so the first paint isn't blank
  const cached = readJson<{ markets: Record<CoinId, MarketSnapshot> }>(PRICE_CACHE_KEY)
  if (cached) usePriceFeed.setState({ markets: cached.markets })
  void delay(0)
}
