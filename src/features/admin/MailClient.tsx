import { useCallback, useEffect, useRef, useState } from "react";
import {
  Mail,
  MailOpen,
  Inbox,
  Send,
  FileText,
  Trash2,
  RefreshCw,
  Reply,
  Forward,
  Edit3,
  X,
  Bold,
  Italic,
  Underline,
  Link2,
  List,
  Trash,
  RotateCcw,
  Search,
  PenLine,
  KeyRound,
} from "lucide-react";
import { api } from "@/lib/mockApi";
import { useApp } from "@/store/app";

type Folder = "inbox" | "sent" | "drafts" | "trash";

type InboxEmail = {
  id: string;
  from: string;
  to: string[];
  subject: string;
  created_at: string;
};

type InboxDetail = InboxEmail & {
  html: string | null;
  text: string | null;
  cc: string[];
  bcc: string[];
};

type LocalEmail = {
  id: string;
  from_addr: string;
  to_addrs: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  html: string;
  text: string;
  folder: string;
  created_at: number;
  updated_at: number;
};

function fmtDateTime(s: string) {
  try {
    return new Date(s).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return s;
  }
}
function fmtLocal(ts: number) {
  return new Date(ts).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
function subjectOf(s: string, prefix: string) {
  return new RegExp(`^${prefix}:`, "i").test(s) ? s : `${prefix}: ${s}`;
}

export function MailClient() {
  const toast = useApp((s) => s.toast);
  const [folder, setFolder] = useState<Folder>("inbox");
  const [inbox, setInbox] = useState<InboxEmail[]>([]);
  const [locals, setLocals] = useState<LocalEmail[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<InboxDetail | null>(null);
  const [localDetail, setLocalDetail] = useState<LocalEmail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restricted, setRestricted] = useState(false);
  const [search, setSearch] = useState("");

  const [composeOpen, setComposeOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [subject, setSubject] = useState("");
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  const loadInbox = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await api.adminListInbox();
      setInbox((res as unknown as { emails: InboxEmail[] }).emails ?? []);
      setRestricted(false);
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg);
      setRestricted(/401|403|restricted/i.test(msg));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadLocals = useCallback(async (f: Folder) => {
    if (f === "inbox") return;
    try {
      const res = await api.adminListEmails(f);
      const list = (res as unknown as { emails: LocalEmail[] }).emails ?? (res as unknown as LocalEmail[]);
      setLocals(Array.isArray(list) ? list : []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (folder === "inbox") void loadInbox();
    else void loadLocals(folder);
  }, [folder, loadInbox, loadLocals]);

  useEffect(() => {
    void loadInbox();
  }, [loadInbox]);

  async function refresh() {
    setRefreshing(true);
    if (folder === "inbox") await loadInbox(true);
    else await loadLocals(folder);
    setRefreshing(false);
  }

  function openCompose(prefill?: Partial<{ to: string; subject: string; html: string }>) {
    setEditId(null);
    setTo(prefill?.to ?? "");
    setCc("");
    setBcc("");
    setShowCc(false);
    setShowBcc(false);
    setSubject(prefill?.subject ?? "");
    if (editorRef.current) editorRef.current.innerHTML = prefill?.html ?? "";
    setComposeOpen(true);
  }

  function editDraft(m: LocalEmail) {
    setEditId(m.id);
    setTo(m.to_addrs.join(", "));
    setCc(m.cc.join(", "));
    setBcc(m.bcc.join(", "));
    setShowCc(m.cc.length > 0);
    setShowBcc(m.bcc.length > 0);
    setSubject(m.subject);
    setComposeOpen(true);
    setTimeout(() => {
      if (editorRef.current) editorRef.current.innerHTML = m.html || m.text.replace(/\n/g, "<br>") || "";
    }, 50);
  }

  async function saveDraft() {
    setSaving(true);
    try {
      const html = editorRef.current?.innerHTML ?? "";
      const text = editorRef.current?.innerText ?? "";
      await api.adminSaveDraft({ id: editId ?? undefined, to, cc, bcc, subject, html, text });
      toast({ kind: "success", title: "Draft saved" });
      setComposeOpen(false);
      if (folder === "drafts") await loadLocals("drafts");
    } catch (e) {
      toast({ kind: "error", title: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      const html = editorRef.current?.innerHTML ?? "";
      const text = editorRef.current?.innerText ?? "";
      await api.adminSendEmail({ to, cc, bcc, subject, html, text, draftId: editId ?? undefined });
      toast({ kind: "success", title: `Email sent to ${to}` });
      setComposeOpen(false);
      setEditId(null);
      setTo("");
      setSubject("");
      if (editorRef.current) editorRef.current.innerHTML = "";
      if (folder === "sent") await loadLocals("sent");
    } catch (err) {
      toast({ kind: "error", title: (err as Error).message });
    } finally {
      setSending(false);
    }
  }

  async function trashLocal() {
    if (!localDetail) return;
    await api.adminTrashEmail(localDetail.id);
    setLocals((prev) => prev.filter((m) => m.id !== localDetail!.id));
    setSelectedId(null);
    setLocalDetail(null);
    setDetail(null);
    toast({ kind: "success", title: "Moved to Trash" });
  }

  async function restoreLocal() {
    if (!localDetail) return;
    await api.adminRestoreEmail(localDetail.id);
    setLocals((prev) => prev.filter((m) => m.id !== localDetail!.id));
    setSelectedId(null);
    toast({ kind: "success", title: "Restored" });
  }

  async function delLocal() {
    if (!localDetail) return;
    await api.adminDeleteEmail(localDetail.id);
    setLocals((prev) => prev.filter((m) => m.id !== localDetail!.id));
    setSelectedId(null);
    toast({ kind: "success", title: "Deleted permanently" });
  }

  function reply(toDetail: InboxDetail | LocalEmail | null) {
    if (!toDetail) return;
    const from = (toDetail as InboxDetail).from ?? (toDetail as LocalEmail).from_addr ?? "";
    const subj = (toDetail as LocalEmail).subject ?? (toDetail as InboxDetail).subject ?? "";
    openCompose({ to: from, subject: subjectOf(subj, "Re"), html: "" });
  }

  function forward(toDetail: InboxDetail | LocalEmail | null) {
    if (!toDetail) return;
    const subj = (toDetail as LocalEmail).subject ?? (toDetail as InboxDetail).subject ?? "";
    const html = (toDetail as InboxDetail).html ?? (toDetail as LocalEmail).html ?? (toDetail as InboxDetail).text ?? "";
    openCompose({ subject: subjectOf(subj, "Fwd"), html: `<br><blockquote style="border-left:3px solid #e5e7eb;padding-left:12px;margin:12px 0;color:#6b7280">${html}</blockquote>` });
  }

  function exec(cmd: string, val?: string) {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
  }

  const filteredInbox = inbox.filter(
    (m) => !search || m.from.toLowerCase().includes(search.toLowerCase()) || m.subject.toLowerCase().includes(search.toLowerCase())
  );
  const filteredLocals = locals.filter(
    (m) => !search || m.to_addrs.join(",").toLowerCase().includes(search.toLowerCase()) || m.subject.toLowerCase().includes(search.toLowerCase())
  );

  const activeDetail: InboxDetail | LocalEmail | null = detail ?? localDetail;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm text-content-faint">
            <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-[11px] font-bold text-brand">help@thecrypton.xyz</span>
            Support mailbox
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-content">Mail</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-xl border border-hairline bg-surface px-3 py-2 text-sm font-semibold text-content-mute hover:bg-elevate disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button onClick={() => openCompose()} className="flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90">
            <PenLine className="h-4 w-4" /> Compose
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-down/20 bg-down/5 px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-down">
            <KeyRound className="h-4 w-4" /> {error}
          </p>
          {restricted && (
            <p className="mt-1 text-xs text-content-faint">Inbox needs a Resend API key with full access (current key is send-only). Sending still works.</p>
          )}
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {(
          [
            ["inbox", "Inbox", Inbox],
            ["sent", "Sent", Send],
            ["drafts", "Drafts", FileText],
            ["trash", "Trash", Trash2],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => {
              setFolder(key as Folder);
              setSelectedId(null);
              setDetail(null);
              setLocalDetail(null);
            }}
            className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
              folder === key ? "bg-brand text-white shadow" : "border border-hairline bg-surface text-content-faint hover:bg-elevate"
            }`}
          >
            <Icon size={15} /> {label}
            {key === "inbox" && inbox.length > 0 && (
              <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[11px] font-bold ${folder === key ? "bg-white/20 text-white" : "bg-fill/10 text-content-mute"}`}>{inbox.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="flex h-[38vh] min-w-0 flex-col overflow-hidden rounded-2xl border border-hairline bg-surface lg:h-[68vh]">
          <div className="flex shrink-0 items-center gap-2 border-b border-hairline px-3 py-2">
            <Search size={14} className="text-content-faint" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search mail…"
              className="h-8 flex-1 bg-transparent text-sm text-content placeholder:text-content-faint outline-none"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {folder === "inbox" ? (
              loading ? (
                <div className="p-8 text-center text-sm text-content-faint">Loading inbox…</div>
              ) : filteredInbox.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                  <Mail size={28} className="text-content-faint" />
                  <p className="mt-2 text-sm font-semibold text-content-mute">No messages</p>
                  <p className="text-xs text-content-faint">Emails to help@thecrypton.xyz appear here</p>
                </div>
              ) : (
                <div className="divide-y divide-hairline">
                  {filteredInbox.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setSelectedId(m.id);
                        setDetail(null);
                        setLocalDetail(null);
                        api.adminGetInboxEmail(m.id).then((r: unknown) => setDetail((r as { email: InboxDetail }).email)).catch(() => {});
                      }}
                      className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition ${selectedId === m.id ? "bg-brand/10" : "hover:bg-elevate"}`}
                    >
                      <div className="flex w-full items-center gap-2">
                        <span className="truncate text-sm font-semibold text-content">{m.from}</span>
                        <span className="ml-auto shrink-0 text-[11px] text-content-faint">{fmtDateTime(m.created_at)}</span>
                      </div>
                      <span className="truncate text-sm text-content-mute">{m.subject || "(no subject)"}</span>
                    </button>
                  ))}
                </div>
              )
            ) : (
              <div className="divide-y divide-hairline">
                {filteredLocals.length === 0 ? (
                  <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                    <FileText size={28} className="text-content-faint" />
                    <p className="mt-2 text-sm font-semibold text-content-mute">Empty</p>
                    <p className="text-xs text-content-faint">No messages in {folder}</p>
                  </div>
                ) : (
                  filteredLocals.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setSelectedId(m.id);
                        setLocalDetail(m);
                        setDetail(null);
                      }}
                      className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition ${selectedId === m.id ? "bg-brand/10" : "hover:bg-elevate"}`}
                    >
                      <div className="flex w-full items-center gap-2">
                        <span className="truncate text-sm font-semibold text-content">{m.to_addrs.join(", ") || "—"}</span>
                        <span className="ml-auto shrink-0 text-[11px] text-content-faint">{fmtLocal(m.updated_at)}</span>
                      </div>
                      <span className="truncate text-sm text-content-mute">{m.subject || "(no subject)"}</span>
                      <span className="truncate text-xs text-content-faint">{m.text.slice(0, 80)}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex h-[56vh] min-w-0 flex-col overflow-hidden rounded-2xl border border-hairline bg-surface lg:h-[68vh]">
          {!activeDetail ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              <MailOpen size={32} className="text-content-faint" />
              <p className="mt-3 text-sm font-semibold text-content-mute">Select a message</p>
              <p className="max-w-xs text-xs text-content-faint">Choose an email on the left, or compose a new one. HTML emails render in a secure sandboxed view.</p>
            </div>
          ) : (
            <>
              <div className="shrink-0 border-b border-hairline px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-display text-lg font-bold text-content">{((activeDetail as LocalEmail).subject ?? (activeDetail as InboxDetail).subject) || "(no subject)"}</h2>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-content-faint">
                      <span>
                        From <b className="text-content">{(activeDetail as LocalEmail).from_addr ?? (activeDetail as InboxDetail).from ?? "—"}</b>
                      </span>
                      <span>
                        To <b className="text-content">
                          {Array.isArray((activeDetail as LocalEmail).to_addrs)
                            ? (activeDetail as LocalEmail).to_addrs.join(", ")
                            : (((activeDetail as InboxDetail).to as string[]) || []).join(", ") || "—"}
                        </b>
                      </span>
                    </div>
                    {(((activeDetail as LocalEmail).cc?.length ?? 0) > 0 || ((activeDetail as InboxDetail).cc?.length ?? 0) > 0) && (
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-content-faint">
                        <span>Cc {(((activeDetail as LocalEmail).cc as string[]) || ((activeDetail as InboxDetail).cc as string[]) || []).join(", ")}</span>
                      </div>
                    )}
                    <div className="mt-1 text-xs text-content-faint">
                      {(activeDetail as LocalEmail).created_at ? fmtLocal((activeDetail as LocalEmail).created_at) : fmtDateTime((activeDetail as InboxDetail).created_at)}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <button onClick={() => reply(activeDetail)} className="inline-flex items-center gap-1.5 rounded-xl border border-hairline bg-surface px-3 py-1.5 text-xs font-semibold text-content hover:bg-elevate">
                    <Reply size={14} /> Reply
                  </button>
                  <button onClick={() => forward(activeDetail)} className="inline-flex items-center gap-1.5 rounded-xl border border-hairline bg-surface px-3 py-1.5 text-xs font-semibold text-content hover:bg-elevate">
                    <Forward size={14} /> Forward
                  </button>
                  {folder !== "trash" ? (
                    <button onClick={() => (folder === "inbox" ? toast({ kind: "success", title: "Inbox is managed in Resend" }) : trashLocal())} className="inline-flex items-center gap-1.5 rounded-xl border border-hairline bg-surface px-3 py-1.5 text-xs font-semibold text-content hover:bg-elevate">
                      <Trash2 size={14} /> Delete
                    </button>
                  ) : (
                    <>
                      <button onClick={restoreLocal} className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3 py-1.5 text-xs font-semibold text-white">
                        <RotateCcw size={14} /> Restore
                      </button>
                      <button onClick={delLocal} className="inline-flex items-center gap-1.5 rounded-xl border border-down/30 bg-down/10 px-3 py-1.5 text-xs font-semibold text-down">
                        <Trash size={14} /> Delete permanently
                      </button>
                    </>
                  )}
                  {folder === "drafts" && (
                    <button onClick={() => activeDetail && editDraft(activeDetail as LocalEmail)} className="inline-flex items-center gap-1.5 rounded-xl border border-hairline bg-surface px-3 py-1.5 text-xs font-semibold text-content hover:bg-elevate">
                      <Edit3 size={14} /> Edit draft
                    </button>
                  )}
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-hidden bg-white">
                {(() => {
                  const html = (activeDetail as LocalEmail).html ?? (activeDetail as InboxDetail).html ?? null;
                  const text = (activeDetail as LocalEmail).text ?? (activeDetail as InboxDetail).text ?? null;
                  if (html) return <iframe title="Email" sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox" srcDoc={html} className="h-full w-full border-0" />;
                  if (text) return <pre className="h-full w-full overflow-y-auto whitespace-pre-wrap p-5 font-sans text-sm leading-relaxed text-content">{text}</pre>;
                  return <div className="flex h-full items-center justify-center p-8 text-sm text-content-faint">(empty message)</div>;
                })()}
              </div>
            </>
          )}
        </div>
      </div>

      {composeOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-overlay/60 p-0 sm:items-center sm:p-4">
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-2xl border border-hairline bg-surface shadow-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-hairline px-5 py-3">
              <h3 className="font-display text-base font-bold text-content">{editId ? "Edit draft" : "Compose email"}</h3>
              <button onClick={() => setComposeOpen(false)} className="rounded-xl p-1.5 text-content-faint hover:bg-elevate">
                <X size={18} />
              </button>
            </div>

            <div className="border-b border-hairline px-5 py-2.5">
              <div className="flex items-center gap-2">
                <span className="w-10 shrink-0 text-xs font-semibold text-content-faint">To</span>
                <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="customer@example.com, ..." className="flex-1 bg-transparent text-sm text-content placeholder:text-content-faint outline-none" required />
                {!showCc && !showBcc && (
                  <button type="button" onClick={() => setShowCc(true)} className="shrink-0 text-xs font-semibold text-brand hover:underline">
                    Cc / Bcc
                  </button>
                )}
              </div>
              {showCc && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="w-10 shrink-0 text-xs font-semibold text-content-faint">Cc</span>
                  <input value={cc} onChange={(e) => setCc(e.target.value)} placeholder="cc@example.com" className="flex-1 bg-transparent text-sm text-content placeholder:text-content-faint outline-none" />
                  {!showBcc && (
                    <button type="button" onClick={() => setShowBcc(true)} className="text-xs font-semibold text-brand">
                      Bcc
                    </button>
                  )}
                </div>
              )}
              {showBcc && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="w-10 shrink-0 text-xs font-semibold text-content-faint">Bcc</span>
                  <input value={bcc} onChange={(e) => setBcc(e.target.value)} placeholder="bcc@example.com" className="flex-1 bg-transparent text-sm text-content placeholder:text-content-faint outline-none" />
                </div>
              )}
              <div className="mt-2 flex items-center gap-2 border-t border-hairline pt-2.5">
                <span className="w-10 shrink-0 text-xs font-semibold text-content-faint">Subject</span>
                <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Regarding your Crypton account" className="flex-1 bg-transparent text-sm font-semibold text-content placeholder:text-content-faint outline-none" required />
              </div>
            </div>

            <div className="flex items-center gap-1 border-b border-hairline bg-elevate/50 px-3 py-1.5">
              <button type="button" onClick={() => exec("bold")} className="rounded-lg p-1.5 text-content-mute hover:bg-surface hover:text-content" title="Bold">
                <Bold size={14} />
              </button>
              <button type="button" onClick={() => exec("italic")} className="rounded-lg p-1.5 text-content-mute hover:bg-surface hover:text-content" title="Italic">
                <Italic size={14} />
              </button>
              <button type="button" onClick={() => exec("underline")} className="rounded-lg p-1.5 text-content-mute hover:bg-surface hover:text-content" title="Underline">
                <Underline size={14} />
              </button>
              <span className="mx-1 h-4 w-px bg-hairline" />
              <button
                type="button"
                onClick={() => {
                  const url = prompt("Enter URL");
                  if (url) exec("createLink", url);
                }}
                className="rounded-lg p-1.5 text-content-mute hover:bg-surface hover:text-content"
                title="Link"
              >
                <Link2 size={14} />
              </button>
              <button type="button" onClick={() => exec("insertUnorderedList")} className="rounded-lg p-1.5 text-content-mute hover:bg-surface hover:text-content" title="List">
                <List size={14} />
              </button>
            </div>

            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              data-placeholder="Write your message… HTML is supported and will render exactly as sent."
              className="min-h-[220px] max-h-[36vh] flex-1 overflow-y-auto px-5 py-4 text-sm leading-relaxed text-content outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-content-faint"
            />

            <div className="flex items-center justify-between border-t border-hairline bg-elevate/30 px-5 py-3">
              <span className="flex items-center gap-1.5 text-xs text-content-faint">
                <span className="rounded-full bg-brand/10 px-2 py-0.5 font-mono text-[11px] font-bold text-brand">help@thecrypton.xyz</span> via Resend
              </span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={saveDraft} disabled={saving} className="rounded-xl border border-hairline bg-surface px-4 py-2 text-sm font-semibold text-content hover:bg-elevate disabled:opacity-50">
                  {saving ? "Saving…" : "Save draft"}
                </button>
                <button type="button" onClick={() => setComposeOpen(false)} className="rounded-xl border border-hairline bg-surface px-4 py-2 text-sm font-semibold text-content hover:bg-elevate">
                  Cancel
                </button>
                <button onClick={(e) => send(e as unknown as React.FormEvent)} disabled={sending} className="rounded-xl bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-50">
                  {sending ? "Sending…" : "Send"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
