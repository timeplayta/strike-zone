import { runGamePreload, finishBootScreen, showBootError, isInstalledApp } from "./game-preload.js";

function updateBootUI(pct, label) {
  const bar = document.getElementById("bootProgressBar");
  const track = bar?.parentElement;
  const status = document.getElementById("bootStatus");
  const percent = document.getElementById("bootPercent");
  const sub = document.getElementById("bootSubtitle");
  if (bar) bar.style.width = `${pct}%`;
  if (track) track.setAttribute("aria-valuenow", String(Math.round(pct)));
  if (status) status.textContent = label;
  if (percent) percent.textContent = `${Math.round(pct)}%`;
  if (sub && pct < 100) {
    sub.textContent = isInstalledApp()
      ? "Instalado na tela inicial — carregando mapas, skins e personagens"
      : "Carregando mapas, skins, personagens e armas…";
  } else if (sub && pct >= 100) {
    sub.textContent = "Tudo pronto — bom jogo!";
  }
}

function updateMenuLoadStatus(ok, errMsg) {
  const loadStatus = document.getElementById("loadStatus");
  const btn = document.getElementById("startBtn");
  if (loadStatus) {
    loadStatus.textContent = ok
      ? "Pronto — clique em JOGAR"
      : errMsg || "Falha ao carregar — recarregue (F5)";
    loadStatus.className = ok ? "load-status load-ok" : "load-status load-bad";
  }
  if (btn) btn.disabled = !ok;
}

async function loadGame() {
  document.body.classList.add("boot-active");

  const isWelcomeVisible = () => {
    const welcome = document.getElementById("welcomeScreen");
    return !!welcome && !welcome.classList.contains("hidden");
  };

  try {
    await runGamePreload(({ pct, label }) => updateBootUI(pct, label));

    window.__strikeZoneReady = true;
    window.__strikeZoneLoadError = null;
    window.dispatchEvent(new CustomEvent("strikezone-ready"));

    updateMenuLoadStatus(true);
    finishBootScreen();

    try {
      const hub = await import("./account-hub.js");
      hub.refreshAccountFabHuman?.() || hub.mountAccountFab?.();
    } catch {
      /* optional */
    }
  } catch (err) {
    console.error("Strike Zone:", err);
    window.__strikeZoneLoadError = err?.message || String(err);
    window.__strikeZoneReady = false;

    showBootError(err?.message || String(err));
    updateMenuLoadStatus(false, err?.message || String(err));

    if (isWelcomeVisible() && location.protocol !== "file:") return;

    let el = document.getElementById("loadError");
    if (!el) {
      el = document.createElement("div");
      el.id = "loadError";
      el.className = "load-error";
      document.body.prepend(el);
    }
    el.classList.remove("hidden");
    el.innerHTML =
      "<strong>Erro ao carregar</strong><p>" +
      (err?.message || err) +
      "</p><p>Pressione <b>Ctrl+Shift+R</b> para limpar o cache.</p><p><a href=\"" +
      location.origin +
      "\">Recarregar</a></p>";
  }
}

loadGame();
