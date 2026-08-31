/** Card brand marks + detection (Visa / Mastercard) for the checkout UI. */

export type CardBrand = 'visa' | 'mastercard'

export function cardBrandOf(num: string): CardBrand | null {
  const d = num.replace(/\D/g, '')
  if (/^4/.test(d)) return 'visa'
  if (/^(5[1-5]|2(2[2-9]|[3-6]|7[01]|720))/.test(d)) return 'mastercard'
  return null
}

export function VisaMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 72 24" className={className} aria-label="Visa">
      <text
        x="0"
        y="18"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="900"
        fontStyle="italic"
        fontSize="22"
        letterSpacing="1"
        fill="currentColor"
      >
        VISA
      </text>
    </svg>
  )
}

export function MastercardMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 44 28" className={className} aria-label="Mastercard">
      <circle cx="16" cy="14" r="12" fill="#EB001B" opacity="0.92" />
      <circle cx="28" cy="14" r="12" fill="#F79E1B" opacity="0.92" />
      <rect x="17.4" y="5" width="9.2" height="18" fill="#FFF" opacity="0.35" />
    </svg>
  )
}

export function BrandMark({ brand, className = '' }: { brand: CardBrand | null; className?: string }) {
  if (brand === 'visa') return <VisaMark className={className} />
  if (brand === 'mastercard') return <MastercardMark className={className} />
  return (
    <span className="flex items-center gap-1.5 opacity-70">
      <VisaMark className="h-3.5 w-auto" />
      <MastercardMark className="h-3.5 w-auto" />
    </span>
  )
}
