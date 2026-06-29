/** Botão S (ao lado do painel) → modal solo + loja */

import { getLoggedInName, refreshShopUI, getCharacterSkin } from "./player-account.js";
import { normalizeLoadout, DEFAULT_LOADOUT } from "./character-loadout.js";
import { mountCharacterViewer, destroyViewer, resizeViewer, updateViewerLoadout, updateViewerCharacterSkin } from "./character-viewer.js";
import { switchHubPanel, showPlayHub } from "./menu-hub.js";

function $(id) {
  return document.getElementById(id);
}

let soloMounted = false;

export function refreshSoloViewer() {
  if (!soloMounted) return;
  updateViewerLoadout("soloCanvas", normalizeLoadout(window.__playerLoadout || DEFAULT_LOADOUT));
}

export function refreshSoloCharacterSkin() {
  if (!soloMounted) return;
  updateViewerCharacterSkin("soloCanvas", getCharacterSkin());
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
  });
}

function closeModal() {
  showPlayHub();
  const panel = $("ffHubPanelShop");
  if (panel) panel.setAttribute("aria-hidden", "true");
}

export function initSoloView() {
  $("openSoloBtn")?.addEventListener("click", openModal);
  $("closeSoloBtn")?.addEventListener("click", closeModal);

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
    if (soloMounted && panel && !panel.classList.contains("hidden")) {
      resizeViewer("soloCanvas");
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSoloView);
} else {
  initSoloView();
}
