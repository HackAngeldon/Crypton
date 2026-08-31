import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Eye, EyeOff, Send, Download, Plus, Repeat, ChevronRight, Megaphone,
} from 'lucide-react'
import { useApp } from '@/store/app'
import { usePriceFeed } from '@/lib/priceFeed'
import { useCurrency } from '@/lib/currency'
import { Wordmark } from '@/components/ui/Logo'
import { Avatar } from '@/components/ui/Avatar'
import { AreaChart } from '@/components/chart/Chart'
import { AssetSparkline } from '@/components/AssetSparkline'
import { TxRow } from '@/components/TxRow'
import { CoinIcon } from '@/components/CoinIcon'
import { COIN_MAP } from '@/data/coins'
import { formatCoin, formatPct } from '@/lib/format'
import { usePortfolioSeries } from '@/lib/portfolio'
import type { CoinId } from '@/types'

function usePortfolioValue() {
  const wallet = useApp((s) => s.wallet)
  const markets = usePriceFeed((s) => s.markets)
  const hidden = useApp((s) => s.hiddenCoins)
  return useMemo(() => {
    let crypto = 0
    let changeW = 0
    const rows: Array<{ id: CoinId; amount: number; value: number; change: number }> = []
    for (const [idStr, amount] of Object.entries(wallet?.balances ?? {})) {
      const id = idStr as CoinId
      if (hidden.includes(id) || !amount) continue
      const m = markets[id]
      const value = amount * (m?.price ?? 0)
      crypto += value
      changeW += value * (m?.change24h ?? 0) / 100
      rows.push({ id, amount, value, change: m?.change24h ?? 0 })
    }
    const fiat = wallet?.fiat ?? 0
    const total = crypto + fiat
    const pct = total > 0 ? (changeW / total) * 100 : 0
    rows.sort((a, b) => b.value - a.value)
    return { crypto, fiat, total, pct, rows }
  }, [wallet, markets, hidden])
}

