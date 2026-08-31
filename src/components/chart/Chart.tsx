import { useMemo, useRef, useState } from 'react'

function buildPath(data: number[], w: number, h: number, pad = 4): { path: string; area: string; min: number; max: number } {
  if (data.length < 2) {
    return { path: '', area: '', min: data[0] ?? 0, max: data[0] ?? 0 }
  }
  const min = Math.min(...data)
  const max = Math.max(...data)
  const span = max - min || 1
  const x = (i: number) => pad + (i / (data.length - 1)) * (w - pad * 2)
  const y = (v: number) => h - pad - ((v - min) / span) * (h - pad * 2)
  const pts = data.map((v, i) => `${x(i).toFixed(2)},${y(v).toFixed(2)}`)
  const path = `M${pts.join(' L')}`
  const area = `${path} L${x(data.length - 1).toFixed(2)},${h} L${x(0).toFixed(2)},${h} Z`
  return { path, area, min, max }
}

export function AreaChart({
  data,
  height = 180,
  color = '#2566AF',
  color2,
  className = '',
  showGrid = true,
  valueFormat,
}: {
  data: number[]
  height?: number
  color?: string
  color2?: string
  className?: string
  showGrid?: boolean
  valueFormat?: (v: number) => string
}) {
  const w = 340
  const [hover, setHover] = useState<number | null>(null)
  const ref = useRef<SVGSVGElement>(null)
  const { path, area, min, max } = useMemo(() => buildPath(data, w, height), [data, height])
  const gid = useMemo(() => `g-${Math.random().toString(36).slice(2, 8)}`, [])
  const c2 = color2 ?? color

  const onMove = (e: React.PointerEvent) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    setHover(Math.round(ratio * (data.length - 1)))
  }

  const idx = hover
  const pct = idx !== null && data.length > 1 ? (data[idx] - min) / (max - min || 1) : null
  const dotY = pct !== null ? height - 4 - pct * (height - 8) : null
  const dotX = idx !== null ? 4 + (idx / (data.length - 1)) * (w - 8) : null

  const gridLines = [0.25, 0.5, 0.75].map((t) => 4 + t * (height - 8))

  return (
    <div className={`relative ${className}`}>
      <svg
        ref={ref}
        viewBox={`0 0 ${w} ${height}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        className="block touch-none select-none"
      >
        <defs>
          <linearGradient id={`${gid}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.32" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id={`${gid}-line`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={c2} />
          </linearGradient>
        </defs>
        {showGrid &&
          gridLines.map((y) => (
            <line key={y} x1="0" x2={w} y1={y} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          ))}
        <path d={area} fill={`url(#${gid}-fill)`} />
        <path d={path} fill="none" stroke={`url(#${gid}-line)`} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {idx !== null && (
          <g>
            <line x1={dotX!} x2={dotX!} y1="2" y2={height - 2} stroke="rgba(255,255,255,0.18)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            <circle cx={dotX!} cy={dotY!} r="5" fill={color} stroke="#0C1120" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </g>
        )}
      </svg>
      {idx !== null && valueFormat && (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-hairlinestrong bg-surface/95 px-2.5 py-1 text-xs font-semibold tabular text-content shadow-xl"
          style={{ left: `${(idx / (data.length - 1)) * 100}%`, transform: `translateX(calc(${(idx / (data.length - 1)) * 100}% > 88% ? -100% : -50%))` }}
        >
          {valueFormat(data[idx])}
        </div>
      )}
    </div>
  )
}

export function Sparkline({ data, color, width = 84, height = 28 }: { data: number[]; color: string; width?: number; height?: number }) {
  const { path } = useMemo(() => buildPath(data, width, height, 1), [data, width, height])
  const gid = useMemo(() => `s-${Math.random().toString(36).slice(2, 8)}`, [])
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="block" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0.55" />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
      </defs>
      <path d={path} fill="none" stroke={`url(#${gid})`} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

export function Donut({
  segments,
  size = 180,
  thickness = 22,
  centerLabel,
  centerSub,
}: {
  segments: Array<{ value: number; color: string }>
  size?: number
  thickness?: number
  centerLabel?: React.ReactNode
  centerSub?: React.ReactNode
}) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1
  const r = (size - thickness) / 2
  const cx = size / 2
  const circ = 2 * Math.PI * r
  let offset = 0
  return (
    <div className="relative inline-flex" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgb(var(--fill) / 0.08)" strokeWidth={thickness} />
        {segments.map((s, i) => {
          const len = (s.value / total) * circ
          const el = (
            <circle
              key={i}
              cx={cx}
              cy={cx}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={thickness}
              strokeDasharray={`${len} ${circ - len}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          )
          offset += len
          return el
        })}
        <circle cx={cx} cy={cx} r={r - thickness / 2} fill="rgb(var(--canvas))" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {centerLabel && <div className="font-display text-xl font-bold tabular text-content">{centerLabel}</div>}
        {centerSub && <div className="mt-0.5 text-2xs uppercase tracking-wider text-content-faint">{centerSub}</div>}
      </div>
    </div>
  )
}
