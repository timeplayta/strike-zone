/** Conta por jogador — servidor com nome + senha (Maria ≠ João) */

export const SHOP_ITEMS = [
  { id: "ak_blue", weapon: "ak47", color: 0x2266cc, price: 45, label: "AK-47 Azul" },
  { id: "ak_red", weapon: "ak47", color: 0xcc3322, price: 45, label: "AK-47 Vermelha" },
  { id: "ak_gold", weapon: "ak47", color: 0xc9a227, price: 120, label: "AK-47 Dourada" },
  { id: "scar_blue", weapon: "scar", color: 0x3355aa, price: 55, label: "SCAR Azul" },
  { id: "scar_green", weapon: "scar", color: 0x2a6644, price: 55, label: "SCAR Verde" },
  { id: "awm_black", weapon: "awm", color: 0x1a1a22, price: 90, label: "AWM Preta" },
  { id: "glock_pink", weapon: "glock", color: 0xcc4488, price: 30, label: "Glock Rosa" },
  { id: "doze_wood", weapon: "doze", color: 0x6b4423, price: 35, label: "Doze Madeira+" },
];

const KILL_REWARD = 12;
const SOLO_KILL_REWARD = 55;
const SESSION_KEY = "strikezone_session_v2";
const PASSWORD_HINT_KEY = "strikezone_password_hint";

let cachedAccount = null;
let cachedName = "";
let sessionToken = "";
let cachedIsAdmin = false;

function emptyAccount() {
  return { coins: 0, skins: {}, purchases: [] };
}

export function saveSession(name, token, account) {
  cachedName = (name || "").trim();
  sessionToken = token || "";
  cachedAccount = account || emptyAccount();
  cachedIsAdmin = !!cachedAccount.isAdmin;
  try {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ name: cachedName, token: sessionToken, account: cachedAccount })
    );
  } catch { /* ignore */ }
}

