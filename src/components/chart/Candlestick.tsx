import { useMemo, useRef, useState } from 'react'
import type { Candle } from '@/lib/candles'

const UP = 'rgb(var(--up))'
const DOWN = 'rgb(var(--down))'

export function CandlestickChart({
  candles,
  height = 200,
  valueFormat,
}: {
  candles: Candle[]
  height?: number
  valueFormat?: (v: number) => string
}) {
  const w = 340
  const pad = 6
  const [hover, setHover] = useState<number | null>(null)
  const ref = useRef<SVGSVGElement>(null)
  const gid = useMemo(() => `c-${Math.random().toString(36).slice(2, 8)}`, [])

  if (!candles.length) return <div style={{ height }} className="animate-pulse rounded-xl bg-fill/5" />

  const lo = Math.min(...candles.map((c) => c.low))
  const hi = Math.max(...candles.map((c) => c.high))
  const span = hi - lo || 1
  const priceH = height * 0.76
  const volTop = height * 0.8
  const maxVol = Math.max(...candles.map((c) => c.volume), 1)
  const n = candles.length
  const slot = (w - pad * 2) / n
  const bw = Math.max(2, slot * 0.62)
  const x = (i: number) => pad + i * slot + slot / 2
  const priceY = (v: number) => pad + priceH - ((v - lo) / span) * (priceH - pad * 2)

  const onMove = (e: React.PointerEvent) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    setHover(Math.min(n - 1, Math.floor(ratio * n)))
  }

  const gridLines = [0.25, 0.5, 0.75].map((t) => pad + t * (priceH - pad * 2))
  const active = hover !== null ? candles[hover] : null
  const prevClose = hover !== null ? (hover > 0 ? candles[hover - 1].close : candles[hover].open) : null

  return (
    <div className="relative">
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
          <clipPath id={`${gid}-clip`}>
            <rect x="0" y="0" width={w} height={height} rx="8" />
          </clipPath>
        </defs>
        {gridLines.map((y) => (
          <line key={y} x1="0" x2={w} y1={y} y2={y} stroke="rgb(var(--fill) / 0.06)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        ))}
        <g clipPath={`url(#${gid}-clip)`}>
          {candles.map((c, i) => {
            const up = c.close >= c.open
            const color = up ? UP : DOWN
            const bodyTop = Math.min(priceY(c.open), priceY(c.close))
            const bodyBot = Math.max(priceY(c.open), priceY(c.close))
            const bh = Math.max(1.5, bodyBot - bodyTop)
            const volH = (c.volume / maxVol) * (height - volTop - 4)
            return (
              <g key={i}>
                <line x1={x(i)} x2={x(i)} y1={priceY(c.high)} y2={priceY(c.low)} stroke={color} strokeWidth="1" vectorEffect="non-scaling-stroke" />
                <rect x={x(i) - bw / 2} y={bodyTop} width={bw} height={bh} fill={color} rx="0.75" />
                <rect x={x(i) - bw * 0.38} y={volTop + (height - volTop - 4 - volH)} width={bw * 0.76} height={volH} fill={color} opacity="0.22" rx="0.5" />
              </g>
            )
          })}
        </g>
        {active && (
          <g>
            <line x1={x(hover!)} x2={x(hover!)} y1="0" y2={height} stroke="rgb(var(--fill) / 0.2)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            <line x1="0" x2={w} y1={priceY(active.close)} y2={priceY(active.close)} stroke="rgb(var(--fill) / 0.15)" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
            <circle cx={x(hover!)} cy={priceY(active.close)} r="3.5" fill={active.close >= active.open ? UP : DOWN} stroke="rgb(var(--surface))" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          </g>
        )}
      </svg>

      {active && (
        <div
          className="pointer-events-none absolute top-1 z-10 min-w-[132px] rounded-xl border border-hairline bg-surface px-3 py-2 shadow-soft"
          style={{
            left: `${((hover ?? 0) / (n - 1)) * 100}%`,
            transform: (hover ?? 0) / (n - 1) > 0.85 ? 'translateX(calc(-100% - 8px))' : 'translateX(8px)',
          }}
        >
          <div className="flex items-center justify-between gap-3 text-[11px]">
            <span className="text-content-faint">O</span>
            <span className="tabular font-semibold text-content">{valueFormat ? valueFormat(active.open) : active.open.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-[11px]">
            <span className="text-content-faint">H</span>
            <span className="tabular font-semibold text-up">{valueFormat ? valueFormat(active.high) : active.high.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-[11px]">
            <span className="text-content-faint">L</span>
            <span className="tabular font-semibold text-down">{valueFormat ? valueFormat(active.low) : active.low.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-[11px]">
            <span className="text-content-faint">C</span>
            <span className="tabular font-semibold text-content">{valueFormat ? valueFormat(active.close) : active.close.toFixed(2)}</span>
          </div>
          {prevClose !== null && prevClose > 0 && (
            <div className="mt-1.5 flex items-center justify-between border-t border-hairline pt-1.5 text-[11px]">
              <span className="text-content-faint">Δ</span>
              <span className={`tabular font-semibold ${active.close >= prevClose ? 'text-up' : 'text-down'}`}>
                {((active.close - prevClose) / prevClose) * 100 >= 0 ? '+' : ''}
                {(((active.close - prevClose) / prevClose) * 100).toFixed(2)}%
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
