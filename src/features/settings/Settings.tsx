import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShieldCheck, KeyRound, Fingerprint, Lock, Bell, BellRing, Globe,
  Zap, HelpCircle, ChevronRight, Info, LogOut, Wallet, Moon,
} from 'lucide-react'
import { useApp } from '@/store/app'
import { Avatar } from '@/components/ui/Avatar'
import { PageHeader } from '@/components/PageHeader'
import { Sheet } from '@/components/ui/Sheet'
import { PinDots } from '@/components/ui/Input'
import { PinPad } from '@/features/auth/PinPad'
import { CURRENCIES } from '@/lib/format'
import { LogoMark } from '@/components/ui/Logo'
import { applyTheme, getTheme } from '@/lib/theme'

export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? 'bg-brand' : 'bg-fill/10'}`}
      role="switch"
      aria-checked={on}
    >
      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}

export function Settings() {
  const user = useApp((s) => s.user)
  const currentPinLen = user?.pinLen ?? 6
  const session = useApp((s) => s.session)
  const currency = useApp((s) => s.currency)
  const setCurrency = useApp((s) => s.setCurrency)
  const lockApp = useApp((s) => s.lockApp)
  const logout = useApp((s) => s.logout)
  const changePin = useApp((s) => s.changePin)
  const toast = useApp((s) => s.toast)
  const nav = useNavigate()

  const [curSheet, setCurSheet] = useState(false)
  const [pinSheet, setPinSheet] = useState(false)
  const [curPin, setCurPin] = useState('')
  const [nextPin, setNextPin] = useState('')
  const [pinStep, setPinStep] = useState<0 | 1 | 2>(0)
  const [pinErr, setPinErr] = useState('')
  const [bio, setBio] = useState(false)
  const [alerts, setAlerts] = useState(true)
  const [push, setPush] = useState(true)
  const [dark, setDark] = useState(() => getTheme() === 'dark')

  const toggleTheme = (on: boolean) => {
    setDark(on)
    applyTheme(on ? 'dark' : 'light')
  }

  const startPinChange = () => {
    setCurPin('')
    setNextPin('')
    setPinStep(0)
    setPinErr('')
    setPinSheet(true)
  }

  const submitPin = async () => {
    const currentLen = user?.pinLen ?? 6
    if (pinStep === 0) {
      if (curPin.length < currentLen) return
      setPinStep(1)
      setPinErr('')
    } else {
      if (nextPin.length < 4) return
      try {
        await changePin(curPin, nextPin)
        setPinSheet(false)
        toast({ kind: 'success', title: 'PIN updated' })
      } catch (e) {
        setPinErr((e as Error).message)
        setCurPin('')
        setNextPin('')
        setPinStep(0)
      }
    }
  }

  return (
    <div className="pb-2">
      <PageHeader title="Settings" sub="Manage your wallet" />

      <div className="px-4 pt-4">
        {/* profile card */}
        <button onClick={() => nav('/profile')} className="press flex w-full items-center gap-3 rounded-2xl border border-hairline bg-surface p-4">
          <Avatar name={user?.name ?? 'U'} size={46} gradient={user?.color} />
          <div className="flex-1 text-left">
            <p className="font-display text-base font-bold text-content">{user?.name}</p>
            <p className="text-xs text-content-faint">{user?.email}</p>
          </div>
          <ChevronRight size={18} className="text-content-faint" />
        </button>

        {/* security */}
        <Section label="Security" icon={<ShieldCheck size={14} className="text-up" />}>
          <RowBtn icon={KeyRound} label="Change PIN" sub="Keep your keys private" onClick={startPinChange} />
          <RowBtn icon={Lock} label="Lock now" sub="Require PIN to continue" onClick={() => void lockApp()} />
          <RowBtn icon={Fingerprint} label="Biometric unlock" sub="Face ID / fingerprint" right={<Toggle on={bio} onChange={setBio} />} />
        </Section>

        {/* preferences */}
        <Section label="Preferences" icon={<Globe size={14} className="text-brand" />}>
          <RowBtn
            icon={Wallet}
            label="Display currency"
            sub={CURRENCIES[currency].symbol + ' ' + currency}
            onClick={() => setCurSheet(true)}
          />
          <RowBtn icon={Bell} label="Price alerts" sub="Big moves get a nudge" right={<Toggle on={alerts} onChange={setAlerts} />} />
          <RowBtn icon={BellRing} label="Push notifications" sub="Confirmations & updates" right={<Toggle on={push} onChange={setPush} />} />
          <RowBtn icon={Moon} label="Dark theme" sub="Calm on the eyes at night" right={<Toggle on={dark} onChange={toggleTheme} />} />
        </Section>

        {/* links */}
        <Section label="App" icon={<Info size={14} className="text-brand" />}>
          {session?.role === 'admin' && (
            <RowBtn icon={Zap} label="Admin control room" sub="Users, balances, markets" onClick={() => nav('/admin')} accent />
          )}
          <RowBtn icon={HelpCircle} label="About Crypton" sub="v1.0.0 · self-custody wallet" onClick={() => toast({ kind: 'info', title: 'Crypton', desc: 'Self-custody crypto wallet with live market rates.' })} />
          <RowBtn icon={LogOut} label="Sign out" sub="End this session" onClick={() => void logout()} danger />
        </Section>

        <div className="mt-8 flex flex-col items-center gap-2 pb-4">
          <LogoMark size={34} />
          <p className="text-2xs text-content-faint">Crypton · rates via CoinGecko</p>
        </div>
      </div>

      {/* currency sheet */}
      <Sheet open={curSheet} onClose={() => setCurSheet(false)} title="Display currency">
        <div className="divide-y divide-hairline">
          {Object.entries(CURRENCIES).map(([code, c]) => (
            <button key={code} onClick={() => { setCurrency(code); setCurSheet(false) }} className="flex w-full items-center justify-between py-3">
              <span className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-fill/5 font-display font-bold text-content">{c.symbol}</span>
                <span className="text-sm font-semibold text-content">{code}</span>
              </span>
              {currency === code && <span className="text-xs font-bold text-brand">ACTIVE</span>}
            </button>
          ))}
        </div>
      </Sheet>

      {/* change PIN sheet */}
      <Sheet
        open={pinSheet}
        onClose={() => setPinSheet(false)}
        title={pinStep === 0 ? 'Current PIN' : 'New PIN'}
        footer={<button onClick={() => void submitPin()} className="mx-auto block text-sm font-bold text-brand">Continue</button>}
      >
        <div className="flex flex-col items-center py-2">
          <PinDots value={pinStep === 0 ? curPin : nextPin} length={pinStep === 0 ? currentPinLen : Math.max(currentPinLen, 4)} error={!!pinErr} />
          {pinErr && <p className="mt-3 text-sm text-down">{pinErr}</p>}
          <p className="mt-3 text-center text-xs text-content-faint">
            {pinStep === 0 ? `Enter your current ${currentPinLen}-digit PIN` : `Choose a new ${currentPinLen}-digit PIN`}
          </p>
          <div className="mt-6">
            <PinPad
              onDigit={(d) => (pinStep === 0 ? curPin.length < currentPinLen && setCurPin(curPin + d) : nextPin.length < Math.max(currentPinLen, 4) && setNextPin(nextPin + d))}
              onDelete={() => (pinStep === 0 ? setCurPin(curPin.slice(0, -1)) : setNextPin(nextPin.slice(0, -1)))}
            />
          </div>
        </div>
      </Sheet>
    </div>
  )
}

function Section({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <p className="mb-2 flex items-center gap-1.5 px-1 text-2xs font-semibold uppercase tracking-wider text-content-faint">
        {icon} {label}
      </p>
      <div className="divide-y divide-hairline rounded-2xl border border-hairline bg-surface px-4">
        {children}
      </div>
    </div>
  )
}

function RowBtn({
  icon: Icon, label, sub, onClick, right, danger, accent,
}: {
  icon: React.ComponentType<{ size?: string | number }>
  label: string
  sub?: string
  onClick?: () => void
  right?: React.ReactNode
  danger?: boolean
  accent?: boolean
}) {
  return (
    <button onClick={onClick} className="press flex w-full items-center gap-3 py-3.5 text-left">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${danger ? 'bg-down/10 text-down' : accent ? 'bg-brand/15 text-brand' : 'bg-fill/5 text-content-mute'}`}>
        <Icon size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold ${danger ? 'text-down' : 'text-content'}`}>{label}</p>
        {sub && <p className="mt-0.5 truncate text-xs text-content-faint">{sub}</p>}
      </div>
      {right ?? (onClick && <ChevronRight size={17} className="text-content-faint" />)}
    </button>
  )
}
