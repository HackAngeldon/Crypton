import { useId } from 'react'
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { AlertCircle } from 'lucide-react'

interface FieldProps {
  label?: string
  error?: string
  hint?: string
  right?: React.ReactNode
}

export function Field({ label, error, hint, right, children }: FieldProps & { children: React.ReactNode }) {
  return (
    <label className="block">
      {(label || right) && (
        <div className="mb-1.5 flex items-center justify-between px-0.5">
          {label && <span className="text-2xs font-semibold uppercase tracking-wider text-content-faint">{label}</span>}
          {right}
        </div>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 flex items-center gap-1 px-0.5 text-xs text-down">
          <AlertCircle size={13} /> {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 px-0.5 text-xs text-content-faint">{hint}</p>
      ) : null}
    </label>
  )
}

const baseInput =
  'w-full rounded-2xl border border-hairline bg-elevate px-4 text-[15px] text-content placeholder:text-content-faint outline-none transition focus:border-brand/60 focus:ring-2 focus:ring-brand/20'

export function TextInput({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${baseInput} h-12 ${className}`} {...rest} />
}

export function AmountInput({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      inputMode="decimal"
      autoComplete="off"
      className={`${baseInput} font-display text-2xl font-semibold tabular tracking-tight h-16 px-5 ${className}`}
      {...rest}
    />
  )
}

export function TextArea({ className = '', ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${baseInput} min-h-24 py-3 ${className}`} {...rest} />
}

export function PinDots({ value, length = 6, error }: { value: string; length?: number; error?: boolean }) {
  const id = useId()
  return (
    <div className="flex justify-center gap-3">
      {Array.from({ length }).map((_, i) => (
        <div
          key={`${id}-${i}`}
          className={`h-4 w-4 rounded-full border-2 transition-all duration-150 ${
            i < value.length
              ? 'border-brand bg-brand shadow-card scale-110'
              : error
                ? 'border-down/70'
                : 'border-hairlinestrong'
          }`}
        />
      ))}
    </div>
  )
}
