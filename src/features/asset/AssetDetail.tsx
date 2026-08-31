import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowUpRight, ArrowDownRight, Send, Download, RefreshCcw, BadgeCheck, Info, ChartLine, ChartCandlestick } from 'lucide-react'
import { useApp } from '@/store/app'
import { usePriceFeed } from '@/lib/priceFeed'
import { useCurrency } from '@/lib/currency'
import { COIN_MAP } from '@/data/coins'
import { CoinIcon } from '@/components/CoinIcon'
import { PageHeader } from '@/components/PageHeader'
import { AreaChart } from '@/components/chart/Chart'
import { CandlestickChart } from '@/components/chart/Candlestick'
import { TxRow } from '@/components/TxRow'
import { Segmented } from '@/components/ui/Segmented'
import { Button } from '@/components/ui/Button'
import { formatCoin, formatPct, formatUsd, timeAgo } from '@/lib/format'
import { candleCountFor, seriesToCandles } from '@/lib/candles'
import type { CoinId, Period } from '@/types'

export function AssetDetail() {
  const { id } = useParams()
  const coinId: CoinId = id && COIN_MAP[id as CoinId] ? (id as CoinId) : 'bitcoin'
  const meta = COIN_MAP[coinId]
  const nav = useNavigate()
  const markets = usePriceFeed((s) => s.markets)
  const lastUpdated = usePriceFeed((s) => s.lastUpdated)
  const fetchSparkline = usePriceFeed((s) => s.fetchSparkline)
  const wallet = useApp((s) => s.wallet)
  const txs = useApp((s) => s.txs)
  const cur = useCurrency()

  const [period, setPeriod] = useState<Period>('24H')
  const [view, setView] = useState<'line' | 'candles'>('line')
  const [chart, setChart] = useState<number[] | null>(null)

  useEffect(() => {
    let alive = true
    setChart(null)
    void fetchSparkline(coinId, period).then((d) => alive && setChart(d))
    return () => {
      alive = false
    }
  }, [coinId, period, fetchSparkline])

  const candles = useMemo(
    () => (chart && chart.length > 1 ? seriesToCandles(chart, candleCountFor(period), `${coinId}:${period}`) : []),
    [chart, period, coinId],
  )

  const m = markets[coinId]
  const price = m?.price ?? 0
  const up = (m?.change24h ?? 0) >= 0
  const balance = wallet?.balances[coinId] ?? 0
  const balanceUsd = balance * price

  const assetTxs = useMemo(() => txs.filter((t) => t.asset === coinId), [txs, coinId])

  if (!meta) return null

  const stats = [
    { label: 'Market cap', value: cur.fmt(m?.marketCap ?? 0, true) },
    { label: '24h volume', value: cur.fmt(m?.volume24h ?? 0, true) },
    { label: '24h high', value: formatUsd(m?.high24h ?? price, { decimals: price < 1 ? 4 : 2 }) },
    { label: '24h low', value: formatUsd(m?.low24h ?? price, { decimals: price < 1 ? 4 : 2 }) },
  ]

  return (
    <div className="pb-2">
      <PageHeader
        back
        title={`${meta.name} (${meta.symbol})`}
        sub={meta.stable ? 'Stablecoin · pegged to USD' : `Ranked asset · ${meta.chain} network`}
        right={<CoinIcon coin={coinId} size={38} />}
      />

      <div className="px-4">
        {/* price */}
        <div className="mt-5">
          <p className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-wider text-content-faint">
            <span className={`h-1.5 w-1.5 rounded-full ${up ? 'bg-up animate-pulse-soft' : 'bg-down animate-pulse-soft'}`} />
            Live market feed · global average
          </p>
          <div className="mt-1.5 flex items-end gap-2.5">
            <p key={price.toFixed(6)} className="font-display text-[42px] font-bold leading-none tabular text-content">
              {formatUsd(price, { decimals: price < 0.01 ? 6 : price < 1 ? 4 : 2 })}
            </p>
            <span className={`mb-1 flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold tabular ${up ? 'bg-up/15 text-up' : 'bg-down/15 text-down'}`}>
              {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
              {formatPct(m?.change24h ?? 0)}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-content-faint">
            24h change · updated {lastUpdated ? timeAgo(lastUpdated) : 'recently'}
          </p>
        </div>

        {/* chart */}
        <div className="mt-4 rounded-2xl border border-hairline bg-surface p-4 shadow-card">
          <div className="flex items-center gap-2">
            <Segmented
              options={(['1H', '24H', '7D', '1M', '1Y'] as const).map((p) => ({ value: p, label: p }))}
              value={period}
              onChange={setPeriod}
              className="flex-1"
            />
            <div className="flex rounded-xl border border-hairline bg-elevate p-0.5">
              <button
                onClick={() => setView('line')}
                aria-label="Line chart"
                className={`press flex h-8 w-9 items-center justify-center rounded-lg transition ${view === 'line' ? 'bg-surface text-brand shadow-sm' : 'text-content-faint'}`}
              >
                <ChartLine size={16} />
              </button>
              <button
                onClick={() => setView('candles')}
                aria-label="Candlestick chart"
                className={`press flex h-8 w-9 items-center justify-center rounded-lg transition ${view === 'candles' ? 'bg-surface text-brand shadow-sm' : 'text-content-faint'}`}
              >
                <ChartCandlestick size={16} />
              </button>
            </div>
          </div>
          <div className="mt-4">
            {view === 'line' ? (
              chart ? (
                <AreaChart
                  data={chart}
                  height={200}
                  color={up ? '#169E64' : '#D23E3E'}
                  valueFormat={(v) => formatUsd(v, { decimals: v < 1 ? 4 : 2 })}
                />
              ) : (
                <div className="h-[200px] animate-pulse rounded-xl bg-fill/5" />
              )
            ) : chart ? (
              <CandlestickChart
                candles={candles}
                height={200}
                valueFormat={(v) => formatUsd(v, { decimals: v < 1 ? 4 : 2 })}
              />
            ) : (
              <div className="h-[200px] animate-pulse rounded-xl bg-fill/5" />
            )}
          </div>
          <p className="mt-2 text-center text-2xs text-content-faint">
            {view === 'candles' ? `${candles.length} candles · OHLC + volume` : 'Price · line view'}
          </p>
        </div>

        {/* stats */}
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-hairline bg-surface px-3.5 py-3">
              <p className="text-2xs font-semibold uppercase tracking-wider text-content-faint">{s.label}</p>
              <p className="mt-1 font-display text-base font-semibold tabular text-content">{s.value}</p>
            </div>
          ))}
        </div>

        {/* holdings */}
        <div className="mt-4 rounded-2xl border border-hairline bg-surface p-4 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xs font-semibold uppercase tracking-wider text-content-faint">Your {meta.symbol}</p>
              <p className="mt-1 font-display text-xl font-bold tabular text-content">{formatCoin(balance, coinId)}</p>
              <p className="mt-0.5 text-xs tabular text-content-faint">{cur.fmt(balanceUsd)}</p>
            </div>
            <CoinIcon coin={coinId} size={46} />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Button size="sm" variant="ghost" onClick={() => nav(`/send?asset=${coinId}`)}>
              <Send size={15} /> Send
            </Button>
            <Button size="sm" variant="ghost" onClick={() => nav(`/receive/${coinId}`)}>
              <Download size={15} /> Receive
            </Button>
            <Button size="sm" variant="ghost" onClick={() => nav(`/swap?from=${coinId}`)}>
              <RefreshCcw size={15} /> Swap
            </Button>
          </div>
        </div>

        {/* buy */}
        <div className="mt-4">
          <Button block size="lg" onClick={() => nav(`/buy?asset=${coinId}`)}>
            Buy {meta.symbol}
          </Button>
        </div>

        {/* about */}
        <div className="mt-4 rounded-2xl border border-hairline bg-surface p-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-content">
            <Info size={15} className="text-brand" /> About {meta.name}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-content-mute">
            {aboutBlurb(coinId)}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="chip">Chain: {meta.chain}</span>
            <span className="chip">Decimals: {meta.decimals}</span>
            {meta.stable ? <span className="chip !text-up">Stablecoin</span> : <span className="chip">Volatile</span>}
          </div>
        </div>

        {/* history */}
        <div className="mt-5 flex items-center justify-between px-1">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-content-mute">
            <BadgeCheck size={15} className="text-brand" /> {meta.symbol} activity
          </h2>
        </div>
        <div className="mt-1 rounded-2xl border border-hairline bg-surface px-3 py-1">
          {assetTxs.length === 0 && (
            <p className="py-8 text-center text-sm text-content-faint">No {meta.symbol} transactions yet.</p>
          )}
          {assetTxs.slice(0, 8).map((tx) => (
            <TxRow key={tx.id} tx={tx} compact onClick={() => nav('/activity')} />
          ))}
        </div>
      </div>
    </div>
  )
}

