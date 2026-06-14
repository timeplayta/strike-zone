/** Botão P (ao lado do painel) → modal de personagem */

import {
  SLOT_ORDER,
  SLOT_META,
  OUTFIT_META,
  SLOT_PRESETS,
  OUTFIT_SETS,
  normalizeLoadout,
  applyPresetToLoadout,
  applyOutfitToLoadout,
  DEFAULT_LOADOUT,
  DEFAULT_LOADOUT_PRESET_IDS,
} from "./character-loadout.js";
import {
  equipShopItem,
  getCharacterSkin,
  getLoggedInName,
  getPlayerLoadout,
  loadAccount,
  savePlayerLoadout,
} from "./player-account.js";
import { refreshAccountHub } from "./account-hub.js";
import { switchHubPanel, showPlayHub } from "./menu-hub.js";
import { CHARACTER_SKINS } from "./shop-catalog.js";
import {
  mountCharacterViewer,
  destroyViewer,
  resizeViewer,
  updateViewerLoadout,
  updateViewerCharacterSkin,
  hexStr,
} from "./character-viewer.js";
import {
  mountTrevasMonsterPreviews,
  destroyAllTrevasMonsterPreviews,
  resizeTrevasMonsterPreviews,
} from "./trevas-monsters-preview.js";

function $(id) {
  return document.getElementById(id);
}

let currentLoadout = normalizeLoadout(DEFAULT_LOADOUT);
let currentAccount = null;
let currentCharacterSkin = "soldier";
let activeSlot = "helmet";
let viewerMounted = false;

function ownedIds() {
  return new Set(currentAccount?.purchases || []);
}

function ownsPreset(slot, presetId) {
  if (DEFAULT_LOADOUT_PRESET_IDS.includes(presetId)) return true;
  const owned = ownedIds();
  if (owned.has(`loadout_${slot}_${presetId}`)) return true;
  return OUTFIT_SETS.some((outfit) => owned.has(outfit.id) && outfit.loadout?.[slot] === presetId);
}

function ownsOutfit(outfit) {
  const owned = ownedIds();
  return owned.has(outfit.id) ||
    Object.entries(outfit.loadout || {}).every(([slot, presetId]) => ownsPreset(slot, presetId));
}

function refreshPreview() {
  window.__playerLoadout = currentLoadout;
  window.__characterSkin = currentCharacterSkin;
  if (viewerMounted) {
    updateViewerLoadout("customizerCanvas", currentLoadout);
    updateViewerCharacterSkin("customizerCanvas", currentCharacterSkin);
  }
  import("./solo-view.js").then((m) => m.refreshSoloViewer?.());
  refreshAccountHub();
  import("./account-hub.js").then((m) => m.mountAccountFab?.());
}

function renderSlotTabs() {
  const tabs = $("customSlotTabs");
  if (!tabs) return;
  tabs.innerHTML = "";
  const outfitBtn = document.createElement("button");
  outfitBtn.type = "button";
  outfitBtn.className = "custom-slot-tab" + (activeSlot === "outfits" ? " selected" : "");
  outfitBtn.dataset.slot = "outfits";
  outfitBtn.innerHTML =
    `<span class="custom-slot-step">${OUTFIT_META.step}</span>` +
    `<span class="custom-slot-icon">${OUTFIT_META.icon}</span>` +
    `<span class="custom-slot-label">${OUTFIT_META.label}</span>`;
  outfitBtn.addEventListener("click", () => selectSlot("outfits"));
  tabs.appendChild(outfitBtn);

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
  if ($("customActiveSlotLabel")) {
    $("customActiveSlotLabel").textContent = slot === "outfits" ? OUTFIT_META.label : SLOT_META[slot].label;
  }
}

