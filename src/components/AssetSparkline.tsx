import { useEffect, useState } from 'react'
import type { CoinId, Period } from '@/types'
import { usePriceFeed } from '@/lib/priceFeed'
import { Sparkline } from '@/components/chart/Chart'

export function AssetSparkline({ coin, period = '24H', width = 60, height = 26 }: { coin: CoinId; period?: Period; width?: number; height?: number }) {
  const fetchSparkline = usePriceFeed((s) => s.fetchSparkline)
  const [data, setData] = useState<number[] | null>(null)

  useEffect(() => {
    let alive = true
    void fetchSparkline(coin, period).then((d) => alive && setData(d))
    return () => {
      alive = false
    }
  }, [coin, period, fetchSparkline])

  const snap = usePriceFeed((s) => s.markets[coin]?.change24h ?? 0)
  if (!data) return <div style={{ width, height }} className="animate-pulse rounded bg-fill/5" />
  return <Sparkline data={data} color={snap >= 0 ? '#34D399' : '#FB7185'} width={width} height={height} />
}
