import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  inset?: boolean
}

export function Card({ children, className = '', inset, ...rest }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-hairline bg-surface shadow-card ${inset ? 'p-4' : ''} ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}

export function SectionTitle({ children, right, className = '' }: { children: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <div className={`flex items-center justify-between px-1 ${className}`}>
      <h2 className="text-sm font-semibold text-content-mute">{children}</h2>
      {right}
    </div>
  )
}

export function Stat({ label, value, sub, accent }: { label: string; value: ReactNode; sub?: ReactNode; accent?: 'up' | 'down' }) {
  return (
    <div className="rounded-2xl border border-hairline bg-surface p-4">
      <p className="text-2xs font-semibold uppercase tracking-wider text-content-faint">{label}</p>
      <p className={`mt-1.5 font-display text-xl font-semibold tabular ${accent === 'up' ? 'text-up' : accent === 'down' ? 'text-down' : 'text-content'}`}>{value}</p>
      {sub && <div className="mt-1 text-xs text-content-faint">{sub}</div>}
    </div>
  )
}
