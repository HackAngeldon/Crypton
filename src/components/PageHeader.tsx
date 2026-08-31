import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export function PageHeader({
  title,
  sub,
  right,
  back,
  className = '',
}: {
  title?: ReactNode
  sub?: ReactNode
  right?: ReactNode
  back?: boolean
  className?: string
}) {
  const nav = useNavigate()
  return (
    <div className={`sticky top-0 z-30 border-b border-hairline bg-canvas/85 backdrop-blur-lg ${className}`}>
      <div className="flex items-center gap-3 px-4 py-3 pt-[calc(env(safe-area-inset-top)+12px)]">
        {back && (
          <button onClick={() => nav(-1)} className="press inline-flex h-9 w-9 items-center justify-center rounded-xl bg-fill/10 border border-hairlinestrong text-content-mute">
            <ArrowLeft size={18} />
          </button>
        )}
        <div className="min-w-0 flex-1">
          {title && <h1 className="truncate font-display text-lg font-bold text-content">{title}</h1>}
          {sub && <div className="text-xs text-content-faint">{sub}</div>}
        </div>
        {right}
      </div>
    </div>
  )
}
