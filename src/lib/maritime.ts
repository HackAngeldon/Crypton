/**
 * Maritime Bank gateway client — lets Crypton charge a Maritime bank card from
 * the browser exactly like a real card processor. No Maritime session needed;
 * the card details themselves authenticate the charge.
 */

export const MARITIME_API =
  (import.meta.env.VITE_MARITIME_URL as string | undefined) ?? 'http://localhost:3000'
export const MARITIME_MERCHANT_KEY =
  (import.meta.env.VITE_MARITIME_KEY as string | undefined) ?? 'crypton-demo-2026'
export const MARITIME_MERCHANT = 'Crypton Exchange'

/** Deterministic demo card that maps to the demo@maritime.bank holder's real card. */
export const MARITIME_DEMO_CARD = {
  number: '4111 1111 1111 1111',
  expiry: '12/30',
  cvv: '123',
  holder: 'Grace Adeyemi',
} as const

export interface MaritimeCardInput {
  number: string
  expiry: string
  cvv: string
}

export interface MaritimeChargeResult {
  ok: boolean
  balance: number
  last4: string
  holder: string
  txnId: number
  cardTxnId: number
}

export interface MaritimeError {
  error: string
}

export async function maritimeGatewayHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${MARITIME_API}/api/checkout/charge`, {
      method: 'GET',
      headers: { 'x-merchant-key': MARITIME_MERCHANT_KEY },
      signal: AbortSignal.timeout(3000),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function maritimeCharge(
  amount: number,
  card: MaritimeCardInput,
  merchant = MARITIME_MERCHANT,
): Promise<MaritimeChargeResult> {
  const res = await fetch(`${MARITIME_API}/api/checkout/charge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-merchant-key': MARITIME_MERCHANT_KEY },
    body: JSON.stringify({
      cardNumber: card.number,
      expiry: card.expiry,
      cvv: card.cvv,
      amount: amount.toFixed(2),
      merchant,
    }),
  })

  if (!res.ok) {
    let message = `Maritime declined the charge (HTTP ${res.status})`
    try {
      const data = (await res.json()) as MaritimeError
      if (data?.error) message = data.error
    } catch {
      /* keep fallback */
    }
    throw new Error(message)
  }

  const data = (await res.json()) as MaritimeChargeResult
  return data
}

export function formatCardNumber(value: string): string {
  return value
    .replace(/[^\d]/g, '')
    .slice(0, 16)
    .replace(/(.{4})(?=.)/g, '$1 ')
    .trim()
}

export function formatExpiry(value: string): string {
  const digits = value.replace(/[^\d]/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}
