import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Home, TrendingUp, Repeat, Clock, User, Zap } from 'lucide-react'
import { useApp } from '@/store/app'

const TABS = [
  { to: '/dashboard', label: 'Home', icon: Home },
  { to: '/markets', label: 'Markets', icon: TrendingUp },
  { to: '/swap', label: 'Swap', icon: Repeat },
  { to: '/activity', label: 'Activity', icon: Clock },
  { to: '/settings', label: 'You', icon: User },
]

export function AppShell() {
  const session = useApp((s) => s.session)
  const location = useLocation()
  const hideBar = ['/send', '/receive', '/buy', '/portfolio', '/admin', '/profile', '/support'].some((p) => location.pathname.startsWith(p))

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col bg-canvas">
      <main className="flex-1 pb-[calc(env(safe-area-inset-bottom)+72px)]">{<Outlet />}</main>

      {!hideBar && (
        <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[430px]">
          <div className="glass border-t border-hairline px-2 pb-[env(safe-area-inset-bottom)] pt-1.5 shadow-tabbar">
            <div className="grid grid-cols-5">
              {TABS.map(({ to, label, icon: Icon }) => {
                const active = location.pathname.startsWith(to)
                return (
                  <NavLink key={to} to={to} className="press flex flex-col items-center gap-1 py-1">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${active ? 'text-brand' : 'text-content-faint'}`}>
                      <Icon size={22} strokeWidth={active ? 2.4 : 2} />
                    </span>
                    <span className={`text-[10px] font-semibold ${active ? 'text-brand' : 'text-content-faint'}`}>{label}</span>
                  </NavLink>
                )
              })}
            </div>
          </div>
        </nav>
      )}

      {session?.role === 'admin' && !hideBar && (
        <NavLink
          to="/admin"
          className="press fixed bottom-[96px] right-3 z-40 flex items-center gap-1.5 rounded-full border border-hairlinestrong bg-surface px-3.5 py-2 text-xs font-bold text-brand shadow-card"
        >
          <Zap size={13} /> Admin
        </NavLink>
      )}
    </div>
  )
}
