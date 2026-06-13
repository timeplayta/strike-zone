/** Banco de dados de contas — JSON persistido no servidor, com senha por conta */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ADMIN_ACCOUNTS = { mjuan: "123456" };
const ADMIN_BOOTSTRAP_PASSWORD = "123456";

const DB_FILE = path.join(__dirname, "data", "accounts.json");
const SESSION_DAYS = 30;
const MIN_PASSWORD_LEN = 4;
const LOGIN_FAIL_MSG =
  "Essa conta não existe ou o nome e a senha estão errados. Tente de novo.";

const SHOP = {
  ak_blue: { weapon: "ak47", color: 0x2266cc, price: 45 },
  ak_red: { weapon: "ak47", color: 0xcc3322, price: 45 },
  ak_gold: { weapon: "ak47", color: 0xc9a227, price: 120 },
  scar_blue: { weapon: "scar", color: 0x3355aa, price: 55 },
  scar_green: { weapon: "scar", color: 0x2a6644, price: 55 },
  awm_black: { weapon: "awm", color: 0x1a1a22, price: 90 },
  glock_pink: { weapon: "glock", color: 0xcc4488, price: 30 },
  doze_wood: { weapon: "doze", color: 0x6b4423, price: 35 },
};

function applyAdminFlag(p, password) {
  const id = accountId(p.name);
  p.isAdmin = ADMIN_ACCOUNTS[id] === String(password) || p.isAdmin === true;
  return p.isAdmin;
}

function ensureBootstrapAdmin() {
  const db = readDb();
  const id = "mjuan";
  if (!db.players[id]) {
    const p = defaultPlayer("MJuan", 18);
    setPasswordOnPlayer(p, ADMIN_BOOTSTRAP_PASSWORD);
    p.isAdmin = true;
    db.players[id] = p;
    writeDb(db);
  } else {
    const p = db.players[id];
    p.isAdmin = true;
    if (!verifyPassword(p, ADMIN_BOOTSTRAP_PASSWORD)) {
      setPasswordOnPlayer(p, ADMIN_BOOTSTRAP_PASSWORD);
    }
    db.players[id] = p;
    writeDb(db);
  }
}

function normalizeName(name) {
  return (name || "").trim().slice(0, 24);
}

function accountId(name) {
  return normalizeName(name).toLowerCase().replace(/\s+/g, "_");
}

function hashPassword(password, salt) {
  return crypto.scryptSync(String(password), salt, 64).toString("hex");
}

function setPasswordOnPlayer(p, password) {
  const salt = crypto.randomBytes(16).toString("hex");
  p.passwordSalt = salt;
  p.passwordHash = hashPassword(password, salt);
}

function verifyPassword(p, password) {
  if (!p?.passwordHash || !p?.passwordSalt) return false;
  return hashPassword(password, p.passwordSalt) === p.passwordHash;
}

function createSessionToken(p) {
  p.sessionToken = crypto.randomBytes(32).toString("hex");
  p.sessionExpires = Date.now() + SESSION_DAYS * 24 * 3600 * 1000;
  return p.sessionToken;
}

function sessionValid(p, token) {
  if (!p || !token || p.sessionToken !== token) return false;
  if (p.sessionExpires && Date.now() > p.sessionExpires) return false;
  return true;
}

function readDb() {
  try {
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify({ players: {} }, null, 2));
    }
    return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  } catch {
    return { players: {} };
  }
}

