import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Wallet, CreditCard, ArrowLeftRight, Send, ChartCandlestick, PieChart, Lock,
  ArrowRight, Check, Radio, BadgeCheck, Sparkles, ShieldCheck, KeyRound, Menu, X, Fingerprint,
} from 'lucide-react'
import { usePriceFeed } from '@/lib/priceFeed'
import { useCurrency } from '@/lib/currency'
import { useApp } from '@/store/app'
import { COIN_CATALOG, COIN_MAP } from '@/data/coins'
import { CoinIcon } from '@/components/CoinIcon'
import { BrandMark, cardBrandOf } from '@/components/CardBrand'
import { LogoMark } from '@/components/ui/Logo'
import { Ticker } from '@/components/Ticker'
import { AssetSparkline } from '@/components/AssetSparkline'
import { AreaChart } from '@/components/chart/Chart'
import { formatPct, formatUsd } from '@/lib/format'
import { MARITIME_DEMO_CARD, formatCardNumber, formatExpiry } from '@/lib/maritime'
import type { CoinId } from '@/types'

export function Landing() {
  const nav = useNavigate()
  const open = () => nav('/onboarding')

  return (
    <div className="min-h-screen bg-canvas font-sans text-content">
      <Nav onOpen={open} />
      <Hero onOpen={open} />
      <LiveBand />
      <Features />
      <BuyWithCard />
      <Assets />
      <Security />
      <FinalCta onOpen={open} />
      <Footer />
    </div>
  )
}

/* -------------------------------- nav ---------------------------------- */

function Nav({ onOpen }: { onOpen: () => void }) {
  const [open, setOpen] = useState(false)
  const links = [
    ['#features', 'Features'],
    ['#buy', 'Buy with a card'],
    ['#assets', 'Assets'],
    ['#security', 'Security'],
  ]
  return (
    <header className="absolute inset-x-0 top-0 z-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <a href="#top" className="flex items-center gap-2.5">
          <LogoMark size={34} />
          <span className="font-grotesk text-xl font-bold tracking-tight text-white">
            Cryp<span style={{ color: '#7DB2F5' }}>ton</span>
          </span>
        </a>
        <nav className="hidden items-center gap-7 text-sm font-medium text-white/70 md:flex">
          {links.map(([href, label]) => (
            <a key={href} href={href} className="transition hover:text-white">{label}</a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <button onClick={onOpen} className="hidden rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#0B1222] transition hover:bg-white/90 active:scale-[0.98] sm:inline-flex">
            Open app
          </button>
          <button onClick={() => setOpen((o) => !o)} className="rounded-xl border border-white/15 p-2 text-white md:hidden" aria-label="Menu">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      {open && (
        <div className="mx-5 rounded-2xl border border-white/10 bg-[#0B1222]/95 p-3 backdrop-blur md:hidden">
          {links.map(([href, label]) => (
            <a key={href} href={href} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm font-medium text-white/80 hover:bg-white/5">
              {label}
            </a>
          ))}
          <button onClick={onOpen} className="mt-1 block w-full rounded-xl bg-white px-3 py-2.5 text-center text-sm font-semibold text-[#0B1222]">
            Open app
          </button>
        </div>
      )}
    </header>
  )
}

/* -------------------------------- hero ---------------------------------- */

function Hero({ onOpen }: { onOpen: () => void }) {
  const live = usePriceFeed((s) => s.live)
  return (
    <section id="top" className="relative overflow-hidden bg-[#070B14] text-white">
      <Aurora />
      <div className="relative mx-auto grid max-w-6xl gap-14 px-5 pb-28 pt-32 md:grid-cols-[1.05fr_0.95fr] md:items-center md:pb-36 md:pt-44">
        <div className="animate-rise">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
            <span className={`h-1.5 w-1.5 rounded-full ${live ? 'bg-emerald-400 animate-pulse-soft' : 'bg-amber-400 animate-pulse-soft'}`} />
            {live ? 'Live markets' : 'Markets online'}
            <span className="text-white/30">·</span>
            PIN-secured
          </p>
          <h1 className="mt-6 font-grotesk text-[42px] font-bold leading-[1.04] tracking-tight sm:text-6xl md:text-[64px]">
            Every coin.
            <br />
            One wallet.
            <br />
            <span className="bg-gradient-to-r from-[#4F9CF5] via-[#8B7CF8] to-[#38D6C0] bg-clip-text text-transparent">
              Zero friction.
            </span>
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-white/65 md:text-lg">
            Buy with a card, swap 16 assets instantly, and watch your portfolio move in real time — behind a PIN only you know.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button onClick={onOpen} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#2566AF] via-[#4F6FE0] to-[#7C5CFF] px-7 py-4 text-sm font-semibold text-white shadow-xl shadow-[#2566AF]/30 transition hover:brightness-110 active:scale-[0.98]">
              Create your wallet <ArrowRight size={16} />
            </button>
            <a href="#assets" className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.04] px-6 py-4 text-sm font-semibold text-white/85 backdrop-blur transition hover:bg-white/10">
              See live markets
            </a>
          </div>
          <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-white/50">
            <span className="flex items-center gap-1.5"><Check size={14} className="text-emerald-400" /> No sign-up fees</span>
            <span className="flex items-center gap-1.5"><Radio size={14} className="text-[#7DB2F5]" /> CoinGecko live rates</span>
            <span className="flex items-center gap-1.5"><Lock size={14} className="text-[#B8A6FF]" /> PIN-protected</span>
          </div>
        </div>
        <HeroCard />
      </div>
    </section>
  )
}

function Aurora() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute -left-28 -top-32 h-[520px] w-[520px] rounded-full bg-[#2566AF]/35 blur-[130px] animate-aurora" />
      <div className="absolute -right-24 top-6 h-[460px] w-[460px] rounded-full bg-[#7C5CFF]/25 blur-[130px] animate-aurora-slow" />
      <div className="absolute -bottom-40 left-1/3 h-[500px] w-[500px] rounded-full bg-[#2DD4BF]/15 blur-[140px] animate-aurora" style={{ animationDelay: '4s' }} />
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,transparent_40%,rgba(7,11,20,0.6)_100%)]" />
    </div>
  )
}

