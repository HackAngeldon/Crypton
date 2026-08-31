import { initials } from '@/lib/format'

export function Avatar({ name, size = 40, className = '' }: { name: string; size?: number; className?: string; gradient?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-full bg-brand font-display font-bold text-white ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </div>
  )
}
