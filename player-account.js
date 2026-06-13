/** Conta por jogador — ID único (SZ-XXXXXX), nome pode repetir */

import {
  ALL_SHOP_ITEMS,
  WEAPON_SKINS,
  CHARACTER_SKINS,
  getShopItem,
} from "./shop-catalog.js";

export const SHOP_ITEMS = ALL_SHOP_ITEMS;

const KILL_REWARD = 12;
const SOLO_KILL_REWARD = 55;
const SESSION_KEY = "strikezone_session_v3";
const PASSWORD_HINT_KEY = "strikezone_password_hint";

let cachedAccount = null;
let cachedName = "";
let cachedAccountId = "";
let sessionToken = "";
let cachedIsAdmin = false;

function emptyAccount() {
  return { coins: 0, skins: {}, purchases: [], characterSkin: "soldier" };
}

export function saveSession(name, token, account) {
  cachedName = (name || "").trim();
  sessionToken = token || "";
  cachedAccount = account || emptyAccount();
  cachedAccountId = account?.id || "";
  cachedIsAdmin = !!cachedAccount.isAdmin;
  try {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        name: cachedName,
        token: sessionToken,
        accountId: cachedAccountId,
        account: cachedAccount,
      })
    );
  } catch { /* ignore */ }
}

export function clearSession() {
  cachedName = "";
  sessionToken = "";
  cachedAccountId = "";
  cachedAccount = null;
  cachedIsAdmin = false;
  try {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(PASSWORD_HINT_KEY);
  } catch { /* ignore */ }
}

export function getSavedSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getLoggedInName() {
  return cachedName || getSavedSession()?.name || "";
}

export function getAccountId() {
  return cachedAccountId || getSavedSession()?.accountId || cachedAccount?.id || "";
}

export function getPlayerId() {
  return cachedAccount?.playerId || getSavedSession()?.account?.playerId || "";
}

export function isLoggedIn() {
  return !!(getAccountId() && sessionToken);
}

export function isSessionAdmin() {
  if (cachedIsAdmin) return true;
  return !!getSavedSession()?.account?.isAdmin;
}

export function savePasswordHint(password) {
  try {
    if (password) localStorage.setItem(PASSWORD_HINT_KEY, String(password));
  } catch { /* ignore */ }
}

export function getSessionPassword() {
  try {
    return localStorage.getItem(PASSWORD_HINT_KEY) || "";
  } catch {
    return "";
  }
}

export function getSavedAvatar() {
  return cachedAccount?.avatar || getSavedSession()?.account?.avatar || "soldier";
}

export function getCharacterSkin() {
  return cachedAccount?.characterSkin || getSavedSession()?.account?.characterSkin || "soldier";
}

function authBody(extra = {}) {
  return {
    accountId: getAccountId(),
    token: sessionToken,
    ...extra,
  };
}

export async function getPlayerLoadout(name) {
  if (cachedAccount?.loadout) return cachedAccount.loadout;
  const saved = getSavedSession();
  if (saved?.account?.loadout) return saved.account.loadout;
  return null;
}

export async function savePlayerLoadout(name, loadout) {
  if (!getAccountId() || !sessionToken) return { ok: false, msg: "Faça login para salvar" };
  try {
    const { ok, data } = await apiPost("/api/account/profile", authBody({ loadout }));
    if (ok && data.ok) {
      cachedAccount.loadout = loadout;
      saveSession(cachedName, sessionToken, data.account);
      return { ok: true, account: data.account };
    }
    if (data.error?.includes("autorizado")) clearSession();
    return { ok: false, msg: data.error || "Erro ao salvar" };
  } catch {
    cachedAccount.loadout = loadout;
    saveSession(cachedName, sessionToken, cachedAccount);
    return { ok: true, offline: true };
  }
}

export async function saveAvatarChoice(name, avatar) {
  if (!getAccountId() || !sessionToken) return { ok: false };
  try {
    const { ok, data } = await apiPost("/api/account/profile", authBody({ avatar }));
    if (ok && data.ok) {
      cachedAccount.avatar = avatar;
      saveSession(cachedName, sessionToken, data.account);
      return { ok: true };
    }
  } catch { /* offline */ }
  cachedAccount.avatar = avatar;
  saveSession(cachedName, sessionToken, cachedAccount);
  return { ok: true };
}

