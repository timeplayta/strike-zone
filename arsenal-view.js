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
import { getShopItemThumbDataUrl } from "./shop-item-preview.js";
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
  const ownedIds = new Set(acc.purchases || []);
  const items = WEAPON_SKINS.filter((i) => i.weapon === activeWeapon && ownedIds.has(i.id));
  const activeColor = acc.skins?.[activeWeapon];

  if (!items.length) {
    list.innerHTML = `<p class="arsenal-empty">Você ainda não comprou skin para ${getWeaponLabel(activeWeapon)}. Compre na loja.</p>`;
  }

  for (const item of items) {
    const active = activeColor === item.color;
    const row = document.createElement("button");
    row.type = "button";
    row.className = "arsenal-skin-row owned" + (active ? " active" : "");
    row.innerHTML =
      `<img class="arsenal-skin-thumb" alt="" width="48" height="48" />` +
      `<span class="arsenal-swatch" style="background:${hex(item.color)}"></span>` +
      `<span class="arsenal-skin-name">${item.label}</span>` +
      `<span class="arsenal-skin-tier">${item.tier || ""}</span>` +
      `<span class="arsenal-skin-status">${active ? "✓ Em uso" : "Equipar"}</span>`;
    const thumb = row.querySelector(".arsenal-skin-thumb");
    if (thumb) {
      const url = getShopItemThumbDataUrl(item);
      if (url) thumb.src = url;
    }
    row.addEventListener("click", async () => {
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
    const activeItem = items.find((i) => i.color === activeColor);
    preview.innerHTML = "";
    if (activeItem) {
      const img = document.createElement("img");
      img.className = "arsenal-weapon-thumb";
      img.width = 80;
      img.height = 80;
      img.alt = activeItem.label;
      const url = getShopItemThumbDataUrl(activeItem);
      if (url) img.src = url;
      preview.appendChild(img);
      const label = document.createElement("span");
      label.textContent = getWeaponLabel(activeWeapon);
      preview.appendChild(label);
    } else {
      preview.textContent = getWeaponLabel(activeWeapon);
      preview.style.background = "#334455";
    }
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
