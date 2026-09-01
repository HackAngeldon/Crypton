import { useEffect, useMemo, useState } from 'react'
import { ShieldCheck, ArrowLeft } from 'lucide-react'
import { useApp } from '@/store/app'
import { api } from '@/lib/mockApi'
import { LogoMark, Wordmark } from '@/components/ui/Logo'
import { Button } from '@/components/ui/Button'
import { Field, PinDots, TextInput } from '@/components/ui/Input'
import { PinPad, usePinGate } from './PinPad'

type Step = 'welcome' | 'register' | 'login' | 'pin' | 'reset'
type ResetStep = 'email' | 'code' | 'newpin'

export function Onboarding() {
  const [step, setStep] = useState<Step>('welcome')
  const [mode, setMode] = useState<'register' | 'login'>('register')
  const [pinLen, setPinLen] = useState(6)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pending, setPending] = useState(false)
  const [localErr, setLocalErr] = useState('')
  const [resetStep, setResetStep] = useState<ResetStep>('email')
  const [resetEmail, setResetEmail] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [resetSentCode, setResetSentCode] = useState('')
  const [resetBusy, setResetBusy] = useState(false)
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

  const submitNewPin = useMemo(() => {
    return (pin: string) => {
      void (async () => {
        setResetBusy(true)
        setLocalErr('')
        try {
          await api.resetPin(resetEmail, resetSentCode, pin)
          setEmail(resetEmail)
          setResetEmail('')
          setResetCode('')
          setResetSentCode('')
          setStep('login')
        } catch (e) {
          resetGate.fail()
          setLocalErr((e as Error).message)
        } finally {
          setResetBusy(false)
        }
      })()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetEmail, resetSentCode])

  const resetGate = usePinGate(submitNewPin, 6)

  useEffect(() => {
    if (step === 'pin') {
      setLocalErr('')
      pinGate.setPin('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, pinLen])

  useEffect(() => {
    if (step === 'reset' && resetStep === 'newpin') {
      setLocalErr('')
      resetGate.setPin('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, resetStep])

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
  const goForgotPin = () => {
    setResetStep('email')
    setResetEmail(email)
    setResetCode('')
    setResetSentCode('')
    setLocalErr('')
    setStep('reset')
  }
  const requestReset = () => {
    setLocalErr('')
    void (async () => {
      setResetBusy(true)
      try {
        const res = await api.requestPinReset(resetEmail)
        if (!res.sent) {
          setLocalErr('No account found for that email.')
          return
        }
        setResetSentCode(res.code)
        setResetCode('')
        setResetStep('code')
      } catch (e) {
        setLocalErr((e as Error).message)
      } finally {
        setResetBusy(false)
      }
    })()
  }
  const submitResetCode = () => {
    setLocalErr('')
    if (resetCode.trim() === resetSentCode) {
      setResetStep('newpin')
    } else {
      setLocalErr("That code doesn't match. Check and try again.")
    }
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
            {pending ? 'Creating your wallet…' : ''}
          </p>
          {mode === 'login' && !pending && (
            <button onClick={goForgotPin} className="mt-2 text-center text-xs font-semibold text-brand">
              Forgot PIN? Reset it
            </button>
          )}
        </div>
      )}

      {step === 'reset' && (
        <div className="flex flex-1 flex-col px-6 pt-16 animate-rise-in">
          <button onClick={() => setStep('login')} className="mb-8 inline-flex w-fit items-center gap-1.5 text-sm text-content-faint">
            <ArrowLeft size={16} /> Back
          </button>
          {resetStep === 'email' && (
            <>
              <h1 className="font-display text-2xl font-bold text-content">Reset your PIN</h1>
              <p className="mt-2 text-sm text-content-faint">Enter the email on your Crypton account and we'll send a reset code.</p>
              <div className="mt-10 space-y-4">
                <Field label="Email">
                  <TextInput type="email" placeholder="you@crypton.app" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} autoComplete="email" />
                </Field>
                <Button block size="lg" onClick={requestReset} disabled={!resetEmail.trim() || resetBusy}>
                  {resetBusy ? 'Sending…' : 'Send reset code'}
                </Button>
              </div>
              {localErr && <p className="mt-4 rounded-xl bg-down/10 px-3.5 py-2.5 text-xs text-down">{localErr}</p>}
            </>
          )}
          {resetStep === 'code' && (
            <>
              <h1 className="font-display text-2xl font-bold text-content">Enter the reset code</h1>
              <p className="mt-2 text-sm text-content-faint">We sent a 6-digit code to {resetEmail}.</p>
              {resetSentCode && (
                <div className="mt-4 rounded-xl border border-brand/30 bg-brand/10 px-3.5 py-2.5">
                  <p className="text-xs text-content-faint">Demo delivery — your code is</p>
                  <p className="font-mono text-2xl font-bold tracking-[0.3em] text-brand tabular">{resetSentCode}</p>
                </div>
              )}
              <div className="mt-6">
                <Field label="Reset code">
                  <TextInput
                    inputMode="numeric"
                    placeholder="000000"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="text-center font-mono text-lg tracking-[0.4em]"
                  />
                </Field>
              </div>
              {localErr && <p className="mt-3 rounded-xl bg-down/10 px-3.5 py-2.5 text-xs text-down">{localErr}</p>}
              <Button block size="lg" className="mt-6" onClick={submitResetCode} disabled={resetCode.length < 6}>
                Verify code
              </Button>
            </>
          )}
          {resetStep === 'newpin' && (
            <>
              <h1 className="font-display text-2xl font-bold text-content">Set a new PIN</h1>
              <p className="mt-2 text-sm text-content-faint">Choose a new 6-digit PIN for {resetEmail}.</p>
              <div className="mt-10">
                <PinDots value={resetGate.pin} length={6} error={resetGate.error} />
              </div>
              {localErr && <p className="mt-6 text-center text-sm text-down">{localErr}</p>}
              <div className="mt-10">
                <PinPad onDigit={resetGate.digit} onDelete={resetGate.del} />
              </div>
              <p className="mt-8 text-center text-xs text-content-faint">{resetBusy ? 'Updating…' : ''}</p>
            </>
          )}
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
