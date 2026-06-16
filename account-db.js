/** Banco de contas — ID único por conta (nome pode repetir) */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ADMIN_EMAIL = "sistemasparasaude@gmail.com";
const ADMIN_ACCOUNTS = { [ADMIN_EMAIL]: "123456" };
const ADMIN_BOOTSTRAP_PASSWORD = "123456";
const ADMIN_BOOTSTRAP_EMAIL = ADMIN_EMAIL;

const DB_FILE = path.join(__dirname, "data", "accounts.json");
const SESSION_DAYS = 30;
const MIN_PASSWORD_LEN = 4;
const LOGIN_FAIL_MSG = "Email ou senha errados. Confira os dados e tente de novo.";

const SHOP = {
  ak_blue: { type: "weapon", weapon: "ak47", color: 0x2266cc, price: 80 },
  ak_red: { type: "weapon", weapon: "ak47", color: 0xcc3322, price: 95 },
  ak_gold: { type: "weapon", weapon: "ak47", color: 0xc9a227, price: 720 },
  ak_neon: { type: "weapon", weapon: "ak47", color: 0x00ffcc, price: 320 },
  ak_shadow: { type: "weapon", weapon: "ak47", color: 0x1b1028, price: 1200 },
  ak_galaxy: { type: "weapon", weapon: "ak47", color: 0x090818, price: 1450 },
  scar_blue: { type: "weapon", weapon: "scar", color: 0x3355aa, price: 90 },
  scar_green: { type: "weapon", weapon: "scar", color: 0x2a6644, price: 140 },
  scar_purple: { type: "weapon", weapon: "scar", color: 0x8844cc, price: 310 },
  scar_galaxy: { type: "weapon", weapon: "scar", color: 0x0b1028, price: 1350 },
  m4_carbon: { type: "weapon", weapon: "m4", color: 0x2a2a32, price: 160 },
  m4_sakura: { type: "weapon", weapon: "m4", color: 0xff88aa, price: 340 },
  m4_galaxy: { type: "weapon", weapon: "m4", color: 0x0a1324, price: 1400 },
  ump_orange: { type: "weapon", weapon: "ump45", color: 0xff6622, price: 70 },
  ump_galaxy: { type: "weapon", weapon: "ump45", color: 0x111024, price: 1150 },
  awm_black: { type: "weapon", weapon: "awm", color: 0x1a1a22, price: 180 },
  awm_ice: { type: "weapon", weapon: "awm", color: 0xa8e8ff, price: 850 },
  awm_galaxy: { type: "weapon", weapon: "awm", color: 0x08061a, price: 1800 },
  doze_wood: { type: "weapon", weapon: "doze", color: 0x6b4423, price: 65 },
  doze_toxic: { type: "weapon", weapon: "doze", color: 0x44cc44, price: 280 },
  doze_galaxy: { type: "weapon", weapon: "doze", color: 0x12091e, price: 1250 },
  glock_pink: { type: "weapon", weapon: "glock", color: 0xcc4488, price: 55 },
  glock_galaxy: { type: "weapon", weapon: "glock", color: 0x0b0b20, price: 1050 },
  revolver_gold: { type: "weapon", weapon: "revolver", color: 0xd6a44e, price: 180 },
  revolver_outlaw: { type: "weapon", weapon: "revolver", color: 0x6b2a1d, price: 260 },
  bazooka_mythic: { type: "weapon", weapon: "bazooka", color: 0x8b45ff, price: 1000 },
  bazooka_galaxy: { type: "weapon", weapon: "bazooka", color: 0x120727, price: 2200 },
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
  char_trevas_horror: { type: "character", skinId: "trevas_horror", color: 0x14091f, price: 1200 },
  char_cowboy_sheriff: { type: "character", skinId: "cowboy_sheriff", color: 0xb87834, price: 240 },
  char_cowboy_outlaw: { type: "character", skinId: "cowboy_outlaw", color: 0x6b2a1d, price: 260 },
  char_cowboy_vaqueiro: { type: "character", skinId: "cowboy_vaqueiro", color: 0x2c5f78, price: 220 },
  char_birthday: { type: "character", skinId: "birthday_hero", color: 0xffcc44, price: 0 },
  outfit_ct_elite: {
    type: "outfit",
    color: 0x2266aa,
    price: 85,
    loadout: { helmet: "ff_helmet_blue", shirt: "ff_ct_blue", pants: "ff_navy", gloves: "ff_black", shoes: "ff_combat" },
  },
  outfit_black_ops: {
    type: "outfit",
    color: 0x1a1a22,
    price: 120,
    loadout: { helmet: "ff_helmet_black", shirt: "ff_urban_gray", pants: "ff_black_ops", gloves: "ff_black", shoes: "ff_boot_black" },
  },
  outfit_desert_raider: {
    type: "outfit",
    color: 0xc9a227,
    price: 95,
    loadout: { helmet: "ff_cap_olive", shirt: "ff_desert", pants: "ff_khaki", gloves: "ff_tan", shoes: "ff_boot_brown" },
  },
  outfit_neon_cyan: {
    type: "outfit",
    color: 0x00eeff,
    price: 150,
    loadout: { helmet: "a8_helmet_neon", shirt: "a8_neon_blue", pants: "a8_neon_purple", gloves: "a8_neon_white", shoes: "a8_sneaker_cyan" },
  },
};

