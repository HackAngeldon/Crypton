import { handleRoute } from "../src/server/http.js";

export default async function handler(req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse): Promise<void> {
  await handleRoute(req, res);
}