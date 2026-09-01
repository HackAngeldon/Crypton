import { useEffect, useRef } from 'react'
import { usePriceFeed } from '@/lib/priceFeed'
import { useApp } from '@/store/app'
import { COIN_CATALOG } from '@/data/coins'
import { getPrefs } from '@/lib/prefs'
import { formatPct } from '@/lib/format'

/**
 * Fires at most one quiet toast per feed tick when price alerts are enabled.
 * Only triggers on meaningful moves and is heavily throttled to avoid spam.
 */
export function usePriceAlerts() {
  const markets = usePriceFeed((s) => s.markets)
  const toast = useApp((s) => s.toast)
  const last = useRef<Partial<Record<string, number>>>({})
  const cooldown = useRef<Partial<Record<string, number>>>({})
  const initialized = useRef(false)

  useEffect(() => {
    if (!getPrefs().alerts) {
      last.current = {}
      initialized.current = false
      return
    }
    // First tick after mount / re-enable: just snapshot, don't alert
    if (!initialized.current) {
      for (const c of COIN_CATALOG) last.current[c.id] = markets[c.id]?.change24h ?? 0
      initialized.current = true
      return
    }
    const now = Date.now()
    const movers: Array<{ symbol: string; ch: number; prev: number }> = []
    for (const c of COIN_CATALOG) {
      const ch = markets[c.id]?.change24h ?? 0
      const prev = last.current[c.id]
      if (prev === undefined) {
        last.current[c.id] = ch
        continue
      }
      // Only alert on a solid move and a meaningful absolute level, with a long cooldown
      const delta = Math.abs(ch - prev)
      const meaningful = Math.abs(ch) >= 5 && delta >= 5
      if (meaningful && now - (cooldown.current[c.id] ?? 0) > 15 * 60 * 1000) {
        cooldown.current[c.id] = now
        movers.push({ symbol: c.symbol, ch, prev })
      }
      last.current[c.id] = ch
    }
    if (movers.length === 0) return
    // Batch multiple movers into a single toast to avoid stacking
    if (movers.length === 1) {
      const m = movers[0]
      toast({ kind: 'info', title: `${m.symbol} ${m.ch > m.prev ? 'rallying' : 'sliding'}`, desc: `24h change now ${formatPct(m.ch)}` })
    } else {
      const tops = movers.slice(0, 3).map((m) => `${m.symbol} ${formatPct(m.ch)}`).join(' · ')
      const extra = movers.length > 3 ? ` +${movers.length - 3} more` : ''
      toast({ kind: 'info', title: `${movers.length} markets moving`, desc: `${tops}${extra}` })
    }
  }, [markets, toast])
}
