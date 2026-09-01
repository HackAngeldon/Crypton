import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { handleRoute } from "./http.js";

try {
  process.loadEnvFile(fileURLToPath(new URL("../../.env.local", import.meta.url)));
} catch {
  /* no .env.local — DATABASE_URL must come from the environment */
}

const PORT = Number(process.env.PORT ?? 8787);

createServer((req, res) => {
  handleRoute(req, res).catch(() => {
    res.statusCode = 500;
    res.end("Internal error");
  });
}).listen(PORT, () => {
  console.log(`[crypton] API server on http://localhost:${PORT}`);
});
