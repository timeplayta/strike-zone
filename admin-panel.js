/** UI do painel admin — visível só para conta MJuan */

import { MAPS, getMapMeta, MAP_KEYS } from "./maps.js";
import { isAdminAccount } from "./admin-config.js";

function $(id) {
  return document.getElementById(id);
}

function logAdmin(msg) {
  const el = $("adminCmdLog");
  if (!el) return;
  const line = document.createElement("div");
  line.className = "admin-cmd-line";
  line.textContent = msg;
  el.prepend(line);
  while (el.children.length > 12) el.lastChild.remove();
}

export function setAdminPanelVisible(show) {
  const panel = $("adminPanel");
  if (panel) panel.classList.toggle("hidden", !show);
  document.body.classList.toggle("user-is-admin", show);
}

export function showAdminForAccount(account) {
  setAdminPanelVisible(isAdminAccount(account));
  if (isAdminAccount(account)) refreshMapInfo();
}

function refreshMapInfo() {
  const key = $("adminMapViewSelect")?.value || "dust";
  const meta = getMapMeta(key);
  const box = $("adminMapInfo");
  if (!box) return;
  box.innerHTML =
    `<strong>${meta.name}</strong><br>` +
    `Modo: ${meta.mode}<br>` +
    `Tamanho: <strong>${meta.widthM} m × ${meta.heightM} m</strong><br>` +
    `Área: ~${meta.areaM2} m²`;
}

function selectAdminTab(tab) {
  document.querySelectorAll(".admin-tab").forEach((b) => {
    b.classList.toggle("selected", b.dataset.adminTab === tab);
  });
  $("adminTabPlay")?.classList.toggle("hidden", tab !== "play");
  $("adminTabChars")?.classList.toggle("hidden", tab !== "chars");
  $("adminTabMaps")?.classList.toggle("hidden", tab !== "maps");
}

function syncAdminMapToMenu(mapKey) {
  document.querySelectorAll(".map-btn").forEach((b) => {
    b.classList.toggle("selected", b.dataset.map === mapKey);
  });
  if (typeof window.updateMapModeUI === "function") window.updateMapModeUI();
}

function initAdminPanel() {
  document.querySelectorAll(".admin-tab").forEach((btn) => {
    btn.addEventListener("click", () => selectAdminTab(btn.dataset.adminTab));
  });

  $("adminMapViewSelect")?.addEventListener("change", refreshMapInfo);

  $("adminStartBtn")?.addEventListener("click", () => {
    const mapKey = $("adminMapSelect")?.value || "dust";
    syncAdminMapToMenu(mapKey);
    const mode = $("adminGameMode")?.value;
    if (mode && $("gameMode")) $("gameMode").value = mode === "escape" ? "tdm" : mode;
    window.__adminStartConfig = {
      mapKey,
      spectator: $("adminSpectatorStart")?.checked === true,
      nightVision: $("adminNightVision")?.checked === true,
      fromAdmin: true,
    };
    if (typeof window.startStrikeZone === "function") {
      window.startStrikeZone(window.__adminStartConfig);
    } else {
      $("startBtn")?.click();
    }
  });

  $("adminViewCharBtn")?.addEventListener("click", () => {
    const val = $("adminCharSelect")?.value || "bandit:0";
    const [type, idx] = val.includes(":") ? val.split(":") : [val, "0"];
    window.__adminStartConfig = {
      preview: "character",
      charType: type,
      charIndex: parseInt(idx, 10) || 0,
      fromAdmin: true,
    };
    if (typeof window.startAdminPreview === "function") {
      window.startAdminPreview(window.__adminStartConfig);
    }
  });

  $("adminViewMapBtn")?.addEventListener("click", () => {
    const mapKey = $("adminMapViewSelect")?.value || "dust";
    syncAdminMapToMenu(mapKey);
    window.__adminStartConfig = {
      mapKey,
      preview: "map",
      spectator: true,
      nightVision: $("adminNightVision")?.checked === true,
      fromAdmin: true,
    };
    if (typeof window.startAdminPreview === "function") {
      window.startAdminPreview(window.__adminStartConfig);
    }
  });

  const runCmd = () => {
    const cmd = $("adminCmdInput")?.value?.trim();
    if (!cmd) return;
    logAdmin("> " + cmd);
    $("adminCmdInput").value = "";
    if (typeof window.runAdminCommand === "function") {
      const out = window.runAdminCommand(cmd);
      if (out) logAdmin(out);
    } else {
      logAdmin("(Inicie uma partida admin para usar comandos)");
    }
  };

  $("adminCmdSend")?.addEventListener("click", runCmd);
  $("adminCmdInput")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") runCmd();
  });

  MAP_KEYS.forEach((k) => {
    if (!MAPS[k]) return;
  });
  refreshMapInfo();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAdminPanel);
} else {
  initAdminPanel();
}

window.showAdminForAccount = showAdminForAccount;
window.adminLog = logAdmin;