function aboutBlurb(coinId: CoinId): string {
  const blurbs: Record<string, string> = {
    bitcoin: 'Bitcoin is the first decentralized digital currency, created in 2009. It runs on a proof-of-work ledger and is widely regarded as digital gold — a store of value outside the reach of any central authority.',
    ethereum: 'Ethereum is a decentralized platform that runs smart contracts and is the home of most DeFi applications. Its transition to proof-of-stake cut energy use by over 99%.',
    solana: 'Solana is a high-performance blockchain built for speed, capable of processing thousands of transactions per second with sub-second finality and near-zero fees.',
    tether: 'Tether is a stablecoin pegged 1:1 to the US dollar, providing a stable bridge between fiat and crypto markets. Each USDT is backed by reserves.',
    'usd-coin': 'USD Coin is a fully reserved stablecoin pegged to the US dollar, issued by Circle. It brings the stability of fiat to the speed of blockchains.',
    binancecoin: 'BNB is the native token of the BNB Chain ecosystem, used for transaction fees, staking, and powering the world’s largest exchange network.',
    cardano: 'Cardano is a proof-of-stake blockchain known for its rigorous, peer-reviewed development and focus on scalability and sustainability.',
    xrp: 'XRP powers the XRP Ledger, designed for fast, low-cost cross-border payments and settlement in seconds.',
    dogecoin: 'Dogecoin started as a joke in 2013 and became one of the most traded meme coins, known for its active community and fast block times.',
    polkadot: 'Polkadot connects multiple specialized blockchains into one unified network, enabling cross-chain communication and shared security.',
    chainlink: 'Chainlink is the leading decentralized oracle network, feeding trusted, tamper-proof data into smart contracts across every major blockchain.',
    'avalanche-2': 'Avalanche is an ultra-fast smart contract platform with near-instant finality, featuring three interoperable subnets.',
    litecoin: 'Litecoin is a peer-to-peer currency inspired by Bitcoin, designed for faster block times and cheaper transactions — the "silver" to Bitcoin\'s gold.',
    'shiba-inu': 'Shiba Inu is an Ethereum-based meme token that grew a large ecosystem including its own DEX, ShibaSwap.',
    near: 'NEAR is a user-friendly, sharded proof-of-stake blockchain designed to onboard the next billion users with human-readable accounts.',
    'polygon-ecosystem-token': 'Polygon brings Ethereum-compatible scaling to the mainstream, with fast and low-cost transactions via its aggregated network.',
  }
  return blurbs[coinId] ?? `${COIN_MAP[coinId].name} is a digital asset tradable through Crypton. Prices shown are indicative mock rates.`
}
