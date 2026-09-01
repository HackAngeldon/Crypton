import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BadgeCheck, Lock, LogOut, Pencil, ArrowLeft } from 'lucide-react'
import { useApp } from '@/store/app'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Field, TextInput } from '@/components/ui/Input'
import { Sheet } from '@/components/ui/Sheet'
import { formatDate } from '@/lib/format'

export function Profile() {
  const user = useApp((s) => s.user)
  const wallet = useApp((s) => s.wallet)
  const logout = useApp((s) => s.logout)
  const lockApp = useApp((s) => s.lockApp)
  const updateProfile = useApp((s) => s.updateProfile)
  const toast = useApp((s) => s.toast)
  const nav = useNavigate()
  const [edit, setEdit] = useState(false)
  const [name, setName] = useState(user?.name ?? '')

  const heldCount = wallet ? Object.values(wallet.balances).filter((v) => v > 0).length : 0

  const save = async () => {
    if (!name.trim()) return
    await updateProfile({ name: name.trim() })
    setEdit(false)
    toast({ kind: 'success', title: 'Profile updated' })
  }

  return (
    <div className="pb-10">
      <div className="sticky top-0 z-30 border-b border-hairline bg-canvas/85 px-4 py-3 pt-[calc(env(safe-area-inset-top)+12px)] backdrop-blur-lg">
        <div className="flex items-center gap-3">
          <button onClick={() => nav(-1)} className="press inline-flex h-9 w-9 items-center justify-center rounded-xl border border-hairlinestrong bg-fill/10 text-content-mute">
            <ArrowLeft size={18} />
          </button>
          <h1 className="font-display text-lg font-bold text-content">Your profile</h1>
        </div>
      </div>

      <div className="px-4 pt-6">
        <div className="flex flex-col items-center rounded-3xl border border-hairline bg-surface p-6">
          <Avatar name={user?.name ?? 'U'} size={76} gradient={user?.color} />
          <h2 className="mt-3 font-display text-xl font-bold text-content">{user?.name}</h2>
          <p className="mt-0.5 text-sm text-content-faint">{user?.email}</p>
          <div className="mt-3 flex gap-2">
            {user?.verified && (
              <span className="chip !text-up bg-up/10 border-up/25"><BadgeCheck size={12} /> Verified</span>
            )}
          </div>
          <Button size="sm" variant="ghost" className="mt-4" onClick={() => { setName(user?.name ?? ''); setEdit(true) }}>
            <Pencil size={14} /> Edit profile
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2.5">
          <StatBox label="Coins" value={String(heldCount)} />
          <StatBox label="Member since" value={formatDate(user?.createdAt ?? Date.now()).split(',')[0]} />
          <StatBox label="Status" value={user?.frozen ? 'Frozen' : 'Active'} danger={user?.frozen} />
        </div>

        <div className="mt-6 space-y-2.5">
          <Button block size="lg" variant="ghost" onClick={() => void lockApp()}>
            <Lock size={16} /> Lock wallet now
          </Button>
          <Button block size="lg" variant="danger" onClick={() => void logout()}>
            <LogOut size={16} /> Sign out
          </Button>
        </div>

        <p className="mt-6 text-center text-2xs text-content-faint">Account ID · {user?.id}</p>
      </div>

      <Sheet open={edit} onClose={() => setEdit(false)} title="Edit profile" footer={
        <Button block size="lg" onClick={() => void save()} disabled={!name.trim()}>Save changes</Button>
      }>
        <Field label="Full name">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <p className="mt-2 text-xs text-content-faint">Email address changes require contacting support.</p>
      </Sheet>
    </div>
  )
}

function StatBox({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-2xl border border-hairline bg-surface px-3 py-3 text-center">
      <p className="text-2xs font-semibold uppercase tracking-wider text-content-faint">{label}</p>
      <p className={`mt-1 truncate font-display text-base font-bold ${danger ? 'text-down' : 'text-content'}`}>{value}</p>
    </div>
  )
}