async function apiPost(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

export async function tryRestoreSession() {
  const saved = getSavedSession();
  if (!saved?.token || !saved?.accountId) return null;

  try {
    const { ok, data } = await apiPost("/api/account/session", {
      accountId: saved.accountId,
      token: saved.token,
    });
    if (ok && data.ok && data.account) {
      saveSession(saved.name, saved.token, data.account);
      return data.account;
    }
  } catch { /* offline */ }

  if (saved.account) {
    cachedName = saved.name;
    sessionToken = saved.token;
    cachedAccountId = saved.accountId;
    cachedAccount = saved.account;
    return saved.account;
  }
  return null;
}

export async function registerAccount(name, age, password) {
  const trimmed = (name || "").trim();
  const { ok, data } = await apiPost("/api/account/register", {
    name: trimmed,
    age,
    password,
  });
  if (ok && data.ok) {
    saveSession(trimmed, data.token, data.account);
    savePasswordHint(password);
    return { ok: true, account: data.account, playerId: data.account.playerId };
  }
  return { ok: false, msg: data.error || "Não foi possível criar a conta" };
}

export async function loginAccount(name, password, playerId) {
  const trimmed = (name || "").trim();
  const { ok, data } = await apiPost("/api/account/login", {
    name: trimmed,
    password,
    playerId: playerId || undefined,
    accountId: playerId?.startsWith?.("SZ-") ? undefined : playerId,
  });
  if (ok && data.ok) {
    saveSession(trimmed || data.account.name, data.token, data.account);
    savePasswordHint(password);
    window.__characterSkin = data.account.characterSkin;
    return { ok: true, account: data.account };
  }
  return {
    ok: false,
    msg: data.error || "Login falhou.",
    needPasswordSetup: !!data.needPasswordSetup,
    needPlayerId: !!data.needPlayerId,
    playerIds: data.playerIds,
  };
}

export async function migrateLegacyAccount(name, age, password) {
  const trimmed = (name || "").trim();
  const { ok, data } = await apiPost("/api/account/migrate", {
    name: trimmed,
    age,
    password,
  });
  if (ok && data.ok) {
    saveSession(trimmed, data.token, data.account);
    savePasswordHint(password);
    return { ok: true, account: data.account };
  }
  return { ok: false, msg: data.error || "Não foi possível definir a senha" };
}

export async function loadAccount(username) {
  if (cachedAccount) return { ...cachedAccount };
  const restored = await tryRestoreSession();
  if (restored) return restored;
  return emptyAccount();
}

export function getAccountCoins(username) {
  return cachedAccount?.coins || getSavedSession()?.account?.coins || 0;
}

export async function addKillReward(username, isSolo = false) {
  if (!getAccountId() || !sessionToken) return isSolo ? SOLO_KILL_REWARD : KILL_REWARD;

  try {
    const { ok, data } = await apiPost("/api/account/kill", authBody({ solo: isSolo }));
    if (ok && data.ok) {
      cachedAccount.coins = data.coins;
      saveSession(cachedName, sessionToken, cachedAccount);
      return data.gain ?? (isSolo ? SOLO_KILL_REWARD : KILL_REWARD);
    }
    if (data.error?.includes("autorizado")) clearSession();
  } catch { /* offline */ }

  const gain = isSolo ? SOLO_KILL_REWARD : KILL_REWARD;
  cachedAccount.coins = (cachedAccount.coins || 0) + gain;
  saveSession(cachedName, sessionToken, cachedAccount);
  return gain;
}

export async function buyShopItem(username, itemId) {
  const item = getShopItem(itemId);
  if (!item || !getAccountId()) return { ok: false, msg: "Item inválido" };
  if (!sessionToken) return { ok: false, msg: "Faça login para comprar" };

  try {
    const { ok, data } = await apiPost("/api/account/buy", authBody({ itemId }));
    if (ok && data.ok && data.account) {
      saveSession(cachedName, sessionToken, data.account);
      window.__characterSkin = data.account.characterSkin;
      return { ok: true, msg: `${item.label} comprado!`, coins: data.account.coins };
    }
    if (data.error) return { ok: false, msg: data.error };
  } catch {
    return { ok: false, msg: "Servidor offline — não foi possível comprar" };
  }
  return { ok: false, msg: "Compra falhou" };
}

export async function equipShopItem(itemId) {
  const item = getShopItem(itemId);
  if (!item || !getAccountId()) return { ok: false, msg: "Item inválido" };

  try {
    const { ok, data } = await apiPost("/api/account/equip", authBody({ itemId }));
    if (ok && data.ok && data.account) {
      saveSession(cachedName, sessionToken, data.account);
      window.__characterSkin = data.account.characterSkin;
      return { ok: true, account: data.account };
    }
    return { ok: false, msg: data.error || "Não foi possível equipar" };
  } catch {
    return { ok: false, msg: "Servidor offline" };
  }
}

export function getWeaponSkinColor(username, weaponId) {
  return cachedAccount?.skins?.[weaponId] || getSavedSession()?.account?.skins?.[weaponId] || null;
}

function renderShopGrid(grid, items, acc, onBuy) {
  if (!grid) return;
  grid.innerHTML = "";
  for (const item of items) {
    const owned = (acc.purchases || []).includes(item.id);
    const isWeapon = item.type === "weapon";
    const active = isWeapon
      ? acc.skins?.[item.weapon] === item.color
      : acc.characterSkin === item.skinId;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "shop-item" +
      (owned ? " owned" : "") +
      (active ? " active-skin" : "") +
      (item.tier ? ` shop-tier-${item.tier}` : "");
    btn.dataset.itemId = item.id;
    const colorHex = (item.color >>> 0).toString(16).padStart(6, "0");
    btn.innerHTML =
      `<span class="shop-swatch" style="background:#${colorHex}"></span>` +
      `<span class="shop-item-name">${item.label}</span>` +
      `<span class="shop-item-tier">${item.tier || ""}</span>` +
      `<span class="shop-item-price">${owned ? (active ? "Em uso" : "Equipar") : item.price + " 🪙"}</span>`;
    btn.addEventListener("click", () => onBuy(item, owned, active));
    grid.appendChild(btn);
  }
}

export async function refreshShopUI(username) {
  const acc = cachedAccount || await loadAccount(username);

  const coins = acc.coins || 0;
  document.getElementById("shopCoins")?.textContent = `${coins} 🪙`;
  document.getElementById("menuCoinsDisplay")?.textContent = `${coins} 🪙`;

  const accHint = document.getElementById("accountHint");
  if (accHint) {
    const pid = acc.playerId || "—";
    accHint.textContent = `ID ${pid} — skins salvas na sua conta única`;
  }

  window.__characterSkin = acc.characterSkin || "soldier";

  const weaponGrid = document.getElementById("shopGridWeapons");
  const charGrid = document.getElementById("shopGridChars");

  const handleBuy = async (item, owned, active) => {
    if (!owned) {
      const res = await buyShopItem(username, item.id);
      if (res.ok) await refreshShopUI(username);
      else alert(res.msg);
      return;
    }
    if (active) return;
    const res = await equipShopItem(item.id);
    if (res.ok) {
      await refreshShopUI(username);
      import("./arsenal-view.js").then((m) => m.refreshArsenal?.());
      import("./account-hub.js").then((m) => m.refreshAccountHub?.());
    } else alert(res.msg);
  };

  renderShopGrid(weaponGrid, WEAPON_SKINS, acc, handleBuy);
  renderShopGrid(charGrid, CHARACTER_SKINS.filter((c) => c.price > 0), acc, handleBuy);

  const legacyGrid = document.getElementById("shopGrid");
  if (legacyGrid && !weaponGrid) {
    renderShopGrid(legacyGrid, ALL_SHOP_ITEMS.filter((i) => i.price > 0), acc, handleBuy);
  }
}

export function bindShopUI() {
  const refresh = () => refreshShopUI(getLoggedInName());
  document.getElementById("playerName")?.addEventListener("input", refresh);
  refresh();
}
