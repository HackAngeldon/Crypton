import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, CandlestickChart, Megaphone, BookOpenText,
  Snowflake, ShieldCheck, Search, Trash2, Plus, Minus, Zap, Radio, Flame, Eye, EyeOff,
  Wallet, Copy, Check, LogOut, Clock,
} from 'lucide-react'
import { useApp } from '@/store/app'
import { usePriceFeed } from '@/lib/priceFeed'
import { useCurrency } from '@/lib/currency'
import { COIN_CATALOG, COIN_MAP } from '@/data/coins'
import { Avatar } from '@/components/ui/Avatar'
import { LogoMark, Wordmark } from '@/components/ui/Logo'
import { Sheet } from '@/components/ui/Sheet'
import { CoinIcon } from '@/components/CoinIcon'
import { TextInput } from '@/components/ui/Input'
import { Toggle } from '@/features/settings/Settings'
import { Button } from '@/components/ui/Button'
import { formatUsd, formatCoin, timeAgo, shortAddr } from '@/lib/format'
import type { CoinId, User } from '@/types'

type Tab = 'overview' | 'users' | 'markets' | 'broadcast' | 'ledger'

const TABS: Array<{ id: Tab; label: string; icon: typeof Users }> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'markets', label: 'Markets', icon: CandlestickChart },
  { id: 'broadcast', label: 'Broadcast', icon: Megaphone },
  { id: 'ledger', label: 'Ledger', icon: BookOpenText },
]

export function Admin() {
  const session = useApp((s) => s.session)
  if (!session || session.role !== 'admin') return <AdminDenied />
  return <AdminPanel />
}

function AdminDenied() {
  const nav = useNavigate()
  return (
    <div className="px-4 pt-24 text-center">
      <ShieldCheck size={40} className="mx-auto text-down" />
      <h1 className="mt-4 font-display text-xl font-bold text-content">Admins only</h1>
      <p className="mt-2 text-sm text-content-faint">This control room is restricted to admin accounts.</p>
      <Button className="mt-6" onClick={() => nav(-1)}>Go back</Button>
    </div>
  )
}

