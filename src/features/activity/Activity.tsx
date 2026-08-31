import { useMemo, useState } from 'react'
import { Activity as ActivityIcon, Search } from 'lucide-react'
import { useApp } from '@/store/app'
import { TxRow, TxIcon } from '@/components/TxRow'
import { PageHeader } from '@/components/PageHeader'
import { Sheet } from '@/components/ui/Sheet'
import { EmptyState } from '@/components/ui/Skeleton'
import { COIN_MAP } from '@/data/coins'
import { formatCoin, formatDate, formatPct, formatTime, formatUsd } from '@/lib/format'
import type { Tx } from '@/types'

type Filter = 'all' | 'sent' | 'received' | 'swap' | 'buy' | 'system'

export function Activity() {
  const txs = useApp((s) => s.txs)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [detail, setDetail] = useState<Tx | null>(null)

  const filtered = useMemo(() => {
    return txs.filter((t) => {
      const f =
        filter === 'all' ? true
          : filter === 'sent' ? t.type === 'send'
          : filter === 'received' ? t.type === 'receive'
          : filter === 'swap' ? t.type === 'swap_in' || t.type === 'swap_out'
          : filter === 'buy' ? t.type === 'buy'
          : t.type === 'admin_credit' || t.type === 'admin_debit'
      if (!f) return false
      if (!query) return true
      const q = query.toLowerCase()
      return (
        COIN_MAP[t.asset].symbol.toLowerCase().includes(q) ||
        (t.counterparty ?? '').toLowerCase().includes(q) ||
        (t.note ?? '').toLowerCase().includes(q) ||
        t.type.includes(q)
      )
    })
  }, [txs, filter, query])

  const groups = useMemo(() => {
    const map = new Map<string, Tx[]>()
    for (const t of filtered) {
      const d = formatDate(t.timestamp)
      map.set(d, [...(map.get(d) ?? []), t])
    }
    return [...map.entries()]
  }, [filtered])

  const filters: Array<{ id: Filter; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'sent', label: 'Sent' },
    { id: 'received', label: 'Received' },
    { id: 'swap', label: 'Swaps' },
    { id: 'buy', label: 'Buys' },
    { id: 'system', label: 'System' },
  ]

  return (
    <div className="pb-2">
      <PageHeader title="Activity" sub={`${txs.length} transactions`} />
      <div className="px-4 pt-4">
        <div className="flex items-center gap-2 rounded-2xl border border-hairline bg-elevate px-3.5">
          <Search size={16} className="text-content-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search activity…"
            className="h-10 flex-1 bg-transparent text-sm text-content placeholder:text-content-faint outline-none"
          />
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
          {filters.map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)} className={`chip ${filter === f.id ? '!bg-brand/20 !border-brand/40 !text-brand' : ''}`}>
              {f.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<ActivityIcon size={24} />}
            title="Nothing here yet"
            desc="Send, receive, or buy your first coin and it will show up here."
          />
        ) : (
          <div className="mt-4 space-y-5">
            {groups.map(([day, items]) => (
              <div key={day}>
                <p className="px-1 text-2xs font-semibold uppercase tracking-wider text-content-faint">{day}</p>
                <div className="mt-1 divide-y divide-hairline rounded-2xl border border-hairline bg-surface px-3 py-1">
                  {items.map((t) => (
                    <TxRow key={t.id} tx={t} compact onClick={() => setDetail(t)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <TxDetail tx={detail} onClose={() => setDetail(null)} />
    </div>
  )
}

export function TxDetail({ tx, onClose }: { tx: Tx | null; onClose: () => void }) {
  const meta = tx ? COIN_MAP[tx.asset] : null
  if (!tx || !meta) return null
  const statusTone = tx.status === 'confirmed' ? 'text-up bg-up/10' : tx.status === 'pending' ? 'text-warn bg-warn/10' : 'text-down bg-down/10'
  return (
    <Sheet open onClose={onClose} title="Transaction details">
      <div className="flex flex-col items-center py-4">
        <TxIcon tx={tx} size={56} />
        <p className={`mt-3 text-2xl font-bold tabular ${tx.direction === 'in' ? 'text-up' : 'text-content'}`}>
          {tx.direction === 'in' ? '+' : '−'}{formatCoin(tx.amount, tx.asset)}
        </p>
        <p className="mt-1 text-sm tabular text-content-faint">{formatUsd(tx.usdValue)}</p>
        <span className={`mt-3 rounded-full px-3 py-1 text-2xs font-bold uppercase tracking-wider ${statusTone}`}>{tx.status}</span>
      </div>
      <dl className="space-y-3 border-t border-hairline pt-4 text-sm">
        <DetailRow label="Asset"><span className="font-semibold text-content">{meta.symbol} · {meta.name}</span></DetailRow>
        <DetailRow label="Network"><span>{meta.chain}</span></DetailRow>
        <DetailRow label="Type"><span className="capitalize">{tx.type.replace('_', ' ')}</span></DetailRow>
        {tx.counterparty && <DetailRow label={tx.direction === 'in' ? 'From' : 'To'}><span className="break-all font-mono text-xs">{tx.counterparty}</span></DetailRow>}
        <DetailRow label="Network fee"><span className="tabular">{formatCoin(tx.fee, tx.asset)}</span></DetailRow>
        <DetailRow label="Date"><span>{formatDate(tx.timestamp)} · {formatTime(tx.timestamp)}</span></DetailRow>
        {tx.note && <DetailRow label="Note"><span>{tx.note}</span></DetailRow>}
        <DetailRow label="Status" last><span>{formatPct(0).replace('0.00%', '')}{tx.status === 'confirmed' ? 'Completed on-chain' : tx.status === 'pending' ? 'Awaiting confirmations' : 'Blockchain rejected this transfer'}</span></DetailRow>
        <DetailRow label="TX ID"><span className="break-all font-mono text-xs text-content-faint">{tx.id}</span></DetailRow>
      </dl>
    </Sheet>
  )
}

function DetailRow({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={`flex items-start justify-between gap-4 ${last ? '' : 'border-b border-hairline pb-3'}`}>
      <dt className="shrink-0 text-content-faint">{label}</dt>
      <dd className="min-w-0 text-right text-content">{children}</dd>
    </div>
  )
}
