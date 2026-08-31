import { create } from 'zustand'
import type { Announcement, CoinId, Tx, User, Wallet } from '@/types'
import type { Session } from '@/lib/mockApi'
import { api, resetDb, getDb } from '@/lib/mockApi'
import { COIN_CATALOG } from '@/data/coins'
import { usePriceFeed } from '@/lib/priceFeed'

export interface Toast {
  id: string
  kind: 'success' | 'error' | 'info' | 'warning'
  title: string
  desc?: string
}

let toastSeq = 0

interface AppState {
  ready: boolean
  session: Session | null
  user: User | null
  wallet: Wallet | null
  txs: Tx[]
  currency: string
  announcements: Announcement[]
  hiddenCoins: CoinId[]
  spreadPct: number
  toasts: Toast[]

  dbInit: () => Promise<void>
  boot: (session: Session) => Promise<void>
  login: (email: string, pin: string) => Promise<void>
  register: (name: string, email: string, pin: string) => Promise<void>
  unlock: (pin: string) => Promise<void>
  lockApp: () => Promise<void>
  logout: () => Promise<void>
  changePin: (cur: string, next: string) => Promise<void>
  refresh: () => Promise<void>
  setCurrency: (c: string) => void

  send: (p: { asset: CoinId; amount: number; address: string; feeTier: 'low' | 'standard' | 'fast' }) => Promise<Tx>
  buy: (p: { asset: CoinId; fiatAmount: number }) => Promise<Tx>
  buyCard: (p: { asset: CoinId; fiatAmount: number; last4: string }) => Promise<Tx>
  depositFiat: (amount: number) => Promise<void>
  swap: (p: { from: CoinId; to: CoinId; amount: number }) => Promise<{ rate: number; received: number }>
  updateProfile: (p: Partial<Pick<User, 'name' | 'email' | 'verified' | 'kycLevel'>>) => Promise<void>

  toast: (t: Omit<Toast, 'id'>) => void
  dismissToast: (id: string) => void

  adminUsers: User[]
  adminWallet: Wallet | null
  adminRefreshUsers: () => void
  adminOpenUser: (userId: string) => Promise<void>
  adminSetBalance: (p: { userId: string; asset: CoinId; amount: number; note?: string }) => Promise<void>
  adminToggleFreeze: (userId: string) => Promise<void>
  adminSetSpread: (pct: number) => Promise<void>
  adminOverridePrice: (asset: CoinId, price: number | null) => Promise<void>
  adminToggleCoin: (asset: CoinId) => Promise<void>
  adminAnnounce: (text: string, severity: Announcement['severity']) => Promise<void>
  adminClearAnnounce: (id: string) => Promise<void>
  adminAddFiat: (userId: string, amount: number) => Promise<void>

  resetAll: () => void
}