const LOADOUT_PRESETS = {
  ff_helmet_blue: { color: 0x2a4a7a, style: "helmet", neon: false },
  ff_helmet_black: { color: 0x1a1a22, style: "helmet", neon: false },
  a8_helmet_neon: { color: 0x00eeff, style: "helmet", neon: true },
  a8_helmet_fire: { color: 0xff6600, style: "helmet", neon: true },
  ff_cap_olive: { color: 0x3a4a28, style: "cap", neon: false },
  ff_cap_red: { color: 0x992222, style: "cap", neon: false },
  ff_mask_skull: { color: 0x222222, style: "mask", neon: false },
  a8_helmet_pink: { color: 0xff44aa, style: "helmet", neon: true },
  ff_cap_starter: { color: 0x2b3448, style: "cap", neon: false },
  ff_bandana_red: { color: 0xcc2233, style: "bandana", neon: false },
  ff_visor_gold: { color: 0xffcc55, style: "glasses", neon: false },
  ff_hood_black: { color: 0x171923, style: "helmet", neon: false },
  ff_mask_future: { color: 0x384b68, style: "mask", neon: false },
  ff_ct_blue: { color: 0x2266aa, style: "combat", neon: false },
  ff_urban_gray: { color: 0x4a4a52, style: "combat", neon: false },
  ff_desert: { color: 0xc9a227, style: "combat", neon: false },
  a8_neon_blue: { color: 0x0088ff, style: "racing", neon: true },
  a8_neon_red: { color: 0xff2244, style: "racing", neon: true },
  a8_neon_green: { color: 0x22ff88, style: "racing", neon: true },
  ff_camo: { color: 0x3a4a2a, style: "combat", neon: false },
  a8_chrome: { color: 0xccccdd, style: "racing", neon: true },
  ff_starter_jacket: { color: 0x2f5f8f, style: "jacket", neon: false },
  ff_striker_red: { color: 0x9b2030, style: "combat", neon: false },
  ff_street_orange: { color: 0xd96a24, style: "jacket", neon: false },
  ff_tech_white: { color: 0xd8dde6, style: "racing", neon: true },
  ff_night_blue: { color: 0x111d3d, style: "combat", neon: false },
  ff_navy: { color: 0x1c2233, style: "cargo", neon: false },
  ff_black_ops: { color: 0x1a1a22, style: "cargo", neon: false },
  ff_khaki: { color: 0x3d2817, style: "cargo", neon: false },
  a8_neon_purple: { color: 0xaa44ff, style: "racing", neon: true },
  a8_neon_yellow: { color: 0xffdd00, style: "racing", neon: true },
  ff_urban: { color: 0x252530, style: "cargo", neon: false },
  ff_jogger_black: { color: 0x151820, style: "jogger", neon: false },
  ff_jogger_blue: { color: 0x203a68, style: "jogger", neon: false },
  ff_tactical_red: { color: 0x5b1720, style: "cargo", neon: false },
  ff_runner_white: { color: 0xcfd6df, style: "racing", neon: true },
  ff_denim: { color: 0x263a55, style: "jogger", neon: false },
  ff_black: { color: 0x111111, style: "tactical", neon: false },
  ff_tan: { color: 0x6b5030, style: "tactical", neon: false },
  a8_neon_white: { color: 0xeeffff, style: "racing", neon: true },
  a8_neon_red: { color: 0xff3355, style: "racing", neon: true },
  ff_green: { color: 0x2a3a22, style: "tactical", neon: false },
  a8_chrome_gloves: { color: 0xb0b8c8, style: "racing", neon: true },
  ff_fingerless: { color: 0x1f2026, style: "fingerless", neon: false },
  ff_wrap_red: { color: 0xb32834, style: "wraps", neon: false },
  ff_white_ops: { color: 0xdfe6ee, style: "tactical", neon: false },
  ff_cyber_cyan: { color: 0x28d7ff, style: "racing", neon: true },
  ff_gold_knuckle: { color: 0xc89a2b, style: "tactical", neon: false },
  ff_combat: { color: 0x222228, style: "boot", neon: false },
  ff_boot_black: { color: 0x141418, style: "boot", neon: false },
  ff_boot_brown: { color: 0x3d2810, style: "boot", neon: false },
  a8_sneaker_red: { color: 0xff2244, style: "sneaker", neon: true },
  a8_sneaker_cyan: { color: 0x00ccff, style: "sneaker", neon: true },
  a8_sneaker_lime: { color: 0x88ff22, style: "sneaker", neon: true },
  ff_runner_black: { color: 0x10131b, style: "sneaker", neon: false },
  ff_runner_red: { color: 0xc62235, style: "sneaker", neon: false },
  ff_hightop_white: { color: 0xe5e9ef, style: "sneaker", neon: false },
  ff_boot_tactical: { color: 0x202633, style: "boot", neon: false },
  ff_neon_gold: { color: 0xffc447, style: "sneaker", neon: true },
};

