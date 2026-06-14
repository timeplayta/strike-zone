async function loadGame() {

  const loadStatus = document.getElementById("loadStatus");

  try {

    if (loadStatus) loadStatus.textContent = "Carregando personagens 3D...";

    const { preloadHumanModels, isHumanModelReady } = await import("./human-model.js");
    await preloadHumanModels();

    const { preloadWeaponModels } = await import("./npc-weapon.js");
    await preloadWeaponModels();

    const { preloadGrimyHand } = await import("./grimy-hand-loader.js");
    await preloadGrimyHand();
    const { preloadRogerJanitor } = await import("./gigante-monster-builder.js");
    await preloadRogerJanitor();

    const { preloadMapSurfaceTextures } = await import("./environment-textures.js");
    await preloadMapSurfaceTextures();

    if (!isHumanModelReady()) {

      throw new Error("Modelo humano 3D não carregou. Use Ctrl+Shift+R ou JOGAR.bat.");

    }

    await import("./game.js");

    if (typeof window.startStrikeZone !== "function") {

      throw new Error("game.js nao definiu startStrikeZone");

    }

    window.__strikeZoneReady = true;

    window.__strikeZoneLoadError = null;

    try {
      const hub = await import("./account-hub.js");
      hub.refreshAccountFabHuman?.() || hub.mountAccountFab?.();
    } catch { /* optional */ }

    if (loadStatus) {

      loadStatus.textContent = "Pronto — clique em INICIAR PARTIDA";

      loadStatus.className = "load-status load-ok";

    }

    const btn = document.getElementById("startBtn");

    if (btn) btn.disabled = false;

  } catch (err) {

    console.error("Strike Zone:", err);

    window.__strikeZoneLoadError = err?.message || String(err);

    window.__strikeZoneReady = false;

    if (loadStatus) {

      loadStatus.textContent = "Erro: " + (err?.message || err);

      loadStatus.className = "load-status load-bad";

    }

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

