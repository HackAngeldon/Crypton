import { fileURLToPath } from "node:url";

try {
  process.loadEnvFile(fileURLToPath(new URL("../.env.local", import.meta.url)));
} catch (e) {
  console.error("Could not load .env.local", e);
}

const resendKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM ?? "no-reply@thecrypton.xyz";
const supportEmail = process.env.SUPPORT_EMAIL ?? "help@thecrypton.xyz";

console.log("RESEND_API_KEY set?", Boolean(resendKey));
console.log("FROM:", from);
console.log("SUPPORT_EMAIL:", supportEmail);

if (!resendKey) {
  console.error("RESEND_API_KEY is not set in .env.local");
  process.exit(1);
}

const recipient = "karlssonandersson3@gmail.com";
const subject = "Crypton System Test Email";
const html = `
<div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 32px; border-radius: 12px; max-width: 540px; margin: 0 auto;">
  <h2 style="color: #38bdf8; margin-bottom: 16px;">Crypton Email Verification</h2>
  <p style="font-size: 15px; line-height: 1.6; color: #cbd5e1;">
    Hello,<br><br>
    This is an automated test email confirming that your Crypton internal email system is correctly integrated with <strong>Resend</strong>.
  </p>
  <div style="background-color: #1e293b; border-left: 4px solid #38bdf8; padding: 16px; margin: 20px 0; border-radius: 6px;">
    <p style="margin: 0; font-size: 14px; color: #94a3b8;">
      <strong>Status:</strong> <span style="color: #4ade80;">Operational</span><br>
      <strong>Sender:</strong> ${supportEmail}<br>
      <strong>Timestamp:</strong> ${new Date().toISOString()}
    </p>
  </div>
  <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
    &copy; ${new Date().getFullYear()} Crypton Wallet. All rights reserved.
  </p>
</div>
`;

async function run() {
  console.log(`Attempting to send email to ${recipient} via Resend...`);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: supportEmail,
      to: [recipient],
      subject,
      html,
    }),
  });

  const responseText = await res.text();
  console.log("Resend Status:", res.status);
  console.log("Resend Response:", responseText);

  if (!res.ok) {
    // If supportEmail domain is unverified on Resend, retry with onboarding@resend.dev or FROM
    console.log("Trying fallback sender if domain is not yet verified...");
    const fallbackRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: from,
        to: [recipient],
        subject,
        html,
      }),
    });
    const fallbackText = await fallbackRes.text();
    console.log("Fallback Status:", fallbackRes.status);
    console.log("Fallback Response:", fallbackText);
  }
}

run().catch(console.error);