const SLOT_PRESETS = {
  helmet: ["ff_helmet_blue", "ff_helmet_black", "a8_helmet_neon", "a8_helmet_fire", "ff_cap_olive", "ff_cap_red", "ff_mask_skull", "a8_helmet_pink", "ff_cap_starter", "ff_bandana_red", "ff_visor_gold", "ff_hood_black", "ff_mask_future"],
  shirt: ["ff_ct_blue", "ff_desert", "a8_neon_blue", "a8_neon_red", "ff_urban_gray", "a8_neon_green", "ff_camo", "a8_chrome", "ff_starter_jacket", "ff_striker_red", "ff_street_orange", "ff_tech_white", "ff_night_blue"],
  pants: ["ff_black_ops", "ff_navy", "a8_neon_purple", "ff_khaki", "a8_neon_yellow", "ff_urban", "ff_jogger_black", "ff_jogger_blue", "ff_tactical_red", "ff_runner_white", "ff_denim"],
  gloves: ["ff_black", "ff_tan", "a8_neon_white", "a8_neon_red", "ff_green", "a8_chrome", "ff_fingerless", "ff_wrap_red", "ff_white_ops", "ff_cyber_cyan", "ff_gold_knuckle"],
  shoes: ["ff_boot_black", "ff_boot_brown", "a8_sneaker_red", "a8_sneaker_cyan", "ff_combat", "a8_sneaker_lime", "ff_runner_black", "ff_runner_red", "ff_hightop_white", "ff_boot_tactical", "ff_neon_gold"],
};

