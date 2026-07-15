/** Conta por jogador — ID único (SZ-XXXXXX), nome pode repetir */

import {
  ALL_SHOP_ITEMS,
  WEAPON_UNLOCKS,
  WEAPON_SKINS,
  CHARACTER_SKINS,
  SHOP_OUTFITS,
  LOADOUT_ITEMS,
  getShopItem,
} from "./shop-catalog.js";
import { getShopItemThumbDataUrl, getShopItemThumbDataUrlAsync, mountShopFeaturedPreview, stopShopFeaturedPreview, preloadShopPreviews, warmShopThumbCache } from "./shop-item-preview.js";
import { ownsWeapon } from "./weapon-unlocks.js";

export const SHOP_ITEMS = ALL_SHOP_ITEMS;

const PLAYER_ID_HINT_KEY = "strikezone_player_ids";

function nameKey(name) {
  return (name || "").trim().toLowerCase().replace(/\s+/g, "_");
}

function savePlayerIdHint(name, playerId) {
  if (!name || !playerId) return;
  try {
    const raw = localStorage.getItem(PLAYER_ID_HINT_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[nameKey(name)] = playerId;
    localStorage.setItem(PLAYER_ID_HINT_KEY, JSON.stringify(map));
  } catch { /* ignore */ }
}

function getSavedPlayerIdForName(name) {
  try {
    const raw = localStorage.getItem(PLAYER_ID_HINT_KEY);
    if (!raw) return "";
    const map = JSON.parse(raw);
    return map[nameKey(name)] || "";
  } catch {
    return "";
  }
}
const KILL_REWARD = 12;
const SOLO_KILL_REWARD = 55;
const SESSION_KEY = "strikezone_session_v3";

let cachedAccount = null;
let cachedName = "";
let cachedAccountId = "";
let sessionToken = "";
let cachedIsAdmin = false;

function hasValidEmail(account) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(account?.email || "").trim());
}

function emptyAccount() {
  return { coins: 0, skins: {}, purchases: [], characterSkin: "soldier" };
}

