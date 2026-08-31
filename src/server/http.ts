import type { IncomingMessage, ServerResponse } from "node:http";
import * as core from "./core";

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

function parseUrl(req: IncomingMessage): { path: string; query: URLSearchParams } {
  const u = new URL(req.url ?? "/", "http://localhost");
  return { path: u.pathname.replace(/^\/api/, "") || "/", query: u.searchParams };
}

type Handler = (ctx: { token: string; body: any; query: URLSearchParams; method: string }) => Promise<unknown> | unknown;

function h(fn: (ctx: { token: string; body: any; query: URLSearchParams }) => Promise<unknown> | unknown): Handler {
  return fn;
}

const ROUTES: Array<{ method: string; path: string; handler: Handler }> = [
  { method: "GET", path: "/meta", handler: h(() => core.meta()) },
  { method: "GET", path: "/health", handler: h(() => ({ ok: true })) },

  { method: "POST", path: "/auth/register", handler: h(({ body }) => core.register(body.name, body.email, body.pin)) },
  { method: "POST", path: "/auth/login", handler: h(({ body }) => core.login(body.email, body.pin)) },
  { method: "POST", path: "/auth/logout", handler: h(({ token }) => core.logout(token)) },
  { method: "POST", path: "/auth/lock", handler: h(() => ({})) },
  { method: "POST", path: "/auth/unlock", handler: h(({ token, body }) => core.unlock(token, body.pin)) },
  { method: "POST", path: "/auth/change-pin", handler: h(({ token, body }) => core.changePin(token, body.current, body.next)) },
  { method: "GET", path: "/auth/pin-length", handler: h(({ query }) => core.pinLength(query.get("email") ?? "").then((pinLen) => ({ pinLen }))) },

  { method: "GET", path: "/me", handler: h(({ token }) => core.me(token)) },
  { method: "GET", path: "/transactions", handler: h(({ token, query }) => core.listTxs(token, Number(query.get("limit") ?? 0) || undefined)) },
  { method: "GET", path: "/announcements", handler: h(() => core.announcements()) },

  { method: "POST", path: "/send", handler: h(({ token, body }) => core.send(token, body)) },
  { method: "POST", path: "/buy", handler: h(({ token, body }) => core.buy(token, body)) },
  { method: "POST", path: "/buy-card", handler: h(({ token, body }) => core.buyWithCard(token, body)) },
  { method: "POST", path: "/deposit-fiat", handler: h(({ token, body }) => core.depositFiat(token, Number(body.amount))) },
  { method: "POST", path: "/swap", handler: h(({ token, body }) => core.swap(token, body)) },
  { method: "POST", path: "/profile", handler: h(({ token, body }) => core.updateProfile(token, body)) },

  { method: "GET", path: "/admin/users", handler: h(({ token }) => core.adminListUsers(token)) },
  { method: "GET", path: "/admin/wallet", handler: h(({ token, query }) => core.adminGetWallet(token, query.get("userId") ?? "")) },
  { method: "GET", path: "/admin/ledger", handler: h(({ token }) => core.adminLedger(token)) },
  { method: "GET", path: "/admin/all-wallets", handler: h(({ token }) => core.adminAllWallets(token)) },
  { method: "POST", path: "/admin/balance", handler: h(({ token, body }) => core.adminSetBalance(token, body)) },
  { method: "POST", path: "/admin/freeze", handler: h(({ token, body }) => core.adminToggleFreeze(token, body.userId, Boolean(body.frozen))) },
  { method: "POST", path: "/admin/spread", handler: h(({ token, body }) => core.adminSetSpread(token, Number(body.pct))) },
  { method: "POST", path: "/admin/override-price", handler: h(({ token, body }) => core.adminOverridePrice(token, body.asset, body.price === null ? null : Number(body.price))) },
  { method: "POST", path: "/admin/coin", handler: h(({ token, body }) => core.adminToggleCoin(token, body.asset, Boolean(body.hidden))) },
  { method: "POST", path: "/admin/announce", handler: h(({ token, body }) => core.adminAnnounce(token, body.text, body.severity)) },
  { method: "POST", path: "/admin/announce/clear", handler: h(({ token, body }) => core.adminClearAnnounce(token, body.id)) },
  { method: "POST", path: "/admin/add-fiat", handler: h(({ token, body }) => core.adminAddFiat(token, body.userId, Number(body.amount))) },
];

export async function handleRoute(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const method = (req.method ?? "GET").toUpperCase();
    const { path, query } = parseUrl(req);
    const route = ROUTES.find((r) => r.method === method && r.path === path);
    if (!route) {
      return json(res, 404, { error: `No route for ${method} ${path}` });
    }
    const body = method === "GET" ? {} : await readBody(req);
    const data = await route.handler({ token: getToken(req), body, query, method });
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
}

export async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  await handleRoute(req, res);
}
