import { createPortal } from 'react-dom'
import { CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react'
import { useApp } from '@/store/app'
export function Toasts() {
  const toasts = useApp((s) => s.toasts)
  const dismiss = useApp((s) => s.dismissToast)
  if (!toasts.length) return null
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 px-4 pt-[calc(env(safe-area-inset-top)+12px)]">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className="pointer-events-auto flex w-full max-w-[430px] items-start gap-3 rounded-2xl border border-hairline bg-surface px-4 py-3 text-left shadow-soft animate-rise-in"
        >
          {t.kind === 'success' ? (
            <CheckCircle2 className="mt-0.5 shrink-0 text-up" size={18} />
          ) : t.kind === 'error' ? (
            <XCircle className="mt-0.5 shrink-0 text-down" size={18} />
          ) : t.kind === 'warning' ? (
            <AlertTriangle className="mt-0.5 shrink-0 text-warn" size={18} />
          ) : (
            <Info className="mt-0.5 shrink-0 text-brand" size={18} />
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-content">{t.title}</p>
            {t.desc && <p className="mt-0.5 text-xs text-content-mute">{t.desc}</p>}
          </div>
        </button>
      ))}
    </div>,
    document.body,
  )
}
