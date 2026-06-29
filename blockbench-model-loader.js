import * as THREE from "three";
import { GLTFLoader } from "./vendor/GLTFLoader.js";

const SOURCES = {
  rock_cluster: "./assets/models/blockbench/props/rock_cluster.glb",
  border_mountain: "./assets/models/blockbench/props/border_mountain.glb",
  br_monster: "./assets/models/blockbench/props/br_monster.glb",
  cactus_prop: "./assets/models/blockbench/props/cactus_prop.glb",
  flying_drop_vehicle: "./assets/models/blockbench/props/flying_drop_vehicle.glb",
  parachute_default: "./assets/models/blockbench/props/parachute_default.glb",
  br_house_enterable: "./assets/models/blockbench/props/br_house_enterable.glb",
  player_hero: "/assets/models/blockbench/characters/player_hero.glb",
  player_neon_runner: "/assets/models/blockbench/characters/player_neon_runner.glb",
  player_shadow: "/assets/models/blockbench/characters/player_shadow.glb",
  player_birthday: "/assets/models/blockbench/characters/player_birthday.glb",
  cowboy_sheriff: "/assets/models/blockbench/characters/cowboy_sheriff.glb",
  cowboy_outlaw: "/assets/models/blockbench/characters/cowboy_outlaw.glb",
  cowboy_vaqueiro: "/assets/models/blockbench/characters/cowboy_vaqueiro.glb",
  loot_ammo_ar: "./assets/models/blockbench/loot/loot_ammo_ar.glb",
  loot_ammo_doze: "./assets/models/blockbench/loot/loot_ammo_doze.glb",
  loot_crate: "./assets/models/blockbench/loot/loot_crate.glb",
};

const templates = new Map();
const loading = new Map();

function resolveUrls(key) {
  const primary = SOURCES[key];
  if (!primary) return [];
  if (primary.startsWith("/")) return [primary, `.${primary}`];
  return [primary, primary.replace(/^\.\//, "/")];
}

function loadTemplate(key) {
  if (templates.has(key)) return Promise.resolve(templates.get(key));
  if (loading.has(key)) return loading.get(key);

  const promise = (async () => {
    const loader = new GLTFLoader();
    for (const url of resolveUrls(key)) {
      try {
        const gltf = await loader.loadAsync(url);
        const root = gltf?.scene || null;
        if (!root) continue;
        root.traverse((o) => {
          if (!o.isMesh) return;
          o.castShadow = false;
          o.receiveShadow = true;
          o.frustumCulled = true;
        });
        templates.set(key, root);
        console.info("[Strike Zone] Blockbench carregado:", key, url);
        return root;
      } catch (err) {
        console.warn("[Strike Zone] falha Blockbench:", key, url, err);
      }
    }
    return null;
  })();

  loading.set(key, promise);
  return promise;
}

export function preloadBlockbenchModels(keys = null) {
  const list = keys || Object.keys(SOURCES);
  return Promise.all([...new Set(list)].map((k) => loadTemplate(k)));
}

export function isBlockbenchModelReady(key) {
  return templates.has(key);
}

function fitToBox(root, targetWidth = 1, targetHeight = 1) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  root.position.sub(center);

  const scaleW = targetWidth / Math.max(size.x, size.z, 0.01);
  const scaleH = targetHeight / Math.max(size.y, 0.01);
  root.scale.setScalar(Math.min(scaleW, scaleH));

  root.updateMatrixWorld(true);
  const fitted = new THREE.Box3().setFromObject(root);
  root.position.y -= fitted.min.y;
}

export function cloneBlockbenchModelSync(key, opts = {}) {
  const template = templates.get(key);
  if (!template) return null;
  const model = template.clone(true);
  fitToBox(model, opts.targetWidth || 1, opts.targetHeight || 1.78);
  return model;
}

export function upgradeWithBlockbenchModel(group, key, opts = {}) {
  if (!group || !SOURCES[key]) return group;
  group.userData.blockbenchKey = key;

  const apply = (template) => {
    if (!template || group.userData.blockbenchApplied) return;
    const model = template.clone(true);
    fitToBox(model, opts.targetWidth || 1, opts.targetHeight || 1.78);
    group.clear();
    group.add(model);
    group.userData.blockbenchApplied = true;
    group.userData.blockbenchModel = model;
    opts.onReady?.(model, group);
  };

  const cached = templates.get(key);
  if (cached) {
    apply(cached);
    return group;
  }

  loadTemplate(key).then(apply);
  return group;
}
