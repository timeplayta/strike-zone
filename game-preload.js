/**
 * Pré-carregamento completo do Strike Zone — personagens, armas, mapas, props e motor.
 * Usado na tela de boot (PWA / tela inicial e primeira entrada).
 * Após a 1ª visita bem-sucedida, visitas seguintes usam caminho rápido (localStorage).
 */

export function isInstalledApp() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.navigator.standalone === true
  );
}

/** Bump quando assets críticos mudarem — invalida skip do boot. */
const PRELOAD_DONE_KEY = "strikezone_assets_v110";

const CRITICAL_FETCH = [
  "/assets/models/blockbench/characters/player_hero.glb",
  "/assets/models/blockbench/characters/operator.glb",
  "/assets/models/blockbench/characters/player_neon_runner.glb",
  "/assets/models/blockbench/characters/player_shadow.glb",
  "/assets/models/blockbench/characters/cowboy_sheriff.glb",
  "./assets/models/blockbench/props/flying_drop_vehicle.glb",
  "./assets/models/blockbench/props/br_house_enterable.glb",
  "./assets/models/blockbench/props/border_mountain.glb",
  "./assets/models/blockbench/props/cactus_prop.glb",
  "./assets/models/blockbench/props/parachute_default.glb",
  "./assets/models/blockbench/props/rock_cluster.glb",
  "./assets/models/blockbench/loot/loot_crate.glb",
  "./assets/textures/dust/bricks094/Bricks094_1K-JPG_Color.jpg",
  "./assets/textures/dust/woodfloor062/WoodFloor062_1K-JPG_Color.jpg",
];

const FRONTIER_BLOCKBENCH = [
  "border_mountain",
  "cactus_prop",
  "parachute_default",
  "rock_cluster",
  "flying_drop_vehicle",
  "br_house_enterable",
  "br_monster",
  "loot_crate",
  "loot_ammo_ar",
  "loot_ammo_doze",
];

async function warmCriticalFiles(onProgress, basePct, span) {
  let done = 0;
  const total = CRITICAL_FETCH.length;
  await Promise.all(
    CRITICAL_FETCH.map(async (url) => {
      try {
        await fetch(url, { cache: "force-cache", mode: "same-origin" });
      } catch {
        /* offline ou arquivo opcional */
      }
      done += 1;
      onProgress?.({
        pct: basePct + (done / total) * span,
        label: `Baixando arquivos (${done}/${total})…`,
      });
    })
  );
}

async function runFastPreload(report) {
  report(12, "Recuperando do cache — validando motor…");
  const [{ preloadPlayerCharacterModels, isPlayerBlockbenchReady }] = await Promise.all([
    import("./player-character.js"),
    import("./maps.js"),
  ]);
  await preloadPlayerCharacterModels();

  report(55, "Motor do jogo…");
  await import("./game.js?v=99");

  if (typeof window.startStrikeZone !== "function") {
    throw new Error("game.js não definiu startStrikeZone");
  }
  if (!isPlayerBlockbenchReady()) {
    localStorage.removeItem(PRELOAD_DONE_KEY);
    throw new Error("Modelo Blockbench do jogador não carregou. Use Ctrl+Shift+R.");
  }

  report(100, "Pronto!");
}

/**
 * @param {(state: { pct: number, label: string }) => void} onProgress
 */
export async function runGamePreload(onProgress) {
  const report = (pct, label) => onProgress?.({ pct: Math.min(100, Math.max(0, pct)), label });

  if (localStorage.getItem(PRELOAD_DONE_KEY) === "1") {
    try {
      await runFastPreload(report);
      return;
    } catch (err) {
      console.warn("Strike Zone: preload rápido falhou, recarregando tudo…", err);
      localStorage.removeItem(PRELOAD_DONE_KEY);
    }
  }

  report(2, isInstalledApp() ? "App na tela inicial — preparando tudo…" : "Preparando Strike Zone…");

  report(5, "Personagens e skins Blockbench…");
  const { preloadPlayerCharacterModels, isPlayerBlockbenchReady } = await import("./player-character.js");
  await preloadPlayerCharacterModels();

  report(18, "Armas e modelos 3D…");
  const { preloadWeaponModels } = await import("./npc-weapon.js");
  await preloadWeaponModels();

  report(32, "Texturas dos mapas…");
  const { preloadMapSurfaceTextures } = await import("./environment-textures.js");
  await preloadMapSurfaceTextures();

  report(44, "Props, casas e loot da ilha…");
  const { preloadBlockbenchModels } = await import("./blockbench-model-loader.js");
  await preloadBlockbenchModels();

  report(52, "Ilha Frontier — mapa completo e POIs…");
  const { getMap } = await import("./maps.js");
  await import("./frontier-map.js");
  getMap("frontier");
  await preloadBlockbenchModels(FRONTIER_BLOCKBENCH);

  report(58, "Monstros e efeitos de terror…");
  const [{ preloadGrimyHand }, { preloadRogerJanitor }] = await Promise.all([
    import("./grimy-hand-loader.js"),
    import("./gigante-monster-builder.js"),
  ]);
  await Promise.all([preloadGrimyHand(), preloadRogerJanitor()]);

  report(68, "Mapas e dados do jogo…");
  await import("./maps.js");

  await warmCriticalFiles(onProgress, 70, 12);

  report(84, "Loja, skins e previews…");
  try {
    const { preloadShopPreviews } = await import("./shop-item-preview.js");
    await preloadShopPreviews();
  } catch {
    /* loja opcional offline */
  }

  report(92, "Motor do jogo (Three.js)…");
  await import("./game.js?v=99");

  if (typeof window.startStrikeZone !== "function") {
    throw new Error("game.js não definiu startStrikeZone");
  }

  if (!isPlayerBlockbenchReady()) {
    throw new Error("Modelo Blockbench do jogador não carregou. Use Ctrl+Shift+R.");
  }

  localStorage.setItem(PRELOAD_DONE_KEY, "1");
  report(100, "Pronto!");
}

export function finishBootScreen() {
  const boot = document.getElementById("bootScreen");
  if (boot) {
    boot.classList.add("boot-done");
    boot.setAttribute("aria-hidden", "true");
    setTimeout(() => boot.classList.add("hidden"), 450);
  }
  document.body.classList.remove("boot-active");
}

export function showBootError(message) {
  const status = document.getElementById("bootStatus");
  const bar = document.getElementById("bootProgressBar");
  if (status) {
    status.textContent = message || "Erro ao carregar";
    status.classList.add("boot-status-error");
  }
  if (bar) bar.classList.add("boot-progress-error");
}
