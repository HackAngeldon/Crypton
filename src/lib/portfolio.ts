import { useEffect, useState } from 'react'
import type { CoinId, Period } from '@/types'
import { usePriceFeed } from '@/lib/priceFeed'
import { useApp } from '@/store/app'

/**
 * Weighted portfolio value series over time, built from per-coin sparklines.
 * Returns aligned points (all series normalized to the same length).
 */
export function usePortfolioSeries(period: Period) {
  const wallet = useApp((s) => s.wallet)
  const fetchSparkline = usePriceFeed((s) => s.fetchSparkline)
  const [series, setSeries] = useState<number[] | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const held = (Object.entries(wallet?.balances ?? {}) as Array<[CoinId, number]>).filter(([, amt]) => amt > 0)

    const run = async () => {
      const coins: Array<{ id: CoinId; amount: number; spark: number[] }> = []
      await Promise.all(
        held.map(async ([id, amount]) => {
          const spark = await fetchSparkline(id, period)
          if (spark) coins.push({ id, amount, spark })
        }),
      )
      if (cancelled) return
      if (!coins.length) {
        setSeries([])
        setLoading(false)
        return
      }
      const len = Math.min(...coins.map((c) => c.spark.length))
      const out: number[] = []
      for (let i = len - 1; i >= 0; i--) {
        let sum = 0
        for (const c of coins) {
          const p = c.spark[c.spark.length - len + i] ?? 0
          sum += c.amount * p
        }
        out.push(sum)
      }
      setSeries(out)
      setLoading(false)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [wallet, period, fetchSparkline])

  return { series, loading }
}

export function percentChange(series: number[]): number {
  if (series.length < 2) return 0
  const first = series[0]
  const last = series[series.length - 1]
  if (!first) return 0
  return ((last - first) / first) * 100
}
