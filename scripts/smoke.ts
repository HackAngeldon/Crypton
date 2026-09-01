/* HTTP smoke test for the Crypton backend. Run with: npm test
   Requires DATABASE_URL (from .env.local) — it seeds the crypton_* tables on
   first access and creates throwaway test users. */

import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { handleRoute } from "../src/server/http";

try {
  process.loadEnvFile(fileURLToPath(new URL("../.env.local", import.meta.url)));
} catch {
  /* no .env.local — DATABASE_URL must come from the environment */
}

const PORT = 8799;
const BASE = `http://127.0.0.1:${PORT}`;

let pass = 0;
let fail = 0;
function ok(cond: boolean, msg: string) {
  if (cond) {
    pass++;
    console.log(`  \u2713 ${msg}`);
  } else {
    fail++;
    console.error(`  \u2717 FAIL: ${msg}`);
  }
}

async function req(method: string, path: string, body?: unknown, token?: string) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

const srv = createServer((req, res) => {
  handleRoute(req, res).catch(() => {
    res.statusCode = 500;
    res.end("Internal error");
  });
});
await new Promise<void>((resolve) => srv.listen(PORT, resolve));

console.log("meta / auth");
let r = await req("GET", "/meta");
ok(r.status === 200 && r.data.seeded, "db seeded");

const email = `smoke-${Date.now()}@crypton.test`;
r = await req("POST", "/auth/register", { name: "Smoke Test", email, pin: "777777" });
ok(r.status === 200 && !!r.data.token, "register works");
const token = r.data.token as string;
const userId = r.data.user.id as string;

r = await req("POST", "/auth/login", { email, pin: "9999" });
ok(r.status === 400, "wrong PIN rejected");

r = await req("POST", "/auth/login", { email, pin: "777777" });
ok(r.status === 200 && !!r.data.token, "login works");

r = await req("GET", "/me", undefined, token);
ok(r.status === 200 && (r.data.wallet.balances.tether ?? 0) === 0 && (r.data.wallet.balances.bitcoin ?? 0) === 0, "new account starts at zero");
ok(r.status === 200 && Object.keys(r.data.wallet.addresses ?? {}).length >= 16, "every coin has a deposit address");

r = await req("GET", `/auth/pin-length?email=${encodeURIComponent(email)}`);
ok(r.data.pinLen === 6, "pinLength resolved");

console.log("send / buy / swap");
r = await req("POST", "/send", { asset: "bitcoin", amount: 999, address: "bc1q".padEnd(20, "a"), feeTier: "standard", price: 64000, pin: "777777" }, token);
ok(r.status === 400 && /Insufficient/.test(r.data.error ?? ""), "insufficient balance rejected");

r = await req("POST", "/deposit-fiat", { amount: 500 }, token);
ok(r.status === 200, "deposit fiat works");

r = await req("POST", "/buy", { asset: "bitcoin", fiatAmount: 100, price: 64000, pin: "777777" }, token);
ok(r.status === 200 && r.data.type === "buy", "buy works");

r = await req("POST", "/swap", { from: "bitcoin", to: "tether", amount: 0.001, rate: 64000, priceFrom: 64000, priceTo: 1, pin: "9999" }, token);
ok(r.status === 400 && /Incorrect PIN/.test(r.data.error ?? ""), "wrong PIN rejected for swap");

r = await req("POST", "/swap", { from: "bitcoin", to: "tether", amount: 0.001, rate: 64000, priceFrom: 64000, priceTo: 1, pin: "777777" }, token);
ok(r.status === 200 && r.data.received > 0, "swap works with correct PIN");

r = await req("GET", "/transactions", undefined, token);
ok(r.status === 200 && Array.isArray(r.data) && r.data.length >= 4, "tx list works");

console.log("pin change");
r = await req("POST", "/auth/change-pin", { current: "777777", next: "888888" }, token);
ok(r.status === 200, "change pin works");
r = await req("POST", "/auth/unlock", { pin: "888888" }, token);
ok(r.status === 200, "new pin unlocks");

console.log("admin");
const adminLogin = await req("POST", "/auth/login", { email: "admin@crypton.app", pin: "000000" });
ok(adminLogin.status === 200, "admin login works");
const atok = adminLogin.data.token as string;

r = await req("GET", "/admin/users", undefined, atok);
ok(r.status === 200 && r.data.length >= 2, "admin lists users");

const freezeId = r.data.find((u: { email: string }) => u.email === email)?.id;
r = await req("POST", "/admin/freeze", { userId: freezeId, frozen: true }, atok);
ok(r.status === 200 && r.data.frozen === true, "admin freezes user");
r = await req("POST", "/admin/freeze", { userId: freezeId, frozen: false }, atok);
ok(r.status === 200 && r.data.frozen === false, "admin unfreezes user");

r = await req("POST", "/admin/override-price", { asset: "bitcoin", price: 99999 }, atok);
ok(r.status === 200, "price override set");

r = await req("GET", "/admin/wallet?userId=" + encodeURIComponent(userId), undefined, atok);
const btcBefore = r.data.balances.bitcoin ?? 0;
r = await req("POST", "/admin/deposit", { userId, asset: "bitcoin", amount: 0.5, price: 64000 }, atok);
ok(r.status === 200 && r.data.type === "receive", "admin deposit credits user");
r = await req("GET", "/admin/wallet?userId=" + encodeURIComponent(userId), undefined, atok);
ok(Math.abs((r.data.balances.bitcoin ?? 0) - (btcBefore + 0.5)) < 1e-9, "deposit reflected in user balance");

r = await req("GET", "/meta");
ok(r.data.priceOverrides.bitcoin === 99999, "override persisted");

