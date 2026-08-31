import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowDown, ArrowLeftRight, ChevronDown, Info } from 'lucide-react'
import { useApp } from '@/store/app'
import { usePriceFeed } from '@/lib/priceFeed'
import { useCurrency } from '@/lib/currency'
import { COIN_CATALOG, COIN_MAP } from '@/data/coins'
import { CoinIcon } from '@/components/CoinIcon'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { AmountInput } from '@/components/ui/Input'
import { Sheet } from '@/components/ui/Sheet'
import { PinConfirm, Success } from '@/features/send/Send'
import { swapPreview } from '@/lib/mockApi'
import { formatCoin, formatUsd } from '@/lib/format'
import type { CoinId } from '@/types'

type Step = 'form' | 'pin' | 'success'

export function Swap() {
  const [params] = useSearchParams()
  const nav = useNavigate()
  const wallet = useApp((s) => s.wallet)
  const user = useApp((s) => s.user)
  const swap = useApp((s) => s.swap)
  const toast = useApp((s) => s.toast)
  const markets = usePriceFeed((s) => s.markets)
  const spreadPct = useApp((s) => s.spreadPct)
  const cur = useCurrency()

  const held = useMemo(
    () => (Object.entries(wallet?.balances ?? {}) as Array<[CoinId, number]>).filter(([, a]) => a > 0).map(([id]) => id),
    [wallet],
  )
  const visible = COIN_CATALOG.map((c) => c.id)

  const [step, setStep] = useState<Step>('form')
  const [from, setFrom] = useState<CoinId>(() => {
    const p = params.get('from')
    return p && COIN_MAP[p as CoinId] ? (p as CoinId) : (held[0] ?? 'bitcoin')
  })
  const [to, setTo] = useState<CoinId>(from === 'tether' || from === 'usd-coin' ? 'bitcoin' : 'tether')
  const [amount, setAmount] = useState('')
  const [picker, setPicker] = useState<'from' | 'to' | null>(null)
  const [slippage, setSlippage] = useState(0.5)
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ received: number; from: CoinId; to: CoinId; amount: number } | null>(null)

  const amt = parseFloat(amount) || 0
  const balance = wallet?.balances[from] ?? 0
  const pFrom = markets[from]?.price ?? 0
  const pTo = markets[to]?.price ?? 0
  const preview = swapPreview(from, to, amt)
  const priceFrom = markets[from]?.change24h ?? 0
  const priceTo = markets[to]?.change24h ?? 0

  const flip = () => {
    setFrom(to)
    setTo(from)
  }

  const pick = (id: CoinId) => {
    if (picker === 'from') {
      if (id === to) setTo(from)
      setFrom(id)
    } else {
      if (id === from) setFrom(to)
      setTo(id)
    }
    setPicker(null)
  }

  const runSwap = async () => {
    if (pin.length < (user?.pinLen ?? 6)) return
    setBusy(true)
    try {
      await swap({ from, to, amount: amt })
      setResult({ received: preview.received, from, to, amount: amt })
      toast({ kind: 'success', title: `Swapped ${formatCoin(amt, from)}`, desc: `Received ${formatCoin(preview.received, to)}` })
      setStep('success')
    } catch (e) {
      setErr((e as Error).message)
      setPin('')
    } finally {
      setBusy(false)
    }
  }

  const goPin = () => {
    if (!amt || amt <= 0) {
      setErr('Enter an amount to swap.')
      return
    }
    if (amt > balance) {
      setErr(`Insufficient ${COIN_MAP[from].symbol} balance.`)
      return
    }
    setErr('')
    setPin('')
    setStep('pin')
  }

  if (step === 'success' && result) {
    return (
      <Success
        title={`${formatCoin(result.amount, result.from)} → ${formatCoin(result.received, result.to)}`}
        desc={`Instant swap complete at ${formatUsd(pTo)}/${COIN_MAP[result.to].symbol}. ${formatCoin(result.received, result.to)} is now in your wallet.`}
        onDone={() => nav('/dashboard')}
        onView={() => nav('/activity')}
      />
    )
  }

  return (
    <div className="pb-10">
      <PageHeader back={step === 'pin'} title={step === 'pin' ? 'Confirm swap' : 'Swap'} sub="Instant, low-slippage exchanges" />

      {step === 'form' && (
        <div className="animate-rise-in px-4 pt-5">
          <div className="rounded-3xl border border-hairline bg-surface p-5 shadow-card">
            {/* from */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xs font-semibold uppercase tracking-wider text-content-faint">You pay</p>
                <button onClick={() => setPicker('from')} className="mt-2 flex items-center gap-2 rounded-2xl border border-hairline bg-elevate px-3 py-2">
                  <CoinIcon coin={from} size={24} />
                  <span className="text-sm font-bold text-content">{COIN_MAP[from].symbol}</span>
                  <ChevronDown size={14} className="text-content-faint" />
                </button>
              </div>
              <div className="flex-1 pl-4">
                <AmountInput value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0.00" className="!text-right" />
                <p className="mt-1 text-right text-xs tabular text-content-faint">≈ {cur.fmt(amt * pFrom)}</p>
              </div>
            </div>
            <button
              onClick={() => setAmount(String(balance))}
              className="mt-1 rounded-lg bg-fill/5 px-2 py-1 text-[10px] font-bold text-content-mute"
            >
              MAX {formatCoin(balance, from)}
            </button>

            {/* flip */}
            <div className="relative my-4 h-px bg-hairline">
              <button onClick={flip} className="press absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-hairline bg-elevate p-2.5 text-brand">
                <ArrowLeftRight size={16} />
              </button>
            </div>

            {/* to */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xs font-semibold uppercase tracking-wider text-content-faint">You receive</p>
                <button onClick={() => setPicker('to')} className="mt-2 flex items-center gap-2 rounded-2xl border border-hairline bg-elevate px-3 py-2">
                  <CoinIcon coin={to} size={24} />
                  <span className="text-sm font-bold text-content">{COIN_MAP[to].symbol}</span>
                  <ChevronDown size={14} className="text-content-faint" />
                </button>
              </div>
              <p className="flex-1 text-right font-display text-2xl font-semibold tabular text-content">
                {amt > 0 ? formatCoin(preview.received, to, { compact: true }) : '0'}
              </p>
            </div>
          </div>

          {/* rate */}
          <div className="mt-4 rounded-2xl border border-hairline bg-surface px-4 py-3.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-content-faint">Rate</span>
              <span className="font-semibold tabular text-content">
                1 {COIN_MAP[from].symbol} = {formatCoin(preview.rate, to, { compact: true })}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-content-faint">Includes spread</span>
              <span className="tabular text-content-mute">{spreadPct.toFixed(2)}%</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-content-faint">Price impact</span>
              <span className="tabular text-content-mute">0.02%</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-content-faint">24h change</span>
              <span className="tabular"><span className={priceFrom >= 0 ? 'text-up' : 'text-down'}>{COIN_MAP[from].symbol} {priceFrom >= 0 ? '+' : ''}{priceFrom.toFixed(2)}%</span>
                <span className="mx-1 text-content-faint">/</span>
                <span className={priceTo >= 0 ? 'text-up' : 'text-down'}>{COIN_MAP[to].symbol} {priceTo >= 0 ? '+' : ''}{priceTo.toFixed(2)}%</span>
              </span>
            </div>
          </div>

          {/* slippage */}
          <div className="mt-4">
            <p className="flex items-center gap-1.5 px-0.5 text-2xs font-semibold uppercase tracking-wider text-content-faint">
              Slippage tolerance <Info size={12} className="text-content-faint" />
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {[0.1, 0.5, 1].map((s) => (
                <button
                  key={s}
                  onClick={() => setSlippage(s)}
                  className={`rounded-2xl border py-2.5 text-sm font-semibold tabular ${slippage === s ? 'border-brand/50 bg-brand/10 text-brand' : 'border-hairline bg-surface text-content-mute'}`}
                >
                  {s}%
                </button>
              ))}
            </div>
          </div>

          {err && <p className="mt-4 rounded-xl bg-down/10 px-3.5 py-2.5 text-xs text-down">{err}</p>}

          <Button block size="xl" className="mt-6" onClick={goPin} disabled={amt <= 0}>
            Review swap
          </Button>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-2xs text-content-faint">
            <ArrowDown size={12} /> Rates update in real time from global market data
          </p>
        </div>
      )}

      {step === 'pin' && (
        <PinConfirm
          title="Confirm swap"
          sub={`Swap ${formatCoin(amt, from)} → ${formatCoin(preview.received, to)}`}
          pin={pin}
          setPin={setPin}
          error={!!err}
          errorMsg={err}
          busy={busy}
          pinLen={user?.pinLen ?? 6}
          onSubmit={runSwap}
        />
      )}

      <Sheet open={picker !== null} onClose={() => setPicker(null)} title={picker === 'from' ? 'You pay' : 'You receive'}>
        <div className="divide-y divide-hairline">
          {(picker === 'from' ? held : visible).map((id) => {
            const c = COIN_MAP[id]
            const bal = wallet?.balances[id] ?? 0
            return (
              <button key={id} onClick={() => pick(id)} className="flex w-full items-center gap-3 py-3">
                <CoinIcon coin={id} size={32} />
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-content">{c.symbol}</p>
                  <p className="text-xs text-content-faint">{c.name}</p>
                </div>
                {picker === 'from' && <p className="text-xs tabular text-content-mute">{formatCoin(bal, id)}</p>}
              </button>
            )
          })}
        </div>
      </Sheet>
    </div>
  )
}
