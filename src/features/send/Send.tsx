import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, ChevronDown, ClipboardPaste, Info, ShieldCheck, Zap, Rocket, Timer } from 'lucide-react'
import { useApp } from '@/store/app'
import { usePriceFeed } from '@/lib/priceFeed'
import { useCurrency } from '@/lib/currency'
import { COIN_MAP } from '@/data/coins'
import { CoinIcon } from '@/components/CoinIcon'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { AmountInput, Field, PinDots, TextInput } from '@/components/ui/Input'
import { Sheet } from '@/components/ui/Sheet'
import { PinPad } from '@/features/auth/PinPad'
import { formatCoin, shortAddr } from '@/lib/format'
import type { CoinId } from '@/types'

type Step = 'form' | 'review' | 'pin' | 'success'
type FeeTier = 'low' | 'standard' | 'fast'

interface FeeOption {
  id: FeeTier
  label: string
  icon: React.ComponentType<{ size?: number | string }>
  eta: string
  mult: number
  note: string
}

const FEES: FeeOption[] = [
  { id: 'low', label: 'Low', icon: Timer, eta: '~30 min', mult: 0.0004, note: 'Save on fees, wait a little longer' },
  { id: 'standard', label: 'Standard', icon: Rocket, eta: '~10 min', mult: 0.0009, note: 'Best balance of speed and cost' },
  { id: 'fast', label: 'Fast', icon: Zap, eta: '~2 min', mult: 0.0018, note: 'Priority confirmation, pays a premium' },
]

