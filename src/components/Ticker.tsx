import { useMemo } from 'react'
import { usePriceFeed } from '@/lib/priceFeed'
import { useApp } from '@/store/app'
import { COIN_CATALOG, COIN_MAP } from '@/data/coins'
import { formatPct, formatUsd } from '@/lib/format'
import { CoinBadge } from './CoinIcon'
import type { CoinId } from '@/types'

function Item({ id }: { id: CoinId }) {
  const m = usePriceFeed((s) => s.markets[id])
  const up = (m?.change24h ?? 0) >= 0
  return (
    <div className="flex shrink-0 items-center gap-2 px-4">
      <CoinBadge coin={id} size={14} />
      <span className="text-xs font-semibold text-content-mute">{COIN_MAP[id].symbol}</span>
      <span className={`text-xs font-medium tabular ${up ? 'text-up' : 'text-down'}`}>{formatUsd(m?.price ?? 0, { decimals: m && m.price < 1 ? 4 : 2 })}</span>
      <span className={`text-[10px] font-semibold tabular ${up ? 'text-up' : 'text-down'}`}>{formatPct(m?.change24h ?? 0)}</span>
    </div>
  )
}

export function Ticker({ live }: { live: boolean }) {
  const hiddenCoins = useApp((s) => s.hiddenCoins)
  const coins = useMemo<CoinId[]>(
    () => COIN_CATALOG.map((c) => c.id).filter((id) => !hiddenCoins.includes(id)) as CoinId[],
    [hiddenCoins],
  )
  const row = [...coins, ...coins]
  return (
    <div className="relative border-y border-hairline bg-elevate/60">
      <div className="flex w-max animate-ticker items-center py-2">
        {row.map((id, i) => (
          <Item key={`${id}-${i}`} id={id} />
        ))}
      </div>
      {live && (
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-canvas to-transparent" />
      )}
    </div>
  )
}
