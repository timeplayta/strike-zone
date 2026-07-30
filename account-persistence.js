/** Persistência opcional das contas em Postgres (Neon/Render) — sobrevive ao Render free dormir */

const fs = require("fs");
const path = require("path");

const DB_FILE = path.join(__dirname, "data", "accounts.json");
const STORE_KEY = "accounts";

let pgPool = null;
let remoteReady = false;
let remoteWriteTimer = null;

async function initAccountPersistence() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    if (process.env.RENDER === "true") {
      console.warn(
        "[Contas] Render free apaga contas quando o serviço dorme. " +
          "Configure DATABASE_URL (Neon Postgres grátis) no painel do Render para manter as contas."
      );
    }
    return;
  }

  try {
    const { Pool } = require("pg");
    pgPool = new Pool({
      connectionString: url,
      ssl: url.includes("localhost") ? false : { rejectUnauthorized: false },
    });
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS strikezone_kv (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    const res = await pgPool.query("SELECT value FROM strikezone_kv WHERE key = $1", [STORE_KEY]);
    if (res.rows[0]?.value) {
      const remote = res.rows[0].value;
      fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
      fs.writeFileSync(DB_FILE, JSON.stringify(remote, null, 2));
      const count = Object.keys(remote.players || {}).length;
      console.log(`[Contas] Carregadas do Postgres (${count} conta${count === 1 ? "" : "s"})`);
    } else if (fs.existsSync(DB_FILE)) {
      const local = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
      await pgPool.query(
        `INSERT INTO strikezone_kv (key, value) VALUES ($1, $2::jsonb)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [STORE_KEY, JSON.stringify(local)]
      );
      console.log("[Contas] Postgres sincronizado com arquivo local");
    }

    remoteReady = true;
  } catch (err) {
    console.error("[Contas] Postgres indisponível — usando só arquivo local:", err.message);
    pgPool = null;
    remoteReady = false;
  }
}

function scheduleRemoteWrite(db) {
  if (!pgPool || !remoteReady) return;
  if (remoteWriteTimer) clearTimeout(remoteWriteTimer);
  remoteWriteTimer = setTimeout(async () => {
    try {
      await pgPool.query(
        `INSERT INTO strikezone_kv (key, value) VALUES ($1, $2::jsonb)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [STORE_KEY, JSON.stringify(db)]
      );
    } catch (err) {
      console.error("[Contas] Falha ao salvar no Postgres:", err.message);
    }
  }, 250);
}

module.exports = { initAccountPersistence, scheduleRemoteWrite };
