export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
      <rect width="64" height="64" rx="18" fill="rgb(var(--brand))" />
      <path d="M14 32c0-9.9 8.1-18 18-18s18 8.1 18 18-8.1 18-18 18" fill="none" stroke="#FFFFFF" strokeWidth="5" opacity="0.9" />
      <path d="M25 32h14M29 26l-4 6 4 6" stroke="#FFFFFF" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Wordmark({ size = 22, className = '' }: { size?: number; className?: string }) {
  return (
    <span className={`font-display font-bold tracking-tight ${className}`} style={{ fontSize: size }}>
      Cryp<span className="text-brand">ton</span>
    </span>
  )
}
