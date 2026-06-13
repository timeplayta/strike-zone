/** Banco de contas — ID único por conta (nome pode repetir) */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ADMIN_ACCOUNTS = { mjuan: "123456" };
const ADMIN_BOOTSTRAP_PASSWORD = "123456";

const DB_FILE = path.join(__dirname, "data", "accounts.json");
const SESSION_DAYS = 30;
const MIN_PASSWORD_LEN = 4;
const LOGIN_FAIL_MSG =
  "Conta não encontrada ou senha errada. Use seu ID SZ-XXXXXX se o nome é igual ao de outra pessoa.";

const SHOP = {
  ak_blue: { type: "weapon", weapon: "ak47", color: 0x2266cc, price: 45 },
  ak_red: { type: "weapon", weapon: "ak47", color: 0xcc3322, price: 45 },
  ak_gold: { type: "weapon", weapon: "ak47", color: 0xc9a227, price: 120 },
  ak_neon: { type: "weapon", weapon: "ak47", color: 0x00ffcc, price: 95 },
  scar_blue: { type: "weapon", weapon: "scar", color: 0x3355aa, price: 55 },
  scar_green: { type: "weapon", weapon: "scar", color: 0x2a6644, price: 55 },
  scar_purple: { type: "weapon", weapon: "scar", color: 0x8844cc, price: 75 },
  m4_carbon: { type: "weapon", weapon: "m4", color: 0x2a2a32, price: 50 },
  m4_sakura: { type: "weapon", weapon: "m4", color: 0xff88aa, price: 70 },
  ump_orange: { type: "weapon", weapon: "ump45", color: 0xff6622, price: 40 },
  awm_black: { type: "weapon", weapon: "awm", color: 0x1a1a22, price: 90 },
  awm_ice: { type: "weapon", weapon: "awm", color: 0xa8e8ff, price: 110 },
  doze_wood: { type: "weapon", weapon: "doze", color: 0x6b4423, price: 35 },
  doze_toxic: { type: "weapon", weapon: "doze", color: 0x44cc44, price: 55 },
  glock_pink: { type: "weapon", weapon: "glock", color: 0xcc4488, price: 30 },
  char_among_red: { type: "character", skinId: "among_red", color: 0xff3355, price: 150 },
  char_among_blue: { type: "character", skinId: "among_blue", color: 0x2266ee, price: 150 },
  char_among_green: { type: "character", skinId: "among_green", color: 0x33aa44, price: 120 },
  char_among_pink: { type: "character", skinId: "among_pink", color: 0xff66aa, price: 120 },
  char_among_yellow: { type: "character", skinId: "among_yellow", color: 0xffcc22, price: 100 },
  char_among_black: { type: "character", skinId: "among_black", color: 0x222228, price: 130 },
  char_among_white: { type: "character", skinId: "among_white", color: 0xf0f0f5, price: 100 },
  char_among_cyan: { type: "character", skinId: "among_cyan", color: 0x22dddd, price: 110 },
  char_neon_runner: { type: "character", skinId: "neon_runner", color: 0x00ffaa, price: 180 },
  char_shadow: { type: "character", skinId: "shadow", color: 0x1a1028, price: 140 },
};

function generatePlayerId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "SZ-";
  for (let i = 0; i < 6; i++) s += chars[crypto.randomInt(0, chars.length)];
  return s;
}

function normalizeName(name) {
  return (name || "").trim().slice(0, 24);
}

function normalizePlayerId(id) {
  return String(id || "").trim().toUpperCase();
}

function accountIdFromName(name) {
  return normalizeName(name).toLowerCase().replace(/\s+/g, "_");
}

function applyAdminFlag(p, password) {
  const id = accountIdFromName(p.name);
  p.isAdmin = ADMIN_ACCOUNTS[id] === String(password) || p.isAdmin === true;
  return p.isAdmin;
}

function migrateDb(db) {
  if (!db.players) db.players = {};
  if (db._version >= 2) return db;

  const newPlayers = {};
  for (const [oldKey, p] of Object.entries(db.players)) {
    if (!p.id) p.id = crypto.randomUUID();
    if (!p.playerId) p.playerId = generatePlayerId();
    newPlayers[p.id] = p;
  }
  db.players = newPlayers;
  db._version = 2;
  writeDb(db);
  return db;
}

