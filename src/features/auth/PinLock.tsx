import { useMemo, useState } from 'react'
import { LogoMark } from '@/components/ui/Logo'
import { PinDots } from '@/components/ui/Input'
import { PinPad, usePinGate } from './PinPad'
import { useApp } from '@/store/app'

export function PinLock() {
  const unlock = useApp((s) => s.unlock)
  const logout = useApp((s) => s.logout)
  const user = useApp((s) => s.user)
  const [err, setErr] = useState('')

  const onSubmit = useMemo(() => {
    return async (pin: string) => {
      try {
        await unlock(pin)
      } catch (e) {
        gate.fail()
        setErr((e as Error).message)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlock])

  const gate = usePinGate(onSubmit, user?.pinLen ?? 6)

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col items-center justify-center bg-canvas px-6">
      <LogoMark size={56} />
      <h1 className="mt-6 font-display text-xl font-bold text-content">Welcome back{user ? `, ${user.name.split(' ')[0]}` : ''}</h1>
      <p className="mt-1 text-sm text-content-faint">Enter your PIN to unlock</p>

      <div className="mt-10">
        <PinDots value={gate.pin} length={user?.pinLen ?? 6} error={gate.error} />
      </div>
      {err && <p className="mt-5 text-sm text-down">{err}</p>}

      <div className="mt-10">
        <PinPad onDigit={gate.digit} onDelete={gate.del} />
      </div>

      <button onClick={() => void logout()} className="mt-10 text-xs text-content-faint underline-offset-4 hover:underline">
        Sign out instead
      </button>
    </div>
  )
}
