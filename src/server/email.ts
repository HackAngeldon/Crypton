const RESEND_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM ?? "no-reply@thecrypton.xyz";

/**
 * Send a transactional email through Resend. Returns false when the API key
 * isn't configured or the request fails, so callers can fall back gracefully.
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_KEY) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_KEY}`,
      },
      body: JSON.stringify({ from: FROM, to: [to], subject, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
