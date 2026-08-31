import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PieChart as PieIcon, TrendingUp, TrendingDown } from 'lucide-react'
import { useApp } from '@/store/app'
import { usePriceFeed } from '@/lib/priceFeed'
import { useCurrency } from '@/lib/currency'
import { Donut, AreaChart } from '@/components/chart/Chart'
import { AssetSparkline } from '@/components/AssetSparkline'
import { CoinIcon } from '@/components/CoinIcon'
import { PageHeader } from '@/components/PageHeader'
import { Segmented } from '@/components/ui/Segmented'
import { COIN_MAP } from '@/data/coins'
import { formatCoin, formatPct } from '@/lib/format'
import { usePortfolioSeries, percentChange } from '@/lib/portfolio'
import type { CoinId, Period } from '@/types'

export function Portfolio() {
  const wallet = useApp((s) => s.wallet)
  const markets = usePriceFeed((s) => s.markets)
  const hidden = useApp((s) => s.hiddenCoins)
  const cur = useCurrency()
  const nav = useNavigate()
  const [period, setPeriod] = useState<Period>('7D')

  const rows = useMemo(() => {
    const out: Array<{ id: CoinId; amount: number; value: number; change: number; pct: number }> = []
    let total = 0
    for (const [idStr, amt] of Object.entries(wallet?.balances ?? {})) {
      const id = idStr as CoinId
      if (hidden.includes(id) || !amt) continue
      const value = amt * (markets[id]?.price ?? 0)
      total += value
      out.push({ id, amount: amt, value, change: markets[id]?.change24h ?? 0, pct: 0 })
    }
    out.forEach((r) => (r.pct = total > 0 ? (r.value / total) * 100 : 0))
    out.sort((a, b) => b.value - a.value)
    return { rows: out, total }
  }, [wallet, markets, hidden])

  const { series, loading } = usePortfolioSeries(period)
  const change = series ? percentChange(series) : 0
  const up = change >= 0
  const pnl = (rows.total * change) / 100

  const donutSegments = rows.rows.map((r) => ({
    value: r.value,
    color: COIN_MAP[r.id].color,
  }))

  return (
    <div className="pb-10">
      <PageHeader back title="Portfolio" sub="Your whole portfolio, one view" />

      <div className="px-4 pt-5">
        <div className="rounded-3xl border border-hairline bg-surface p-5 shadow-card">
          <div className="flex flex-col items-center">
            <Donut segments={donutSegments} centerLabel={cur.fmt(rows.total, true)} centerSub="total value" />
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-fill/5 px-2 py-3">
              <p className="text-2xs font-semibold uppercase tracking-wider text-content-faint">Assets</p>
              <p className="mt-1 font-display text-lg font-bold tabular text-content">{rows.rows.length}</p>
            </div>
            <div className="rounded-2xl bg-fill/5 px-2 py-3">
              <p className="text-2xs font-semibold uppercase tracking-wider text-content-faint">Top coin</p>
              <p className="mt-1 truncate font-display text-lg font-bold tabular text-content">
                {rows.rows[0] ? `${COIN_MAP[rows.rows[0].id].symbol} ${rows.rows[0].pct.toFixed(0)}%` : '—'}
              </p>
            </div>
            <div className="rounded-2xl bg-fill/5 px-2 py-3">
              <p className="text-2xs font-semibold uppercase tracking-wider text-content-faint">{period} PnL</p>
              <p className={`mt-1 flex items-center justify-center gap-1 font-display text-lg font-bold tabular ${up ? 'text-up' : 'text-down'}`}>
                {up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {formatPct(change)}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <Segmented
              options={(['1H', '24H', '7D', '1M', '1Y'] as const).map((p) => ({ value: p, label: p }))}
              value={period}
              onChange={setPeriod}
              className="w-full"
            />
          </div>
          <div className="mt-4">
            {loading || !series ? (
              <div className="h-[150px] animate-pulse rounded-xl bg-fill/5" />
            ) : series.length < 2 ? (
              <div className="flex h-[150px] items-center justify-center rounded-xl bg-fill/5 text-xs text-content-faint">
                Hold a coin to see your portfolio trend
              </div>
            ) : (
              <>
                <AreaChart
                  data={series}
                  height={150}
                  color={up ? '#169E64' : '#D23E3E'}
                  valueFormat={(v) => cur.fmt(v)}
                />
                <p className="mt-1 text-center text-xs text-content-faint">
                  {period === '1H' ? 'Last hour' : period === '24H' ? 'Last 24 hours' : period === '7D' ? 'Last 7 days' : period === '1M' ? 'Last 30 days' : 'Last 12 months'}
                  {' · '}<span className={up ? 'text-up' : 'text-down'}>{up ? '+' : '−'}{cur.fmt(Math.abs(pnl))}</span>
                </p>
              </>
            )}
          </div>
        </div>

        <h2 className="mt-6 flex items-center gap-1.5 px-1 text-sm font-semibold text-content-mute">
          <PieIcon size={15} className="text-brand" /> Allocation
        </h2>
        <div className="mt-2 divide-y divide-hairline rounded-2xl border border-hairline bg-surface px-3">
          {rows.rows.map((r) => (
            <button key={r.id} onClick={() => nav(`/asset/${r.id}`)} className="press flex w-full items-center gap-3 py-3.5 text-left">
              <CoinIcon coin={r.id} size={36} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-content">{COIN_MAP[r.id].symbol}</p>
                <p className="mt-0.5 text-xs tabular text-content-faint">{formatCoin(r.amount, r.id)}</p>
              </div>
              <div className="w-24">
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-content-mute tabular">{cur.fmt(r.value, true)}</span>
                  <span className="font-semibold text-content-mute tabular">{r.pct.toFixed(1)}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-fill/10">
                  <div className="h-full rounded-full" style={{ width: `${r.pct}%`, background: COIN_MAP[r.id].color }} />
                </div>
              </div>
              <div className="w-16 text-right">
                <p className={`text-xs font-bold tabular ${r.change >= 0 ? 'text-up' : 'text-down'}`}>{formatPct(r.change)}</p>
                <AssetSparkline coin={r.id} period="24H" width={48} height={20} />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
