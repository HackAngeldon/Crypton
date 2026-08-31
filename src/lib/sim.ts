/** Deterministic pseudo-random helpers + a market simulation engine used when the live API is unreachable. */

export function hashSeed(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

let _idSeed = Date.now() % 1000000
export function genId(prefix = 'id'): string {
  _idSeed = (_idSeed + 1) % 1000000
  return `${prefix}_${_idSeed.toString(36)}${Date.now().toString(36).slice(-4)}`
}

const ADDR_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
export function genAddress(chain: string, coinId: string): string {
  const rnd = mulberry32(hashSeed(chain + coinId))
  const prefixMap: Record<string, string> = {
    Bitcoin: 'bc1q',
    Ethereum: '0x',
    Solana: '',
    Cardano: 'addr1',
    'XRP Ledger': 'r',
    Dogecoin: 'D',
    'BNB Chain': '0x',
    NEAR: '',
    Polygon: '0x',
  }
  const prefix = prefixMap[chain] ?? '0x'
  let body = ''
  for (let i = 0; i < 34; i++) body += ADDR_ALPHABET[Math.floor(rnd() * ADDR_ALPHABET.length)]
  return prefix + body
}

/** Generate a realistic random-walk series ending near `endPrice`. */
export function randomWalkSeries(
  seedStr: string,
  endPrice: number,
  points: number,
  volatility = 0.004,
  drift = 0,
): number[] {
  const rnd = mulberry32(hashSeed(seedStr + endPrice.toFixed(4)))
  const out: number[] = []
  let p = endPrice
  // walk backwards so the series terminates exactly at endPrice
  for (let i = points - 1; i >= 0; i--) {
    const shock = (rnd() * 2 - 1) * volatility
    p = p / (1 + shock + drift)
    out[i] = p
  }
  return out
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

/** Small gaussian-ish jitter around a base rate. */
export function jitter(base: number, pct: number, rnd = Math.random): number {
  return base * (1 + (rnd() * 2 - 1) * pct)
}

export function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