const LOADOUT_PRESETS_BY_SLOT = {
  helmet: {
    ff_helmet_blue: { color: 0x2a4a7a, style: "helmet", neon: false },
    ff_helmet_black: { color: 0x1a1a22, style: "helmet", neon: false },
    a8_helmet_neon: { color: 0x00eeff, style: "helmet", neon: true },
    a8_helmet_fire: { color: 0xff6600, style: "helmet", neon: true },
    ff_cap_olive: { color: 0x3a4a28, style: "cap", neon: false },
    ff_cap_red: { color: 0x992222, style: "cap", neon: false },
    ff_mask_skull: { color: 0x222222, style: "mask", neon: false },
    a8_helmet_pink: { color: 0xff44aa, style: "helmet", neon: true },
    ff_cap_starter: { color: 0x2b3448, style: "cap", neon: false },
    ff_bandana_red: { color: 0xcc2233, style: "bandana", neon: false },
    ff_visor_gold: { color: 0xffcc55, style: "glasses", neon: false },
    ff_hood_black: { color: 0x171923, style: "helmet", neon: false },
    ff_mask_future: { color: 0x384b68, style: "mask", neon: false },
  },
  shirt: {
    ff_ct_blue: { color: 0x2266aa, style: "combat", neon: false },
    ff_desert: { color: 0xc9a227, style: "combat", neon: false },
    a8_neon_blue: { color: 0x0088ff, style: "racing", neon: true },
    a8_neon_red: { color: 0xff2244, style: "racing", neon: true },
    ff_urban_gray: { color: 0x4a4a52, style: "combat", neon: false },
    a8_neon_green: { color: 0x22ff88, style: "racing", neon: true },
    ff_camo: { color: 0x3a4a2a, style: "combat", neon: false },
    a8_chrome: { color: 0xccccdd, style: "racing", neon: true },
    ff_starter_jacket: { color: 0x2f5f8f, style: "jacket", neon: false },
    ff_striker_red: { color: 0x9b2030, style: "combat", neon: false },
    ff_street_orange: { color: 0xd96a24, style: "jacket", neon: false },
    ff_tech_white: { color: 0xd8dde6, style: "racing", neon: true },
    ff_night_blue: { color: 0x111d3d, style: "combat", neon: false },
  },
  pants: {
    ff_black_ops: { color: 0x1a1a22, style: "cargo", neon: false },
    ff_navy: { color: 0x1c2233, style: "cargo", neon: false },
    a8_neon_purple: { color: 0xaa44ff, style: "racing", neon: true },
    ff_khaki: { color: 0x3d2817, style: "cargo", neon: false },
    a8_neon_yellow: { color: 0xffdd00, style: "racing", neon: true },
    ff_urban: { color: 0x252530, style: "cargo", neon: false },
    ff_jogger_black: { color: 0x151820, style: "jogger", neon: false },
    ff_jogger_blue: { color: 0x203a68, style: "jogger", neon: false },
    ff_tactical_red: { color: 0x5b1720, style: "cargo", neon: false },
    ff_runner_white: { color: 0xcfd6df, style: "racing", neon: true },
    ff_denim: { color: 0x263a55, style: "jogger", neon: false },
  },
  gloves: {
    ff_black: { color: 0x111111, style: "tactical", neon: false },
    ff_tan: { color: 0x6b5030, style: "tactical", neon: false },
    a8_neon_white: { color: 0xeeffff, style: "racing", neon: true },
    a8_neon_red: { color: 0xff3355, style: "racing", neon: true },
    ff_green: { color: 0x2a3a22, style: "tactical", neon: false },
    a8_chrome: { color: 0xb0b8c8, style: "racing", neon: true },
    ff_fingerless: { color: 0x1f2026, style: "fingerless", neon: false },
    ff_wrap_red: { color: 0xb32834, style: "wraps", neon: false },
    ff_white_ops: { color: 0xdfe6ee, style: "tactical", neon: false },
    ff_cyber_cyan: { color: 0x28d7ff, style: "racing", neon: true },
    ff_gold_knuckle: { color: 0xc89a2b, style: "tactical", neon: false },
  },
  shoes: {
    ff_boot_black: { color: 0x141418, style: "boot", neon: false },
    ff_boot_brown: { color: 0x3d2810, style: "boot", neon: false },
    a8_sneaker_red: { color: 0xff2244, style: "sneaker", neon: true },
    a8_sneaker_cyan: { color: 0x00ccff, style: "sneaker", neon: true },
    ff_combat: { color: 0x222228, style: "boot", neon: false },
    a8_sneaker_lime: { color: 0x88ff22, style: "sneaker", neon: true },
    ff_runner_black: { color: 0x10131b, style: "sneaker", neon: false },
    ff_runner_red: { color: 0xc62235, style: "sneaker", neon: false },
    ff_hightop_white: { color: 0xe5e9ef, style: "sneaker", neon: false },
    ff_boot_tactical: { color: 0x202633, style: "boot", neon: false },
    ff_neon_gold: { color: 0xffc447, style: "sneaker", neon: true },
  },
};

function getLoadoutPreset(slot, presetId) {
  return LOADOUT_PRESETS_BY_SLOT[slot]?.[presetId] || LOADOUT_PRESETS[presetId] || null;
}

const DEFAULT_LOADOUT_PRESETS = ["ff_helmet_blue", "ff_ct_blue", "ff_black_ops", "ff_black", "ff_boot_black"];
const LOADOUT_SLOT_PRICE = { helmet: 35, shirt: 40, pants: 38, gloves: 25, shoes: 30 };

for (const [slot, presetIds] of Object.entries(SLOT_PRESETS)) {
  for (const presetId of presetIds) {
    const preset = getLoadoutPreset(slot, presetId);
    if (!preset) continue;
    SHOP[`loadout_${slot}_${presetId}`] = {
      type: "loadout",
      slot,
      presetId,
      color: preset.color,
      price: DEFAULT_LOADOUT_PRESETS.includes(presetId) ? 0 : LOADOUT_SLOT_PRICE[slot],
    };
  }
}

function materializeOutfitLoadout(outfit = {}) {
  const loadout = {};
  for (const [slot, presetId] of Object.entries(outfit)) {
    const preset = getLoadoutPreset(slot, presetId);
    if (!preset) continue;
    loadout[slot] = { presetId, ...preset };
  }
  return loadout;
}

