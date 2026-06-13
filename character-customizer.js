/** Botão P (ao lado do painel) → modal de personagem */

import {
  SLOT_ORDER,
  SLOT_META,
  SLOT_PRESETS,
  normalizeLoadout,
  applyPresetToLoadout,
  DEFAULT_LOADOUT,
} from "./character-loadout.js";
import { getCharacterSkin, getLoggedInName, getPlayerLoadout, savePlayerLoadout } from "./player-account.js";
import { refreshAccountHub } from "./account-hub.js";
import { switchHubPanel, showPlayHub } from "./menu-hub.js";
import {
  mountCharacterViewer,
  destroyViewer,
  resizeViewer,
  updateViewerLoadout,
  hexStr,
} from "./character-viewer.js";
import { switchHubPanel, showPlayHub } from "./menu-hub.js";

function $(id) {
  return document.getElementById(id);
}

let currentLoadout = normalizeLoadout(DEFAULT_LOADOUT);
let activeSlot = "helmet";
let viewerMounted = false;

function renderSlotTabs() {
  const tabs = $("customSlotTabs");
  if (!tabs) return;
  tabs.innerHTML = "";
  for (const slot of SLOT_ORDER) {
    const meta = SLOT_META[slot];
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "custom-slot-tab" + (slot === activeSlot ? " selected" : "");
    btn.dataset.slot = slot;
    btn.innerHTML =
      `<span class="custom-slot-step">${meta.step}</span>` +
      `<span class="custom-slot-icon">${meta.icon}</span>` +
      `<span class="custom-slot-label">${meta.label}</span>`;
    btn.addEventListener("click", () => selectSlot(slot));
    tabs.appendChild(btn);
  }
}

function selectSlot(slot) {
  activeSlot = slot;
  renderSlotTabs();
  renderPresets();
  if ($("customActiveSlotLabel")) $("customActiveSlotLabel").textContent = SLOT_META[slot].label;
}

function renderPresets() {
  const grid = $("customPresetGrid");
  if (!grid) return;
  grid.innerHTML = "";
  const presets = SLOT_PRESETS[activeSlot] || [];
  const current = currentLoadout[activeSlot];
  for (const p of presets) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "custom-preset-card" + (current.presetId === p.id ? " selected" : "");
    card.innerHTML =
      `<span class="custom-swatch" style="background:${hexStr(p.color)}${p.neon ? ";box-shadow:0 0 12px " + hexStr(p.color) : ""}"></span>` +
      `<span class="custom-preset-name">${p.name}</span>` +
      `<span class="custom-preset-theme">${p.theme === "a8" ? "Asphalt 8" : "Free Fire"}</span>`;
    card.addEventListener("click", () => {
      currentLoadout = applyPresetToLoadout(currentLoadout, activeSlot, p.id);
      window.__playerLoadout = currentLoadout;
      renderPresets();
      if (viewerMounted) updateViewerLoadout("customizerCanvas", currentLoadout);
      import("./solo-view.js").then((m) => m.refreshSoloViewer?.());
      refreshAccountHub();
      import("./account-hub.js").then((m) => m.mountAccountFab?.());
    });
    grid.appendChild(card);
  }
}

async function openModal() {
  const name = getLoggedInName() || $("playerName")?.value?.trim();
  if (!name) {
    alert("Faça login para customizar.");
    return;
  }
  currentLoadout = normalizeLoadout(await getPlayerLoadout(name));
  window.__playerLoadout = currentLoadout;
  activeSlot = "helmet";
  renderSlotTabs();
  selectSlot("helmet");
  switchHubPanel("character");
  const panel = $("ffHubPanelCharacter");
  if (panel) {
    panel.classList.remove("hidden");
    panel.setAttribute("aria-hidden", "false");
  }
  requestAnimationFrame(() => {
    if (!viewerMounted) {
      mountCharacterViewer("customizerCanvas", {
        loadout: currentLoadout,
        autoSpin: true,
        characterSkin: getCharacterSkin(),
      });
      viewerMounted = true;
    } else {
      updateViewerLoadout("customizerCanvas", currentLoadout);
    }
    resizeViewer("customizerCanvas");
  });
}

function closeModal() {
  showPlayHub();
  const panel = $("ffHubPanelCharacter");
  if (panel) panel.setAttribute("aria-hidden", "true");
}

async function saveLoadout() {
  const name = getLoggedInName();
  if (!name) return alert("Faça login para salvar.");
  const btn = $("customSaveBtn");
  if (btn) btn.disabled = true;
  try {
    const res = await savePlayerLoadout(name, currentLoadout);
    if (res.ok) {
      window.__playerLoadout = currentLoadout;
      const hint = $("customSaveHint");
      if (hint) {
        hint.textContent = "Salvo!";
        setTimeout(() => { hint.textContent = ""; }, 2000);
      }
      refreshAccountHub();
      import("./account-hub.js").then((m) => m.mountAccountFab?.());
      import("./solo-view.js").then((m) => m.refreshSoloViewer?.());
    } else alert(res.msg || "Erro ao salvar.");
  } catch {
    alert("Servidor offline.");
  } finally {
    if (btn) btn.disabled = false;
  }
}

export function initCharacterCustomizer() {
  $("openCharacterBtn")?.addEventListener("click", openModal);
  $("closeCharacterBtn")?.addEventListener("click", closeModal);
  $("customSaveBtn")?.addEventListener("click", saveLoadout);
  window.addEventListener("resize", () => {
    const panel = $("ffHubPanelCharacter");
    if (viewerMounted && panel && !panel.classList.contains("hidden")) {
      resizeViewer("customizerCanvas");
    }
  });
}

export async function preloadPlayerLoadout(name) {
  if (!name) return;
  currentLoadout = normalizeLoadout(await getPlayerLoadout(name));
  window.__playerLoadout = currentLoadout;
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCharacterCustomizer);
} else {
  initCharacterCustomizer();
}
