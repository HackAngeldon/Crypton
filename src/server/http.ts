import type { IncomingMessage, ServerResponse } from "node:http";
import * as core from "./core.js";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function json(res: ServerResponse, status: number, data: unknown): void {
  const payload = data === undefined ? "{}" : JSON.stringify(data);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Length", Buffer.byteLength(payload));
  res.end(payload);
}

function readBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (c) => {
      raw += c;
      if (raw.length > 1e6) {
        reject(new ApiError("Body too large", 413));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new ApiError("Invalid request body"));
      }
    });
    req.on("error", reject);
  });
}

function getToken(req: IncomingMessage): string {
  const h = req.headers.authorization ?? "";
  return h.startsWith("Bearer ") ? h.slice(7) : "";
}

type Ctx = { token: string; body: any; query: URLSearchParams; method: string };
export type VercelHandler = (req: IncomingMessage, res: ServerResponse) => Promise<void> | void;

function makeHandler(fn: (ctx: Ctx) => Promise<unknown> | unknown): VercelHandler {
  return async (req, res) => {
    try {
      const u = new URL(req.url ?? "/", "http://localhost");
      const method = (req.method ?? "GET").toUpperCase();
      const body = method === "GET" ? {} : await readBody(req);
      const data = await fn({ token: getToken(req), body, query: u.searchParams, method });
      json(res, 200, data);
    } catch (err) {
      if (err instanceof ApiError) {
        json(res, err.status, { error: err.message });
      } else if (err instanceof Error) {
        json(res, 400, { error: err.message });
      } else {
        json(res, 500, { error: "Unexpected error" });
      }
    }
  };
}

const DEFS: Array<[string, string, (ctx: Ctx) => Promise<unknown> | unknown]> = [
  ["GET", "/meta", () => core.meta()],
  ["GET", "/health", () => ({ ok: true })],

  ["POST", "/auth/register", ({ body }) => core.register(body.name, body.email, body.pin)],
  ["POST", "/auth/login", ({ body }) => core.login(body.email, body.pin)],
  ["POST", "/auth/logout", ({ token }) => core.logout(token)],
  ["POST", "/auth/lock", () => ({})],
  ["POST", "/auth/unlock", ({ token, body }) => core.unlock(token, body.pin)],
  ["POST", "/auth/change-pin", ({ token, body }) => core.changePin(token, body.current, body.next)],
  ["GET", "/auth/pin-length", ({ query }) => core.pinLength(query.get("email") ?? "").then((pinLen) => ({ pinLen }))],

  ["GET", "/me", ({ token }) => core.me(token)],
  ["GET", "/transactions", ({ token, query }) => core.listTxs(token, Number(query.get("limit") ?? 0) || undefined)],
  ["GET", "/announcements", () => core.announcements()],

  ["POST", "/send", ({ token, body }) => core.send(token, body)],
  ["POST", "/buy", ({ token, body }) => core.buy(token, body)],
  ["POST", "/buy-card", ({ token, body }) => core.buyWithCard(token, body)],
  ["POST", "/deposit-fiat", ({ token, body }) => core.depositFiat(token, Number(body.amount))],
  ["POST", "/swap", ({ token, body }) => core.swap(token, body)],
  ["POST", "/profile", ({ token, body }) => core.updateProfile(token, body)],

  ["GET", "/admin/users", ({ token }) => core.adminListUsers(token)],
  ["GET", "/admin/wallet", ({ token, query }) => core.adminGetWallet(token, query.get("userId") ?? "")],
  ["GET", "/admin/ledger", ({ token }) => core.adminLedger(token)],
  ["GET", "/admin/all-wallets", ({ token }) => core.adminAllWallets(token)],
  ["POST", "/admin/balance", ({ token, body }) => core.adminSetBalance(token, body)],
  ["POST", "/admin/freeze", ({ token, body }) => core.adminToggleFreeze(token, body.userId, Boolean(body.frozen))],
  ["POST", "/admin/spread", ({ token, body }) => core.adminSetSpread(token, Number(body.pct))],
  ["POST", "/admin/override-price", ({ token, body }) => core.adminOverridePrice(token, body.asset, body.price === null ? null : Number(body.price))],
  ["POST", "/admin/coin", ({ token, body }) => core.adminToggleCoin(token, body.asset, Boolean(body.hidden))],
  ["POST", "/admin/announce", ({ token, body }) => core.adminAnnounce(token, body.text, body.severity)],
  ["POST", "/admin/announce/clear", ({ token, body }) => core.adminClearAnnounce(token, body.id)],
  ["POST", "/admin/add-fiat", ({ token, body }) => core.adminAddFiat(token, body.userId, Number(body.amount))],
];

export const routeHandlers: Record<string, VercelHandler> = {};
for (const [method, path, fn] of DEFS) {
  routeHandlers[`${method} ${path}`] = makeHandler(fn);
}

export async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const method = (req.method ?? "GET").toUpperCase();
  const path = new URL(req.url ?? "/", "http://localhost").pathname.replace(/^\/api/, "") || "/";
  const handler = routeHandlers[`${method} ${path}`];
  if (!handler) {
    json(res, 404, { error: `No route for ${method} ${path}` });
    return;
  }
  await handler(req, res);
}

export const handleRoute = handle;
