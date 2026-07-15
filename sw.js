const CACHE = "strike-zone-v116";
const ASSETS = [
  "/",
  "/index.html",
  "/celular.html",
  "/style.css",
  "/manifest.webmanifest",
  "/menu-init.js",
  "/menu-hub.js",
  "/menu-weapon-preview.js",
  "/round-weapon-picker.js",
  "/game-loader.js",
  "/game-preload.js",
  "/game.js",
  "/perf-config.js",
  "/dev-chat.js",
  "/dev-commands.js",
  "/shop-catalog.js",
  "/shop-item-preview.js",
  "/weapon-skin-apply.js",
  "/weapon-models-hd.js",
  "/weapon-gltf-loader.js",
  "/blockbench-model-loader.js",
  "/horror-jumpscare.js",
  "/horror-monsters.js",
  "/horror-monster-sounds.js",
  "/horror-hand-builder.js",
  "/grimy-hand-loader.js",
  "/giant-hand-janitor.js",
  "/gigante-monster-builder.js",
  "/ln-roger-textures.js",
  "/monster-texture-hd.js",
  "/pelucia-materials.js",
  "/gosmento-muk-builder.js",
  "/assets/models/grimy-hand-thumb.jpg",
  "/trevas-monsters-preview.js",
  "/among-us-model.js",
  "/arsenal-view.js",
  "/maps.js",
  "/frontier-map.js",
  "/labyrinth-layout.js",
  "/melee-weapons.js",
  "/melee-pickups.js",
  "/battle-royale-loot.js",
  "/battle-royale-lobby.js",
  "/exit-zone.js",
  "/characters.js",
  "/human-model.js",
  "/npc-weapon.js",
  "/weapon-unlocks.js",
  "/player-character.js",
  "/ammo-stations.js",
  "/player-account.js",
  "/admin-config.js",
  "/admin-panel.js",
  "/character-loadout.js",
  "/character-viewer.js",
  "/account-hub.js",
  "/character-customizer.js",
  "/solo-view.js",
  "/map-view.js",
  "/map-card-art.js",
  "/in-game-menu.js",
  "/table-games.js",
  "/table-games-audio.js",
  "/table-games-bots.js",
  "/table-games-match.js",
  "/table-game-chess.js",
  "/table-game-checkers.js",
  "/table-game-pool.js",
  "/bot-difficulty.js",
  "/stylized-character.js",
  "/character-animation.js",
  "/entity-jump.js",
  "/npc-steering.js",
  "/npc-brain.js",
  "/environment-textures.js",
  "/assets/textures/dust/bricks094/Bricks094_1K-JPG_Color.jpg",
  "/assets/textures/dust/bricks094/Bricks094_1K-JPG_NormalGL.jpg",
  "/assets/textures/dust/bricks094/Bricks094_1K-JPG_Roughness.jpg",
  "/assets/textures/dust/woodfloor062/WoodFloor062_1K-JPG_Color.jpg",
  "/assets/textures/dust/woodfloor062/WoodFloor062_1K-JPG_NormalGL.jpg",
  "/assets/textures/dust/woodfloor062/WoodFloor062_1K-JPG_Roughness.jpg",
  "/assets/textures/labyrinth/diamondplate009/DiamondPlate009_1K-JPG_Color.jpg",
  "/assets/textures/labyrinth/diamondplate009/DiamondPlate009_1K-JPG_NormalGL.jpg",
  "/assets/textures/labyrinth/diamondplate009/DiamondPlate009_1K-JPG_Roughness.jpg",
  "/assets/textures/labyrinth/diamondplate009/DiamondPlate009_1K-JPG_Metalness.jpg",
  "/cinematics.js",
  "/controls-mobile.js",
  "/map-props.js",
  "/world-decor.js",
  "/furniture.js",
  "/weapon-view.js",
  "/weapons-data.js",
  "/effects-ui.js",
  "/audio.js",
  "/vendor/three.module.js",
  "/vendor/GLTFLoader.js",
  "/vendor/SkeletonUtils.js",
  "/vendor/BufferGeometryUtils.js",
  "/vendor/Soldier.glb",
  "/assets/models/Soldier.glb",
  "/assets/models/blockbench/weapons/ak47.glb",
  "/assets/models/blockbench/weapons/awm.glb",
  "/assets/models/blockbench/weapons/glock.glb",
  "/assets/models/blockbench/weapons/revolver.glb",
  "/assets/models/blockbench/weapons/scar.glb",
  "/assets/models/blockbench/weapons/m4.glb",
  "/assets/models/blockbench/weapons/ump45.glb",
  "/assets/models/blockbench/weapons/doze.glb",
  "/assets/models/blockbench/weapons/bazooka.glb",
  "/assets/models/blockbench/props/rock_cluster.glb",
  "/assets/models/blockbench/props/border_mountain.glb",
  "/assets/models/blockbench/props/br_monster.glb",
  "/assets/models/blockbench/props/cactus_prop.glb",
  "/assets/models/blockbench/props/flying_drop_vehicle.glb",
  "/assets/models/blockbench/props/parachute_default.glb",
  "/assets/models/blockbench/props/br_house_enterable.glb",
  "/assets/models/blockbench/loot/loot_ammo_ar.glb",
  "/assets/models/blockbench/loot/loot_ammo_doze.glb",
  "/assets/models/blockbench/loot/loot_crate.glb",
  "/assets/models/blockbench/characters/cowboy_sheriff.glb",
  "/assets/models/blockbench/characters/fps_hands_rework.glb",
  "/assets/models/blockbench/characters/player_hero.glb",
  "/assets/models/blockbench/characters/player_neon_runner.glb",
  "/assets/models/blockbench/characters/player_shadow.glb",
  "/assets/models/blockbench/characters/player_birthday.glb",
  "/assets/models/blockbench/characters/cowboy_outlaw.glb",
  "/assets/models/blockbench/characters/cowboy_vaqueiro.glb",
  "/icon-192.png",
  "/icon-512.png",
];

function shouldCache(request, response) {
  if (!response || response.status !== 200) return false;
  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/")) return false;
  if (/\.(html|js|css|json|webmanifest)$/i.test(url.pathname)) return false;
  return true;
}

function offlineAppResponse() {
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>Strike Zone offline</title>
    <body style="font-family:system-ui;background:#101722;color:white;padding:24px">
      <h1>Servidor do jogo offline</h1>
      <p>Abra o servidor local de novo e recarregue a página. Não vou carregar versão velha do jogo.</p>
    </body>`,
    { status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } }
  );
}

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.pathname.startsWith("/api/")) return;

  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).catch(() => offlineAppResponse())
    );
    return;
  }

  if (/\.(html|js|css|json|webmanifest)$/i.test(url.pathname)) {
    e.respondWith(fetch(e.request));
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (shouldCache(e.request, res)) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(e.request);
        if (cached) return cached;
        const pathOnly = new URL(e.request.url).pathname;
        const byPath = await caches.match(pathOnly);
        if (byPath) return byPath;
        return new Response("Offline", { status: 503, statusText: "Offline" });
      })
  );
});
