import type { ReactNode } from 'react'

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-fill/10 ${className}`}
      style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)' }}
    />
  )
}

export function EmptyState({ icon, title, desc, action }: { icon: ReactNode; title: string; desc: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-8 py-14 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-hairline bg-surface text-content-faint">
        {icon}
      </div>
      <h3 className="font-display text-base font-semibold text-content">{title}</h3>
      <p className="mt-1.5 max-w-[260px] text-sm text-content-faint">{desc}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
