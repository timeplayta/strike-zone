/** Botão C (canto superior esquerdo) → modal de conta + retrato */

import {
  getLoggedInName,
  getAccountCoins,
  getSavedAvatar,
  getCharacterSkin,
  saveAvatarChoice,
  getSavedSession,
} from "./player-account.js";
import { normalizeLoadout, DEFAULT_LOADOUT } from "./character-loadout.js";
import {
  mountCharacterViewer,
  destroyViewer,
  resizeViewer,
  updateViewerLoadout,
  updateViewerCharacterSkin,
} from "./character-viewer.js";

function $(id) {
  return document.getElementById(id);
}

let viewersMounted = false;
let fabPortraitMounted = false;

function updateFabName(name) {
  const el = $("accountFabName");
  if (el) el.textContent = name || "Operador";
}

export async function mountAccountFab() {
  const name = getLoggedInName() || $("playerName")?.value?.trim();
  updateFabName(name);
  const loadout = normalizeLoadout(window.__playerLoadout || DEFAULT_LOADOUT);
  const characterSkin = getCharacterSkin();
  window.__characterSkin = characterSkin;
  if (!fabPortraitMounted && $("accountFabCanvas")) {
    await mountCharacterViewer("accountFabCanvas", {
      loadout,
      portrait: true,
      autoSpin: false,
      characterSkin,
    });
    fabPortraitMounted = true;
  } else if (fabPortraitMounted) {
    updateViewerLoadout("accountFabCanvas", loadout);
  }
  resizeViewer("accountFabCanvas");
}

/** Remonta retrato após modelo humano 3D carregar */
export function refreshAccountFabHuman() {
  if (!$("accountFabCanvas")) return;
  destroyViewer("accountFabCanvas");
  fabPortraitMounted = false;
  mountAccountFab();
}

async function mountViewers() {
  const loadout = normalizeLoadout(window.__playerLoadout || DEFAULT_LOADOUT);
  const characterSkin = getCharacterSkin();
  await mountCharacterViewer("accountPlayerCanvas", { loadout, autoSpin: true, characterSkin });
  await mountCharacterViewer("accountEnemyCanvas", { enemy: true, autoSpin: true });
  resizeViewer("accountPlayerCanvas");
  resizeViewer("accountEnemyCanvas");
  viewersMounted = true;
}

function refreshAccountPanel(name) {
  if (!name) name = getLoggedInName() || $("playerName")?.value?.trim();
  if (!name) return;

  updateFabName(name);
  mountAccountFab();

  const session = getSavedSession();
  const account = session?.account || {};
  const avatar = getSavedAvatar() || account.avatar || "soldier";
  const characterSkin = account.characterSkin || getCharacterSkin() || "soldier";
  window.__characterSkin = characterSkin;

  if ($("accountNameDisplay")) $("accountNameDisplay").textContent = name;
  if ($("accountPlayerIdDisplay")) $("accountPlayerIdDisplay").textContent = account.playerId || "—";
  if ($("accountEmailDisplay")) $("accountEmailDisplay").textContent = account.email || "—";
  if ($("accountAgeDisplay")) $("accountAgeDisplay").textContent =
    account.birthDate ? `${account.age || "?"} anos • ${account.birthDate}` : account.age ? `${account.age} anos` : "—";
  if ($("accountCoinsDisplay")) $("accountCoinsDisplay").textContent = `${getAccountCoins(name)} 🪙`;
  if ($("accountKillsDisplay")) $("accountKillsDisplay").textContent = String(account.kills || 0);

  document.querySelectorAll(".avatar-pick").forEach((btn) => {
    btn.classList.toggle("selected", btn.dataset.avatar === avatar);
  });

  const loadout = normalizeLoadout(window.__playerLoadout || DEFAULT_LOADOUT);
  if (viewersMounted) {
    updateViewerCharacterSkin("accountPlayerCanvas", characterSkin);
  }
  if (fabPortraitMounted) {
    updateViewerCharacterSkin("accountFabCanvas", characterSkin);
  }
}

function openModal() {
  const name = getLoggedInName() || $("playerName")?.value?.trim();
  if (!name) {
    alert("Faça login para ver sua conta.");
    return;
  }
  refreshAccountPanel(name);
  $("accountModal")?.classList.remove("hidden");
  $("accountModal")?.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => {
    if (!viewersMounted) mountViewers();
    else refreshAccountPanel(name);
  });
}

function closeModal() {
  $("accountModal")?.classList.add("hidden");
  $("accountModal")?.setAttribute("aria-hidden", "true");
}

async function pickAvatar(id) {
  const name = getLoggedInName();
  if (!name) return;
  await saveAvatarChoice(name, id);
  document.querySelectorAll(".avatar-pick").forEach((btn) => {
    btn.classList.toggle("selected", btn.dataset.avatar === id);
  });
}

export function refreshAccountHub() {
  refreshAccountPanel();
}

export function initAccountHub() {
  $("openAccountBtn")?.addEventListener("click", openModal);
  $("closeAccountBtn")?.addEventListener("click", closeModal);
  $("accountModalBackdrop")?.addEventListener("click", closeModal);

  $("playerName")?.addEventListener("input", () => updateFabName($("playerName")?.value?.trim()));

  document.querySelectorAll(".avatar-pick").forEach((btn) => {
    btn.addEventListener("click", () => pickAvatar(btn.dataset.avatar));
  });

  window.addEventListener("resize", () => {
    if (fabPortraitMounted) resizeViewer("accountFabCanvas");
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAccountHub);
} else {
  initAccountHub();
}
