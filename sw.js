const CACHE = "strike-zone-v28";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./manifest.webmanifest",
  "./menu-init.js",
  "./game-loader.js",
  "./game.js",
  "./maps.js",
  "./labyrinth-layout.js",
  "./melee-weapons.js",
  "./melee-pickups.js",
  "./exit-zone.js",
  "./characters.js",
  "./human-model.js",
  "./npc-weapon.js",
  "./ammo-stations.js",
  "./player-account.js",
  "./admin-config.js",
  "./admin-panel.js",
  "./character-loadout.js",
  "./character-viewer.js",
  "./account-hub.js",
  "./character-customizer.js",
  "./solo-view.js",
  "./stylized-character.js",
  "./character-animation.js",
  "./entity-jump.js",
  "./npc-steering.js",
  "./npc-brain.js",
  "./environment-textures.js",
  "./cinematics.js",
  "./controls-mobile.js",
  "./map-props.js",
  "./world-decor.js",
  "./furniture.js",
  "./weapon-view.js",
  "./weapons-data.js",
  "./effects-ui.js",
  "./audio.js",
  "./vendor/three.module.js",
  "./vendor/GLTFLoader.js",
  "./vendor/SkeletonUtils.js",
  "./vendor/BufferGeometryUtils.js",
  "./vendor/Soldier.glb",
  "./assets/models/Soldier.glb",
  "./icon-192.png",
  "./icon-512.png",
];

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
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
