function formatSender(raw: string, defaultName: string): string {
  if (!raw.includes("<") && raw.includes("@")) {
    return `${defaultName} <${raw}>`;
  }
  return raw;
}

function getResendKey(): string | undefined {
  return process.env.RESEND_API_KEY;
}
function getFrom(): string {
  const raw = process.env.EMAIL_FROM ?? "no-reply@thecrypton.xyz";
  return formatSender(raw, "Crypton");
}
export function getSupportEmail(): string {
  const raw = process.env.SUPPORT_EMAIL ?? "help@thecrypton.xyz";
  return formatSender(raw, "Crypton Support");
}
export const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL ?? "help@thecrypton.xyz";

/**
 * Send a transactional email through Resend. Returns false when the API key
 * isn't configured or the request fails, so callers can fall back gracefully.
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const key = getResendKey();
  if (!key) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ from: getFrom(), to: [to], subject, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Resend receiving (inbox) ───────────────────────────────────────────────

export type ReceivedEmail = {
  id: string;
  from: string;
  to: string[];
  cc: string[];
  bcc: string[];
  reply_to: string[];
  subject: string;
  created_at: string;
  attachments?: { id: string; filename: string; content_type: string; size: number }[];
};

export type ReceivedEmailDetail = ReceivedEmail & {
  html: string | null;
  text: string | null;
  headers: Record<string, string>;
  received_for?: string[];
};

async function authHeaders(): Promise<Headers> {
  const key = getResendKey();
  if (!key) throw new Error("RESEND_API_KEY is not configured");
  return new Headers({ Authorization: `Bearer ${key}` });
}

export async function listReceivedEmails(limit = 50): Promise<ReceivedEmail[]> {
  try {
    const res = await fetch(
      `https://api.resend.com/emails/receiving?limit=${Math.min(100, Math.max(1, limit))}`,
      { headers: await authHeaders(), cache: "no-store" },
    );
    if (!res.ok) {
      if (res.status === 404 || res.status === 403 || res.status === 401) {
        // Resend inbound receiving is not enabled or supported on this plan/key
        return [];
      }
      throw new Error(`Resend error ${res.status}: ${await res.text()}`);
    }
    const json = (await res.json()) as { data?: ReceivedEmail[] };
    return json.data ?? [];
  } catch (err) {
    if ((err as Error).message.includes("not configured")) {
      throw err;
    }
    return [];
  }
}

export async function getReceivedEmail(id: string): Promise<ReceivedEmailDetail> {
  const res = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(id)}`, {
    headers: await authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Resend error ${res.status}: ${await res.text()}`);
  return (await res.json()) as ReceivedEmailDetail;
}

export async function sendSupportEmail(opts: {
  to: string;
  cc?: string[];
  bcc?: string[];
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  const key = getResendKey();
  if (!key) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: getSupportEmail(),
        to: [opts.to],
        cc: opts.cc?.length ? opts.cc : undefined,
        bcc: opts.bcc?.length ? opts.bcc : undefined,
        subject: opts.subject,
        html: opts.html,
        text: opts.text ?? opts.html.replace(/<[^>]*>/g, " "),
      }),
    });
    if (!res.ok) {
      console.warn("Resend rejected support email:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Support email send failed:", err);
    return false;
  }
}
