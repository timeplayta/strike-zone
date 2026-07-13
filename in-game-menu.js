/** Menu in-game — engrenagem, HUD e sair da partida */

const HUD_STORAGE_KEY = "strikeZoneHudSettings";

const HUD_DEFAULTS = {
  crosshairX: 0,
  crosshairY: 0,
  crosshairSize: 100,
  mobBtnScale: 100,
};

let activeTab = "hud";

function $(id) {
  return document.getElementById(id);
}

function loadHudSettings() {
  try {
    const raw = localStorage.getItem(HUD_STORAGE_KEY);
    if (!raw) return { ...HUD_DEFAULTS };
    return { ...HUD_DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...HUD_DEFAULTS };
  }
}

function saveHudSettings(settings) {
  try {
    localStorage.setItem(HUD_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

function applyHudSettings(settings = loadHudSettings()) {
  const root = document.documentElement;
  root.style.setProperty("--hud-crosshair-x", `${settings.crosshairX}px`);
  root.style.setProperty("--hud-crosshair-y", `${settings.crosshairY}px`);
  root.style.setProperty("--hud-crosshair-scale", String(settings.crosshairSize / 100));
  root.style.setProperty("--hud-mob-btn-scale", String(settings.mobBtnScale / 100));
}

function syncHudForm(settings = loadHudSettings()) {
  const x = $("hudCrosshairX");
  const y = $("hudCrosshairY");
  const size = $("hudCrosshairSize");
  const mob = $("hudMobBtnScale");
  if (x) x.value = String(settings.crosshairX);
  if (y) y.value = String(settings.crosshairY);
  if (size) size.value = String(settings.crosshairSize);
  if (mob) mob.value = String(settings.mobBtnScale);
  $("hudCrosshairXVal") && ($("hudCrosshairXVal").textContent = String(settings.crosshairX));
  $("hudCrosshairYVal") && ($("hudCrosshairYVal").textContent = String(settings.crosshairY));
  $("hudCrosshairSizeVal") && ($("hudCrosshairSizeVal").textContent = `${settings.crosshairSize}%`);
  $("hudMobBtnScaleVal") && ($("hudMobBtnScaleVal").textContent = `${settings.mobBtnScale}%`);
}

function readHudForm() {
  return {
    crosshairX: Number($("hudCrosshairX")?.value ?? HUD_DEFAULTS.crosshairX),
    crosshairY: Number($("hudCrosshairY")?.value ?? HUD_DEFAULTS.crosshairY),
    crosshairSize: Number($("hudCrosshairSize")?.value ?? HUD_DEFAULTS.crosshairSize),
    mobBtnScale: Number($("hudMobBtnScale")?.value ?? HUD_DEFAULTS.mobBtnScale),
  };
}

function onHudInput() {
  const settings = readHudForm();
  syncHudForm(settings);
  applyHudSettings(settings);
  saveHudSettings(settings);
}

function resetHudSettings() {
  saveHudSettings({ ...HUD_DEFAULTS });
  syncHudForm(HUD_DEFAULTS);
  applyHudSettings(HUD_DEFAULTS);
}

function canShowGear() {
  if (!document.body.classList.contains("game-active")) return false;
  if (document.body.classList.contains("death-screen-active")) return false;
  if (document.body.classList.contains("round-weapon-pick-active")) return false;
  const jumpscare = $("jumpscareOverlay");
  if (jumpscare && !jumpscare.classList.contains("hidden")) return false;
  return true;
}

function syncGearButton() {
  const btn = $("inGameMenuBtn");
  if (!btn) return;
  const menuOpen = $("inGameMenu") && !$("inGameMenu").classList.contains("hidden");
  btn.classList.toggle("hidden", !canShowGear() || menuOpen);
}

function setActiveTab(tab) {
  activeTab = tab;
  document.querySelectorAll(".in-game-menu-nav-btn").forEach((btn) => {
    btn.classList.toggle("selected", btn.dataset.ingameTab === tab);
  });
  $("inGameTabHud")?.classList.toggle("hidden", tab !== "hud");
  $("inGameTabLeave")?.classList.toggle("hidden", tab !== "leave");
  const title = $("inGameMenuTitle");
  if (title) title.textContent = tab === "leave" ? "Sair da partida" : "HUD";
}

export function openInGameMenu() {
  if (!canShowGear()) return;
  const menu = $("inGameMenu");
  if (!menu || !menu.classList.contains("hidden")) return;
  syncHudForm();
  setActiveTab("hud");
  menu.classList.remove("hidden");
  menu.setAttribute("aria-hidden", "false");
  $("inGameMenuBtn")?.classList.add("hidden");
  document.body.classList.add("in-game-menu-open", "show-cursor");
  window.__strikeInGameMenuOpen = true;
  document.exitPointerLock?.();
}

export function closeInGameMenu() {
  const menu = $("inGameMenu");
  if (!menu || menu.classList.contains("hidden")) return;
  menu.classList.add("hidden");
  menu.setAttribute("aria-hidden", "true");
  document.body.classList.remove("in-game-menu-open", "show-cursor");
  window.__strikeInGameMenuOpen = false;
  syncGearButton();
  if (typeof window.strikeZoneResumeAfterMenu === "function") {
    window.strikeZoneResumeAfterMenu();
  }
}

function confirmLeaveMatch() {
  closeInGameMenu();
  if (typeof window.strikeZoneLeaveMatch === "function") {
    window.strikeZoneLeaveMatch();
  }
}

function initInGameMenu() {
  applyHudSettings();
  syncHudForm();

  $("inGameMenuBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    openInGameMenu();
  });

  $("inGameMenuCloseBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    closeInGameMenu();
  });

  document.querySelectorAll(".in-game-menu-nav-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const tab = btn.dataset.ingameTab;
      if (tab) setActiveTab(tab);
    });
  });

  ["hudCrosshairX", "hudCrosshairY", "hudCrosshairSize", "hudMobBtnScale"].forEach((id) => {
    $(id)?.addEventListener("input", onHudInput);
  });

  $("hudResetBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    resetHudSettings();
  });

  $("inGameLeaveConfirmBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    confirmLeaveMatch();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("inGameMenu")?.classList.contains("hidden")) {
      e.preventDefault();
      e.stopPropagation();
      closeInGameMenu();
    }
  });

  const observer = new MutationObserver(syncGearButton);
  observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
  syncGearButton();
}

window.openInGameMenu = openInGameMenu;
window.closeInGameMenu = closeInGameMenu;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initInGameMenu);
} else {
  initInGameMenu();
}
