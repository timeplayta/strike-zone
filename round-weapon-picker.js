/** Seleção de arma ao entrar no round (não no menu; não no Fim das Trevas) */

import { initMenuWeaponPreviews } from "./menu-weapon-preview.js";

let onConfirm = null;
let selectedId = "ak47";

function $(id) {
  return document.getElementById(id);
}

function selectWeapon(btn) {
  if (!btn?.dataset?.weapon) return;
  document.querySelectorAll("#roundWeaponPicker .weapon-btn").forEach((b) => b.classList.remove("selected"));
  btn.classList.add("selected");
  selectedId = btn.dataset.weapon;
}

export function showRoundWeaponPicker(callback) {
  const panel = $("roundWeaponPicker");
  if (!panel) {
    callback?.("ak47");
    return;
  }

  onConfirm = callback;
  selectedId =
    document.querySelector("#roundWeaponPicker .weapon-btn.selected")?.dataset?.weapon || "ak47";

  panel.classList.remove("hidden");
  panel.setAttribute("aria-hidden", "false");
  document.body.classList.add("round-weapon-pick-active");

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
  const id = selectedId || "ak47";
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
  onConfirm = null;
}