export function Dashboard() {
  const user = useApp((s) => s.user)
  const txs = useApp((s) => s.txs)
  const announcements = useApp((s) => s.announcements)
  const live = usePriceFeed((s) => s.live)
  const nav = useNavigate()
  const { total, pct, rows, crypto } = usePortfolioValue()
  const cur = useCurrency()
  const [hidden, setHidden] = useState(false)
  const { series, loading } = usePortfolioSeries('7D')
  const up = pct >= 0

  const prevTotal = useRef(total)
  const [flash, setFlash] = useState<'' | 'flash-up' | 'flash-down'>('')
  if (total !== prevTotal.current) {
    setFlash(total > prevTotal.current ? 'flash-up' : 'flash-down')
    prevTotal.current = total
  }
  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(''), 800)
    return () => clearTimeout(t)
  }, [flash])

  const balanceText = hidden ? '••••••' : cur.fmt(total)
  const pnlDelta = (total * pct) / 100

  const quickActions = [
    { label: 'Send', icon: Send, to: '/send', tint: 'text-brand bg-brand/10 border-brand/25' },
    { label: 'Receive', icon: Download, to: '/receive', tint: 'text-brand bg-brand/10 border-brand/25' },
    { label: 'Buy', icon: Plus, to: '/buy', tint: 'text-up bg-up/10 border-up/25' },
    { label: 'Swap', icon: Repeat, to: '/swap', tint: 'text-warn bg-warn/10 border-warn/25' },
  ]

  return (
    <div className="pb-2">
      {/* header */}
      <header className="flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+14px)]">
        <div className="flex items-center gap-2.5">
          <Wordmark size={20} />
          <span className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${live ? 'bg-up/10 text-up' : 'bg-warn/10 text-warn'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${live ? 'bg-up animate-pulse-soft' : 'bg-warn animate-pulse-soft'}`} />
            {live ? 'Live' : 'Simulated'}
          </span>
        </div>
        <button onClick={() => nav('/profile')} className="press rounded-full border border-hairlinestrong">
          <Avatar name={user?.name ?? 'U'} size={38} gradient={user?.color} />
        </button>
      </header>

      {announcements.length > 0 && (
        <div className="mt-3 px-4">
          <div className="flex items-start gap-2.5 rounded-2xl border border-brand/25 bg-brand/10 px-3.5 py-2.5">
            <Megaphone size={16} className="mt-0.5 shrink-0 text-brand" />
            <div className="space-y-1.5">
              {announcements.slice(0, 2).map((a) => (
                <p key={a.id} className="text-xs leading-relaxed text-content-mute">{a.text}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* balance */}
      <section className="relative mt-4 px-4">
        <div className="relative overflow-hidden rounded-3xl border border-hairline bg-surface p-5 shadow-card">
          <div className="flex items-center justify-between">
            <p className="text-2xs font-semibold uppercase tracking-wider text-content-mute">Total balance</p>
            <button onClick={() => setHidden((h) => !h)} className="press rounded-lg p-1.5 text-content-mute">
              {hidden ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div className="mt-2 flex items-end gap-2">
            <p key={total.toFixed(6)} className={`font-display text-[40px] font-bold leading-none tabular ${flash === 'flash-up' ? 'text-up' : flash === 'flash-down' ? 'text-down' : 'text-content'}`}>
              {balanceText}
            </p>
            <span className={`mb-1.5 rounded-full px-2 py-0.5 text-xs font-bold tabular ${up ? 'bg-up/15 text-up' : 'bg-down/15 text-down'}`}>
              {formatPct(pct)}
            </span>
          </div>
          <p className="mt-2 text-xs text-content-mute">
            <span className={up ? 'text-up' : 'text-down'}>{up ? '▲' : '▼'} {cur.fmt(Math.abs(pnlDelta))}</span>
            <span className="mx-1.5 text-content-faint">·</span> past 24h
          </p>
          <div className="mt-4 h-px bg-hairline" />
          <div className="mt-4 grid grid-cols-4 gap-2">
            {quickActions.map(({ label, icon: Icon, to, tint }) => (
              <button key={label} onClick={() => nav(to)} className="press group flex flex-col items-center gap-1.5">
                <span className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${tint}`}>
                  <Icon size={19} />
                </span>
                <span className="text-[11px] font-semibold text-content-mute">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* portfolio chart */}
        <div className="mt-4 rounded-2xl border border-hairline bg-surface p-4 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xs font-semibold uppercase tracking-wider text-content-faint">Portfolio · 7D</p>
              <p className="mt-1 font-display text-lg font-semibold tabular text-content">{hidden ? '••••••' : cur.fmt(total)}</p>
            </div>
            <Link to="/portfolio" className="press flex items-center gap-0.5 rounded-xl bg-fill/10 px-3 py-2 text-xs font-semibold text-content-mute">
              Details <ChevronRight size={14} />
            </Link>
          </div>
          {loading ? (
            <div className="mt-3 h-[140px] animate-pulse rounded-xl bg-fill/5" />
          ) : series && series.length > 1 ? (
            <div className="mt-2">
              <AreaChart
                data={series}
                height={140}
                color={up ? '#169E64' : '#D23E3E'}
                valueFormat={(v) => cur.fmt(v)}
                showGrid
              />
            </div>
          ) : (
            <div className="mt-3 flex h-[140px] items-center justify-center rounded-xl bg-fill/5 text-xs text-content-faint">
              Hold a coin to see your portfolio trend
            </div>
          )}
        </div>

        {/* assets */}
        <div className="mt-5 flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold text-content-mute">Your assets</h2>
          <span className="text-2xs font-semibold uppercase tracking-wider text-content-faint">
            {crypto > 0 ? `${rows.length} coins · ${cur.fmt(crypto)}` : ''}
          </span>
        </div>
        <div className="mt-2 divide-y divide-hairline rounded-2xl border border-hairline bg-surface px-3">
          {rows.length === 0 && (
            <div className="py-10 text-center text-sm text-content-faint">
              No assets yet.{' '}
              <button onClick={() => nav('/buy')} className="font-semibold text-brand">Buy your first coin</button>
            </div>
          )}
          {rows.map(({ id, amount, value, change }) => (
            <button key={id} onClick={() => nav(`/asset/${id}`)} className="press flex w-full items-center gap-3 py-3.5 text-left">
              <CoinIcon coin={id} size={38} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-content">
                  {COIN_MAP[id].symbol}
                  <span className="truncate text-xs font-normal text-content-faint">{COIN_MAP[id].name}</span>
                </p>
                <p className="mt-0.5 text-xs tabular text-content-faint">{formatCoin(amount, id)}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden xs:block sm:block">
                  <AssetSparkline coin={id} period="24H" width={60} height={26} />
                </div>
                <div className="w-[84px] text-right">
                  <p className="text-sm font-semibold tabular text-content">{cur.fmt(value)}</p>
                  <p className={`mt-0.5 text-xs font-medium tabular ${change >= 0 ? 'text-up' : 'text-down'}`}>{formatPct(change)}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* activity */}
        <div className="mt-5 flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold text-content-mute">Recent activity</h2>
          <Link to="/activity" className="press text-xs font-semibold text-brand">View all</Link>
        </div>
        <div className="mt-1 rounded-2xl border border-hairline bg-surface px-3 py-1">
          {txs.slice(0, 5).map((tx) => (
            <TxRow key={tx.id} tx={tx} compact onClick={() => nav('/activity')} />
          ))}
          {txs.length === 0 && (
            <div className="py-8 text-center text-sm text-content-faint">No transactions yet.</div>
          )}
        </div>
      </section>
    </div>
  )
}