function writeDb(db) {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function getPlayerRecord(name) {
  const db = readDb();
  return db.players[accountId(name)] || null;
}

function savePlayer(p) {
  const db = readDb();
  db.players[accountId(p.name)] = p;
  writeDb(db);
}

function defaultPlayer(name, age = null) {
  return {
    name: normalizeName(name),
    age: age ?? null,
    coins: 0,
    purchases: [],
    skins: {},
    kills: 0,
    avatar: "soldier",
    loadout: null,
    passwordSalt: null,
    passwordHash: null,
    sessionToken: null,
    sessionExpires: null,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  };
}

function exportAccount(p) {
  return {
    name: p.name,
    age: p.age,
    coins: p.coins || 0,
    purchases: p.purchases || [],
    skins: p.skins || {},
    kills: p.kills || 0,
    hasPassword: !!(p.passwordHash && p.passwordSalt),
    isAdmin: !!p.isAdmin,
    avatar: p.avatar || "soldier",
    loadout: p.loadout || null,
  };
}

function validatePasswordInput(password) {
  if (!password || String(password).length < MIN_PASSWORD_LEN) {
    return { ok: false, error: `Senha deve ter pelo menos ${MIN_PASSWORD_LEN} caracteres` };
  }
  return { ok: true };
}

function registerAccount(name, age, password) {
  const n = normalizeName(name);
  if (!n) return { ok: false, error: "Nome inválido" };
  if (!age || age < 8 || age > 99) return { ok: false, error: "Idade inválida (8 a 99)" };

  const pwCheck = validatePasswordInput(password);
  if (!pwCheck.ok) return pwCheck;

  const db = readDb();
  const id = accountId(n);
  if (db.players[id]) return { ok: false, error: "Este nome já está em uso — faça login" };

  const p = defaultPlayer(n, age);
  setPasswordOnPlayer(p, password);
  const token = createSessionToken(p);
  p.lastLogin = new Date().toISOString();
  db.players[id] = p;
  writeDb(db);

  return { ok: true, account: exportAccount(p), token };
}

function loginAccount(name, password) {
  const n = normalizeName(name);
  if (!n) return { ok: false, error: "Nome inválido" };

  const p = getPlayerRecord(n);
  if (!p) return { ok: false, error: LOGIN_FAIL_MSG };

  if (!p.passwordHash) {
    return {
      ok: false,
      needPasswordSetup: true,
      error: "Conta antiga sem senha — use 'Definir senha' abaixo",
    };
  }

  const pwCheck = validatePasswordInput(password);
  if (!pwCheck.ok) return { ok: false, error: LOGIN_FAIL_MSG };

  if (!verifyPassword(p, password)) {
    return { ok: false, error: LOGIN_FAIL_MSG };
  }

  applyAdminFlag(p, password);
  const token = createSessionToken(p);
  p.lastLogin = new Date().toISOString();
  savePlayer(p);

  return { ok: true, account: exportAccount(p), token };
}

/** Contas criadas antes das senhas — define senha com nome + idade */
function migrateLegacyPassword(name, age, password) {
  const n = normalizeName(name);
  if (!n) return { ok: false, error: "Nome inválido" };

  const p = getPlayerRecord(n);
  if (!p) return { ok: false, error: "Conta não encontrada" };
  if (p.passwordHash) return { ok: false, error: "Esta conta já tem senha — faça login" };
  if (p.age != null && p.age !== age) return { ok: false, error: "Idade não confere com a conta" };

  const pwCheck = validatePasswordInput(password);
  if (!pwCheck.ok) return pwCheck;

  setPasswordOnPlayer(p, password);
  if (age != null) p.age = age;
  const token = createSessionToken(p);
  p.lastLogin = new Date().toISOString();
  savePlayer(p);

  return { ok: true, account: exportAccount(p), token };
}

function validateSession(name, token) {
  const p = getPlayerRecord(name);
  if (!sessionValid(p, token)) return { ok: false, error: "Sessão expirada — faça login novamente" };
  p.lastLogin = new Date().toISOString();
  savePlayer(p);
  return { ok: true, account: exportAccount(p), token };
}

function accountExists(name) {
  return !!getPlayerRecord(normalizeName(name));
}

function authPlayer(name, token) {
  const p = getPlayerRecord(name);
  if (!sessionValid(p, token)) return null;
  return p;
}

function addKill(name, token, solo) {
  const p = authPlayer(name, token);
  if (!p) return { ok: false, error: "Não autorizado" };
  const gain = solo ? 55 : 12;
  p.coins = (p.coins || 0) + gain;
  p.kills = (p.kills || 0) + 1;
  savePlayer(p);
  return { ok: true, coins: p.coins, gain };
}

function purchase(name, token, itemId) {
  const p = authPlayer(name, token);
  if (!p) return { ok: false, error: "Não autorizado" };
  const item = SHOP[itemId];
  if (!item) return { ok: false, error: "Item inválido" };
  if ((p.purchases || []).includes(itemId)) return { ok: false, error: "Já possui este item" };
  if ((p.coins || 0) < item.price) return { ok: false, error: "Moedas insuficientes" };
  p.coins -= item.price;
  p.purchases = p.purchases || [];
  p.purchases.push(itemId);
  p.skins = p.skins || {};
  p.skins[item.weapon] = item.color;
  savePlayer(p);
  return { ok: true, account: exportAccount(p) };
}

function saveProfile(name, token, data) {
  const p = authPlayer(name, token);
  if (!p) return { ok: false, error: "Não autorizado" };
  if (data.avatar && ["dog", "cat", "soldier", "enemy"].includes(data.avatar)) {
    p.avatar = data.avatar;
  }
  if (data.loadout && typeof data.loadout === "object") {
    p.loadout = data.loadout;
  }
  savePlayer(p);
  return { ok: true, account: exportAccount(p) };
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (c) => { raw += c; });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("JSON inválido"));
      }
    });
    req.on("error", reject);
  });
}

async function handleAccountApi(req, res, pathname) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  if (pathname === "/api/account/register" && req.method === "POST") {
    const body = await parseBody(req);
    const result = registerAccount(body.name, body.age, body.password);
    res.writeHead(result.ok ? 200 : 400, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(result));
  }

  if (pathname === "/api/account/login" && req.method === "POST") {
    const body = await parseBody(req);
    const result = loginAccount(body.name, body.password);
    res.writeHead(result.ok ? 200 : 400, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(result));
  }

  if (pathname === "/api/account/migrate" && req.method === "POST") {
    const body = await parseBody(req);
    const result = migrateLegacyPassword(body.name, body.age, body.password);
    res.writeHead(result.ok ? 200 : 400, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(result));
  }

  if (pathname === "/api/account/session" && req.method === "POST") {
    const body = await parseBody(req);
    const result = validateSession(body.name, body.token);
    res.writeHead(result.ok ? 200 : 401, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(result));
  }

  if (pathname === "/api/account/kill" && req.method === "POST") {
    const body = await parseBody(req);
    const r = addKill(body.name, body.token, !!body.solo);
    res.writeHead(r.ok ? 200 : 401, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(r));
  }

  if (pathname === "/api/account/buy" && req.method === "POST") {
    const body = await parseBody(req);
    const r = purchase(body.name, body.token, body.itemId);
    res.writeHead(r.ok ? 200 : 400, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(r));
  }

  if (pathname === "/api/account/profile" && req.method === "POST") {
    const body = await parseBody(req);
    const r = saveProfile(body.name, body.token, body);
    res.writeHead(r.ok ? 200 : 401, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(r));
  }

  if (pathname === "/api/account/exists" && req.method === "GET") {
    const url = new URL(req.url, "http://localhost");
    const name = url.searchParams.get("name");
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ exists: accountExists(name) }));
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Rota inválida" }));
}

module.exports = { handleAccountApi, registerAccount, loginAccount, getPlayerRecord, SHOP, ensureBootstrapAdmin };
