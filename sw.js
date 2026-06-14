const CACHE = "strike-zone-v68";
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
  "/game.js",
  "/perf-config.js",
  "/dev-chat.js",
  "/dev-commands.js",
  "/shop-catalog.js",
  "/shop-item-preview.js",
  "/weapon-skin-apply.js",
  "/weapon-models-hd.js",
  "/weapon-gltf-loader.js",
  "/assets/models/weapons/ak47.glb",
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
  "/labyrinth-layout.js",
  "/melee-weapons.js",
  "/melee-pickups.js",
  "/exit-zone.js",
  "/characters.js",
  "/human-model.js",
  "/npc-weapon.js",
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
  "/icon-192.png",
  "/icon-512.png",
];

function shouldCache(request, response) {
  if (!response || response.status !== 200) return false;
  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/")) return false;
  return true;
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
      fetch(e.request).catch(() => caches.match("/index.html"))
    );
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
      .catch(() => caches.match(e.request))
  );
});
