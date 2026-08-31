import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronDown, Gift, Landmark, Lock, ShieldCheck, Sparkles } from 'lucide-react'
import { useApp } from '@/store/app'
import { usePriceFeed } from '@/lib/priceFeed'
import { useCurrency } from '@/lib/currency'
import { COIN_CATALOG, COIN_MAP } from '@/data/coins'
import { CoinIcon } from '@/components/CoinIcon'
import { BrandMark, cardBrandOf } from '@/components/CardBrand'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { AmountInput, Field, TextInput } from '@/components/ui/Input'
import { Sheet } from '@/components/ui/Sheet'
import { Success } from '@/features/send/Send'
import { formatCoin } from '@/lib/format'
import { MARITIME_DEMO_CARD, formatCardNumber, formatExpiry, maritimeCharge } from '@/lib/maritime'
import type { CoinId } from '@/types'

type Step = 'form' | 'checkout' | 'success'

const BRAND_LABEL: Record<string, string> = { visa: 'Visa', mastercard: 'Mastercard' }

export function Buy() {
  const [params] = useSearchParams()
  const nav = useNavigate()
  const buyCard = useApp((s) => s.buyCard)
  const toast = useApp((s) => s.toast)
  const markets = usePriceFeed((s) => s.markets)
  const cur = useCurrency()

  const [coin, setCoin] = useState<CoinId>(() => {
    const p = params.get('asset')
    return p && COIN_MAP[p as CoinId] ? (p as CoinId) : 'bitcoin'
  })
  const [amount, setAmount] = useState('')
  const [showCoins, setShowCoins] = useState(false)
  const [step, setStep] = useState<Step>('form')
  const [cardNo, setCardNo] = useState('')
  const [cardExp, setCardExp] = useState('')
  const [cardCvv, setCardCvv] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [paidBy, setPaidBy] = useState('')

  const amt = parseFloat(amount) || 0
  const price = markets[coin]?.price ?? 0
  const meta = COIN_MAP[coin]
  const bonus = meta.stable ? 0 : amt > 1000 ? 0.02 : amt > 0 ? 0.01 : 0
  const coinGain = price > 0 ? (amt / price) * (1 + bonus) : 0
  const fee = 0.99
  const totalFiat = amt + fee
  const brand = cardBrandOf(cardNo)

  const goCheckout = () => {
    if (!amt || amt <= 0) return setErr('Enter an amount to buy.')
    setErr('')
    setStep('checkout')
  }

  const fillDemoCard = () => {
    setCardNo(MARITIME_DEMO_CARD.number)
    setCardExp(MARITIME_DEMO_CARD.expiry)
    setCardCvv(MARITIME_DEMO_CARD.cvv)
    setErr('')
  }

  const doCardBuy = async () => {
    const num = cardNo.replace(/\s/g, '')
    if (num.length < 15) return setErr('Enter a valid card number.')
    if (!/^\d{2}\/\d{2}$/.test(cardExp.trim())) return setErr('Enter a valid expiry (MM/YY).')
    if (!/^\d{3,4}$/.test(cardCvv.trim())) return setErr('Enter a valid CVV.')
    setBusy(true)
    setErr('')
    try {
      const charge = await maritimeCharge(totalFiat, { number: num, expiry: cardExp.trim(), cvv: cardCvv.trim() })
      await buyCard({ asset: coin, fiatAmount: amt, last4: charge.last4 })
      const label = BRAND_LABEL[brand ?? ''] ?? 'Maritime'
      setPaidBy(`${label} •••• ${charge.last4}`)
      toast({
        kind: 'success',
        title: `Bought ${formatCoin(coinGain, coin)}`,
        desc: `${cur.fmt(totalFiat)} charged to ${label} •••• ${charge.last4}.`,
      })
      setStep('success')
    } catch (e) {
      setErr((e as Error).message)
      setCardCvv('')
    } finally {
      setBusy(false)
    }
  }

  if (step === 'success') {
    return (
      <Success
        title={`${cur.fmt(amt)} of ${meta.symbol}`}
        desc={
          paidBy
            ? `${formatCoin(coinGain, coin)} purchased instantly — paid with ${paidBy}. Check your wallet for the new balance.`
            : `${formatCoin(coinGain, coin)} purchased instantly. Check your wallet for the new balance.`
        }
        onDone={() => nav('/dashboard')}
        onView={() => nav('/activity')}
      />
    )
  }

  return (
    <div className="pb-10">
      <PageHeader
        back={step === 'checkout'}
        title={step === 'checkout' ? 'Card checkout' : 'Buy crypto'}
        sub={step === 'checkout' ? 'Secure payment' : 'Pay with your Maritime Bank card'}
      />

      {step === 'form' && (
        <div className="animate-rise-in px-4 pt-5">
          {/* amount */}
          <div>
            <p className="px-0.5 text-2xs font-semibold uppercase tracking-wider text-content-faint">How much do you want to spend?</p>
            <div className="relative mt-2">
              <AmountInput value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0.00" inputMode="decimal" autoFocus />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-content-mute">{cur.code}</span>
            </div>
            <div className="mt-2 flex gap-2">
              {[50, 100, 250, 500].map((v) => (
                <button key={v} onClick={() => setAmount(String(v))} className="flex-1 rounded-xl border border-hairline bg-surface py-2 text-xs font-semibold tabular text-content-mute">
                  {cur.fmt(v, true)}
                </button>
              ))}
            </div>
          </div>

          {/* asset picker */}
          <div className="mt-5 rounded-2xl border border-hairline bg-surface p-4">
            <button onClick={() => setShowCoins(true)} className="flex w-full items-center gap-3">
              <CoinIcon coin={coin} size={34} />
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-content">{meta.name}</p>
                <p className="text-xs tabular text-content-faint">1 {meta.symbol} = {cur.fmt(price)}</p>
              </div>
              <ChevronDown size={18} className="text-content-faint" />
            </button>
            <div className="mt-3 border-t border-hairline pt-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-content-faint">You receive</span>
                <span className="font-display text-lg font-semibold tabular text-content">{amt > 0 ? formatCoin(coinGain, coin) : '—'}</span>
              </div>
              {bonus > 0 && amt > 0 && (
                <div className="mt-2 flex items-center justify-between rounded-xl bg-up/10 px-3 py-2 text-xs">
                  <span className="flex items-center gap-1.5 text-up"><Gift size={13} /> Instant bonus</span>
                  <span className="font-semibold text-up">+{(bonus * 100).toFixed(0)}%</span>
                </div>
              )}
              <div className="mt-2 flex items-center justify-between text-xs text-content-faint">
                <span>Network fee</span>
                <span className="tabular">{cur.fmt(fee)}</span>
              </div>
            </div>
          </div>

          {err && <p className="mt-4 rounded-xl bg-down/10 px-3.5 py-2.5 text-xs text-down">{err}</p>}

          <Button block size="xl" className="mt-6" onClick={goCheckout} disabled={amt <= 0}>
            Continue to checkout
          </Button>
        </div>
      )}

      {step === 'checkout' && (
        <div className="animate-rise-in px-4 pt-5">
          {/* Maritime-only notice */}
          <div className="flex items-center gap-3 rounded-2xl border border-brand/30 bg-brand/10 px-4 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/20 text-brand">
              <Landmark size={18} />
            </span>
            <div>
              <p className="text-sm font-bold text-brand">Maritime Bank only</p>
              <p className="text-xs text-content-faint">We only accept Maritime Bank credit cards for now.</p>
            </div>
          </div>

          {/* payment summary */}
          <div className="mt-4 rounded-2xl border border-hairline bg-surface px-4 py-3.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-content-faint">You receive</span>
              <span className="font-display text-lg font-semibold tabular text-content">{formatCoin(coinGain, coin)}</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-xs text-content-faint">
              <span>Amount</span>
              <span className="tabular">{cur.fmt(amt)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-content-faint">
              <span>Network fee</span>
              <span className="tabular">{cur.fmt(fee)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-hairline pt-2 text-sm">
              <span className="font-semibold text-content">Total charge</span>
              <span className="font-display text-lg font-bold tabular text-content">{cur.fmt(totalFiat)}</span>
            </div>
          </div>

          {/* card form */}
          <div className="mt-4 rounded-2xl border border-hairline bg-surface p-4">
            <Field label="Card number">
              <div className="relative">
                <TextInput
                  inputMode="numeric"
                  placeholder="4111 1111 1111 1111"
                  value={cardNo}
                  onChange={(e) => setCardNo(formatCardNumber(e.target.value))}
                  className="pr-14 font-mono text-sm"
                  autoComplete="cc-number"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                  <BrandMark brand={brand} className="h-3.5 w-auto text-content-mute" />
                </span>
              </div>
            </Field>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="Expiry">
                <TextInput
                  inputMode="numeric"
                  placeholder="MM/YY"
                  value={cardExp}
                  onChange={(e) => setCardExp(formatExpiry(e.target.value))}
                  className="font-mono text-sm"
                  autoComplete="cc-exp"
                />
              </Field>
              <Field label="CVV">
                <div className="relative">
                  <TextInput
                    inputMode="numeric"
                    placeholder="123"
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="pr-8 font-mono text-sm"
                    autoComplete="cc-csc"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-content-faint">
                    <Lock size={13} />
                  </span>
                </div>
              </Field>
            </div>

            <button onClick={fillDemoCard} className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand/10 px-3 py-2.5 text-xs font-bold text-brand">
              <Sparkles size={13} /> Autofill card details
            </button>

            {err && <p className="mt-3 rounded-xl bg-down/10 px-3.5 py-2.5 text-xs text-down">{err}</p>}

            <Button block size="xl" className="mt-4" onClick={() => void doCardBuy()} disabled={!amt} loading={busy}>
              {busy ? 'Charging card…' : `Pay ${cur.fmt(totalFiat)}`}
            </Button>
            <p className="mt-3 flex items-center justify-center gap-1 text-center text-2xs text-content-faint">
              <ShieldCheck size={12} /> Processed by Maritime Trust Bank
            </p>
          </div>
        </div>
      )}

      <Sheet open={showCoins} onClose={() => setShowCoins(false)} title="Buy asset">
        <div className="divide-y divide-hairline">
          {COIN_CATALOG.map((c) => (
            <button key={c.id} onClick={() => { setCoin(c.id); setShowCoins(false) }} className="flex w-full items-center gap-3 py-3">
              <CoinIcon coin={c.id} size={32} />
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-content">{c.symbol}</p>
                <p className="text-xs text-content-faint">{c.name}</p>
              </div>
              <p className="text-xs tabular text-content-mute">{cur.fmt(markets[c.id]?.price ?? 0)}</p>
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  )
}