function applyLoadoutItemOnPlayer(p, item) {
  const preset = getLoadoutPreset(item.slot, item.presetId);
  if (!preset) return false;
  p.loadout = p.loadout || materializeOutfitLoadout({
    helmet: "ff_helmet_blue",
    shirt: "ff_ct_blue",
    pants: "ff_black_ops",
    gloves: "ff_black",
    shoes: "ff_boot_black",
  });
  p.loadout[item.slot] = { presetId: item.presetId, ...preset };
  p.loadout.outfitId = null;
  p.outfitId = null;
  p.characterSkin = p.characterSkin || "soldier";
  return true;
}

function ownsLoadoutPreset(p, slot, presetId) {
  if (DEFAULT_LOADOUT_PRESETS.includes(presetId)) return true;
  const itemId = `loadout_${slot}_${presetId}`;
  if ((p.purchases || []).includes(itemId)) return true;
  return (p.purchases || []).some((id) => {
    const item = SHOP[id];
    return item?.type === "outfit" && item.loadout?.[slot] === presetId;
  });
}

function ownsOutfit(p, outfitId) {
  const outfit = SHOP[outfitId];
  if (!outfit || outfit.type !== "outfit") return false;
  if ((p.purchases || []).includes(outfitId)) return true;
  return Object.entries(outfit.loadout || {}).every(([slot, presetId]) => ownsLoadoutPreset(p, slot, presetId));
}

function sanitizeLoadoutForPlayer(p, raw) {
  const loadout = materializeOutfitLoadout({
    helmet: "ff_helmet_blue",
    shirt: "ff_ct_blue",
    pants: "ff_black_ops",
    gloves: "ff_black",
    shoes: "ff_boot_black",
  });
  for (const slot of Object.keys(SLOT_PRESETS)) {
    const presetId = raw?.[slot]?.presetId;
    if (!presetId || !ownsLoadoutPreset(p, slot, presetId)) continue;
    const preset = getLoadoutPreset(slot, presetId);
    if (preset) loadout[slot] = { presetId, ...preset };
  }
  if (raw?.outfitId && ownsOutfit(p, raw.outfitId)) loadout.outfitId = raw.outfitId;
  return loadout;
}

function equipOutfitOnPlayer(p, item, itemId) {
  p.loadout = materializeOutfitLoadout(item.loadout);
  p.loadout.outfitId = itemId;
  p.characterSkin = item.skinId || "soldier";
  p.outfitId = itemId;
}

function generatePlayerId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "SZ-";
  for (let i = 0; i < 6; i++) s += chars[crypto.randomInt(0, chars.length)];
  return s;
}

function normalizeName(name) {
  return (name || "").trim().slice(0, 24);
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase().slice(0, 80);
}