function AdminPanel() {
  const [tab, setTab] = useState<Tab>('overview')
  const nav = useNavigate()
  const adminRefreshUsers = useApp((s) => s.adminRefreshUsers)
  const adminRefreshExtended = useApp((s) => s.adminRefreshExtended)
  const adminRefreshPending = useApp((s) => s.adminRefreshPending)
  const adminUsers = useApp((s) => s.adminUsers)
  const adminWallets = useApp((s) => s.adminWallets)
  const txs = useApp((s) => s.txs)
  const announcements = useApp((s) => s.announcements)
  const user = useApp((s) => s.user)
  const hiddenCoins = useApp((s) => s.hiddenCoins)
  const logout = useApp((s) => s.logout)

  useEffect(() => {
    void adminRefreshUsers()
    void adminRefreshExtended()
    void adminRefreshPending()
  }, [adminRefreshUsers, adminRefreshExtended, adminRefreshPending])

  const frozenCount = adminUsers.filter((u) => u.frozen).length
  const prices = usePriceFeed((s) => s.markets)
  const live = usePriceFeed((s) => s.live)
  const aum = useMemo(() => {
    let sum = 0
    for (const { wallet } of adminWallets) {
      sum += wallet.fiat ?? 0
      for (const [id, amt] of Object.entries(wallet.balances)) {
        sum += amt * (prices[id as CoinId]?.price ?? 0)
      }
    }
    return sum
  }, [adminWallets, prices])

  const renderTab = () => {
    switch (tab) {
      case 'overview':
        return <Overview users={adminUsers} frozenCount={frozenCount} aum={aum} txsCount={txs.length} live={live} announcements={announcements} />
      case 'users':
        return <UsersTab users={adminUsers} />
      case 'markets':
        return <MarketsTab hiddenCoins={hiddenCoins} />
      case 'broadcast':
        return <BroadcastTab />
      case 'ledger':
        return <LedgerTab users={adminUsers} />
    }
  }

  return (
    <div className="min-h-[100dvh] bg-canvas lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-[100dvh] w-64 shrink-0 flex-col border-r border-hairline bg-surface px-4 py-6 lg:flex">
        <div className="flex items-center gap-2.5 px-2">
          <LogoMark size={30} />
          <Wordmark size={20} />
        </div>
        <p className="mt-4 px-2 text-2xs font-semibold uppercase tracking-wider text-content-faint">Control room</p>
        <nav className="mt-4 flex flex-col gap-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${tab === id ? 'bg-brand/12 text-brand' : 'text-content-mute hover:bg-fill/5 hover:text-content'}`}
            >
              <Icon size={17} strokeWidth={tab === id ? 2.4 : 2} /> {label}
            </button>
          ))}
        </nav>
        <div className="flex-1" />
        <button onClick={() => nav('/dashboard')} className="flex items-center gap-2 rounded-xl bg-fill/5 px-3 py-2.5 text-sm font-semibold text-content-mute transition hover:bg-fill/10 hover:text-content">
          <Wallet size={16} /> Back to wallet
        </button>
        <div className="mt-2 flex items-center gap-2.5 rounded-xl bg-elevate px-3 py-2.5">
          <Avatar name={user?.name ?? 'U'} size={32} gradient={user?.color} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-content">{user?.name}</p>
            <p className="truncate text-[10px] text-content-faint">Admin · session active</p>
          </div>
          <button onClick={() => void logout()} className="press rounded-lg p-1.5 text-content-faint" title="Sign out">
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="min-w-0 flex-1">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 border-b border-hairline bg-canvas/85 backdrop-blur lg:hidden">
          <div className="flex items-center gap-2.5 px-4 py-3 pt-[calc(env(safe-area-inset-top)+12px)]">
            <LogoMark size={26} />
            <Wordmark size={17} />
            <span className="ml-auto flex items-center gap-1.5 rounded-full bg-brand/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-brand">
              <Zap size={11} /> Admin
            </span>
          </div>
        </header>

        {/* Content */}
        <main className="mx-auto max-w-[430px] px-4 pb-32 pt-5 lg:max-w-3xl lg:px-8 lg:pb-16 lg:pt-8">
          <div className="mb-5 hidden items-end justify-between lg:flex">
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-content">{TABS.find((t) => t.id === tab)?.label}</h1>
              <p className="text-sm text-content-faint">Operating as admin</p>
            </div>
            <span className="flex items-center gap-1.5 rounded-full bg-brand/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-brand">
              <Zap size={11} /> Admin
            </span>
          </div>
          {renderTab()}
          <p className="mt-10 text-center text-2xs text-content-faint lg:hidden">Signed in as {user?.name}</p>
        </main>

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
          <div className="glass border-t border-hairline px-2 pb-[env(safe-area-inset-bottom)] pt-1.5 shadow-tabbar">
            <div className="grid grid-cols-5">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setTab(id)} className="press flex flex-col items-center gap-1 py-1">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${tab === id ? 'text-brand' : 'text-content-faint'}`}>
                    <Icon size={22} strokeWidth={tab === id ? 2.4 : 2} />
                  </span>
                  <span className={`text-[10px] font-semibold ${tab === id ? 'text-brand' : 'text-content-faint'}`}>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </nav>
      </div>
    </div>
  )
}

/* ------------------------------- overview ------------------------------- */

function Overview({ users, frozenCount, aum, txsCount, live, announcements }: {
  users: User[]
  frozenCount: number
  aum: number
  txsCount: number
  live: boolean
  announcements: import('@/types').Announcement[]
}) {
  const cur = useCurrency()
  const clear = useApp((s) => s.adminClearAnnounce)
  const stats = [
    { label: 'Registered users', value: String(users.length), tone: 'text-brand' },
    { label: 'Wallet AUM', value: cur.fmt(aum, true), tone: 'text-brand' },
    { label: 'Transactions', value: String(txsCount), tone: 'text-content' },
    { label: 'Frozen', value: String(frozenCount), tone: frozenCount ? 'text-down' : 'text-content' },
  ]
  return (
    <div className="animate-rise-in">
      <div className="flex items-center justify-between rounded-2xl border border-hairline bg-surface px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-semibold text-content">
          <Radio size={15} className="text-brand" /> Market feed
        </span>
        <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${live ? 'bg-up/10 text-up' : 'bg-warn/10 text-warn'}`}>
          <span className={`h-1.5 w-1.5 rounded-full animate-pulse-soft ${live ? 'bg-up' : 'bg-warn'}`} />
          {live ? 'CoinGecko live' : 'Offline estimates'}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-hairline bg-surface px-4 py-3.5">
            <p className="text-2xs font-semibold uppercase tracking-wider text-content-faint">{s.label}</p>
            <p className={`mt-1 font-display text-2xl font-bold tabular ${s.tone}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {announcements.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 px-1 text-2xs font-semibold uppercase tracking-wider text-content-faint">Active broadcasts</p>
          <div className="space-y-2">
            {announcements.map((a) => (
              <div key={a.id} className="flex items-start justify-between gap-3 rounded-2xl border border-hairline bg-surface px-4 py-3">
                <div className="flex-1">
                  <span className={`chip ${severityTone(a.severity)}`}>{a.severity}</span>
                  <p className="mt-2 text-sm text-content">{a.text}</p>
                  <p className="mt-1 text-xs text-content-faint">{timeAgo(a.createdAt)}</p>
                </div>
                <button onClick={() => void clear(a.id)} className="press rounded-lg p-1.5 text-content-faint">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <MasterWallet />
    </div>
  )
}

/* ----------------------------- master wallet ----------------------------- */

function MasterWallet() {
  const session = useApp((s) => s.session)
  const adminWallet = useApp((s) => s.adminWallet)
  const adminOpenUser = useApp((s) => s.adminOpenUser)
  const markets = usePriceFeed((s) => s.markets)
  const cur = useCurrency()
  const [copied, setCopied] = useState('')

  useEffect(() => {
    if (session?.role === 'admin') void adminOpenUser(session.userId)
  }, [session, adminOpenUser])

  const w = session && adminWallet && adminWallet.userId === session.userId ? adminWallet : null
  const rows = COIN_CATALOG.filter((c) => (w?.balances[c.id] ?? 0) > 0)
  const total = rows.reduce((s, c) => s + (w?.balances[c.id] ?? 0) * (markets[c.id]?.price ?? 0), 0)

  const copy = async (addr: string) => {
    await navigator.clipboard?.writeText(addr).catch(() => {})
    setCopied(addr)
    setTimeout(() => setCopied(''), 1500)
  }

  return (
    <div className="mt-5 rounded-2xl border border-hairline bg-surface p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-wider text-content-faint">
            <Wallet size={13} className="text-brand" /> Master wallet
          </p>
          <p className="mt-1 font-display text-2xl font-bold tabular text-content">{cur.fmt(total, true)}</p>
        </div>
        <span className="rounded-full bg-brand/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-brand">Held on behalf of users</span>
      </div>
      <p className="mt-2 text-xs text-content-faint">Deposit addresses derive from this wallet. Incoming funds land here and are credited to the user's balance.</p>

      <div className="mt-3 divide-y divide-hairline rounded-xl border border-hairline bg-surface px-3">
        {rows.length === 0 && <p className="py-5 text-center text-xs text-content-faint">No holdings in the master wallet yet. Credit a deposit from a user's profile.</p>}
        {rows.map((c) => {
          const addr = w?.addresses[c.id] ?? ''
          const amt = w?.balances[c.id] ?? 0
          return (
            <div key={c.id} className="flex items-center gap-3 py-2.5">
              <CoinIcon coin={c.id} size={30} />
              <div className="w-20">
                <p className="text-sm font-semibold text-content">{c.symbol}</p>
                <p className="text-[10px] tabular text-content-faint">{formatCoin(amt, c.id, { compact: true })}</p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-[11px] text-content-mute">{shortAddr(addr, 8)}</p>
                <p className="text-[10px] tabular text-content-faint">{cur.fmt(amt * (markets[c.id]?.price ?? 0))}</p>
              </div>
              <button onClick={() => void copy(addr)} className="press flex items-center gap-1 rounded-lg bg-fill/5 px-2 py-1.5 text-[10px] font-bold text-content-mute">
                {copied === addr ? <Check size={12} className="text-up" /> : <Copy size={12} />} {copied === addr ? 'Copied' : 'Copy'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* -------------------------------- users -------------------------------- */

function UsersTab({ users }: { users: User[] }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<User | null>(null)
  const filtered = users.filter(
    (u) => u.name.toLowerCase().includes(query.toLowerCase()) || u.email.toLowerCase().includes(query.toLowerCase()),
  )
  return (
    <div className="animate-rise-in">
      <div className="flex items-center gap-2 rounded-2xl border border-hairline bg-elevate px-3.5">
        <Search size={16} className="text-content-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search users…"
          className="h-10 flex-1 bg-transparent text-sm text-content placeholder:text-content-faint outline-none"
        />
      </div>
      <div className="mt-3 divide-y divide-hairline rounded-2xl border border-hairline bg-surface px-3">
        {filtered.map((u) => (
          <button key={u.id} onClick={() => setSelected(u)} className="press flex w-full items-center gap-3 py-3 text-left">
            <Avatar name={u.name} size={38} gradient={u.color} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-content">
                {u.name}
                {u.role === 'admin' && <ShieldCheck size={13} className="text-brand" />}
                {u.frozen && <Snowflake size={13} className="text-down" />}
              </p>
              <p className="truncate text-xs text-content-faint">{u.email}</p>
            </div>
            <span className={`chip ${u.frozen ? 'bg-down/10 border-down/25 !text-down' : 'bg-up/10 border-up/25 !text-up'}`}>
              {u.frozen ? 'Frozen' : 'Active'}
            </span>
          </button>
        ))}
      </div>
      <UserDetail user={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

function UserDetail({ user, onClose }: { user: User | null; onClose: () => void }) {
  const [balance, setBalance] = useState<Partial<Record<CoinId, string>>>({})
  const [depositCoin, setDepositCoin] = useState<CoinId>('bitcoin')
  const [depositAmount, setDepositAmount] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const adminSetBalance = useApp((s) => s.adminSetBalance)
  const adminDeposit = useApp((s) => s.adminDeposit)
  const adminToggleFreeze = useApp((s) => s.adminToggleFreeze)
  const adminOpenUser = useApp((s) => s.adminOpenUser)
  const adminSetRestriction = useApp((s) => s.adminSetRestriction)
  const adminDeleteUser = useApp((s) => s.adminDeleteUser)
  const adminWallet = useApp((s) => s.adminWallet)
  const toast = useApp((s) => s.toast)
  const markets = usePriceFeed((s) => s.markets)
  const liveUser = useApp((s) => s.adminUsers.find((u) => u.id === user?.id))

  useEffect(() => {
    if (user) void adminOpenUser(user.id)
    else setBalance({})
  }, [user, adminOpenUser])

  if (!user) return null
  const w = adminWallet && adminWallet.userId === user.id ? adminWallet : null
  const held = (Object.entries(w?.balances ?? {}) as Array<[CoinId, number]>).filter(([, a]) => a > 0)
  const restrictions = liveUser?.restrictions ?? user.restrictions ?? {}

  const toggleRestriction = async (key: string, value: boolean) => {
    await adminSetRestriction({ userId: user.id, key, value })
    toast({ kind: 'success', title: value ? 'Restricted' : 'Allowed', desc: `${key} ${value ? 'disabled' : 'enabled'} for ${user.name}` })
  }

  const doDelete = async () => {
    await adminDeleteUser(user.id)
    onClose()
    toast({ kind: 'success', title: 'Account deleted', desc: `${user.name}'s account was removed.` })
  }

  const apply = async (id: CoinId, note?: string) => {
    const v = parseFloat(balance[id] ?? '')
    if (isNaN(v) || v < 0) return
    await adminSetBalance({ userId: user.id, asset: id, amount: v, note, price: markets[id]?.price })
    setBalance((p) => ({ ...p, [id]: '' }))
    toast({ kind: 'success', title: 'Balance updated', desc: `${COIN_MAP[id].symbol} set to ${formatCoin(v, id)}` })
  }

  const credit = async (id: CoinId, delta: number) => {
    const curBal = w?.balances[id] ?? 0
    await adminSetBalance({ userId: user.id, asset: id, amount: Math.max(0, curBal + delta), note: delta > 0 ? 'Admin credit' : 'Admin debit', price: markets[id]?.price })
    toast({ kind: 'success', title: `${delta > 0 ? 'Credited' : 'Debited'} ${COIN_MAP[id].symbol}`, desc: `${delta > 0 ? '+' : ''}${formatCoin(delta, id)}` })
  }

  const doDeposit = async () => {
    const v = parseFloat(depositAmount)
    if (!v || v <= 0) return
    await adminDeposit({ userId: user.id, asset: depositCoin, amount: v, price: markets[depositCoin]?.price })
    setDepositAmount('')
    toast({ kind: 'success', title: 'Deposit credited', desc: `${formatCoin(v, depositCoin)} received · funds held in the master wallet` })
  }

  return (
    <Sheet open onClose={onClose} title={user.name} footer={
      <Button
        block
        size="lg"
        variant={user.frozen ? 'primary' : 'danger'}
        onClick={() => { void adminToggleFreeze(user.id); toast({ kind: user.frozen ? 'success' : 'warning', title: user.frozen ? 'Account unfrozen' : 'Account frozen' }) }}
        disabled={user.role === 'admin'}
      >
        <Snowflake size={15} /> {user.frozen ? 'Unfreeze account' : 'Freeze account'}
      </Button>
    }>
      <div className="flex items-center gap-3">
        <Avatar name={user.name} size={48} gradient={user.color} />
        <div>
          <p className="flex items-center gap-1.5 font-display text-base font-bold text-content">
            {user.name} {user.role === 'admin' && <ShieldCheck size={15} className="text-brand" />}
          </p>
          <p className="text-xs text-content-faint">{user.email} · {user.frozen ? 'FROZEN' : 'active'}</p>
        </div>
      </div>

      <p className="mt-5 text-2xs font-semibold uppercase tracking-wider text-content-faint">Adjust balances</p>
      <div className="mt-2 divide-y divide-hairline rounded-2xl border border-hairline bg-surface px-3">
        {held.length === 0 && <p className="py-6 text-center text-xs text-content-faint">This user holds no assets.</p>}
        {held.map(([id, amt]) => (
          <div key={id} className="flex items-center gap-2.5 py-2.5">
            <CoinIcon coin={id} size={30} />
            <div className="w-16">
              <p className="text-sm font-semibold text-content">{COIN_MAP[id].symbol}</p>
              <p className="text-[10px] tabular text-content-faint">{formatCoin(amt, id, { compact: true })}</p>
            </div>
            <div className="flex flex-1 items-center gap-1.5">
              <button onClick={() => void credit(id, -1)} className="press flex h-8 w-8 items-center justify-center rounded-lg bg-down/10 text-down"><Minus size={14} /></button>
              <input
                value={balance[id] ?? ''}
                onChange={(e) => setBalance((p) => ({ ...p, [id]: e.target.value.replace(/[^0-9.]/g, '') }))}
                placeholder={String(amt)}
                inputMode="decimal"
                className="h-9 w-full min-w-0 rounded-lg border border-hairline bg-elevate px-2 text-center font-mono text-xs tabular text-content placeholder:text-content-faint outline-none focus:border-brand/60"
              />
              <button onClick={() => void credit(id, 1)} className="press flex h-8 w-8 items-center justify-center rounded-lg bg-up/10 text-up"><Plus size={14} /></button>
            </div>
            <button onClick={() => void apply(id, 'Admin adjustment')} className="shrink-0 rounded-lg bg-brand/15 px-2.5 py-1.5 text-2xs font-bold text-brand">
              Set
            </button>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <p className="text-2xs font-semibold uppercase tracking-wider text-content-faint">Credit a deposit · master wallet</p>
        <div className="mt-2 rounded-2xl border border-hairline bg-surface p-3">
          <div className="flex items-center gap-2">
            <select
              value={depositCoin}
              onChange={(e) => setDepositCoin(e.target.value as CoinId)}
              className="h-11 shrink-0 rounded-xl border border-hairline bg-elevate px-2.5 text-sm font-semibold text-content outline-none focus:border-brand/60"
            >
              {COIN_CATALOG.map((c) => (
                <option key={c.id} value={c.id}>{c.symbol}</option>
              ))}
            </select>
            <input
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value.replace(/[^0-9.]/g, ''))}
              placeholder="0.00"
              inputMode="decimal"
              className="h-11 w-full min-w-0 flex-1 rounded-xl border border-hairline bg-elevate px-3 text-right font-mono text-sm tabular text-content placeholder:text-content-faint outline-none focus:border-brand/60"
            />
            <Button size="sm" onClick={() => void doDeposit()} disabled={!parseFloat(depositAmount)} className="shrink-0">
              Credit
            </Button>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-content-faint">
            Simulates a deposit to {user.name}'s address. The coins are credited to their balance and held in the admin master wallet.
          </p>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-2xs font-semibold uppercase tracking-wider text-content-faint">Restricted features</p>
        <div className="mt-2 divide-y divide-hairline rounded-2xl border border-hairline bg-surface px-3">
          {[
            { key: 'send', label: 'Withdrawals', desc: 'Send coins to an external address' },
            { key: 'transfer', label: 'Transfers', desc: 'Send to another Crypton wallet' },
            { key: 'swap', label: 'Swaps', desc: 'Exchange between assets' },
            { key: 'buy', label: 'Purchases', desc: 'Buy crypto with a card' },
          ].map((r) => (
            <div key={r.key} className="flex items-center justify-between gap-3 py-2.5">
              <div>
                <p className="text-sm font-semibold text-content">{r.label}</p>
                <p className="text-[11px] text-content-faint">{r.desc}</p>
              </div>
              <Toggle on={!!restrictions[r.key]} onChange={(v) => void toggleRestriction(r.key, v)} />
            </div>
          ))}
        </div>
      </div>

      {confirmDelete ? (
        <div className="mt-4 rounded-2xl border border-down/30 bg-down/5 p-3">
          <p className="text-sm font-semibold text-down">Delete {user.name}?</p>
          <p className="mt-0.5 text-xs text-content-faint">Their wallet, transactions and account will be permanently removed. This can't be undone.</p>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <button onClick={() => void doDelete()} className="btn h-10 rounded-xl bg-down/15 text-down font-semibold">Yes, delete</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setConfirmDelete(true)}
          disabled={user.role === 'admin'}
          className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-down/25 py-2.5 text-xs font-bold text-down disabled:opacity-40"
        >
          <Trash2 size={14} /> Delete account
        </button>
      )}

      <p className="mt-4 text-2xs text-content-faint">Last seen {timeAgo(user.lastSeen)} · joined {new Date(user.createdAt).toLocaleDateString()} · KYC level {user.kycLevel}</p>
    </Sheet>
  )
}