export function saveSession(name, token, account) {
  cachedName = (name || "").trim();
  sessionToken = token || "";
  cachedAccount = account || emptyAccount();
  cachedAccountId = account?.id || "";
  cachedIsAdmin = !!cachedAccount.isAdmin;
  if (typeof window !== "undefined") window.__cachedAccount = cachedAccount;
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
  if (typeof window !== "undefined") window.__cachedAccount = null;
  try {
    localStorage.removeItem(SESSION_KEY);
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

export function isSessionAdult() {
  const account = cachedAccount || getSavedSession()?.account;
  if (!account) return false;
  if (account.isAdult === true) return true;
  if (account.isAdult === false) return false;
  const age = typeof account.age === "number" ? account.age : null;
  return age != null && age >= 18;
}

export function getProfilePhotoUrl() {
  return cachedAccount?.profilePhoto || getSavedSession()?.account?.profilePhoto || null;
}

export function getCachedFriends() {
  return cachedAccount?.friends || getSavedSession()?.account?.friends || [];
}

export function isVoiceChatEnabled() {
  const account = cachedAccount || getSavedSession()?.account;
  return !!(account?.voiceChatEnabled && isSessionAdult());
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
    return { ok: false, msg: data.error || "Erro ao salvar" };
  } catch { /* offline */ }
  cachedAccount.avatar = avatar;
  saveSession(cachedName, sessionToken, cachedAccount);
  return { ok: true };
}

export async function uploadProfilePhoto(imageDataUrl) {
  if (!getAccountId() || !sessionToken) return { ok: false, msg: "Faça login" };
  try {
    const { ok, data } = await apiPost("/api/account/photo", authBody({ imageDataUrl }));
    if (ok && data.ok) {
      saveSession(cachedName, sessionToken, data.account);
      return { ok: true, account: data.account };
    }
    return { ok: false, msg: data.error || "Erro ao enviar foto" };
  } catch {
    return { ok: false, msg: "Sem conexão com o servidor" };
  }
}

export async function removeProfilePhoto() {
  if (!getAccountId() || !sessionToken) return { ok: false, msg: "Faça login" };
  try {
    const { ok, data } = await apiPost("/api/account/photo/remove", authBody());
    if (ok && data.ok) {
      saveSession(cachedName, sessionToken, data.account);
      return { ok: true, account: data.account };
    }
    return { ok: false, msg: data.error || "Erro ao remover foto" };
  } catch {
    return { ok: false, msg: "Sem conexão com o servidor" };
  }
}

export async function setVoiceChatEnabled(enabled) {
  if (!getAccountId() || !sessionToken) return { ok: false, msg: "Faça login" };
  if (enabled && !isSessionAdult()) {
    return { ok: false, msg: "Conversas por voz só para maiores de 18 anos" };
  }
  try {
    const { ok, data } = await apiPost("/api/account/profile", authBody({ voiceChatEnabled: !!enabled }));
    if (ok && data.ok) {
      saveSession(cachedName, sessionToken, data.account);
      return { ok: true, account: data.account };
    }
    return { ok: false, msg: data.error || "Erro ao salvar" };
  } catch {
    return { ok: false, msg: "Sem conexão com o servidor" };
  }
}

export async function searchPlayers(query) {
  const q = String(query || "").trim();
  if (!q) return { ok: true, results: [] };
  try {
    const exclude = getPlayerId() || "";
    const res = await fetch(
      `/api/account/search?q=${encodeURIComponent(q)}&exclude=${encodeURIComponent(exclude)}`
    );
    const data = await res.json();
    return { ok: !!data.ok, results: data.results || [], msg: data.error };
  } catch {
    return { ok: false, results: [], msg: "Sem conexão" };
  }
}

export async function addFriendByPlayerId(playerId) {
  if (!getAccountId() || !sessionToken) return { ok: false, msg: "Faça login" };
  try {
    const { ok, data } = await apiPost("/api/account/friends/add", authBody({ playerId }));
    if (ok && data.ok) {
      saveSession(cachedName, sessionToken, data.account);
      return { ok: true, account: data.account, friend: data.friend };
    }
    return { ok: false, msg: data.error || "Não foi possível adicionar" };
  } catch {
    return { ok: false, msg: "Sem conexão com o servidor" };
  }
}

export async function removeFriendByPlayerId(playerId) {
  if (!getAccountId() || !sessionToken) return { ok: false, msg: "Faça login" };
  try {
    const { ok, data } = await apiPost("/api/account/friends/remove", authBody({ playerId }));
    if (ok && data.ok) {
      saveSession(cachedName, sessionToken, data.account);
      return { ok: true, account: data.account };
    }
    return { ok: false, msg: data.error || "Não foi possível remover" };
  } catch {
    return { ok: false, msg: "Sem conexão com o servidor" };
  }
}

export async function refreshFriendsList() {
  if (!getAccountId() || !sessionToken) return { ok: false, friends: [] };
  try {
    const res = await fetch(
      `/api/account/friends?accountId=${encodeURIComponent(getAccountId())}&token=${encodeURIComponent(sessionToken)}`
    );
    const data = await res.json();
    if (data.ok) {
      if (cachedAccount) {
        cachedAccount.friends = data.friends || [];
        saveSession(cachedName, sessionToken, cachedAccount);
      }
      return { ok: true, friends: data.friends || [] };
    }
    return { ok: false, friends: [], msg: data.error };
  } catch {
    return { ok: false, friends: getCachedFriends(), msg: "Sem conexão" };
  }
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

  if (saved.account && hasValidEmail(saved.account)) {
    cachedName = saved.name;
    sessionToken = saved.token;
    cachedAccountId = saved.accountId;
    cachedAccount = saved.account;
    return saved.account;
  }
  clearSession();
  return null;
}

export async function registerAccount(name, age, email, birthDate, password) {
  const trimmed = (name || "").trim();
  const { ok, data } = await apiPost("/api/account/register", {
    name: trimmed,
    age,
    email,
    birthDate,
    password,
  });
  if (ok && data.ok) {
    saveSession(data.account?.name || trimmed, data.token, data.account);
    savePlayerIdHint(trimmed, data.account.playerId);
    return { ok: true, account: data.account, playerId: data.account.playerId };
  }
  return { ok: false, msg: data.error || "Não foi possível criar a conta" };
}

export async function loginAccount(email, password, playerId) {
  const mail = (email || "").trim();
  let pid = (playerId || "").trim();
  const { ok, data } = await apiPost("/api/account/login", {
    email: mail,
    password,
    playerId: pid || undefined,
  });
  if (ok && data.ok) {
    saveSession(data.account.name || mail, data.token, data.account);
    savePlayerIdHint(data.account.name || mail, data.account.playerId);
    window.__characterSkin = data.account.characterSkin;
    return { ok: true, account: data.account };
  }
  return {
    ok: false,
    msg: data.error || "Login falhou.",
    reason: data.reason || "",
    needPasswordSetup: !!data.needPasswordSetup,
    needPlayerId: !!data.needPlayerId,
    playerIds: data.playerIds,
  };
}

export async function checkEmailExists(email) {
  const mail = (email || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
    return { ok: false, exists: false, msg: "Digite um email válido." };
  }
  try {
    const res = await fetch(`/api/account/email-exists?email=${encodeURIComponent(mail)}`, {
      cache: "no-store",
    });
    const data = await res.json();
    return { ok: !!data.ok, exists: !!data.exists };
  } catch {
    return { ok: false, exists: false, msg: "Servidor offline." };
  }
}

export async function migrateLegacyAccount(name, age, email, birthDate, password) {
  const trimmed = (name || "").trim();
  const { ok, data } = await apiPost("/api/account/migrate", {
    name: trimmed,
    age,
    email,
    birthDate,
    password,
  });
  if (ok && data.ok) {
    saveSession(data.account?.name || trimmed, data.token, data.account);
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
  if (!item) return { ok: false, msg: "Item inválido na loja — atualize a página." };
  if (!getAccountId()) return { ok: false, msg: "Faça login para comprar." };
  if (!sessionToken) return { ok: false, msg: "Faça login para comprar" };

  try {
    const { ok, data } = await apiPost("/api/account/buy", authBody({ itemId }));
    if (ok && data.ok && data.account) {
      saveSession(cachedName, sessionToken, data.account);
      window.__characterSkin = data.account.characterSkin;
      window.__playerLoadout = data.account.loadout || window.__playerLoadout;
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
  if (!item) return { ok: false, msg: "Item inválido na loja — atualize a página." };
  if (!getAccountId()) return { ok: false, msg: "Faça login para equipar." };

  try {
    const { ok, data } = await apiPost("/api/account/equip", authBody({ itemId }));
    if (ok && data.ok && data.account) {
      saveSession(cachedName, sessionToken, data.account);
      window.__characterSkin = data.account.characterSkin;
      window.__playerLoadout = data.account.loadout || window.__playerLoadout;
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

export function getAccountWeaponSkins() {
  return cachedAccount?.skins || getSavedSession()?.account?.skins || {};
}

function getShopItemState(item, acc) {
  const isUnlock = item.type === "weapon_unlock";
  const owned = isUnlock
    ? ownsWeapon(acc, item.weapon)
    : (acc.purchases || []).includes(item.id);
  const isWeapon = item.type === "weapon";
  const isOutfit = item.type === "outfit";
  const isLoadout = item.type === "loadout";
  const active = isUnlock
    ? false
    : isWeapon
      ? acc.skins?.[item.weapon] === item.color
      : isOutfit
        ? (acc.outfitId === item.id || acc.loadout?.outfitId === item.id)
        : isLoadout
          ? acc.loadout?.[item.slot]?.presetId === item.presetId
          : acc.characterSkin === item.skinId;
  return { owned, active };
}

function updateShopSelectedPreview(item, owned = false, active = false) {
  const img = document.getElementById("shopSelectedPreviewImg");
  const canvas = document.getElementById("shopWeaponPreviewCanvas");
  const title = document.getElementById("shopSelectedPreviewTitle");
  const desc = document.getElementById("shopSelectedPreviewDesc");
  if (!item || !title || !desc) return;

  const isWeapon = item.type === "weapon" || item.type === "weapon_unlock";
  if (isWeapon && canvas) {
    img?.classList.add("hidden");
    canvas.classList.remove("hidden");
    mountShopFeaturedPreview(canvas, item);
  } else {
    stopShopFeaturedPreview();
    canvas?.classList.add("hidden");
    img?.classList.remove("hidden");
    if (img) {
      getShopItemThumbDataUrlAsync(item).then((url) => {
        if (url) img.src = url;
      });
    }
  }

  title.textContent = item.label;
  const isUnlock = item.type === "weapon_unlock";
  const action = owned
    ? (isUnlock ? "Arma desbloqueada — use no jogo." : active ? "Já está equipado." : "Clique para equipar.")
    : `Clique para comprar por ${item.price} moedas.`;
  const type =
    item.type === "weapon_unlock" ? "Desbloqueio de arma"
    : item.type === "weapon" ? "Arma"
    : item.type === "outfit" ? "Conjunto"
    : item.type === "loadout" ? item.category || "Peça"
    : "Personagem";
  desc.textContent = `${type} • ${item.tier || "comum"} • ${action}`;
}

async function renderShopGrid(grid, items, acc, onBuy) {
  if (!grid) return;
  grid.innerHTML = "";
  await preloadShopPreviews();
  for (const item of items) {
    const { owned, active } = getShopItemState(item, acc);
    const isUnlock = item.type === "weapon_unlock";
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
      `<span class="shop-preview-wrap"><img class="shop-preview-img" alt="" /></span>` +
      `<span class="shop-item-row"><span class="shop-swatch" style="background:#${colorHex}"></span>` +
      `<span class="shop-item-name">${item.label}</span></span>` +
      `<span class="shop-item-tier">${item.category || item.tier || ""}</span>` +
      `<span class="shop-item-price">${owned ? (isUnlock ? "Desbloqueada" : active ? "Em uso" : "Equipar") : item.price + " 🪙"}</span>`;
    const thumb = btn.querySelector(".shop-preview-img");
    if (thumb) {
      getShopItemThumbDataUrlAsync(item).then((url) => {
        if (url) thumb.src = url;
      });
    }
    btn.addEventListener("mouseenter", () => updateShopSelectedPreview(item, owned, active));
    btn.addEventListener("focus", () => updateShopSelectedPreview(item, owned, active));
    btn.addEventListener("click", () => {
      updateShopSelectedPreview(item, owned, active);
      onBuy(item, owned, active);
    });
    grid.appendChild(btn);
  }
}

export async function refreshShopUI(username) {
  const acc = cachedAccount || await loadAccount(username);

  const coins = acc.coins || 0;
  const shopCoinsEl = document.getElementById("shopCoins");
  const menuCoinsEl = document.getElementById("menuCoinsDisplay");
  if (shopCoinsEl) shopCoinsEl.textContent = `${coins} 🪙`;
  if (menuCoinsEl) menuCoinsEl.textContent = `${coins} 🪙`;

  const accHint = document.getElementById("accountHint");
  if (accHint) {
    const pid = acc.playerId || "—";
    accHint.textContent = `ID ${pid} — skins salvas na sua conta única`;
  }

  window.__characterSkin = acc.characterSkin || "soldier";

  const weaponGrid = document.getElementById("shopGridWeapons");
  const charGrid = document.getElementById("shopGridChars");

  const handleBuy = async (item, owned, active) => {
    if (item.type === "weapon_unlock" && owned) return;
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
      import("./solo-view.js").then((m) => m.refreshSoloCharacterSkin?.());
      import("./character-customizer.js").then((m) => m.preloadPlayerLoadout?.(username));
      import("./arsenal-view.js").then((m) => m.refreshArsenal?.());
      import("./account-hub.js").then((m) => m.refreshAccountHub?.());
    } else alert(res.msg);
  };

  const charItems = [
    ...CHARACTER_SKINS.filter((c) => c.price > 0),
    ...SHOP_OUTFITS,
    ...LOADOUT_ITEMS.filter((i) => i.price > 0),
  ];

  await preloadShopPreviews();
  const shopItems = [...WEAPON_UNLOCKS, ...WEAPON_SKINS, ...charItems.filter((i) => i.price > 0)];
  await warmShopThumbCache(shopItems);

  renderShopGrid(weaponGrid, [...WEAPON_UNLOCKS, ...WEAPON_SKINS], acc, handleBuy);
  renderShopGrid(
    charGrid,
    charItems,
    acc,
    handleBuy
  );

  const activeTab = document.querySelector(".shop-tab.selected")?.dataset?.shopTab || "weapons";
  const firstItem = activeTab === "chars"
    ? charItems[0]
    : (WEAPON_UNLOCKS[0] || WEAPON_SKINS[0]);
  if (firstItem) {
    const { owned, active } = getShopItemState(firstItem, acc);
    updateShopSelectedPreview(firstItem, owned, active);
  }

  const legacyGrid = document.getElementById("shopGrid");
  if (legacyGrid && !weaponGrid) {
    renderShopGrid(legacyGrid, ALL_SHOP_ITEMS.filter((i) => i.price > 0), acc, handleBuy);
  }
}

export function bindShopUI() {
  preloadShopPreviews();
  const refresh = () => refreshShopUI(getLoggedInName());
  document.getElementById("playerName")?.addEventListener("input", refresh);
  refresh();

  document.getElementById("buyCoinsBtn")?.addEventListener("click", openCoinPackModal);
  document.getElementById("coinPackCloseBtn")?.addEventListener("click", closeCoinPackModal);
  document.getElementById("coinPackBackdrop")?.addEventListener("click", closeCoinPackModal);

  const params = new URLSearchParams(window.location.search);
  if (params.get("payment") === "success") {
    const coins = params.get("coins") || "";
    const pack = params.get("pack") || "";
    window.history.replaceState({}, "", window.location.pathname);
    showCoinPackSuccess(coins, pack);
    refresh();
  }
}

async function openCoinPackModal() {
  const modal = document.getElementById("coinPackModal");
  if (!modal) return;
  modal.classList.remove("hidden");
  const grid = document.getElementById("coinPackGrid");
  if (!grid) return;
  grid.innerHTML = '<div class="coin-pack-loading">Carregando pacotes...</div>';

  try {
    const res = await fetch("/api/stripe/packs");
    const data = await res.json();
    if (!data.ok || !data.packs?.length) {
      grid.innerHTML = '<div class="coin-pack-loading">Pacotes indisponíveis no momento.</div>';
      return;
    }
    renderCoinPacks(grid, data.packs);
  } catch {
    grid.innerHTML = '<div class="coin-pack-loading">Erro ao carregar pacotes. Verifique sua conexão.</div>';
  }
}

function closeCoinPackModal() {
  document.getElementById("coinPackModal")?.classList.add("hidden");
  const success = document.getElementById("coinPackSuccess");
  if (success) success.classList.add("hidden");
}

function renderCoinPacks(grid, packs) {
  grid.innerHTML = "";
  for (const pack of packs) {
    const card = document.createElement("div");
    card.className = "coin-pack-card" + (pack.highlight ? " highlight" : "");

    if (pack.highlight) {
      const badge = document.createElement("div");
      badge.className = "coin-pack-badge";
      badge.textContent = "🔥 MAIS POPULAR";
      card.appendChild(badge);
    }

    card.innerHTML += `
      <span class="coin-pack-emoji">${pack.emoji}</span>
      <div class="coin-pack-name">${pack.label}</div>
      <div class="coin-pack-coins">${pack.coins.toLocaleString("pt-BR")} 🪙</div>
      <div class="coin-pack-bonus">${pack.bonus || ""}</div>
      <div class="coin-pack-price">${pack.display}</div>
      <button type="button" class="coin-pack-buy-btn" data-pack-id="${pack.id}">Comprar</button>
    `;

    const btn = card.querySelector(".coin-pack-buy-btn");
    btn?.addEventListener("click", (e) => {
      e.stopPropagation();
      startCoinPurchase(pack.id, btn);
    });

    grid.appendChild(card);
  }
}

async function startCoinPurchase(packId, btnEl) {
  const accountId = getAccountId();
  const token = sessionToken;
  if (!accountId || !token) {
    alert("Faça login para comprar moedas.");
    return;
  }

  if (btnEl) { btnEl.disabled = true; btnEl.textContent = "Aguarde..."; }

  try {
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packId, accountId, token }),
    });
    const data = await res.json();
    if (data.ok && data.url) {
      window.location.href = data.url;
    } else {
      alert(data.error || "Erro ao iniciar pagamento. Tente novamente.");
      if (btnEl) { btnEl.disabled = false; btnEl.textContent = "Comprar"; }
    }
  } catch {
    alert("Servidor offline. Tente novamente.");
    if (btnEl) { btnEl.disabled = false; btnEl.textContent = "Comprar"; }
  }
}

function showCoinPackSuccess(coins, pack) {
  const modal = document.getElementById("coinPackModal");
  const success = document.getElementById("coinPackSuccess");
  const msg = document.getElementById("coinPackSuccessMsg");
  if (!modal || !success) return;
  modal.classList.remove("hidden");
  success.classList.remove("hidden");
  if (msg && coins) {
    msg.textContent = `+${Number(coins).toLocaleString("pt-BR")} moedas creditadas! Aproveite a loja.`;
  }
}