const HOLDINGS: Array<[CoinId, number]> = [
  ['bitcoin', 0.05234],
  ['ethereum', 1.242],
  ['solana', 18.6],
  ['tether', 1250],
  ['usd-coin', 480],
]

function HeroCard() {
  const markets = usePriceFeed((s) => s.markets)
  const cur = useCurrency()
  const fetchSparkline = usePriceFeed((s) => s.fetchSparkline)
  const [btc, setBtc] = useState<number[] | null>(null)

  useEffect(() => {
    let alive = true
    void fetchSparkline('bitcoin', '24H').then((d) => alive && setBtc(d))
    return () => {
      alive = false
    }
  }, [fetchSparkline])

  const total = HOLDINGS.reduce((s, [id, amt]) => s + amt * (markets[id]?.price ?? 0), 0)
  const btcUp = (markets.bitcoin?.change24h ?? 0) >= 0

  return (
    <div className="relative mx-auto w-full max-w-[420px] animate-rise md:justify-self-end" style={{ animationDelay: '160ms' }}>
      <div className="pointer-events-none absolute -inset-8 rounded-[2.5rem] bg-gradient-to-br from-[#2566AF]/45 via-[#7C5CFF]/30 to-[#2DD4BF]/25 blur-3xl" aria-hidden />
      <div className="absolute -left-10 top-8 animate-float-y">
        <CoinIcon coin="bitcoin" size={46} />
      </div>
      <div className="absolute -right-9 top-24 animate-float-y" style={{ animationDelay: '1.2s' }}>
        <CoinIcon coin="solana" size={40} />
      </div>
      <div className="absolute -bottom-3 -left-5 animate-float-y" style={{ animationDelay: '2.2s' }}>
        <CoinIcon coin="ethereum" size={34} />
      </div>

      <div className="relative overflow-hidden rounded-[1.75rem] border border-white/12 bg-white/[0.07] p-6 shadow-2xl backdrop-blur-xl">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#2566AF]/30 blur-3xl" aria-hidden />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LogoMark size={26} />
            <span className="font-grotesk text-sm font-bold tracking-tight">Cryp<span style={{ color: '#7DB2F5' }}>ton</span></span>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-soft" /> Live
          </span>
        </div>

        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">Portfolio balance</p>
        <div className="mt-1 flex items-end justify-between gap-3">
          <p className="font-grotesk text-[34px] font-bold leading-none tracking-tight tabular">{cur.fmt(total, true)}</p>
          <span className={`mb-1 flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold tabular ${btcUp ? 'bg-emerald-400/15 text-emerald-300' : 'bg-rose-400/15 text-rose-300'}`}>
            {btcUp ? '▲' : '▼'} {formatPct(markets.bitcoin?.change24h ?? 0)}
          </span>
        </div>

        <div className="mt-4">
          {btc ? (
            <AreaChart data={btc} height={120} color={btcUp ? '#34D399' : '#FB7185'} valueFormat={(v) => cur.fmt(v)} showGrid={false} />
          ) : (
            <div className="h-[120px] animate-pulse rounded-xl bg-white/[0.06]" />
          )}
        </div>

        <div className="mt-4 space-y-2.5 border-t border-white/10 pt-4">
          {HOLDINGS.map(([id, amt]) => {
            const m = markets[id]
            const up = (m?.change24h ?? 0) >= 0
            return (
              <div key={id} className="flex items-center gap-3">
                <CoinIcon coin={id} size={28} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-semibold text-white/90">{COIN_MAP[id].symbol}</span>
                    <span className="text-sm font-semibold tabular text-white/90">{cur.fmt(amt * (m?.price ?? 0))}</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11px] text-white/40">{formatUsd(m?.price ?? 0, { decimals: m && m.price < 1 ? 4 : 2 })}</span>
                    <span className={`text-[11px] font-semibold tabular ${up ? 'text-emerald-300' : 'text-rose-300'}`}>{formatPct(m?.change24h ?? 0)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------ live band ------------------------------- */

function LiveBand() {
  const live = usePriceFeed((s) => s.live)
  return (
    <section className="border-b border-hairline bg-canvas">
      <Ticker live={live} />
    </section>
  )
}

/* ------------------------------- features ------------------------------- */

function Features() {
  const items = [
    { icon: CreditCard, title: 'Buy with a card', copy: 'Pick a coin, pay with a Maritime bank card, and own it in seconds.' },
    { icon: ArrowLeftRight, title: 'Instant swaps', copy: 'Fair live rates, no order books. Switch between 16 assets instantly.' },
    { icon: Send, title: 'Send & receive', copy: 'Move coins to any address. A quick PIN confirms every transaction.' },
    { icon: ChartCandlestick, title: 'Live markets', copy: 'Real-time prices, sparklines and candles streamed from CoinGecko.' },
    { icon: PieChart, title: 'Portfolio', copy: 'Every holding in one balance. See your whole position at a glance.' },
    { icon: Lock, title: 'PIN security', copy: 'Unlock, send, swap, buy — every action confirmed by a PIN you control.' },
  ]
  return (
    <section id="features" className="bg-canvas py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal className="max-w-xl">
          <Eyebrow>The wallet</Eyebrow>
          <h2 className="mt-4 font-grotesk text-3xl font-bold tracking-tight md:text-5xl">Built for the way you move money.</h2>
          <p className="mt-4 text-base text-content-mute md:text-lg">Everything you need to hold, trade and track crypto — without the bloat.</p>
        </Reveal>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((f, i) => (
            <Reveal key={f.title} delay={i * 60}>
              <div className="group h-full rounded-3xl border border-hairline bg-surface p-6 transition duration-300 hover:-translate-y-1 hover:border-brand/30 hover:shadow-soft">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/10 text-brand transition group-hover:bg-brand/15">
                  <f.icon size={20} />
                </span>
                <h3 className="mt-4 font-grotesk text-lg font-bold tracking-tight">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-content-mute">{f.copy}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ----------------------------- buy with card ---------------------------- */

function BuyWithCard() {
  const [number, setNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const brand = cardBrandOf(number)
  const steps = [
    { title: 'Pick your asset', copy: 'Choose from 16 coins and enter how much you want to spend.' },
    { title: 'Pay with your card', copy: 'Enter your Maritime bank card. We currently accept Maritime Bank cards.' },
    { title: 'It lands instantly', copy: 'The coin hits your wallet with a receipt and an updated balance.' },
  ]
  return (
    <section id="buy" className="relative overflow-hidden bg-[#0B1222] py-20 text-white md:py-28">
      <div className="pointer-events-none absolute -right-40 top-0 h-[420px] w-[420px] rounded-full bg-[#2566AF]/25 blur-[120px]" aria-hidden />
      <div className="relative mx-auto grid max-w-6xl gap-14 px-5 lg:grid-cols-2 lg:items-center">
        <div>
          <Eyebrow light>Checkout</Eyebrow>
          <h2 className="mt-4 font-grotesk text-3xl font-bold tracking-tight md:text-5xl">From card to coin in about a minute.</h2>
          <div className="mt-10 space-y-8">
            {steps.map((s, i) => (
              <Reveal key={s.title} delay={i * 80}>
                <div className="flex gap-5">
                  <div className="flex flex-col items-center">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] font-grotesk text-sm font-bold text-white/90">
                      {i + 1}
                    </span>
                    {i < steps.length - 1 && <span className="mt-2 w-px flex-1 bg-white/10" />}
                  </div>
                  <div className="pb-2">
                    <h3 className="font-grotesk text-lg font-bold tracking-tight">{s.title}</h3>
                    <p className="mt-1 max-w-sm text-sm leading-relaxed text-white/60">{s.copy}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal delay={120} className="lg:justify-self-end">
          <div className="relative mx-auto w-full max-w-[380px] rounded-[1.75rem] border border-white/12 bg-white/[0.05] p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-semibold text-white/90"><Wallet size={16} className="text-[#7DB2F5]" /> Card checkout</p>
              <BrandMark brand={brand} className="h-4 w-auto text-white" />
            </div>
            <div className="mt-5 space-y-3">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-white/40">Card number</label>
                <input
                  value={number}
                  onChange={(e) => setNumber(formatCardNumber(e.target.value))}
                  placeholder="4111 1111 1111 1111"
                  inputMode="numeric"
                  className="mt-1.5 w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 font-mono text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#7DB2F5]/60"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-white/40">Expiry</label>
                  <input
                    value={expiry}
                    onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                    placeholder="MM/YY"
                    inputMode="numeric"
                    className="mt-1.5 w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 font-mono text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#7DB2F5]/60"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-white/40">CVV</label>
                  <input
                    placeholder="123"
                    inputMode="numeric"
                    className="mt-1.5 w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 font-mono text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#7DB2F5]/60"
                  />
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setNumber(MARITIME_DEMO_CARD.number)
                setExpiry(MARITIME_DEMO_CARD.expiry)
              }}
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-white/[0.07] px-3 py-2.5 text-xs font-bold text-white/80 transition hover:bg-white/10"
            >
              <Sparkles size={13} /> Autofill demo card
            </button>
            <button className="mt-3 w-full rounded-2xl bg-gradient-to-r from-[#2566AF] via-[#4F6FE0] to-[#7C5CFF] py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#2566AF]/30 transition hover:brightness-110 active:scale-[0.98]">
              Pay and buy
            </button>
            <p className="mt-3 flex items-center justify-center gap-1 text-center text-[11px] text-white/40">
              <ShieldCheck size={12} /> Processed by Maritime Trust Bank
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* -------------------------------- assets -------------------------------- */

function Assets() {
  const hidden = useApp((s) => s.hiddenCoins)
  const coins = COIN_CATALOG.filter((c) => !hidden.includes(c.id))
  return (
    <section id="assets" className="bg-canvas py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <Eyebrow>Markets</Eyebrow>
            <h2 className="mt-4 font-grotesk text-3xl font-bold tracking-tight md:text-5xl">16 assets, one wallet.</h2>
            <p className="mt-4 text-base text-content-mute md:text-lg">Live prices and 24h trends for every coin in the catalog.</p>
          </div>
          <span className="flex items-center gap-2 rounded-full border border-hairline bg-surface px-4 py-2 text-xs font-semibold text-content-mute">
            <span className="h-2 w-2 rounded-full bg-up animate-pulse-soft" /> CoinGecko live
          </span>
        </Reveal>
        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {coins.map((c, i) => (
            <Reveal key={c.id} delay={(i % 4) * 60}>
              <div className="flex items-center gap-3 rounded-2xl border border-hairline bg-surface p-4 transition hover:border-brand/30">
                <CoinIcon coin={c.id} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-semibold">{c.symbol}</span>
                    <AssetSparkline coin={c.id} period="24H" width={44} height={18} />
                  </div>
                  <PriceRow id={c.id} />
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function PriceRow({ id }: { id: CoinId }) {
  const m = usePriceFeed((s) => s.markets[id])
  const up = (m?.change24h ?? 0) >= 0
  return (
    <div className="mt-0.5 flex items-baseline justify-between gap-2">
      <span className="truncate text-xs tabular text-content-mute">{formatUsd(m?.price ?? 0, { decimals: m && m.price < 1 ? 4 : 2 })}</span>
      <span className={`shrink-0 text-[11px] font-semibold tabular ${up ? 'text-up' : 'text-down'}`}>{formatPct(m?.change24h ?? 0)}</span>
    </div>
  )
}

/* ------------------------------- security ------------------------------- */

function Security() {
  return (
    <section id="security" className="relative overflow-hidden bg-[#070B14] py-20 text-white md:py-28">
      <div className="pointer-events-none absolute -left-40 bottom-0 h-[420px] w-[420px] rounded-full bg-[#7C5CFF]/20 blur-[120px]" aria-hidden />
      <div className="relative mx-auto grid max-w-6xl gap-14 px-5 lg:grid-cols-2 lg:items-center">
        <Reveal className="lg:order-2">
          <Eyebrow light>Security</Eyebrow>
          <h2 className="mt-4 font-grotesk text-3xl font-bold tracking-tight md:text-5xl">Your keys. Your PIN. Your call.</h2>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-white/60 md:text-lg">
            A 4–6 digit PIN you set at sign-up unlocks your wallet and confirms every transaction — send, swap, or buy. Lock it instantly, change it anytime, and keep full control.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-white/75">
            {[
              'PIN required to unlock, send, swap and buy',
              'Lock the wallet with one tap',
              'Change your PIN whenever you want',
            ].map((t) => (
              <li key={t} className="flex items-center gap-2.5">
                <BadgeCheck size={18} className="text-[#7DB2F5]" /> {t}
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={120} className="lg:order-1 lg:justify-self-start">
          <PinVisual />
        </Reveal>
      </div>
    </section>
  )
}

function PinVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[380px] rounded-[1.75rem] border border-white/12 bg-white/[0.05] p-8 text-center shadow-2xl backdrop-blur-xl">
      <div className="pointer-events-none absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-[#7C5CFF]/30 via-transparent to-[#2566AF]/30 blur-2xl" aria-hidden />
      <div className="relative">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2566AF] to-[#7C5CFF] shadow-lg shadow-[#2566AF]/40">
          <KeyRound size={28} className="text-white" />
        </span>
        <p className="mt-6 font-grotesk text-xl font-bold tracking-tight">Enter your PIN</p>
        <div className="mt-6 flex justify-center gap-3">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`relative h-4 w-4 rounded-full ${i < 2 ? 'bg-white' : 'border-2 border-white/25'}`}
              style={i === 0 ? { animation: 'pulse-ring 2.4s ease-out infinite' } : undefined}
            />
          ))}
        </div>
        <div className="mt-8 grid grid-cols-3 gap-2.5 opacity-80">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k, i) => (
            <span
              key={i}
              className={`flex h-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] font-grotesk text-base font-semibold text-white/80 ${k === '' ? 'border-transparent bg-transparent' : ''}`}
            >
              {k}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------ final cta ------------------------------- */

function FinalCta({ onOpen }: { onOpen: () => void }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#0B1222] via-[#101B33] to-[#1E1640] py-20 text-white md:py-28">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[560px] -translate-x-1/2 rounded-full bg-[#2566AF]/30 blur-[110px]" aria-hidden />
      <Reveal className="relative mx-auto max-w-2xl px-5 text-center">
        <p className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
          <Fingerprint size={13} /> Create once, own everything
        </p>
        <h2 className="mt-6 font-grotesk text-4xl font-bold tracking-tight md:text-5xl">Your first coin is minutes away.</h2>
        <p className="mx-auto mt-4 max-w-md text-base text-white/60 md:text-lg">Create a wallet free, pick an amount, and pay with your card. It's that simple.</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button onClick={onOpen} className="inline-flex items-center gap-2 rounded-2xl bg-white px-7 py-4 text-sm font-semibold text-[#0B1222] shadow-xl transition hover:bg-white/90 active:scale-[0.98]">
            Create your wallet <ArrowRight size={16} />
          </button>
          <a href="#features" className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.04] px-6 py-4 text-sm font-semibold text-white/85 transition hover:bg-white/10">
            Explore features
          </a>
        </div>
      </Reveal>
    </section>
  )
}

/* -------------------------------- footer -------------------------------- */

function Footer() {
  return (
    <footer className="border-t border-hairline bg-canvas">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-5 py-10 md:flex-row">
        <div className="flex items-center gap-2.5">
          <LogoMark size={28} />
          <span className="font-grotesk text-base font-bold tracking-tight">Cryp<span className="text-brand">ton</span></span>
        </div>
        <p className="text-center text-xs text-content-faint">© 2026 Crypton · Market data via CoinGecko</p>
        <div className="flex items-center gap-4 text-xs text-content-mute">
          <a href="#features" className="transition hover:text-content">Features</a>
          <a href="#assets" className="transition hover:text-content">Assets</a>
          <a href="#security" className="transition hover:text-content">Security</a>
        </div>
      </div>
    </footer>
  )
}

/* -------------------------------- shared -------------------------------- */

function Eyebrow({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <p className={`flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] ${light ? 'text-[#7DB2F5]' : 'text-brand'}`}>
      <span className={`h-px w-6 ${light ? 'bg-[#7DB2F5]/60' : 'bg-brand/50'}`} /> {children}
    </p>
  )
}

function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} style={{ transitionDelay: `${delay}ms` }} className={`reveal ${shown ? 'is-in' : ''} ${className}`}>
      {children}
    </div>
  )
}