function renderPresets() {
  const grid = $("customPresetGrid");
  if (!grid) return;
  grid.innerHTML = "";
  if (activeSlot === "outfits") {
    const ownedOutfits = OUTFIT_SETS.filter(ownsOutfit);
    const ownedCharacters = CHARACTER_SKINS.filter((c) => c.skinId === "soldier" || ownedIds().has(c.id));
    const bodyItems = [
      ...ownedOutfits.map((outfit) => ({ kind: "outfit", outfit })),
      ...ownedCharacters.map((skin) => ({ kind: "character", skin })),
    ];

    if (!bodyItems.length) {
      grid.innerHTML = `<p class="custom-empty">Você ainda não tem conjuntos. Compra na loja primeiro.</p>`;
      return;
    }

    for (const item of bodyItems) {
      const card = document.createElement("button");
      card.type = "button";
      const isOutfit = item.kind === "outfit";
      const outfit = item.outfit;
      const skin = item.skin;
      const selected = isOutfit
        ? currentLoadout.outfitId === outfit.id && currentCharacterSkin === "soldier"
        : currentCharacterSkin === skin.skinId;
      card.className = "custom-preset-card custom-outfit-card" + (selected ? " selected" : "");
      card.innerHTML =
        `<span class="custom-swatch" style="background:${hexStr(isOutfit ? outfit.color : skin.color)}"></span>` +
        `<span class="custom-preset-name">${isOutfit ? outfit.name : skin.label}</span>` +
        `<span class="custom-preset-theme">${isOutfit ? outfit.tier || "conjunto" : "corpo inteiro"}</span>`;
      card.addEventListener("click", async () => {
        if (isOutfit) {
          currentCharacterSkin = "soldier";
          if (ownedIds().has(outfit.id)) {
            const res = await equipShopItem(outfit.id);
            if (res.ok) currentAccount = res.account;
            else return alert(res.msg);
          }
          currentLoadout = applyOutfitToLoadout(currentLoadout, outfit.id);
        } else {
          if (skin.price > 0) {
            const res = await equipShopItem(skin.id);
            if (res.ok) currentAccount = res.account;
            else return alert(res.msg);
          }
          currentCharacterSkin = skin.skinId;
        }
        renderPresets();
        refreshPreview();
      });
      grid.appendChild(card);
    }
    return;
  }
  const presets = (SLOT_PRESETS[activeSlot] || []).filter((p) => ownsPreset(activeSlot, p.id));
  const current = currentLoadout[activeSlot];
  if (!presets.length) {
    grid.innerHTML = `<p class="custom-empty">Nada comprado nesta categoria ainda. Vai na loja para liberar.</p>`;
    return;
  }
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
      currentCharacterSkin = "soldier";
      renderPresets();
      refreshPreview();
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
  currentAccount = await loadAccount(name);
  currentCharacterSkin = currentAccount?.characterSkin || getCharacterSkin();
  currentLoadout = normalizeLoadout(await getPlayerLoadout(name) || currentAccount?.loadout);
  window.__playerLoadout = currentLoadout;
  window.__characterSkin = currentCharacterSkin;
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
        characterSkin: currentCharacterSkin,
      });
      viewerMounted = true;
    } else {
      updateViewerLoadout("customizerCanvas", currentLoadout);
    }
    resizeViewer("customizerCanvas");
    mountTrevasMonsterPreviews();
    resizeTrevasMonsterPreviews();
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
      currentAccount = res.account || currentAccount;
      currentLoadout = normalizeLoadout(res.account?.loadout || currentLoadout);
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
      resizeTrevasMonsterPreviews();
    }
  });
}

export async function preloadPlayerLoadout(name) {
  if (!name) return;
  currentAccount = await loadAccount(name);
  currentCharacterSkin = currentAccount?.characterSkin || getCharacterSkin();
  currentLoadout = normalizeLoadout(await getPlayerLoadout(name) || currentAccount?.loadout);
  window.__playerLoadout = currentLoadout;
  window.__characterSkin = currentCharacterSkin;
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCharacterCustomizer);
} else {
  initCharacterCustomizer();
}
