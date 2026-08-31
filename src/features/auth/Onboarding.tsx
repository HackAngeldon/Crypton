import { useEffect, useMemo, useState } from 'react'
import { ShieldCheck, ArrowLeft } from 'lucide-react'
import { useApp } from '@/store/app'
import { api } from '@/lib/mockApi'
import { LogoMark, Wordmark } from '@/components/ui/Logo'
import { Button } from '@/components/ui/Button'
import { Field, PinDots, TextInput } from '@/components/ui/Input'
import { PinPad, usePinGate } from './PinPad'

type Step = 'welcome' | 'register' | 'login' | 'pin'

export function Onboarding() {
  const [step, setStep] = useState<Step>('welcome')
  const [mode, setMode] = useState<'register' | 'login'>('register')
  const [pinLen, setPinLen] = useState(6)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pending, setPending] = useState(false)
  const [localErr, setLocalErr] = useState('')
  const login = useApp((s) => s.login)
  const register = useApp((s) => s.register)

  const submitPin = useMemo(() => {
    return (pin: string) => {
      void (async () => {
        setPending(true)
        try {
          if (mode === 'login') {
            await login(email, pin)
          } else {
            await register(name, email, pin)
          }
        } catch (e) {
          pinGate.fail()
          setLocalErr((e as Error).message)
        } finally {
          setPending(false)
        }
      })()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, name, email, login, register])

  const pinGate = usePinGate(submitPin, pinLen)

  useEffect(() => {
    if (step === 'pin') {
      setLocalErr('')
      pinGate.setPin('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, pinLen])

  const goRegister = () => {
    setStep('register')
    setMode('register')
    setPinLen(6)
    setLocalErr('')
  }
  const goLogin = () => {
    setStep('login')
    setMode('login')
    setLocalErr('')
  }
  const goPin = () => {
    setLocalErr('')
    if (mode === 'login') {
      void api.pinLengthFor(email)
        .then((n) => setPinLen(n))
        .catch(() => {})
    }
    setStep('pin')
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col bg-canvas">
      {step === 'welcome' && <Welcome onRegister={goRegister} onLogin={goLogin} />}
      {step === 'register' && (
        <AuthForm
          title="Create your wallet"
          subtitle="A non-custodial wallet. Your keys, your coins."
          onBack={() => setStep('welcome')}
          footer={
            <>
              <Field label="Full name">
                <TextInput placeholder="Alex Carter" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
              </Field>
              <Field label="Email">
                <TextInput placeholder="you@example.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              </Field>
              <Button block size="lg" onClick={goPin} disabled={!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)}>
                Continue
              </Button>
            </>
          }
        />
      )}
      {step === 'login' && (
        <AuthForm
          title="Welcome back"
          subtitle="Sign in to your Crypton wallet"
          onBack={() => setStep('welcome')}
          footer={
            <>
              <Field label="Email">
                <TextInput placeholder="you@example.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              </Field>
              <Button block size="lg" onClick={goPin} disabled={!email.trim()}>
                Continue
              </Button>
            </>
          }
        />
      )}
      {step === 'pin' && (
        <div className="flex flex-1 flex-col px-6 pt-16 animate-rise-in">
          <button onClick={() => setStep(mode === 'login' ? 'login' : 'register')} className="mb-8 inline-flex w-fit items-center gap-1.5 text-sm text-content-faint">
            <ArrowLeft size={16} /> Back
          </button>
          <h1 className="font-display text-2xl font-bold text-content">
            {mode === 'login' ? 'Enter your PIN' : `Set a ${pinLen}-digit PIN`}
          </h1>
          <p className="mt-2 text-sm text-content-faint">
            {mode === 'login' ? `Unlock ${email}` : 'You will use this PIN to unlock your wallet and confirm transactions.'}
          </p>

          <div className="mt-10">
            <PinDots value={pinGate.pin} length={pinLen} error={pinGate.error} />
          </div>
          {localErr && <p className="mt-6 text-center text-sm text-down">{localErr}</p>}

          <div className="mt-10">
            <PinPad onDigit={pinGate.digit} onDelete={pinGate.del} />
          </div>

          <p className="mt-8 text-center text-xs text-content-faint">
            {pending ? 'Creating your wallet…' : mode === 'login' ? 'Forgot PIN? Admin can reset it.' : ''}
          </p>
        </div>
      )}
    </div>
  )
}

function AuthForm({ title, subtitle, footer, onBack }: { title: string; subtitle: string; footer: React.ReactNode; onBack: () => void }) {
  return (
    <div className="flex flex-1 flex-col px-6 pt-16 animate-rise-in">
      <button onClick={onBack} className="mb-8 inline-flex w-fit items-center gap-1.5 text-sm text-content-faint">
        <ArrowLeft size={16} /> Back
      </button>
      <h1 className="font-display text-2xl font-bold text-content">{title}</h1>
      <p className="mt-2 text-sm text-content-faint">{subtitle}</p>
      <div className="mt-10 space-y-4">{footer}</div>
      <p className="mt-10 flex items-center justify-center gap-1.5 text-center text-xs text-content-faint">
        <ShieldCheck size={14} className="text-up" /> Your funds are protected by bank-grade encryption
      </p>
    </div>
  )
}

function Welcome({ onRegister, onLogin }: { onRegister: () => void; onLogin: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center px-6 pt-24">
      <LogoMark size={84} />
      <Wordmark size={34} className="mt-8" />
      <p className="mt-3 max-w-[260px] text-center text-sm text-content-faint">
        Live markets. Instant swaps. One sleek wallet for every coin.
      </p>

      <div className="mt-14 w-full space-y-3">
        <Button block size="xl" onClick={onRegister}>
          Create wallet
        </Button>
        <Button block size="xl" variant="ghost" onClick={onLogin}>
          I already have a wallet
        </Button>
      </div>
    </div>
  )
}
