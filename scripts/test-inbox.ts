import { fileURLToPath } from "node:url";
import { listReceivedEmails } from "../src/server/email.js";

try {
  process.loadEnvFile(fileURLToPath(new URL("../.env.local", import.meta.url)));
} catch (e) {}

async function check() {
  try {
    const res = await listReceivedEmails(50);
    console.log("listReceivedEmails result:", res);
  } catch (err) {
    console.error("listReceivedEmails ERROR:", err);
  }
}

check();