/* ------------------------------- markets ------------------------------- */

function MarketsTab({ hiddenCoins }: { hiddenCoins: CoinId[] }) {
  const spreadPct = useApp((s) => s.spreadPct)
  const adminSetSpread = useApp((s) => s.adminSetSpread)
  const adminOverridePrice = useApp((s) => s.adminOverridePrice)
  const adminToggleCoin = useApp((s) => s.adminToggleCoin)
  const markets = usePriceFeed((s) => s.markets)
  const priceOverrides = useApp((s) => s.priceOverrides)
  const [overrides, setOverrides] = useState<Partial<Record<CoinId, string>>>({})
  const toast = useApp((s) => s.toast)

  const dbOverrides = priceOverrides

  return (
    <div className="animate-rise-in">
      {/* spread */}
      <div className="rounded-2xl border border-hairline bg-surface p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-content">Market spread</p>
            <p className="text-xs text-content-faint">Applied to every swap rate</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => void adminSetSpread(Math.max(0, +(spreadPct - 0.1).toFixed(1)))} className="press flex h-8 w-8 items-center justify-center rounded-lg bg-fill/5 text-content-mute"><Minus size={14} /></button>
            <span className="w-16 text-center font-display text-xl font-bold tabular text-brand">{spreadPct.toFixed(1)}%</span>
            <button onClick={() => void adminSetSpread(Math.min(10, +(spreadPct + 0.1).toFixed(1)))} className="press flex h-8 w-8 items-center justify-center rounded-lg bg-fill/5 text-content-mute"><Plus size={14} /></button>
          </div>
        </div>
        <input
          type="range"
          min={0}
          max={10}
          step={0.1}
          value={spreadPct}
          onChange={(e) => void adminSetSpread(parseFloat(e.target.value))}
          className="mt-3 w-full accent-brand"
        />
      </div>

      <div className="mt-4 flex items-center justify-between px-1">
        <p className="text-2xs font-semibold uppercase tracking-wider text-content-faint">Coin visibility & price overrides</p>
      </div>
      <div className="mt-2 divide-y divide-hairline rounded-2xl border border-hairline bg-surface px-3">
        {COIN_CATALOG.map((c) => {
          const hidden = hiddenCoins.includes(c.id)
          const override = dbOverrides[c.id]
          const livePrice = markets[c.id]?.price ?? 0
          const shown = override !== undefined ? override : livePrice
          const overridden = override !== undefined
          return (
            <div key={c.id} className="flex items-center gap-3 py-3">
              <CoinIcon coin={c.id} size={32} />
              <div className="w-24">
                <p className="text-sm font-semibold text-content">{c.symbol}</p>
                <p className="truncate text-[10px] text-content-faint">{c.name}</p>
              </div>
              <div className="flex flex-1 items-center gap-2">
                <input
                  value={overrides[c.id] ?? ''}
                  onChange={(e) => setOverrides((p) => ({ ...p, [c.id]: e.target.value }))}
                  placeholder={formatUsd(shown, { decimals: shown < 1 ? 4 : 2 })}
                  inputMode="decimal"
                  className={`h-9 w-full min-w-0 rounded-lg border px-2 text-right font-mono text-xs tabular outline-none ${overridden ? 'border-warn/60 bg-warn/10 text-warn' : 'border-hairline bg-elevate text-content placeholder:text-content-faint focus:border-brand/60'}`}
                />
              </div>
              <button
                onClick={() => {
                  const v = parseFloat(overrides[c.id] ?? '')
                  if (v > 0) {
                    void adminOverridePrice(c.id, v)
                    setOverrides((p) => ({ ...p, [c.id]: '' }))
                    toast({ kind: 'success', title: `Override set`, desc: `${c.symbol} pinned to ${formatUsd(v)}` })
                  } else if (overridden) {
                    void adminOverridePrice(c.id, null)
                    toast({ kind: 'info', title: 'Override cleared', desc: `${c.symbol} back on live feed` })
                  }
                }}
                className={`shrink-0 rounded-lg px-2.5 py-1.5 text-2xs font-bold ${overridden ? 'bg-warn/15 text-warn' : 'bg-fill/5 text-content-mute'}`}
              >
                {overridden ? 'Clear' : 'Pin'}
              </button>
              <button
                onClick={() => { void adminToggleCoin(c.id); toast({ kind: 'info', title: hidden ? `${c.symbol} shown` : `${c.symbol} hidden from users` }) }}
                className={`shrink-0 rounded-lg p-2 ${hidden ? 'bg-down/10 text-down' : 'bg-fill/5 text-content-mute'}`}
                title={hidden ? 'Show coin' : 'Hide coin'}
              >
                {hidden ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          )
        })}
      </div>
      <p className="mt-3 flex items-center gap-1.5 px-1 text-2xs text-content-faint">
        <Flame size={12} /> Pinned prices override the live feed for the entire app. Users see the pinned value.
      </p>
    </div>
  )
}

