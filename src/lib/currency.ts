import { useApp } from '@/store/app'
import { CURRENCIES } from '@/lib/format'

export interface Currency {
  code: string
  symbol: string
  rate: number
  /** Format a USD amount into this currency, optionally compact. */
  fmt: (usd: number, compact?: boolean) => string
}

export function useCurrency(): Currency {
  const code = useApp((s) => s.currency)
  const { symbol, rate } = CURRENCIES[code] ?? CURRENCIES.USD
  return {
    code,
    symbol,
    rate,
    fmt: (usd: number, compact?: boolean) => {
      const v = usd * rate
      const abs = Math.abs(v)
      if (compact && abs >= 1000) {
        const units = [
          { v: 1e9, s: 'B' },
          { v: 1e6, s: 'M' },
          { v: 1e3, s: 'K' },
        ]
        const u = units.find((x) => abs >= x.v)
        if (u) return `${symbol}${(v / u.v).toFixed(2)}${u.s}`
      }
      const d = abs > 0 && abs < 1 ? 4 : abs < 1000 ? 2 : 0
      return `${symbol}${v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })}`
    },
  }
}