export function clearSession() {
  cachedName = "";
  sessionToken = "";
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

export function isLoggedIn() {
  return !!(cachedName && sessionToken);
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

export async function getPlayerLoadout(name) {
  const trimmed = (name || "").trim();
  if (cachedName === trimmed && cachedAccount?.loadout) return cachedAccount.loadout;
  const saved = getSavedSession();
  if (saved?.name === trimmed && saved.account?.loadout) return saved.account.loadout;
  return null;
}

export async function savePlayerLoadout(name, loadout) {
  const trimmed = (name || "").trim();
  if (!trimmed || !sessionToken) return { ok: false, msg: "Faça login para salvar" };
  try {
    const { ok, data } = await apiPost("/api/account/profile", {
      name: trimmed,
      token: sessionToken,
      loadout,
    });
    if (ok && data.ok) {
      if (cachedName === trimmed && cachedAccount) {
        cachedAccount.loadout = loadout;
        saveSession(trimmed, sessionToken, cachedAccount);
      }
      return { ok: true, account: data.account };
    }
    if (data.error?.includes("autorizado")) clearSession();
    return { ok: false, msg: data.error || "Erro ao salvar" };
  } catch {
    if (cachedName === trimmed && cachedAccount) {
      cachedAccount.loadout = loadout;
      saveSession(trimmed, sessionToken, cachedAccount);
    }
    return { ok: true, offline: true };
  }
}

export async function saveAvatarChoice(name, avatar) {
  const trimmed = (name || "").trim();
  if (!trimmed || !sessionToken) return { ok: false };
  try {
    const { ok, data } = await apiPost("/api/account/profile", {
      name: trimmed,
      token: sessionToken,
      avatar,
    });
    if (ok && data.ok && cachedName === trimmed && cachedAccount) {
      cachedAccount.avatar = avatar;
      saveSession(trimmed, sessionToken, cachedAccount);
      return { ok: true };
    }
  } catch { /* offline */ }
  if (cachedName === trimmed && cachedAccount) {
    cachedAccount.avatar = avatar;
    saveSession(trimmed, sessionToken, cachedAccount);
  }
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

/** Tenta restaurar sessão salva ao reiniciar o jogo */
export async function tryRestoreSession() {
  const saved = getSavedSession();
  if (!saved?.name || !saved?.token) return null;

  try {
    const { ok, data } = await apiPost("/api/account/session", {
      name: saved.name,
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
    return { ok: true, account: data.account };
  }
  return { ok: false, msg: data.error || "Não foi possível criar a conta" };
}

export async function loginAccount(name, password) {
  const trimmed = (name || "").trim();
  const { ok, data } = await apiPost("/api/account/login", {
    name: trimmed,
    password,
  });
  if (ok && data.ok) {
    saveSession(trimmed, data.token, data.account);
    savePasswordHint(password);
    return { ok: true, account: data.account };
  }
  return {
    ok: false,
    msg: data.error || "Essa conta não existe ou o nome e a senha estão errados. Tente de novo.",
    needPasswordSetup: !!data.needPasswordSetup,
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

/** @deprecated use loginAccount — mantido por compatibilidade */
export async function loadAccount(username) {
  if (cachedName === (username || "").trim() && cachedAccount) return { ...cachedAccount };
  const restored = await tryRestoreSession();
  if (restored && cachedName === (username || "").trim()) return restored;
  return emptyAccount();
}

export function getAccountCoins(username) {
  if (cachedName === (username || "").trim() && cachedAccount) return cachedAccount.coins || 0;
  return getSavedSession()?.account?.coins || 0;
}

export async function addKillReward(username, isSolo = false) {
  const trimmed = (username || "").trim();
  if (!trimmed || !sessionToken) return isSolo ? SOLO_KILL_REWARD : KILL_REWARD;

  try {
    const { ok, data } = await apiPost("/api/account/kill", {
      name: trimmed,
      token: sessionToken,
      solo: isSolo,
    });
    if (ok && data.ok) {
      if (cachedName === trimmed && cachedAccount) {
        cachedAccount.coins = data.coins;
        saveSession(trimmed, sessionToken, cachedAccount);
      }
      return data.gain ?? (isSolo ? SOLO_KILL_REWARD : KILL_REWARD);
    }
    if (data.error?.includes("autorizado")) clearSession();
  } catch { /* offline */ }

  if (cachedName === trimmed && cachedAccount) {
    const gain = isSolo ? SOLO_KILL_REWARD : KILL_REWARD;
    cachedAccount.coins = (cachedAccount.coins || 0) + gain;
    saveSession(trimmed, sessionToken, cachedAccount);
    return gain;
  }
  return isSolo ? SOLO_KILL_REWARD : KILL_REWARD;
}

export async function buyShopItem(username, itemId) {
  const item = SHOP_ITEMS.find((i) => i.id === itemId);
  const trimmed = (username || "").trim();
  if (!item || !trimmed) return { ok: false, msg: "Item inválido" };
  if (!sessionToken) return { ok: false, msg: "Faça login para comprar" };

  try {
    const { ok, data } = await apiPost("/api/account/buy", {
      name: trimmed,
      token: sessionToken,
      itemId,
    });
    if (ok && data.ok && data.account) {
      saveSession(trimmed, sessionToken, data.account);
      return { ok: true, msg: `${item.label} comprada!`, coins: data.account.coins };
    }
    if (data.error) return { ok: false, msg: data.error };
  } catch {
    return { ok: false, msg: "Servidor offline — não foi possível comprar" };
  }

  return { ok: false, msg: "Compra falhou" };
}

export function getWeaponSkinColor(username, weaponId) {
  if (cachedName === (username || "").trim() && cachedAccount?.skins) {
    return cachedAccount.skins[weaponId] || null;
  }
  return getSavedSession()?.account?.skins?.[weaponId] || null;
}

export async function refreshShopUI(username) {
  const acc =
    cachedName === (username || "").trim() && cachedAccount
      ? cachedAccount
      : await loadAccount(username);

  const coinsEl = document.getElementById("shopCoins");
  if (coinsEl) coinsEl.textContent = `${acc.coins || 0} 🪙`;

  const accHint = document.getElementById("accountHint");
  if (accHint) {
    const name = (username || "").trim() || "—";
    accHint.textContent = `Conta: ${name} — moedas e skins salvas no servidor`;
  }

  const grid = document.getElementById("shopGrid");
  if (!grid) return;
  grid.innerHTML = "";
  for (const item of SHOP_ITEMS) {
    const owned = (acc.purchases || []).includes(item.id);
    const active = acc.skins?.[item.weapon] === item.color;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "shop-item" + (owned ? " owned" : "") + (active ? " active-skin" : "");
    btn.dataset.itemId = item.id;
    btn.innerHTML =
      `<span class="shop-swatch" style="background:#${item.color.toString(16).padStart(6, "0")}"></span>` +
      `<span class="shop-item-name">${item.label}</span>` +
      `<span class="shop-item-price">${owned ? "Comprado" : item.price + " 🪙"}</span>`;
    if (!owned) btn.addEventListener("click", () => onShopBuy(item.id));
    grid.appendChild(btn);
  }
}

async function onShopBuy(itemId) {
  const name = document.getElementById("playerName")?.value?.trim();
  if (!name) {
    alert("Faça login antes de comprar.");
    return;
  }
  const res = await buyShopItem(name, itemId);
  if (res.ok) await refreshShopUI(name);
  else alert(res.msg);
}

export function bindShopUI() {
  const nameInput = document.getElementById("playerName");
  const refresh = () => refreshShopUI(nameInput?.value?.trim() || getLoggedInName());
  nameInput?.addEventListener("input", refresh);
  nameInput?.addEventListener("change", refresh);
  refresh();
}