/* ------------------------------ broadcast ------------------------------ */

function BroadcastTab() {
  const [text, setText] = useState('')
  const [severity, setSeverity] = useState<'info' | 'success' | 'warning' | 'danger'>('info')
  const adminAnnounce = useApp((s) => s.adminAnnounce)
  const adminClearAnnounce = useApp((s) => s.adminClearAnnounce)
  const announcements = useApp((s) => s.announcements)
  const toast = useApp((s) => s.toast)

  return (
    <div className="animate-rise-in">
      <div className="rounded-2xl border border-hairline bg-surface p-4">
        <p className="text-sm font-semibold text-content">Broadcast a notice</p>
        <p className="mt-0.5 text-xs text-content-faint">Appears instantly on every user's dashboard.</p>
        <div className="mt-3">
          <TextInput
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. Scheduled maintenance at 22:00 UTC tonight."
          />
        </div>
        <div className="mt-3 flex gap-2">
          {(['info', 'success', 'warning', 'danger'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSeverity(s)}
              className={`chip ${severity === s ? severityTone(s) : ''} ${severity !== s ? 'border-hairlinestrong bg-fill/5 !text-content-faint' : ''}`}
            >
              {s}
            </button>
          ))}
        </div>
        <Button block size="lg" className="mt-4" onClick={() => { if (!text.trim()) return; void adminAnnounce(text.trim(), severity); toast({ kind: 'success', title: 'Broadcast sent', desc: 'Visible to all users now.' }); setText('') }} disabled={!text.trim()}>
          <Megaphone size={16} /> Broadcast
        </Button>
      </div>

      <div className="mt-5 space-y-2">
        <p className="px-1 text-2xs font-semibold uppercase tracking-wider text-content-faint">History</p>
        {announcements.length === 0 && <p className="py-6 text-center text-xs text-content-faint">No broadcasts yet.</p>}
        {announcements.map((a) => (
          <div key={a.id} className="flex items-start justify-between gap-3 rounded-2xl border border-hairline bg-surface px-4 py-3">
            <div className="flex-1">
              <span className={`chip ${severityTone(a.severity)}`}>{a.severity}</span>
              <p className="mt-2 text-sm text-content">{a.text}</p>
              <p className="mt-1 text-xs text-content-faint">{timeAgo(a.createdAt)}</p>
            </div>
            <button onClick={() => void adminClearAnnounce(a.id)} className="press rounded-lg p-1.5 text-content-faint">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

/* -------------------------------- ledger -------------------------------- */

function LedgerTab({ users }: { users: User[] }) {
  const ledger = useApp((s) => s.adminLedger)
  const pending = useApp((s) => s.adminPending)
  const adminResolve = useApp((s) => s.adminResolve)
  const toast = useApp((s) => s.toast)
  const allTxs = useMemo(() => [...ledger].sort((a, b) => b.timestamp - a.timestamp), [ledger])
  const [filter, setFilter] = useState<'all' | 'send' | 'receive' | 'swap' | 'buy' | 'system'>('all')
  const nameOf = (id: string) => users.find((u) => u.id === id)?.name ?? 'unknown'
  const filtered = allTxs.filter((t) => {
    if (filter === 'all') return true
    if (filter === 'send') return t.type === 'send'
    if (filter === 'receive') return t.type === 'receive'
    if (filter === 'swap') return t.type === 'swap_in' || t.type === 'swap_out'
    if (filter === 'buy') return t.type === 'buy'
    return t.type === 'admin_credit' || t.type === 'admin_debit'
  })

  const decide = async (id: string, decision: 'approve' | 'reject') => {
    await adminResolve(id, decision)
    toast({
      kind: decision === 'approve' ? 'success' : 'warning',
      title: decision === 'approve' ? 'Approved' : 'Rejected',
      desc: decision === 'approve' ? 'Transaction completed.' : 'Funds refunded to the sender.',
    })
  }

  return (
    <div className="animate-rise-in">
      {pending.length > 0 && (
        <div className="mb-4 rounded-2xl border border-warn/30 bg-warn/5 p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-content">
            <Clock size={15} className="text-warn" /> Pending approvals · {pending.length}
          </p>
          <p className="mt-0.5 text-xs text-content-faint">Transfers and withdrawals are held until you approve or reject them.</p>
          <div className="mt-3 space-y-2">
            {pending.map(({ tx, senderName }) => (
              <div key={tx.id} className="flex items-center gap-2.5 rounded-xl border border-hairline bg-surface px-3 py-2.5 text-xs">
                <CoinIcon coin={tx.asset} size={26} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-content">{senderName} · {COIN_MAP[tx.asset].symbol}</p>
                  <p className="truncate text-[10px] text-content-faint">{tx.note || tx.counterparty} · {timeAgo(tx.timestamp)}</p>
                </div>
                <span className="tabular font-semibold text-content">−{formatCoin(tx.amount, tx.asset)}</span>
                <button onClick={() => void decide(tx.id, 'approve')} className="rounded-lg bg-up/15 px-2.5 py-1.5 text-[10px] font-bold text-up">Approve</button>
                <button onClick={() => void decide(tx.id, 'reject')} className="rounded-lg bg-down/15 px-2.5 py-1.5 text-[10px] font-bold text-down">Reject</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {(['all', 'send', 'receive', 'swap', 'buy', 'system'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`chip ${filter === f ? '!bg-brand/20 !border-brand/40 !text-brand' : ''}`}>{f}</button>
        ))}
      </div>
      <div className="mt-3 divide-y divide-hairline rounded-2xl border border-hairline bg-surface px-3">
        {filtered.length === 0 && <p className="py-8 text-center text-xs text-content-faint">No transactions match.</p>}
        {filtered.slice(0, 60).map((t) => (
          <div key={t.id} className="flex items-center gap-2.5 py-2.5 text-xs">
            <CoinIcon coin={t.asset} size={24} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-content">
                <span className="font-semibold">{nameOf(t.userId)}</span>
                <span className="mx-1 text-content-faint">·</span>
                <span className="capitalize text-content-mute">{t.type.replace('_', ' ')}</span>
              </p>
              <p className="truncate text-[10px] text-content-faint">{t.id} · {timeAgo(t.timestamp)}</p>
            </div>
            <span className={`tabular font-semibold ${t.direction === 'in' ? 'text-up' : 'text-content-mute'}`}>
              {t.direction === 'in' ? '+' : '−'}{formatCoin(t.amount, t.asset)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* --------------------------------- util -------------------------------- */

function severityTone(s: string): string {
  return {
    info: '!text-brand bg-brand/10 border-brand/25',
    success: '!text-up bg-up/10 border-up/25',
    warning: '!text-warn bg-warn/10 border-warn/25',
    danger: '!text-down bg-down/10 border-down/25',
  }[s] ?? ''
}
