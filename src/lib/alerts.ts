import { useEffect, useRef } from 'react'
import { usePriceFeed } from '@/lib/priceFeed'
import { useApp } from '@/store/app'
import { COIN_CATALOG } from '@/data/coins'
import { getPrefs } from '@/lib/prefs'
import { formatPct } from '@/lib/format'

/**
 * Fires a toast when any coin's 24h change shifts by a meaningful amount
 * between feed updates, while price alerts are enabled.
 */
export function usePriceAlerts() {
  const markets = usePriceFeed((s) => s.markets)
  const toast = useApp((s) => s.toast)
  const last = useRef<Partial<Record<string, number>>>({})
  const cooldown = useRef<Partial<Record<string, number>>>({})

  useEffect(() => {
    if (!getPrefs().alerts) {
      last.current = {}
      return
    }
    const now = Date.now()
    for (const c of COIN_CATALOG) {
      const ch = markets[c.id]?.change24h ?? 0
      const prev = last.current[c.id]
      if (prev !== undefined && Math.abs(ch - prev) >= 3 && now - (cooldown.current[c.id] ?? 0) > 5 * 60 * 1000) {
        cooldown.current[c.id] = now
        toast({ kind: 'info', title: `${c.symbol} ${ch > prev ? 'rallying' : 'sliding'}`, desc: `24h change now ${formatPct(ch)}` })
      }
      last.current[c.id] = ch
    }
  }, [markets, toast])
}
