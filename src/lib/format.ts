import type { CoinId } from '@/types'
import { COIN_MAP } from '@/data/coins'

export const CURRENCIES: Record<string, { symbol: string; rate: number }> = {
  USD: { symbol: '$', rate: 1 },
  EUR: { symbol: '€', rate: 0.92 },
  GBP: { symbol: '£', rate: 0.79 },
  NGN: { symbol: '₦', rate: 1550 },
  JPY: { symbol: '¥', rate: 156 },
  KRW: { symbol: '₩', rate: 1380 },
}

export function formatUsd(
  n: number,
  opts: { compact?: boolean; decimals?: number; currency?: string } = {},
): string {
  const { compact = false, decimals, currency = 'USD' } = opts
  const sym = CURRENCIES[currency]?.symbol ?? '$'
  const abs = Math.abs(n)
  if (compact && abs >= 1000) {
    const units = [
      { v: 1e9, s: 'B' },
      { v: 1e6, s: 'M' },
      { v: 1e3, s: 'K' },
    ]
    const u = units.find((x) => abs >= x.v)
    if (u) return `${sym}${(n / u.v).toFixed(2)}${u.s}`
  }
  const d = decimals ?? (abs > 0 && abs < 1 ? 4 : abs < 1000 ? 2 : 0)
  return `${sym}${n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })}`
}

export function formatCoin(
  n: number,
  coin: CoinId,
  opts: { compact?: boolean } = {},
): string {
  const meta = COIN_MAP[coin]
  const abs = Math.abs(n)
  if (opts.compact && abs >= 1000) {
    return `${(n / 1000).toFixed(2)}K ${meta.symbol}`
  }
  let d = 2
  if (abs < 1 && abs >= 0.0001) d = 4
  else if (abs < 0.0001 && abs > 0) d = 8
  else if (abs === 0) d = 2
  return `${n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })} ${meta.symbol}`
}

export function formatAmount(n: number, opts: { max?: number } = {}): string {
  const d = opts.max ?? 6
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: d,
  })
}

export function formatPct(n: number): string {
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}%`
}

export function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function shortAddr(addr: string, n = 6): string {
  if (addr.length <= 2 * n + 2) return addr
  return `${addr.slice(0, n)}…${addr.slice(-n)}`
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}
