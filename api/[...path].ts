import type { IncomingMessage, ServerResponse } from "node:http";
import { handleRoute } from "../src/server/http";

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  await handleRoute(req, res);
}
