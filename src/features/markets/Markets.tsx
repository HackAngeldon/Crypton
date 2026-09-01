import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Star, TrendingUp, TrendingDown, Flame } from 'lucide-react'
import { useApp } from '@/store/app'
import { usePriceFeed } from '@/lib/priceFeed'
import { useCurrency } from '@/lib/currency'
import { COIN_CATALOG } from '@/data/coins'
import { CoinIcon } from '@/components/CoinIcon'
import { AssetSparkline } from '@/components/AssetSparkline'
import { formatPct } from '@/lib/format'
import { EmptyState } from '@/components/ui/Skeleton'

function useWatchlist() {
  const [list, setList] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('crypton.watchlist') ?? '[]') as string[]
    } catch {
      return []
    }
  })
  const toggle = (id: string) => {
    setList((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      localStorage.setItem('crypton.watchlist', JSON.stringify(next))
      return next
    })
  }
  return { list, toggle }
}

type Sort = 'cap' | 'gainers' | 'losers'

export function Markets() {
  const hidden = useApp((s) => s.hiddenCoins)
  const markets = usePriceFeed((s) => s.markets)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'gainers' | 'losers' | 'watch'>('all')
  const [sort, setSort] = useState<Sort>('cap')
  const nav = useNavigate()
  const cur = useCurrency()
  const { list, toggle } = useWatchlist()

  const coins = COIN_CATALOG.filter((c) => !hidden.includes(c.id))
    .map((c) => ({ ...c, m: markets[c.id] }))
    .filter((c) => c.m)
    .filter((c) => (query ? c.symbol.toLowerCase().includes(query.toLowerCase()) || c.name.toLowerCase().includes(query.toLowerCase()) : true))
    .filter((c) => (filter === 'gainers' ? c.m.change24h > 0 : filter === 'losers' ? c.m.change24h < 0 : filter === 'watch' ? list.includes(c.id) : true))

  const sorted = [...coins].sort((a, b) => {
    if (sort === 'gainers') return b.m.change24h - a.m.change24h
    if (sort === 'losers') return a.m.change24h - b.m.change24h
    return (b.m.marketCap || 0) - (a.m.marketCap || 0)
  })

  return (
    <div className="pb-2">
      <header className="px-4 pt-[calc(env(safe-area-inset-top)+16px)]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-content">Markets</h1>
            <p className="mt-0.5 text-xs text-content-faint">Live rates across {COIN_CATALOG.length - hidden.length} assets</p>
          </div>
          <div className="flex gap-1.5">
            <SortBtn active={sort === 'cap'} onClick={() => setSort('cap')}>Cap</SortBtn>
            <SortBtn active={sort === 'gainers'} onClick={() => setSort('gainers')}><TrendingUp size={13} /> Top</SortBtn>
            <SortBtn active={sort === 'losers'} onClick={() => setSort('losers')}><TrendingDown size={13} /> Flop</SortBtn>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-hairline bg-elevate px-3.5">
          <Search size={17} className="text-content-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search coins…"
            className="h-11 flex-1 bg-transparent text-sm text-content placeholder:text-content-faint outline-none"
          />
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
          {(['all', 'gainers', 'losers', 'watch'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`chip ${filter === f ? '!bg-brand/20 !border-brand/40 !text-brand' : ''}`}
            >
              {f === 'watch' && <Star size={11} className={list.length ? 'fill-warn text-warn' : ''} />}
              {f === 'all' ? 'All' : f === 'gainers' ? 'Gainers' : f === 'losers' ? 'Losers' : `Watching (${list.length})`}
            </button>
          ))}
        </div>
      </header>

      <div className="mt-4 divide-y divide-hairline rounded-2xl border border-hairline bg-surface px-3">
        {sorted.length === 0 && (
          <EmptyState
            icon={<Star size={24} />}
            title={filter === 'watch' ? 'Nothing watched yet' : 'No results'}
            desc={filter === 'watch' ? 'Tap the star on any coin to keep it within reach.' : `No coins match “${query}”. Try a ticker like BTC.`}
          />
        )}
        {sorted.map((c) => {
          const watched = list.includes(c.id)
          const up = c.m.change24h >= 0
          return (
            <button key={c.id} onClick={() => nav(`/asset/${c.id}`)} className="press flex w-full items-center gap-3 py-3 text-left">
              <button
                onClick={(e) => { e.stopPropagation(); toggle(c.id) }}
                className="press shrink-0 rounded-lg p-1"
              >
                <Star size={16} className={watched ? 'fill-warn text-warn' : 'text-content-faint'} />
              </button>
              <CoinIcon coin={c.id} size={36} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-content">
                  {c.symbol}
                  <span className="truncate text-xs font-normal text-content-faint">{c.name}</span>
                  {c.stable && <span className="rounded bg-up/10 px-1 text-[9px] font-bold text-up">STABLE</span>}
                </p>
                <p className="mt-0.5 text-xs tabular text-content-faint">{cur.fmt(c.m.price)}</p>
              </div>
              <AssetSparkline coin={c.id} period="24H" width={56} height={24} />
              <div className="w-[72px] text-right">
                <p className={`text-xs font-bold tabular ${up ? 'text-up' : 'text-down'}`}>{formatPct(c.m.change24h)}</p>
                <p className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-content-faint">
                  <Flame size={10} /> {cur.fmt(c.m.marketCap || 0, true)}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function SortBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`press flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-2xs font-bold uppercase tracking-wide ${active ? 'border-brand/40 bg-brand/15 text-brand' : 'border-hairlinestrong bg-fill/5 text-content-faint'}`}
    >
      {children}
    </button>
  )
}
