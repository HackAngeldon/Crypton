import { useEffect, useRef, useState } from 'react'
import { MessageSquare, Send, Headset } from 'lucide-react'
import { api, type SupportMessage } from '@/lib/mockApi'
import { useApp } from '@/store/app'
import { PageHeader } from '@/components/PageHeader'
import { formatTime } from '@/lib/format'

export function Support() {
  const refreshSupportStatus = useApp((s) => s.refreshSupportStatus)
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const load = async () => {
    try {
      setMessages(await api.supportMessages())
    } catch {
      /* ignore transient errors */
    }
  }

  useEffect(() => {
    void load()
    const t = setInterval(() => void load(), 2000)
    return () => {
      clearInterval(t)
      void refreshSupportStatus()
    }
  }, [refreshSupportStatus])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages])

  const send = async () => {
    const text = draft.trim()
    if (!text || sending) return
    setSending(true)
    try {
      await api.sendSupportMessage(text)
      setDraft('')
      await load()
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex h-[100dvh] flex-col bg-canvas">
      <PageHeader
        back
        title="Support"
        sub="Live chat with our team"
        right={
          <span className="flex items-center gap-1.5 rounded-full bg-up/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-up">
            <span className="h-1.5 w-1.5 rounded-full bg-up animate-pulse-soft" /> Live
          </span>
        }
      />

      <div ref={scrollRef} className="flex-1 space-y-2.5 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="mt-16 text-center">
            <MessageSquare size={34} className="mx-auto text-content-faint" />
            <p className="mt-3 text-sm font-semibold text-content-mute">Chat with Crypton support</p>
            <p className="mt-1 text-xs text-content-faint">Send a message — an agent will reply live in this thread.</p>
          </div>
        )}
        {messages.map((m) => (
          <Bubble key={m.id} msg={m} />
        ))}
      </div>

      <div className="border-t border-hairline bg-surface px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
        <div className="flex items-end gap-2">
          <div className="relative flex-1">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() } }}
              placeholder="Type a message…"
              className="h-11 w-full rounded-2xl border border-hairline bg-elevate px-4 pr-11 text-sm text-content placeholder:text-content-faint outline-none transition focus:border-brand/60"
            />
            <button
              onClick={() => void send()}
              disabled={!draft.trim() || sending}
              className="press absolute right-1.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-xl bg-brand text-white disabled:opacity-40"
              aria-label="Send"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
        <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-content-faint">
          <Headset size={12} /> Support usually replies within a minute
        </p>
      </div>
    </div>
  )
}

function Bubble({ msg }: { msg: SupportMessage }) {
  const mine = msg.sender === 'user'
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm ${mine ? 'bg-brand text-white' : 'border border-hairline bg-surface text-content'}`}>
        <p className="whitespace-pre-wrap break-words">{msg.body}</p>
        <p className={`mt-1 text-[10px] ${mine ? 'text-white/60' : 'text-content-faint'}`}>{formatTime(msg.createdAt)}</p>
      </div>
    </div>
  )
}