export const useApp = create<AppState>((set, get) => {
  const withWalletTx = async (userId: string) => {
    const { user, wallet } = await api.me(userId)
    const txs = api.listTxs(userId, 80)
    set({ user, wallet, txs, announcements: api.announcements() })
  }

  return {
    ready: false,
    session: null,
    user: null,
    wallet: null,
    txs: [],
    currency: 'USD',
    announcements: [],
    hiddenCoins: [],
    spreadPct: 0.4,
    toasts: [],

    dbInit: async () => {
      await api.init()
      const d = getDb()
      const session = api.getSession()
      set({ hiddenCoins: d.meta.hiddenCoins, spreadPct: d.meta.spreadPct, ready: true })
      if (session) await get().boot(session)
    },

    boot: async (session) => {
      const { user } = await api.me(session.userId)
      set({ session, user, wallet: getDb().wallets[user.id] })
      await withWalletTx(user.id)
    },

    login: async (email, pin) => {
      const session = await api.login(email, pin)
      set({ session })
      await withWalletTx(session.userId)
    },

    register: async (name, email, pin) => {
      const { session } = await api.register(name, email, pin)
      set({ session })
      await withWalletTx(session.userId)
    },

    unlock: async (pin) => {
      const session = await api.unlock(pin)
      set({ session })
    },

    lockApp: async () => {
      await api.lock()
      const s = get().session
      if (s) set({ session: { ...s, locked: true } })
    },

    logout: async () => {
      await api.logout()
      set({ session: null, user: null, wallet: null, txs: [] })
    },

    changePin: async (cur, next) => {
      await api.changePin(cur, next)
    },

    refresh: async () => {
      const { session } = get()
      if (session) await withWalletTx(session.userId)
      const d = getDb()
      set({ hiddenCoins: d.meta.hiddenCoins, spreadPct: d.meta.spreadPct, announcements: api.announcements() })
    },

    setCurrency: (currency) => set({ currency }),

    send: async (p) => {
      const { session } = get()
      if (!session) throw new Error('Not signed in')
      const tx = await api.send({ userId: session.userId, ...p })
      await withWalletTx(session.userId)
      return tx
    },

    buy: async (p) => {
      const { session } = get()
      if (!session) throw new Error('Not signed in')
      const tx = await api.buy({ userId: session.userId, ...p })
      await withWalletTx(session.userId)
      return tx
    },

    buyCard: async (p) => {
      const { session } = get()
      if (!session) throw new Error('Not signed in')
      const tx = await api.buyWithCard({ userId: session.userId, ...p })
      await withWalletTx(session.userId)
      return tx
    },

    depositFiat: async (amount) => {
      const { session } = get()
      if (!session) throw new Error('Not signed in')
      await api.depositFiat({ userId: session.userId, amount })
      await withWalletTx(session.userId)
    },

    swap: async (p) => {
      const { session } = get()
      if (!session) throw new Error('Not signed in')
      const res = await api.swap({ userId: session.userId, ...p })
      await withWalletTx(session.userId)
      return { rate: res.rate, received: res.received }
    },

    updateProfile: async (p) => {
      const { session } = get()
      if (!session) throw new Error('Not signed in')
      const user = await api.updateProfile(session.userId, p)
      set({ user })
    },

    toast: (t) => {
      const id = `t${++toastSeq}`
      set((s) => ({ toasts: [...s.toasts.slice(-3), { id, ...t }] }))
      setTimeout(() => get().dismissToast(id), 3800)
    },
    dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

    adminUsers: [],
    adminWallet: null,
    adminRefreshUsers: () => {
      set({ adminUsers: api.listUsers() })
    },

    adminOpenUser: async (userId) => {
      const wallet = await api.adminGetWallet(userId)
      set({ adminWallet: wallet })
    },

    adminSetBalance: async (p) => {
      await api.adminSetBalance(p)
      get().adminRefreshUsers()
      await get().refresh()
      const { session } = get()
      if (session && p.userId === session.userId) await get().boot(session)
      else if (get().adminWallet && p.userId === get().adminWallet!.userId) {
        set({ adminWallet: await api.adminGetWallet(p.userId) })
      }
    },

    adminToggleFreeze: async (userId) => {
      const d = getDb()
      const user = d.users[userId]
      await api.adminToggleFreeze(userId, !user.frozen)
      get().adminRefreshUsers()
      await get().refresh()
    },

    adminSetSpread: async (pct) => {
      await api.adminSetSpread(pct)
      set({ spreadPct: pct })
    },

    adminOverridePrice: async (asset, price) => {
      await api.adminOverridePrice(asset, price)
      usePriceFeed.getState().applyOverride(asset, price)
      const d = getDb()
      set({ hiddenCoins: d.meta.hiddenCoins })
    },

    adminToggleCoin: async (asset) => {
      const d = getDb()
      const isHidden = d.meta.hiddenCoins.includes(asset)
      await api.adminToggleCoin(asset, !isHidden)
      set({ hiddenCoins: getDb().meta.hiddenCoins })
    },

    adminAnnounce: async (text, severity) => {
      await api.adminAnnounce(text, severity)
      set({ announcements: api.announcements() })
    },

    adminClearAnnounce: async (id) => {
      await api.adminClearAnnounce(id)
      set({ announcements: api.announcements() })
    },

    adminAddFiat: async (userId, amount) => {
      await api.adminAddFiat(userId, amount)
      get().adminRefreshUsers()
      if (get().adminWallet && userId === get().adminWallet!.userId) {
        set({ adminWallet: await api.adminGetWallet(userId) })
      }
    },

    resetAll: () => {
      resetDb()
      usePriceFeed.getState().stop()
      set({
        session: null, user: null, wallet: null, txs: [], announcements: [], hiddenCoins: [], spreadPct: 0.4,
        adminUsers: [], adminWallet: null, ready: true,
      })
    },
  }
})

export function visibleCoins(): CoinId[] {
  const hidden = new Set(useApp.getState().hiddenCoins)
  return COIN_CATALOG.map((c) => c.id).filter((id) => !hidden.has(id))
}
