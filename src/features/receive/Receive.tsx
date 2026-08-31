import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { Check, Copy, ChevronDown } from 'lucide-react'
import { useApp } from '@/store/app'
import { COIN_MAP } from '@/data/coins'
import { CoinIcon } from '@/components/CoinIcon'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { formatCoin, shortAddr } from '@/lib/format'
import { genAddress } from '@/lib/sim'
import type { CoinId } from '@/types'

export function Receive() {
  const { asset } = useParams()
  const wallet = useApp((s) => s.wallet)
  const nav = useNavigate()
  const [coin, setCoin] = useState<CoinId>(asset && COIN_MAP[asset as CoinId] ? (asset as CoinId) : 'bitcoin')
  const [showCoins, setShowCoins] = useState(false)
  const [copied, setCopied] = useState(false)

  const meta = COIN_MAP[coin]
  const address = wallet?.addresses[coin] ?? (wallet ? genAddress(meta.chain, coin + wallet.userId) : '')
  const balance = wallet?.balances[coin] ?? 0

  const copy = async () => {
    await navigator.clipboard?.writeText(address).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="pb-10">
      <PageHeader back title="Receive" sub="Deposit into your wallet" />

      <div className="px-4 pt-5">
        <button onClick={() => setShowCoins(true)} className="mx-auto flex items-center gap-2.5 rounded-full border border-hairline bg-surface px-4 py-2">
          <CoinIcon coin={coin} size={22} />
          <span className="text-sm font-semibold text-content">{meta.name}</span>
          <ChevronDown size={16} className="text-content-faint" />
        </button>

        <div className="mt-6 rounded-3xl border border-hairline bg-surface p-6 shadow-card">
          <div className="rounded-2xl bg-white p-4">
            <QRCodeSVG
              value={address || `crypton:${coin}`}
              size={220}
              level="M"
              marginSize={1}
              style={{ width: '100%', height: 'auto', borderRadius: 12 }}
              fgColor="#0B1222"
              bgColor="#FFFFFF"
            />
          </div>
          <div className="mt-5 text-center">
            <p className="text-2xs font-semibold uppercase tracking-wider text-content-faint">Your {meta.symbol} address</p>
            <button onClick={copy} className="group mx-auto mt-2 flex items-center gap-2 rounded-xl bg-fill/5 px-3.5 py-2 font-mono text-xs text-content">
              {shortAddr(address, 10)}
              {copied ? <Check size={14} className="text-up" /> : <Copy size={14} className="text-content-faint group-hover:text-content-mute" />}
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-hairline bg-surface px-4 py-3 text-xs leading-relaxed text-content-faint">
          <p className="font-semibold text-content-mute">Deposit rules</p>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            <li>Only send <span className="font-semibold text-content">{meta.symbol}</span> to this address. Other assets may be lost.</li>
            <li>Confirmations are required before funds appear (typically 1–6 depending on network).</li>
            <li>This address is reusable and unique to you.</li>
          </ul>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-2xl border border-hairline bg-surface px-4 py-3">
          <div>
            <p className="text-2xs font-semibold uppercase tracking-wider text-content-faint">Current {meta.symbol} balance</p>
            <p className="mt-1 font-display text-lg font-bold tabular text-content">{formatCoin(balance, coin)}</p>
          </div>
          <CoinIcon coin={coin} size={38} />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <Button variant="ghost" size="lg" onClick={copy}>{copied ? 'Copied' : 'Copy address'}</Button>
          <Button size="lg" onClick={() => nav('/dashboard')}>Done</Button>
        </div>
      </div>

      <Sheet open={showCoins} onClose={() => setShowCoins(false)} title="Receive asset">
        <div className="divide-y divide-hairline">
          {COIN_MAP && Object.keys(COIN_MAP).map((id) => {
            const c = COIN_MAP[id as CoinId]
            const have = (wallet?.balances[id as CoinId] ?? 0) > 0
            return (
              <button key={id} onClick={() => { setCoin(id as CoinId); setShowCoins(false) }} className="flex w-full items-center gap-3 py-3">
                <CoinIcon coin={id as CoinId} size={32} />
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-content">{c.symbol}</p>
                  <p className="text-xs text-content-faint">{c.name}</p>
                </div>
                {have && <span className="rounded-full bg-up/10 px-2 py-0.5 text-[10px] font-bold text-up">HOLDING</span>}
              </button>
            )
          })}
        </div>
      </Sheet>
    </div>
  )
}
