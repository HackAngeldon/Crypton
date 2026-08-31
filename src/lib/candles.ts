import { hashSeed, mulberry32 } from './sim'

export interface Candle {
  open: number
  high: number
  low: number
  close: number
  volume: number
}

/**
 * Convert a close-price series into OHLC candles. The free CoinGecko feed only
 * exposes close prices, so candles are synthesized with realistic wicks and a
 * volume estimate scaled by each candle's move.
 */
export function seriesToCandles(points: number[], count: number, seedStr?: string): Candle[] {
  if (!points.length) return []
  const n = Math.min(count, Math.max(2, points.length))
  const step = Math.max(1, Math.floor(points.length / n))
  const rnd = mulberry32(hashSeed((seedStr ?? 'candles') + points.length))
  const candles: Candle[] = []
  for (let i = 0; i < points.length; i += step) {
    const slice = points.slice(i, i + step)
    const open = i === 0 ? points[0] : points[i - 1]
    const close = slice[slice.length - 1]
    const hi = Math.max(open, close, ...slice)
    const lo = Math.min(open, close, ...slice)
    const wick = Math.max(hi - lo, close * 0.001)
    const high = hi + wick * (0.2 + rnd() * 0.5)
    const low = Math.max(0.0000001, lo - wick * (0.2 + rnd() * 0.5))
    const move = Math.abs(close - open) / (open || 1)
    const volume = Math.round(120 + rnd() * 2400 + move * 90000)
    candles.push({ open, high, low, close, volume })
  }
  return candles
}

export function candleCountFor(period: string): number {
  switch (period) {
    case '1H':
      return 48
    case '24H':
      return 48
    case '7D':
      return 56
    case '1M':
      return 60
    case '1Y':
      return 72
    default:
      return 56
  }
}
