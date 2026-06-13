/** Botão S (ao lado do painel) → modal solo + loja */

import { getLoggedInName, refreshShopUI, getCharacterSkin } from "./player-account.js";
import { normalizeLoadout, DEFAULT_LOADOUT } from "./character-loadout.js";
import { mountCharacterViewer, destroyViewer, resizeViewer, updateViewerLoadout } from "./character-viewer.js";

function $(id) {
  return document.getElementById(id);
}

let soloMounted = false;

export function refreshSoloViewer() {
  if (!soloMounted) return;
  updateViewerLoadout("soloCanvas", normalizeLoadout(window.__playerLoadout || DEFAULT_LOADOUT));
}

async function openModal() {
  const name = getLoggedInName() || $("playerName")?.value?.trim();
  if (!name) {
    alert("Faça login primeiro.");
    return;
  }
  await refreshShopUI(name);
  $("soloModal")?.classList.remove("hidden");
  $("soloModal")?.setAttribute("aria-hidden", "false");
  const loadout = normalizeLoadout(window.__playerLoadout || DEFAULT_LOADOUT);
  requestAnimationFrame(() => {
    if (!soloMounted) {
      mountCharacterViewer("soloCanvas", {
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
  $("soloModal")?.classList.add("hidden");
  $("soloModal")?.setAttribute("aria-hidden", "true");
}

export function initSoloView() {
  $("openSoloBtn")?.addEventListener("click", openModal);
  $("closeSoloBtn")?.addEventListener("click", closeModal);
  $("soloModalBackdrop")?.addEventListener("click", closeModal);

  document.querySelectorAll(".shop-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".shop-tab").forEach((t) => t.classList.toggle("selected", t === tab));
      const which = tab.dataset.shopTab;
      $("shopPanelWeapons")?.classList.toggle("hidden", which !== "weapons");
      $("shopPanelChars")?.classList.toggle("hidden", which !== "chars");
    });
  });
  window.addEventListener("resize", () => {
    if (soloMounted && !$("soloModal")?.classList.contains("hidden")) {
      resizeViewer("soloCanvas");
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSoloView);
} else {
  initSoloView();
}
