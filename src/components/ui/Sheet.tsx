import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-overlay/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[430px] rounded-t-4xl border border-b-0 border-hairline bg-surface animate-slide-up pb-[env(safe-area-inset-bottom)] shadow-soft">
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-fill/15" />
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h3 className="font-display text-lg font-semibold text-content">{title}</h3>
          <button onClick={onClose} className="press rounded-xl p-2 text-content-mute hover:bg-fill/5">
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[72vh] overflow-y-auto px-5 pb-4">{children}</div>
        {footer && <div className="border-t border-hairline px-5 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
