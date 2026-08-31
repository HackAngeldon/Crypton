import type { Tx } from '@/types'
import { CoinIcon } from './CoinIcon'
import { formatCoin, formatUsd, timeAgo } from '@/lib/format'
import { COIN_MAP } from '@/data/coins'
import { ArrowUpRight, ArrowDownLeft, Repeat, CreditCard, ShieldCheck } from 'lucide-react'

export function TxIcon({ tx, size = 40 }: { tx: Tx; size?: number }) {
  if (tx.type === 'swap_out') {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-brand/25 bg-brand/10">
        <Repeat size={size * 0.45} className="text-brand" />
      </div>
    )
  }
  if (tx.type === 'buy') {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-warn/25 bg-warn/10">
        <CreditCard size={size * 0.45} className="text-warn" />
      </div>
    )
  }
  if (tx.type === 'admin_credit' || tx.type === 'admin_debit') {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-up/25 bg-up/10">
        <ShieldCheck size={size * 0.45} className="text-up" />
      </div>
    )
  }
  return <CoinIcon coin={tx.asset} size={size} />
}

const TYPE_LABEL: Record<Tx['type'], string> = {
  send: 'Sent',
  receive: 'Received',
  swap_in: 'Swap',
  swap_out: 'Swap',
  buy: 'Bought',
  admin_credit: 'Credit',
  admin_debit: 'Adjustment',
}

export function TxRow({ tx, onClick, compact }: { tx: Tx; onClick?: () => void; compact?: boolean }) {
  const isOut = tx.direction === 'out'
  const meta = COIN_MAP[tx.asset]
  const amtStr = `${isOut ? '−' : '+'}${formatCoin(tx.amount, tx.asset, { compact: true })}`
  const label = TYPE_LABEL[tx.type]
  const counter = tx.type === 'send' ? 'To ' : tx.type === 'receive' ? 'From ' : ''
  return (
    <button
      onClick={onClick}
      className="press flex w-full items-center gap-3 rounded-2xl px-1 py-3 text-left"
    >
      <TxIcon tx={tx} size={compact ? 36 : 40} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-content">{label} {meta.symbol}</p>
          {tx.status === 'pending' && (
            <span className="rounded-full bg-warn/15 px-2 py-0.5 text-[10px] font-semibold text-warn">PENDING</span>
          )}
          {tx.status === 'failed' && (
            <span className="rounded-full bg-down/15 px-2 py-0.5 text-[10px] font-semibold text-down">FAILED</span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-content-faint">
          {counter}{tx.counterparty ? (tx.counterparty.length > 18 ? tx.counterparty.slice(0, 6) + '…' + tx.counterparty.slice(-4) : tx.counterparty) : tx.note ?? tx.id}
          {' · '}{timeAgo(tx.timestamp)}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className={`text-sm font-semibold tabular ${isOut ? 'text-content' : 'text-up'}`}>{amtStr}</p>
        <p className="mt-0.5 text-xs text-content-faint tabular">{formatUsd(tx.usdValue, { compact: true })}</p>
      </div>
    </button>
  )
}

export function TxDirectionIcon({ direction }: { direction: 'in' | 'out' }) {
  return direction === 'in' ? <ArrowDownLeft size={16} className="text-up" /> : <ArrowUpRight size={16} className="text-down" />
}