export function Send() {
  const [params] = useSearchParams()
  const initial = params.get('asset') as CoinId | null
  const nav = useNavigate()
  const wallet = useApp((s) => s.wallet)
  const user = useApp((s) => s.user)
  const send = useApp((s) => s.send)
  const toast = useApp((s) => s.toast)
  const markets = usePriceFeed((s) => s.markets)
  const cur = useCurrency()

  const held = useMemo(
    () => (Object.entries(wallet?.balances ?? {}) as Array<[CoinId, number]>).filter(([, a]) => a > 0).map(([id]) => id),
    [wallet],
  )

  const [step, setStep] = useState<Step>('form')
  const [asset, setAsset] = useState<CoinId>(initial && held.includes(initial) ? initial : (held[0] ?? 'bitcoin'))
  const [amount, setAmount] = useState('')
  const [address, setAddress] = useState('')
  const [feeTier, setFeeTier] = useState<FeeTier>('standard')
  const [showCoins, setShowCoins] = useState(false)
  const [err, setErr] = useState('')
  const [pin, setPin] = useState('')
  const [pinErr, setPinErr] = useState(false)
  const [busy, setBusy] = useState(false)
  const [txId, setTxId] = useState('')

  const meta = COIN_MAP[asset]
  const price = markets[asset]?.price ?? 0
  const amt = parseFloat(amount) || 0
  const balance = wallet?.balances[asset] ?? 0
  const fee = meta.stable ? 0.5 : amt * FEES.find((f) => f.id === feeTier)!.mult
  const total = amt + fee

  const setMax = () => {
    const mult = FEES.find((f) => f.id === feeTier)!.mult
    const usable = meta.stable ? Math.max(0, balance - 0.5) : Math.max(0, balance / (1 + mult))
    setAmount(usable > 0 ? usable.toFixed(Math.min(meta.decimals, 6)) : '0')
  }

  const openCoin = (id: CoinId) => {
    setAsset(id)
    setShowCoins(false)
    setErr('')
  }

  const validate = () => {
    if (!amt || amt <= 0) return 'Enter an amount to send.'
    if (amt > balance) return `Insufficient ${meta.symbol} balance.`
    if (total > balance) return `Balance too low to cover the network fee (${formatCoin(fee, asset)}).`
    if (address.trim().length < 12) return 'Enter a valid recipient address.'
    return ''
  }

  const goReview = () => {
    const e = validate()
    if (e) {
      setErr(e)
      return
    }
    setErr('')
    setStep('review')
  }

  const confirm = async () => {
    if (pin.length < (user?.pinLen ?? 6)) return
    setBusy(true)
    try {
      const tx = await send({ asset, amount: amt, address: address.trim(), feeTier })
      setTxId(tx.id)
      setStep('success')
      toast({ kind: 'success', title: `Sent ${formatCoin(amt, asset)}`, desc: `Network fee ${formatCoin(fee, asset)} was deducted.` })
    } catch (e) {
      setPinErr(true)
      setPin('')
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="pb-10">
      <PageHeader back title="Send crypto" sub={step === 'success' ? 'Transaction complete' : 'Transfer to any wallet'} />

      {step === 'form' && (
        <div className="animate-rise-in px-4 pt-5">
          {/* asset */}
          <Field label="Asset">
            <button onClick={() => setShowCoins(true)} className="flex w-full items-center gap-3 rounded-2xl border border-hairline bg-surface px-4 py-3.5">
              <CoinIcon coin={asset} size={30} />
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-content">{meta.symbol}</p>
                <p className="text-xs text-content-faint">Balance {formatCoin(balance, asset)}</p>
              </div>
              <ChevronDown size={18} className="text-content-faint" />
            </button>
          </Field>

          {/* amount */}
          <div className="mt-4">
            <Field label="Amount" right={
              <button onClick={setMax} className="text-xs font-bold text-brand">MAX</button>
            }>
              <div className="relative">
                <AmountInput
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                  placeholder="0.00"
                  inputMode="decimal"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-2xs font-bold uppercase tracking-wider text-content-faint">{meta.symbol}</span>
              </div>
            </Field>
            <p className="mt-1.5 px-0.5 text-xs tabular text-content-faint">
              ≈ {cur.fmt(amt * price)} · fee {formatCoin(fee, asset)}
            </p>
          </div>

          {/* address */}
          <div className="mt-4">
            <Field label="Recipient address">
              <div className="relative">
                <TextInput
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={`${meta.chain} address`}
                  className="pr-12 font-mono text-xs"
                />
                <button
                  onClick={() => void navigator.clipboard?.readText().then(setAddress).catch(() => {})}
                  className="press absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-content-mute"
                  title="Paste"
                >
                  <ClipboardPaste size={16} />
                </button>
              </div>
            </Field>
          </div>

          {/* fee */}
          <div className="mt-5">
            <p className="px-0.5 text-2xs font-semibold uppercase tracking-wider text-content-faint">Network fee</p>
            <div className="mt-2 space-y-2">
              {FEES.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFeeTier(f.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${feeTier === f.id ? 'border-brand/50 bg-brand/10' : 'border-hairline bg-surface'}`}
                >
                  <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${feeTier === f.id ? 'bg-brand/20 text-brand' : 'bg-fill/5 text-content-faint'}`}>
                    <f.icon size={16} />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-content">{f.label}</p>
                    <p className="text-xs text-content-faint">{f.note}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold tabular text-content">{formatCoin(meta.stable ? 0.5 : amt * f.mult, asset)}</p>
                    <p className="text-[10px] text-content-faint">{f.eta}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {err && <p className="mt-4 rounded-xl bg-down/10 px-3.5 py-2.5 text-xs text-down">{err}</p>}

          <Button block size="xl" className="mt-6" onClick={goReview}>
            Continue
          </Button>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-2xs text-content-faint">
            <ShieldCheck size={13} className="text-up" /> Your transfer is encrypted end-to-end
          </p>
        </div>
      )}

      {step === 'review' && (
        <div className="animate-rise-in px-4 pt-5">
          <div className="rounded-3xl border border-hairline bg-surface p-5 text-center">
            <p className="text-2xs font-semibold uppercase tracking-wider text-content-faint">You are sending</p>
            <p className="mt-2 font-display text-4xl font-bold tabular text-content">{formatCoin(amt, asset)}</p>
            <p className="mt-1 text-sm tabular text-content-faint">≈ {cur.fmt(amt * price)}</p>
            <div className="mx-auto mt-4 h-px w-full bg-hairline" />
            <dl className="mt-4 space-y-2.5 text-left text-sm">
              <Row label="To"><span className="font-mono text-xs">{shortAddr(address, 8)}</span></Row>
              <Row label="Network"><span>{meta.chain}</span></Row>
              <Row label="Fee tier"><span className="capitalize">{feeTier}</span></Row>
              <Row label="Network fee"><span className="tabular">{formatCoin(fee, asset)}</span></Row>
              <Row label="Total deducted"><span className="tabular font-semibold text-content">{formatCoin(total, asset)}</span></Row>
            </dl>
            <p className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-warn/10 px-3 py-2 text-xs text-warn">
              <Info size={13} /> This action cannot be undone. Double-check the address.
            </p>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <Button variant="ghost" size="lg" onClick={() => setStep('form')}>Edit</Button>
            <Button size="lg" onClick={() => { setErr(''); setPin(''); setStep('pin') }}>Confirm</Button>
          </div>
        </div>
      )}

      {step === 'pin' && (
        <PinConfirm
          title="Confirm with PIN"
          sub={`Send ${formatCoin(amt, asset)} to ${shortAddr(address, 6)}`}
          pin={pin}
          setPin={setPin}
          error={pinErr || !!err}
          errorMsg={err}
          busy={busy}
          pinLen={user?.pinLen ?? 6}
          onSubmit={confirm}
        />
      )}

      {step === 'success' && (
        <Success
          title={`${formatCoin(amt, asset)} sent`}
          desc={`Arriving on the ${meta.chain} network in ${FEES.find((f) => f.id === feeTier)!.eta}. Reference ${txId.slice(-8).toUpperCase()}.`}
          onDone={() => nav('/dashboard')}
          onView={() => nav('/activity')}
        />
      )}

      <Sheet open={showCoins} onClose={() => setShowCoins(false)} title="Select asset">
        <div className="divide-y divide-hairline">
          {held.map((id) => {
            const c = COIN_MAP[id]
            return (
              <button key={id} onClick={() => openCoin(id)} className="flex w-full items-center gap-3 py-3">
                <CoinIcon coin={id} size={32} />
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-content">{c.symbol}</p>
                  <p className="text-xs text-content-faint">{c.name}</p>
                </div>
                <p className="text-xs tabular text-content-mute">{formatCoin(wallet?.balances[id] ?? 0, id)}</p>
              </button>
            )
          })}
        </div>
      </Sheet>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-content-faint">{label}</dt>
      <dd className="truncate text-content">{children}</dd>
    </div>
  )
}

export function PinConfirm({
  title, sub, pin, setPin, error, errorMsg, busy, onSubmit, pinLen = 6,
}: {
  title: string
  sub: string
  pin: string
  setPin: (s: string) => void
  error: boolean
  errorMsg: string
  busy: boolean
  onSubmit: () => void
  pinLen?: number
}) {
  useEffect(() => {
    if (pin.length === pinLen && !busy) {
      const t = setTimeout(onSubmit, 140)
      return () => clearTimeout(t)
    }
  }, [pin, pinLen, busy, onSubmit])

  return (
    <div className="flex flex-col items-center px-6 pt-8 animate-rise-in">
      <h2 className="font-display text-xl font-bold text-content">{title}</h2>
      <p className="mt-1 text-sm text-content-faint">{sub}</p>
      <div className="mt-8">
        <PinDots value={pin} length={pinLen} error={error} />
      </div>
      {errorMsg && <p className="mt-4 text-sm text-down">{errorMsg}</p>}
      <div className="mt-8">
        <PinPad
          onDigit={(d) => pin.length < pinLen && setPin(pin + d)}
          onDelete={() => setPin(pin.slice(0, -1))}
        />
      </div>
      {busy && <p className="mt-6 text-xs text-content-faint">Broadcasting…</p>}
    </div>
  )
}

export function Success({ title, desc, onDone, onView }: { title: string; desc: string; onDone: () => void; onView: () => void }) {
  return (
    <div className="flex flex-col items-center px-6 pt-16 text-center animate-rise-in">
      <div className="relative">
        <div className="absolute -inset-6 rounded-full bg-up/20 blur-2xl" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-up/40 bg-up/15">
          <CheckCircle2 size={40} className="text-up" />
        </div>
      </div>
      <h2 className="mt-6 font-display text-2xl font-bold text-content">{title}</h2>
      <p className="mt-2 max-w-[300px] text-sm leading-relaxed text-content-faint">{desc}</p>
      <div className="mt-10 w-full space-y-3">
        <Button block size="xl" onClick={onDone}>Back to wallet</Button>
        <Button block size="lg" variant="ghost" onClick={onView}>View activity</Button>
      </div>
    </div>
  )
}