function ensureBootstrapAdmin() {
  const db = readDb();
  let admin = null;
  for (const p of Object.values(db.players)) {
    if (accountIdFromName(p.name) === "mjuan") admin = p;
  }
  if (!admin) {
    admin = defaultPlayer("MJuan", 18);
    admin.playerId = generatePlayerId();
    setPasswordOnPlayer(admin, ADMIN_BOOTSTRAP_PASSWORD);
    admin.isAdmin = true;
    db.players[admin.id] = admin;
    writeDb(db);
  } else {
    admin.isAdmin = true;
    if (!verifyPassword(admin, ADMIN_BOOTSTRAP_PASSWORD)) {
      setPasswordOnPlayer(admin, ADMIN_BOOTSTRAP_PASSWORD);
    }
    db.players[admin.id] = admin;
    writeDb(db);
  }
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
      fs.writeFileSync(DB_FILE, JSON.stringify({ players: {}, _version: 2 }, null, 2));
    }
    const db = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    return migrateDb(db);
  } catch {
    return { players: {}, _version: 2 };
  }
}

function writeDb(db) {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function getPlayerById(id) {
  const db = readDb();
  return db.players[id] || null;
}

function getPlayerByPlayerId(playerId) {
  const pid = normalizePlayerId(playerId);
  const db = readDb();
  for (const p of Object.values(db.players)) {
    if (normalizePlayerId(p.playerId) === pid) return p;
  }
  return null;
}

function findPlayersByName(name) {
  const n = normalizeName(name).toLowerCase();
  const db = readDb();
  return Object.values(db.players).filter((p) => normalizeName(p.name).toLowerCase() === n);
}

function savePlayer(p) {
  const db = readDb();
  db.players[p.id] = p;
  writeDb(db);
}

function defaultPlayer(name, age = null) {
  return {
    id: crypto.randomUUID(),
    playerId: generatePlayerId(),
    name: normalizeName(name),
    age: age ?? null,
    coins: 0,
    purchases: [],
    skins: {},
    kills: 0,
    avatar: "soldier",
    characterSkin: "soldier",
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
    id: p.id,
    playerId: p.playerId,
    name: p.name,
    age: p.age,
    coins: p.coins || 0,
    purchases: p.purchases || [],
    skins: p.skins || {},
    kills: p.kills || 0,
    hasPassword: !!(p.passwordHash && p.passwordSalt),
    isAdmin: !!p.isAdmin,
    avatar: p.avatar || "soldier",
    characterSkin: p.characterSkin || "soldier",
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
  const p = defaultPlayer(n, age);
  setPasswordOnPlayer(p, password);
  applyAdminFlag(p, password);
  const token = createSessionToken(p);
  p.lastLogin = new Date().toISOString();
  db.players[p.id] = p;
  writeDb(db);

  return { ok: true, account: exportAccount(p), token };
}

function loginAccount(name, password, accountIdOrPlayerId) {
  const pwCheck = validatePasswordInput(password);
  if (!pwCheck.ok) return { ok: false, error: LOGIN_FAIL_MSG };

  let candidates = [];

  const pid = normalizePlayerId(accountIdOrPlayerId);
  if (pid.startsWith("SZ-")) {
    const byPid = getPlayerByPlayerId(pid);
    if (byPid) candidates = [byPid];
  } else if (accountIdOrPlayerId) {
    const byId = getPlayerById(accountIdOrPlayerId);
    if (byId) candidates = [byId];
  }

  if (!candidates.length) {
    const n = normalizeName(name);
    if (!n) return { ok: false, error: "Digite o nome ou ID da conta" };
    candidates = findPlayersByName(n);
  }

  if (!candidates.length) return { ok: false, error: LOGIN_FAIL_MSG };

  const matched = candidates.filter((p) => verifyPassword(p, password));
  if (!matched.length) return { ok: false, error: LOGIN_FAIL_MSG };

  if (matched.length > 1) {
    return {
      ok: false,
      error: "Várias contas com esse nome. Use seu ID SZ-XXXXXX no login.",
      needPlayerId: true,
      playerIds: matched.map((p) => p.playerId),
    };
  }

  const p = matched[0];
  applyAdminFlag(p, password);
  const token = createSessionToken(p);
  p.lastLogin = new Date().toISOString();
  savePlayer(p);

  return { ok: true, account: exportAccount(p), token };
}

function migrateLegacyPassword(name, age, password) {
  const n = normalizeName(name);
  if (!n) return { ok: false, error: "Nome inválido" };

  const matches = findPlayersByName(n);
  const p = matches[0];
  if (!p) return { ok: false, error: "Conta não encontrada" };
  if (p.passwordHash) return { ok: false, error: "Esta conta já tem senha — faça login" };
  if (p.age != null && p.age !== age) return { ok: false, error: "Idade não confere com a conta" };

  const pwCheck = validatePasswordInput(password);
  if (!pwCheck.ok) return pwCheck;

  setPasswordOnPlayer(p, password);
  if (age != null) p.age = age;
  if (!p.playerId) p.playerId = generatePlayerId();
  const token = createSessionToken(p);
  p.lastLogin = new Date().toISOString();
  savePlayer(p);

  return { ok: true, account: exportAccount(p), token };
}

function validateSession(accountId, token) {
  const p = getPlayerById(accountId);
  if (!sessionValid(p, token)) return { ok: false, error: "Sessão expirada — faça login novamente" };
  p.lastLogin = new Date().toISOString();
  savePlayer(p);
  return { ok: true, account: exportAccount(p), token };
}

function accountExists(name) {
  return findPlayersByName(name).length > 0;
}

function authPlayer(accountId, token) {
  const p = getPlayerById(accountId);
  if (!sessionValid(p, token)) return null;
  return p;
}

function addKill(accountId, token, solo) {
  const p = authPlayer(accountId, token);
  if (!p) return { ok: false, error: "Não autorizado" };
  const gain = solo ? 55 : 12;
  p.coins = (p.coins || 0) + gain;
  p.kills = (p.kills || 0) + 1;
  savePlayer(p);
  return { ok: true, coins: p.coins, gain };
}

function purchase(accountId, token, itemId) {
  const p = authPlayer(accountId, token);
  if (!p) return { ok: false, error: "Não autorizado" };
  const item = SHOP[itemId];
  if (!item) return { ok: false, error: "Item inválido" };
  if ((p.purchases || []).includes(itemId)) return { ok: false, error: "Já possui este item" };
  if ((p.coins || 0) < item.price) return { ok: false, error: "Moedas insuficientes" };
  p.coins -= item.price;
  p.purchases = p.purchases || [];
  p.purchases.push(itemId);
  if (item.type === "weapon") {
    p.skins = p.skins || {};
    p.skins[item.weapon] = item.color;
  } else if (item.type === "character") {
    p.characterSkin = item.skinId;
  }
  savePlayer(p);
  return { ok: true, account: exportAccount(p) };
}

function equipSkin(accountId, token, itemId) {
  const p = authPlayer(accountId, token);
  if (!p) return { ok: false, error: "Não autorizado" };
  const item = SHOP[itemId];
  if (!item) return { ok: false, error: "Item inválido" };
  if (!itemId.startsWith("char_") && !(p.purchases || []).includes(itemId)) {
    return { ok: false, error: "Compre este item na loja primeiro" };
  }
  if (item.type === "weapon") {
    p.skins = p.skins || {};
    p.skins[item.weapon] = item.color;
  } else if (item.type === "character") {
    p.characterSkin = item.skinId;
  }
  savePlayer(p);
  return { ok: true, account: exportAccount(p) };
}

function saveProfile(accountId, token, data) {
  const p = authPlayer(accountId, token);
  if (!p) return { ok: false, error: "Não autorizado" };
  if (data.avatar && ["dog", "cat", "soldier", "enemy"].includes(data.avatar)) {
    p.avatar = data.avatar;
  }
  if (data.characterSkin) {
    const owned = (p.purchases || []).some((id) => SHOP[id]?.skinId === data.characterSkin);
    if (data.characterSkin === "soldier" || owned) p.characterSkin = data.characterSkin;
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
    const result = loginAccount(body.name, body.password, body.accountId || body.playerId);
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
    const accountId = body.accountId || body.id;
    const result = validateSession(accountId, body.token);
    res.writeHead(result.ok ? 200 : 401, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(result));
  }

  if (pathname === "/api/account/kill" && req.method === "POST") {
    const body = await parseBody(req);
    const r = addKill(body.accountId || body.id, body.token, !!body.solo);
    res.writeHead(r.ok ? 200 : 401, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(r));
  }

  if (pathname === "/api/account/buy" && req.method === "POST") {
    const body = await parseBody(req);
    const r = purchase(body.accountId || body.id, body.token, body.itemId);
    res.writeHead(r.ok ? 200 : 400, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(r));
  }

  if (pathname === "/api/account/equip" && req.method === "POST") {
    const body = await parseBody(req);
    const r = equipSkin(body.accountId || body.id, body.token, body.itemId);
    res.writeHead(r.ok ? 200 : 400, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(r));
  }

  if (pathname === "/api/account/profile" && req.method === "POST") {
    const body = await parseBody(req);
    const r = saveProfile(body.accountId || body.id, body.token, body);
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

module.exports = {
  handleAccountApi,
  registerAccount,
  loginAccount,
  getPlayerById,
  SHOP,
  ensureBootstrapAdmin,
};
