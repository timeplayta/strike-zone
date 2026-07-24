/** Botão S (ao lado do painel) → modal solo + loja */

import { getLoggedInName, refreshShopUI, getCharacterSkin } from "./player-account.js";
import { normalizeLoadout, DEFAULT_LOADOUT, applyOutfitToLoadout, applyPresetToLoadout } from "./character-loadout.js";
import { mountCharacterViewer, destroyViewer, resizeViewer, updateViewerLoadout, updateViewerCharacterSkin } from "./character-viewer.js";
import { mountShopFeaturedPreview, stopShopFeaturedPreview, resizeFeaturedPreview } from "./shop-item-preview.js";
import { switchHubPanel, showPlayHub } from "./menu-hub.js";

function $(id) {
  return document.getElementById(id);
}

let soloMounted = false;
let shopViewMode = "both"; // "both" | "weapon"
let lastWeaponItem = null;

export function refreshSoloViewer() {
  if (!soloMounted) return;
  updateViewerLoadout("soloCanvas", normalizeLoadout(window.__playerLoadout || DEFAULT_LOADOUT));
}

export function refreshSoloCharacterSkin() {
  if (!soloMounted) return;
  updateViewerCharacterSkin("soloCanvas", getCharacterSkin());
}

/** Preview em destaque de um item da loja (arma/personagem/roupa) no canvas grande */
export function previewShopItemLive(item) {
  if (!item) return;
  const isWeapon = item.type === "weapon" || item.type === "weapon_unlock";
  if (isWeapon) {
    lastWeaponItem = item;
    if (shopViewMode === "weapon") {
      const canvas = $("shopWeaponOnlyCanvas");
      if (canvas) mountShopFeaturedPreview(canvas, item);
    }
    return;
  }
  if (!soloMounted) return;
  if (item.type === "character") {
    updateViewerCharacterSkin("soloCanvas", item.skinId);
  } else if (item.type === "outfit") {
    const loadout = applyOutfitToLoadout(window.__playerLoadout || DEFAULT_LOADOUT, item.id);
    updateViewerLoadout("soloCanvas", loadout);
  } else if (item.type === "loadout") {
    const loadout = applyPresetToLoadout(window.__playerLoadout || DEFAULT_LOADOUT, item.slot, item.presetId);
    updateViewerLoadout("soloCanvas", loadout);
  }
}

/** Volta o preview grande pro que o jogador realmente tem equipado */
function resetSoloPreviewToOwned() {
  if (!soloMounted) return;
  updateViewerCharacterSkin("soloCanvas", getCharacterSkin());
  updateViewerLoadout("soloCanvas", normalizeLoadout(window.__playerLoadout || DEFAULT_LOADOUT));
}

function applyShopViewMode() {
  const bothBtn = $("shopViewBothBtn");
  const weaponBtn = $("shopViewWeaponBtn");
  const bothCanvas = $("soloCanvas");
  const weaponCanvas = $("shopWeaponOnlyCanvas");
  bothBtn?.classList.toggle("selected", shopViewMode === "both");
  weaponBtn?.classList.toggle("selected", shopViewMode === "weapon");

  if (shopViewMode === "weapon") {
    bothCanvas?.classList.add("hidden");
    weaponCanvas?.classList.remove("hidden");
    if (weaponCanvas) mountShopFeaturedPreview(weaponCanvas, lastWeaponItem || { type: "weapon", weapon: "ak47", color: 0x5c3a1e, id: "default_ak47" });
  } else {
    weaponCanvas?.classList.add("hidden");
    bothCanvas?.classList.remove("hidden");
    stopShopFeaturedPreview();
    if (soloMounted) resizeViewer("soloCanvas");
  }
}

async function openModal() {
  const name = getLoggedInName() || $("playerName")?.value?.trim();
  if (!name) {
    alert("Faça login primeiro.");
    return;
  }
  await refreshShopUI(name);
  switchHubPanel("shop");
  const panel = $("ffHubPanelShop");
  if (panel) {
    panel.classList.remove("hidden");
    panel.setAttribute("aria-hidden", "false");
  }
  const loadout = normalizeLoadout(window.__playerLoadout || DEFAULT_LOADOUT);
  shopViewMode = "both";
  lastWeaponItem = null;
  requestAnimationFrame(async () => {
    if (!soloMounted) {
      await mountCharacterViewer("soloCanvas", {
        loadout,
        characterSkin: getCharacterSkin(),
        autoSpin: true,
      });
      soloMounted = true;
    } else {
      updateViewerLoadout("soloCanvas", loadout);
    }
    resizeViewer("soloCanvas");
    applyShopViewMode();
  });
}

function closeModal() {
  showPlayHub();
  const panel = $("ffHubPanelShop");
  if (panel) panel.setAttribute("aria-hidden", "true");
  stopShopFeaturedPreview();
  resetSoloPreviewToOwned();
}

export function initSoloView() {
  $("openSoloBtn")?.addEventListener("click", openModal);
  $("closeSoloBtn")?.addEventListener("click", closeModal);
  $("shopViewBothBtn")?.addEventListener("click", () => {
    if (shopViewMode === "both") return;
    shopViewMode = "both";
    applyShopViewMode();
  });
  $("shopViewWeaponBtn")?.addEventListener("click", () => {
    if (shopViewMode === "weapon") return;
    shopViewMode = "weapon";
    applyShopViewMode();
  });

  document.querySelectorAll(".shop-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".shop-tab").forEach((t) => t.classList.toggle("selected", t === tab));
      const which = tab.dataset.shopTab;
      $("shopPanelWeapons")?.classList.toggle("hidden", which !== "weapons");
      $("shopPanelChars")?.classList.toggle("hidden", which !== "chars");
      refreshShopUI(getLoggedInName());
    });
  });
  window.addEventListener("resize", () => {
    const panel = $("ffHubPanelShop");
    if (panel && !panel.classList.contains("hidden")) {
      if (soloMounted) resizeViewer("soloCanvas");
      if (shopViewMode === "weapon") resizeFeaturedPreview();
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSoloView);
} else {
  initSoloView();
}