function emailValid(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

function normalizeBirthDate(date) {
  const s = String(date || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "";
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function ageFromBirthDate(birthDate, now = new Date()) {
  const clean = normalizeBirthDate(birthDate);
  if (!clean) return null;
  const [y, m, d] = clean.split("-").map(Number);
  let age = now.getFullYear() - y;
  const month = now.getMonth() + 1;
  const day = now.getDate();
  if (month < m || (month === m && day < d)) age--;
  return age;
}

function normalizePlayerId(id) {
  return String(id || "").trim().toUpperCase();
}

function accountIdFromName(name) {
  return normalizeName(name).toLowerCase().replace(/\s+/g, "_");
}

function isBootstrapAdminName(name) {
  return accountIdFromName(name) === "mjuan";
}

function isAdminPlayer(p) {
  return isBootstrapAdminName(p?.name) && normalizeEmail(p?.email) === ADMIN_EMAIL;
}

function applyAdminFlag(p, password) {
  const email = normalizeEmail(p.email);
  p.isAdmin = isBootstrapAdminName(p.name) && ADMIN_ACCOUNTS[email] === String(password);
  return p.isAdmin;
}

function migrateDb(db) {
  if (!db.players) db.players = {};
  let changed = db._version < 4;

  const newPlayers = {};
  for (const [oldKey, p] of Object.entries(db.players)) {
    if (!p.id) { p.id = crypto.randomUUID(); changed = true; }
    if (!p.playerId) { p.playerId = generatePlayerId(); changed = true; }
    if (isBootstrapAdminName(p.name) && normalizeEmail(p.email) !== ADMIN_BOOTSTRAP_EMAIL) {
      p.email = ADMIN_BOOTSTRAP_EMAIL;
      changed = true;
    }
    if (p.email) {
      const mail = normalizeEmail(p.email);
      if (mail !== p.email) { p.email = mail; changed = true; }
    }
    const shouldBeAdmin = isAdminPlayer(p);
    if (!!p.isAdmin !== shouldBeAdmin) { p.isAdmin = shouldBeAdmin; changed = true; }
    if (p.birthDate) {
      const born = normalizeBirthDate(p.birthDate);
      if (born !== p.birthDate) { p.birthDate = born; changed = true; }
    }
    if (!p.birthdayRewards) { p.birthdayRewards = {}; changed = true; }
    newPlayers[p.id] = p;
  }
  db.players = newPlayers;
  db._version = 4;
  if (changed) writeDb(db);
  return db;
}

function ensureBootstrapAdmin() {
  const db = readDb();
  let admin = null;
  for (const p of Object.values(db.players)) {
    if (accountIdFromName(p.name) === "mjuan") admin = p;
  }
  if (!admin) {
    admin = defaultPlayer("MJuan", 18, ADMIN_BOOTSTRAP_EMAIL, "2008-01-01");
    admin.playerId = generatePlayerId();
    setPasswordOnPlayer(admin, ADMIN_BOOTSTRAP_PASSWORD);
    admin.isAdmin = true;
    db.players[admin.id] = admin;
    writeDb(db);
  } else {
    admin.email = ADMIN_BOOTSTRAP_EMAIL;
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
  if (!emailValid(p.email)) return false;
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

function getPlayerByEmail(email) {
  const mail = normalizeEmail(email);
  if (!mail) return null;
  const db = readDb();
  if (mail === ADMIN_EMAIL) {
    const admin = Object.values(db.players).find((p) => isAdminPlayer(p));
    if (admin) return admin;
  }
  return Object.values(db.players).find((p) => normalizeEmail(p.email) === mail) || null;
}

function getPlayerByOAuth(provider, providerId, db = readDb()) {
  const prov = String(provider || "").trim().toLowerCase();
  const pid = String(providerId || "").trim();
  if (!prov || !pid) return null;
  return Object.values(db.players).find((p) => String(p.oauthProviders?.[prov]?.id || "") === pid) || null;
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

function defaultPlayer(name, age = null, email = "", birthDate = "") {
  return {
    id: crypto.randomUUID(),
    playerId: generatePlayerId(),
    name: normalizeName(name),
    email: normalizeEmail(email),
    age: age ?? null,
    birthDate: normalizeBirthDate(birthDate),
    coins: 0,
    purchases: [],
    skins: {},
    kills: 0,
    avatar: "soldier",
    characterSkin: "soldier",
    outfitId: null,
    loadout: null,
    birthdayRewards: {},
    passwordSalt: null,
    passwordHash: null,
    oauthProviders: {},
    sessionToken: null,
    sessionExpires: null,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  };
}

function exportAccount(p) {
  grantBirthdayReward(p);
  const isAdmin = isAdminPlayer(p);
  if (!!p.isAdmin !== isAdmin) {
    p.isAdmin = isAdmin;
    savePlayer(p);
  }
  return {
    id: p.id,
    playerId: p.playerId,
    name: p.name,
    email: p.email || "",
    age: p.age,
    birthDate: p.birthDate || "",
    coins: p.coins || 0,
    purchases: p.purchases || [],
    skins: p.skins || {},
    kills: p.kills || 0,
    hasPassword: !!(p.passwordHash && p.passwordSalt),
    isAdmin,
    avatar: p.avatar || "soldier",
    characterSkin: p.characterSkin || "soldier",
    outfitId: p.outfitId || null,
    loadout: p.loadout || null,
    birthdayMessage: p.birthdayMessage || "",
  };
}

function grantBirthdayReward(p, now = new Date()) {
  if (!p?.birthDate) return false;
  const birth = normalizeBirthDate(p.birthDate);
  if (!birth) return false;
  const [, month, day] = birth.split("-").map(Number);
  if (now.getMonth() + 1 !== month || now.getDate() !== day) {
    p.birthdayMessage = "";
    return false;
  }
  const year = String(now.getFullYear());
  p.birthdayRewards = p.birthdayRewards || {};
  if (p.birthdayRewards[year]) return false;
  p.coins = (p.coins || 0) + 3000;
  p.purchases = p.purchases || [];
  if (!p.purchases.includes("char_birthday")) p.purchases.push("char_birthday");
  p.characterSkin = "birthday_hero";
  p.birthdayRewards[year] = new Date().toISOString();
  p.birthdayMessage = "Feliz aniversário! Você ganhou 3000 moedas e a skin Aniversariante.";
  savePlayer(p);
  return true;
}

function validatePasswordInput(password) {
  if (!password || String(password).length < MIN_PASSWORD_LEN) {
    return { ok: false, error: `Senha deve ter pelo menos ${MIN_PASSWORD_LEN} caracteres` };
  }
  return { ok: true };
}

function registerAccount(name, age, email, birthDate, password) {
  const n = normalizeName(name);
  if (!n) return { ok: false, error: "Nome inválido" };
  const mail = normalizeEmail(email);
  const born = normalizeBirthDate(birthDate);
  if (!emailValid(mail)) return { ok: false, error: "Digite um email válido" };
  if (getPlayerByEmail(mail)) return { ok: false, error: "Este email já tem conta. Faça login com ele." };
  const ageByDate = ageFromBirthDate(born);
  if (!born || ageByDate == null) return { ok: false, error: "Digite sua data de nascimento" };
  if (!age || age < 8 || age > 99) return { ok: false, error: "Idade inválida (8 a 99)" };
  if (Math.abs(Number(age) - ageByDate) > 1) return { ok: false, error: "Idade não confere com a data de nascimento" };

  const pwCheck = validatePasswordInput(password);
  if (!pwCheck.ok) return pwCheck;

  const db = readDb();
  const p = defaultPlayer(n, ageByDate, mail, born);
  setPasswordOnPlayer(p, password);
  applyAdminFlag(p, password);
  const token = createSessionToken(p);
  p.lastLogin = new Date().toISOString();
  db.players[p.id] = p;
  writeDb(db);

  return { ok: true, account: exportAccount(p), token };
}

function loginWithOAuthProvider(provider, profile) {
  const prov = String(provider || "").trim().toLowerCase();
  const providerId = String(profile?.id || profile?.sub || "").trim();
  if (!prov || !providerId) return { ok: false, error: "Login social inválido" };

  const email = normalizeEmail(profile?.email || `${prov}_${providerId}@oauth.local`);
  const displayName = normalizeName(profile?.name || profile?.username || `${prov}_${providerId}`).slice(0, 16);
  const db = readDb();

  let p = getPlayerByOAuth(prov, providerId, db);
  if (!p && emailValid(email)) {
    p = Object.values(db.players).find((player) => normalizeEmail(player.email) === email) || null;
  }
  if (!p) {
    p = defaultPlayer(displayName || "Jogador", null, email, "");
    db.players[p.id] = p;
  }

  p.name = p.name || displayName || "Jogador";
  if (!emailValid(p.email) && emailValid(email)) p.email = email;
  p.oauthProviders = p.oauthProviders || {};
  p.oauthProviders[prov] = {
    id: providerId,
    email,
    name: displayName,
    linkedAt: new Date().toISOString(),
  };
  const token = createSessionToken(p);
  p.lastLogin = new Date().toISOString();
  db.players[p.id] = p;
  writeDb(db);

  return { ok: true, account: exportAccount(p), token };
}

function loginAccount(email, password, accountIdOrPlayerId) {
  const pwCheck = validatePasswordInput(password);
  if (!pwCheck.ok) {
    return { ok: false, error: "Senha deve ter pelo menos 4 caracteres", reason: "password_too_short" };
  }

  let candidates = [];
  const mail = normalizeEmail(email);
  if (!emailValid(mail)) return { ok: false, error: "Digite um email válido", reason: "invalid_email" };

  const pid = normalizePlayerId(accountIdOrPlayerId);
  if (pid.startsWith("SZ-")) {
    const byPid = getPlayerByPlayerId(pid);
    if (byPid && normalizeEmail(byPid.email) === mail) candidates = [byPid];
  } else if (accountIdOrPlayerId) {
    const byId = getPlayerById(accountIdOrPlayerId);
    if (byId && normalizeEmail(byId.email) === mail) candidates = [byId];
  }

  if (!candidates.length) {
    const byEmail = getPlayerByEmail(mail);
    if (byEmail) candidates = [byEmail];
  }

  if (!candidates.length) return { ok: false, error: "Email não existe.", reason: "email_not_found" };

  const matched = candidates.filter((p) => verifyPassword(p, password));
  if (!matched.length) return { ok: false, error: "Email ou senha errado.", reason: "wrong_password" };

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

function migrateLegacyPassword(name, age, email, birthDate, password) {
  const n = normalizeName(name);
  if (!n) return { ok: false, error: "Nome inválido" };
  const mail = normalizeEmail(email);
  const born = normalizeBirthDate(birthDate);
  if (!emailValid(mail)) return { ok: false, error: "Digite um email válido" };
  if (!born) return { ok: false, error: "Digite sua data de nascimento" };
  const existingEmailOwner = getPlayerByEmail(mail);
  if (existingEmailOwner) return { ok: false, error: "Este email já tem conta" };

  const matches = findPlayersByName(n);
  const p = matches[0];
  if (!p) return { ok: false, error: "Conta não encontrada" };
  if (p.passwordHash) return { ok: false, error: "Esta conta já tem senha — faça login" };
  if (p.age != null && p.age !== age) return { ok: false, error: "Idade não confere com a conta" };

  const pwCheck = validatePasswordInput(password);
  if (!pwCheck.ok) return pwCheck;

  setPasswordOnPlayer(p, password);
  if (age != null) p.age = age;
  p.email = mail;
  p.birthDate = born;
  if (!p.playerId) p.playerId = generatePlayerId();
  applyAdminFlag(p, password);
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

function emailExists(email) {
  const mail = normalizeEmail(email);
  return emailValid(mail) && !!getPlayerByEmail(mail);
}

function authPlayer(accountId, token) {
  const p = getPlayerById(accountId);
  if (!sessionValid(p, token)) return null;
  return p;
}

function creditCoins(accountId, stripeSessionId, amount) {
  const db = readDb();
  const p = db.players[accountId];
  if (!p) return { ok: false, error: "Conta não encontrada" };

  p.payments = p.payments || [];
  if (p.payments.includes(stripeSessionId)) {
    return { ok: false, error: "Pagamento já processado (idempotente)" };
  }

  p.coins = (p.coins || 0) + amount;
  p.payments.push(stripeSessionId);
  db.players[accountId] = p;
  writeDb(db);

  console.log(`[Stripe] +${amount} moedas → ${p.name} (${p.playerId})`);
  return { ok: true, coins: p.coins };
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
    p.outfitId = itemId;
  } else if (item.type === "outfit") {
    equipOutfitOnPlayer(p, item, itemId);
  } else if (item.type === "loadout") {
    applyLoadoutItemOnPlayer(p, item);
  }
  savePlayer(p);
  return { ok: true, account: exportAccount(p) };
}

function equipSkin(accountId, token, itemId) {
  const p = authPlayer(accountId, token);
  if (!p) return { ok: false, error: "Não autorizado" };
  const item = SHOP[itemId];
  if (!item) return { ok: false, error: "Item inválido" };
  if ((item.price || 0) > 0 && !(p.purchases || []).includes(itemId)) {
    return { ok: false, error: "Compre este item na loja primeiro" };
  }
  if (item.type === "weapon") {
    p.skins = p.skins || {};
    p.skins[item.weapon] = item.color;
  } else if (item.type === "character") {
    p.characterSkin = item.skinId;
    p.outfitId = itemId;
  } else if (item.type === "outfit") {
    equipOutfitOnPlayer(p, item, itemId);
  } else if (item.type === "loadout") {
    applyLoadoutItemOnPlayer(p, item);
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
    p.loadout = sanitizeLoadoutForPlayer(p, data.loadout);
    p.outfitId = p.loadout.outfitId || null;
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
    const result = registerAccount(body.name, body.age, body.email, body.birthDate, body.password);
    res.writeHead(result.ok ? 200 : 400, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(result));
  }

  if (pathname === "/api/account/login" && req.method === "POST") {
    const body = await parseBody(req);
    const result = loginAccount(body.email || body.name, body.password, body.accountId || body.playerId);
    res.writeHead(result.ok ? 200 : 400, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(result));
  }

  if (pathname === "/api/account/migrate" && req.method === "POST") {
    const body = await parseBody(req);
    const result = migrateLegacyPassword(body.name, body.age, body.email, body.birthDate, body.password);
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

  if (pathname === "/api/account/email-exists" && req.method === "GET") {
    const url = new URL(req.url, "http://localhost");
    const email = url.searchParams.get("email");
    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-cache" });
    return res.end(JSON.stringify({ ok: true, exists: emailExists(email) }));
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Rota inválida" }));
}

module.exports = {
  handleAccountApi,
  registerAccount,
  loginAccount,
  loginWithOAuthProvider,
  getPlayerById,
  creditCoins,
  SHOP,
  ensureBootstrapAdmin,
};
