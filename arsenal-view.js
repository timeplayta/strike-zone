/** Arsenal — visualizar e equipar skins de arma (estilo Free Fire) */

import {
  getLoggedInName,
  getCharacterSkin,
  loadAccount,
  equipShopItem,
  getWeaponSkinColor,
} from "./player-account.js";
import { WEAPON_SKINS, WEAPON_IDS, getWeaponLabel } from "./shop-catalog.js";
import { normalizeLoadout, DEFAULT_LOADOUT } from "./character-loadout.js";
import {
  mountCharacterViewer,
  destroyViewer,
  resizeViewer,
  updateViewerLoadout,
} from "./character-viewer.js";
import { switchHubPanel, showPlayHub } from "./menu-hub.js";

function $(id) {
  return document.getElementById(id);
}

let arsenalMounted = false;
let activeWeapon = "ak47";

function hex(c) {
  return "#" + (c >>> 0).toString(16).padStart(6, "0");
}

async function renderWeaponTabs(acc) {
  const tabs = $("arsenalWeaponTabs");
  if (!tabs) return;
  tabs.innerHTML = "";
  for (const w of WEAPON_IDS) {
    if (w === "glock") continue;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "arsenal-weapon-tab" + (w === activeWeapon ? " selected" : "");
    btn.textContent = getWeaponLabel(w);
    btn.addEventListener("click", () => {
      activeWeapon = w;
      renderWeaponTabs(acc);
      renderSkinList(acc);
    });
    tabs.appendChild(btn);
  }
}

function renderSkinList(acc) {
  const list = $("arsenalSkinList");
  if (!list) return;
  list.innerHTML = "";
  const items = WEAPON_SKINS.filter((i) => i.weapon === activeWeapon);
  const activeColor = acc.skins?.[activeWeapon];

  for (const item of items) {
    const owned = (acc.purchases || []).includes(item.id);
    const active = activeColor === item.color;
    const row = document.createElement("button");
    row.type = "button";
    row.className = "arsenal-skin-row" + (owned ? " owned" : "") + (active ? " active" : "");
    row.innerHTML =
      `<span class="arsenal-swatch" style="background:${hex(item.color)}"></span>` +
      `<span class="arsenal-skin-name">${item.label}</span>` +
      `<span class="arsenal-skin-tier">${item.tier || ""}</span>` +
      `<span class="arsenal-skin-status">${active ? "✓ Em uso" : owned ? "Equipar" : "Loja"}</span>`;
    row.addEventListener("click", async () => {
      if (!owned) {
        alert("Compre esta skin na loja primeiro.");
        return;
      }
      if (active) return;
      const res = await equipShopItem(item.id);
      if (res.ok) {
        await openModal();
      } else alert(res.msg);
    });
    list.appendChild(row);
  }

  const preview = $("arsenalWeaponPreview");
  if (preview) {
    preview.style.background = activeColor ? hex(activeColor) : "#334455";
    preview.textContent = getWeaponLabel(activeWeapon);
  }
}

export async function refreshArsenal() {
  const acc = await loadAccount(getLoggedInName());
  renderWeaponTabs(acc);
  renderSkinList(acc);
  if (arsenalMounted) {
    updateViewerLoadout("arsenalCanvas", normalizeLoadout(window.__playerLoadout || DEFAULT_LOADOUT));
  }
}

async function openModal() {
  const name = getLoggedInName();
  if (!name) {
    alert("Faça login primeiro.");
    return;
  }
  const acc = await loadAccount(name);
  switchHubPanel("arsenal");
  const panel = $("ffHubPanelArsenal");
  if (panel) {
    panel.classList.remove("hidden");
    panel.setAttribute("aria-hidden", "false");
  }
  renderWeaponTabs(acc);
  renderSkinList(acc);

  const loadout = normalizeLoadout(window.__playerLoadout || DEFAULT_LOADOUT);
  requestAnimationFrame(() => {
    if (!arsenalMounted) {
      mountCharacterViewer("arsenalCanvas", {
        loadout,
        characterSkin: getCharacterSkin(),
        autoSpin: true,
      });
      arsenalMounted = true;
    } else {
      updateViewerLoadout("arsenalCanvas", loadout);
    }
    resizeViewer("arsenalCanvas");
  });
}

function closeModal() {
  showPlayHub();
  const panel = $("ffHubPanelArsenal");
  if (panel) panel.setAttribute("aria-hidden", "true");
}

export function initArsenalView() {
  $("openArsenalBtn")?.addEventListener("click", openModal);
  $("closeArsenalBtn")?.addEventListener("click", closeModal);
  window.addEventListener("resize", () => {
    const panel = $("ffHubPanelArsenal");
    if (arsenalMounted && panel && !panel.classList.contains("hidden")) {
      resizeViewer("arsenalCanvas");
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initArsenalView);
} else {
  initArsenalView();
}
