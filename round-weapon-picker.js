/** Seleção de arma ao entrar no round (não no menu; não no Fim das Trevas) */

import { initMenuWeaponPreviews } from "./menu-weapon-preview.js";
import { ownsWeapon, getAccountForUnlocks, isPremiumWeapon } from "./weapon-unlocks.js";

let onConfirm = null;
let selectedId = "ak47";

function $(id) {
  return document.getElementById(id);
}

function selectWeapon(btn) {
  if (!btn?.dataset?.weapon || btn.disabled || btn.classList.contains("locked")) return;
  document.querySelectorAll("#roundWeaponPicker .weapon-btn").forEach((b) => b.classList.remove("selected"));
  btn.classList.add("selected");
  selectedId = btn.dataset.weapon;
}

function refreshPremiumWeaponLocks() {
  const acc = getAccountForUnlocks();
  const sub = $("roundWeaponSub");
  const hasRevolver = ownsWeapon(acc, "revolver");

  document.querySelectorAll("#roundWeaponPicker .weapon-btn[data-weapon]").forEach((btn) => {
    const wid = btn.dataset.weapon;
    if (!isPremiumWeapon(wid)) {
      btn.classList.remove("locked");
      btn.disabled = false;
      btn.querySelector(".weapon-lock-tag")?.remove();
      return;
    }
    const owned = ownsWeapon(acc, wid);
    btn.classList.toggle("locked", !owned);
    btn.disabled = !owned;
    let tag = btn.querySelector(".weapon-lock-tag");
    if (!owned) {
      if (!tag) {
        tag = document.createElement("span");
        tag.className = "weapon-lock-tag";
        tag.textContent = "1200 🪙";
        btn.appendChild(tag);
      }
      if (btn.classList.contains("selected")) btn.classList.remove("selected");
    } else {
      tag?.remove();
    }
  });

  if (sub) {
    sub.textContent = hasRevolver
      ? "Round iniciando — escolha a arma principal. Revólver Frontier vem como secundária."
      : "Round iniciando — escolha a arma principal. Glock vem como secundária (compre o Revólver na loja).";
  }

  const selected = document.querySelector("#roundWeaponPicker .weapon-btn.selected:not(.locked)");
  if (!selected) {
    const firstFree = document.querySelector("#roundWeaponPicker .weapon-btn:not(.locked)");
    firstFree?.classList.add("selected");
    selectedId = firstFree?.dataset?.weapon || "ak47";
  } else {
    selectedId = selected.dataset.weapon;
  }
}

export function showRoundWeaponPicker(callback) {
  const panel = $("roundWeaponPicker");
  if (!panel) {
    callback?.("ak47");
    return;
  }

  onConfirm = callback;
  refreshPremiumWeaponLocks();

  panel.classList.remove("hidden");
  panel.setAttribute("aria-hidden", "false");
  document.body.classList.add("round-weapon-pick-active", "show-cursor");
  document.exitPointerLock?.();

  requestAnimationFrame(() => initMenuWeaponPreviews());

  const confirmBtn = $("roundWeaponConfirm");
  if (confirmBtn && !confirmBtn.__bound) {
    confirmBtn.__bound = true;
    confirmBtn.addEventListener("click", () => confirmRoundWeaponPick());
  }

  panel.querySelectorAll(".weapon-btn").forEach((btn) => {
    if (btn.__rwBound) return;
    btn.__rwBound = true;
    btn.addEventListener("click", () => selectWeapon(btn));
  });
}

export function confirmRoundWeaponPick() {
  const panel = $("roundWeaponPicker");
  if (panel) {
    panel.classList.add("hidden");
    panel.setAttribute("aria-hidden", "true");
  }
  document.body.classList.remove("round-weapon-pick-active");
  if (!document.body.classList.contains("death-screen-active")) {
    document.body.classList.remove("show-cursor");
  }
  const acc = getAccountForUnlocks();
  let id = selectedId || "ak47";
  if (isPremiumWeapon(id) && !ownsWeapon(acc, id)) id = "ak47";
  if (onConfirm) onConfirm(id);
  onConfirm = null;
}

export function hideRoundWeaponPicker() {
  const panel = $("roundWeaponPicker");
  if (panel) {
    panel.classList.add("hidden");
    panel.setAttribute("aria-hidden", "true");
  }
  document.body.classList.remove("round-weapon-pick-active");
  if (!document.body.classList.contains("death-screen-active")) {
    document.body.classList.remove("show-cursor");
  }
  onConfirm = null;
}