console.log("internal transfer");
r = await req("GET", "/lookup?email=" + encodeURIComponent("admin@crypton.app"), undefined, token);
ok(r.status === 200 && r.data.found === true && r.data.name === "Crypto Ops", "user lookup finds accounts");
r = await req("GET", "/lookup?email=" + encodeURIComponent("nobody@crypton.test"), undefined, token);
ok(r.status === 200 && r.data.found === false, "user lookup rejects unknown email");

const adminId = adminLogin.data.user.id as string;
r = await req("GET", "/me", undefined, token);
const senderTetherBefore = r.data.wallet.balances.tether ?? 0;
r = await req("GET", "/admin/wallet?userId=" + encodeURIComponent(adminId), undefined, atok);
const adminTetherBefore = r.data.balances.tether ?? 0;

r = await req("POST", "/send-internal", { toEmail: "admin@crypton.app", asset: "tether", amount: 10, price: 1, pin: "888888" }, token);
ok(r.status === 200 && r.data.type === "send" && r.data.status === "pending", "internal transfer held as pending");
const pendingId = r.data.id as string;

r = await req("GET", "/me", undefined, token);
ok(Math.abs((r.data.wallet.balances.tether ?? 0) - (senderTetherBefore - 10)) < 1e-9, "sender balance debited immediately");

r = await req("GET", "/admin/pending", undefined, atok);
ok(Array.isArray(r.data) && r.data.some((p: { tx: { id: string } }) => p.tx.id === pendingId), "transfer appears in admin pending queue");

r = await req("POST", "/admin/resolve", { txnId: pendingId, decision: "approve" }, atok);
ok(r.status === 200 && r.data.status === "confirmed", "admin approves transfer");

r = await req("GET", "/admin/wallet?userId=" + encodeURIComponent(adminId), undefined, atok);
ok(Math.abs((r.data.balances.tether ?? 0) - (adminTetherBefore + 10)) < 1e-9, "recipient credited after approval");

r = await req("POST", "/send-internal", { toEmail: "admin@crypton.app", asset: "tether", amount: 5, price: 1, pin: "888888" }, token);
const rejectId = r.data.id as string;
r = await req("GET", "/me", undefined, token);
const afterSecondSend = r.data.wallet.balances.tether ?? 0;
r = await req("POST", "/admin/resolve", { txnId: rejectId, decision: "reject" }, atok);
ok(r.status === 200 && r.data.status === "failed", "admin rejects transfer");
r = await req("GET", "/me", undefined, token);
ok(Math.abs((r.data.wallet.balances.tether ?? 0) - (afterSecondSend + 5)) < 1e-9, "rejected transfer refunds sender");

console.log("reset pin / restrictions / delete");
r = await req("POST", "/auth/request-reset", { email }, token);
const resetCode = r.data.code as string | undefined;
ok(r.status === 200 && r.data.sent === true, "reset code requested");
if (resetCode) {
  r = await req("POST", "/auth/reset-pin", { email, code: resetCode, newPin: "112233" }, token);
  ok(r.status === 200, "PIN reset with code");
  r = await req("POST", "/auth/login", { email, pin: "112233" });
  ok(r.status === 200, "new PIN logs in after reset");
} else {
  console.log("  (reset-pin skipped — code delivered by email, not returned)");
}

r = await req("POST", "/admin/restriction", { userId, key: "swap", value: true }, atok);
ok(r.status === 200, "admin restricts swaps");
r = await req("POST", "/swap", { from: "bitcoin", to: "tether", amount: 0.001, rate: 64000, priceFrom: 64000, priceTo: 1, pin: "112233" }, token);
ok(r.status === 400 && /restricted/.test(r.data.error ?? ""), "restricted user cannot swap");

console.log("live support");
r = await req("POST", "/support/messages", { body: "Hi, I can't swap." }, token);
ok(r.status === 200 && r.data.sender === "user", "user sends support message");
r = await req("GET", "/support/messages", undefined, token);
ok(r.status === 200 && r.data.some((m: { body: string }) => m.body.includes("can't swap")), "user sees own message");
r = await req("GET", "/admin/support", undefined, atok);
ok(r.status === 200 && r.data.some((c: { unreadAdmin: number }) => c.unreadAdmin > 0), "admin sees unread conversation");
const convId = (r.data as Array<{ conversationId: string; unreadAdmin: number }>).find((c) => c.unreadAdmin > 0)?.conversationId as string;
r = await req("POST", "/admin/support/messages", { conversationId: convId, body: "Hi! Swaps are back online now." }, atok);
ok(r.status === 200 && r.data.sender === "admin", "admin replies");
r = await req("GET", "/support/messages", undefined, token);
ok(r.status === 200 && r.data.some((m: { sender: string }) => m.sender === "admin"), "user receives admin reply");
r = await req("GET", "/admin/support/messages?conversationId=" + encodeURIComponent(convId), undefined, atok);
ok(r.status === 200 && r.data.some((m: { sender: string }) => m.sender === "user"), "admin reads the thread");
r = await req("GET", "/admin/support", undefined, atok);
ok(r.status === 200 && (r.data as Array<{ unreadAdmin: number }>).every((c) => c.unreadAdmin === 0), "admin unread reset after reading");

r = await req("POST", "/admin/delete-user", { userId }, atok);
ok(r.status === 200, "admin deletes user");
r = await req("GET", "/admin/users", undefined, atok);
ok(!r.data.some((u: { id: string }) => u.id === userId), "deleted user is gone");

r = await req("POST", "/admin/announce", { text: "Test notice", severity: "warning" }, atok);
ok(r.status === 200, "announcement broadcast");
r = await req("GET", "/announcements");
ok(r.data.some((a: { text: string }) => a.text === "Test notice"), "announcement visible");

await new Promise<void>((resolve) => srv.close(() => resolve()));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
