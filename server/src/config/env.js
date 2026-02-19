import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const candidates = [
  process.env.DOTENV_PATH && resolve(process.env.DOTENV_PATH),
  resolve(__dirname, "../../server.env"),
  resolve(__dirname, "../../.env"),
].filter(Boolean);

let loaded = false;
for (const p of candidates) {
  const r = dotenv.config({ path: p });
  if (!r.error) {
    loaded = true;
    console.log(`[env] ✅ Loaded ${p.replace(process.cwd(), ".")}`);
    break;
  }
}
if (!loaded) {
  console.warn("[env] ⚠️ No .env/server.env file loaded; relying on process.env");
}

function splitCsv(v) {
  return (v || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export const env = {
  node: process.env.NODE_ENV || "development",
  port: Number(process.env.API_PORT || 4000),
  mongoUri: process.env.MONGODB_URI || process.env.MONGO_URI || null,
  jwtSecret: process.env.JWT_SECRET || process.env.APP_JWT_SECRET || null,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
  corsOrigin: splitCsv(process.env.CORS_ORIGIN),
};

if (!env.mongoUri) console.error("[env] ❌ Missing mongoUri (define MONGODB_URI)");
if (!env.jwtSecret)
  console.warn("[env] ⚠️ JWT_SECRET no definido (la autenticación local fallará)");
