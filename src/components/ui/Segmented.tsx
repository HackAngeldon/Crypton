export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className = '',
}: {
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (v: T) => void
  className?: string
}) {
  return (
    <div className={`inline-flex rounded-2xl border border-hairline bg-elevate p-1 ${className}`}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150 ${
            value === o.value ? 'bg-fill/10 text-content shadow-sm' : 'text-content-faint hover:text-content-mute'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Chip({ tone = 'neutral', children }: { tone?: 'neutral' | 'up' | 'down' | 'violet' | 'gold'; children: React.ReactNode }) {
  const tones = {
    neutral: 'bg-fill/10 text-content-mute border-hairlinestrong',
    up: 'bg-up/10 text-up border-up/25',
    down: 'bg-down/10 text-down border-down/25',
    violet: 'bg-brand/15 text-brand border-brand/30',
    gold: 'bg-warn/10 text-warn border-warn/25',
  }
  return <span className={`chip ${tones[tone]}`}>{children}</span>
}
