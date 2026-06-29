/** Miniaturas e preview 3D para itens da loja */

import * as THREE from "three";
import { buildNpcWeapon, preloadWeaponModels } from "./npc-weapon.js";
import { buildAmongUsCharacter } from "./among-us-model.js";
import { buildStylizedHuman } from "./stylized-character.js";
import { DEFAULT_LOADOUT, applyOutfitToLoadout, applyPresetToLoadout, loadoutToBuildOpts } from "./character-loadout.js";
import { applyWeaponSkin } from "./weapon-skin-apply.js";
import { isWeaponGltfReady } from "./weapon-gltf-loader.js";

const cache = new Map();
const THUMB_CACHE_VER = "v10";

let weaponsReadyPromise = null;
let renderer;
let scene;
let camera;
let pivot;
let lightsAdded = false;
const PREVIEW_W = 192;
const PREVIEW_H = 132;

let featuredRenderer;
let featuredScene;
let featuredCamera;
let featuredPivot;
let featuredLights = false;
let featuredAnimId = 0;
let featuredCanvas = null;

function ensureWeaponsReady() {
  if (!weaponsReadyPromise) {
    weaponsReadyPromise = preloadWeaponModels();
  }
  return weaponsReadyPromise;
}

export function preloadShopPreviews() {
  return ensureWeaponsReady();
}

function ensureThumbPreview() {
  if (renderer) return;
  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(PREVIEW_W, PREVIEW_H);
  renderer.setClearColor(0x000000, 0);
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(30, PREVIEW_W / PREVIEW_H, 0.05, 20);
  pivot = new THREE.Group();
  scene.add(pivot);
}

function ensureFeaturedPreview(canvas) {
  if (!featuredRenderer || featuredCanvas !== canvas) {
    featuredRenderer?.dispose?.();
    featuredRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, canvas });
    featuredCanvas = canvas;
    featuredScene = new THREE.Scene();
    featuredCamera = new THREE.PerspectiveCamera(32, 1, 0.05, 20);
    featuredPivot = new THREE.Group();
    featuredScene.add(featuredPivot);
    featuredLights = false;
  }
  const w = canvas.clientWidth || 480;
  const h = canvas.clientHeight || 280;
  featuredRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  featuredRenderer.setSize(w, h, false);
  featuredCamera.aspect = w / h;
  featuredCamera.updateProjectionMatrix();
}

function addLightsToScene(targetScene, flagRef) {
  if (flagRef.value) return;
  targetScene.add(new THREE.AmbientLight(0xffffff, 0.82));
  const key = new THREE.DirectionalLight(0xfff0dd, 1.35);
  key.position.set(2.5, 4, 3.5);
  targetScene.add(key);
  const fill = new THREE.DirectionalLight(0x6688cc, 0.62);
  fill.position.set(-2, 1.5, 2);
  targetScene.add(fill);
  const rim = new THREE.DirectionalLight(0xffaa66, 0.42);
  rim.position.set(0, 2, -3);
  targetScene.add(rim);
  flagRef.value = true;
}

function clearGroup(group) {
  while (group.children.length) {
    const ch = group.children[0];
    group.remove(ch);
    ch.traverse((o) => {
      if (o.geometry) o.geometry.dispose?.();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose?.());
        else o.material.dispose?.();
      }
    });
  }
}

function weaponThumbScale(weaponId) {
  if (weaponId === "bazooka") return 1.9;
  if (weaponId === "glock") return 3.5;
  if (weaponId === "revolver") return 4.8;
  return 2.45;
}

function weaponFrameZoom(weaponId) {
  if (weaponId === "glock" || weaponId === "revolver") return 1.48;
  if (weaponId === "doze") return 1.32;
  return 1.16;
}

function buildShopWeaponMesh(item) {
  const gun = buildNpcWeapon(item.weapon, item.color || 0x6b4423);
  if (gun.userData?.blockbenchMissing) return null;
  if (item.type === "weapon") applyWeaponSkin(gun, item.weapon, item.color, item.id);
  gun.rotation.set(-0.08, Math.PI / 2, 0);
  gun.scale.setScalar(weaponThumbScale(item.weapon));
  return gun;
}

function frameObject(obj, cam, zoom = 1.15) {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  if (box.isEmpty()) return;
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y * 2.2, size.z, 0.25);
  const fov = THREE.MathUtils.degToRad(cam.fov);
  const dist = (maxDim / (2 * Math.tan(fov / 2))) / zoom;
  cam.position.set(center.x + 0.02, center.y + 0.04, center.z + Math.max(0.62, dist));
  cam.lookAt(center.x, center.y, center.z);
  cam.updateProjectionMatrix();
}

function addNonWeaponToPivot(item, targetPivot, cam) {
  if (item.type === "loadout") {
    const loadout = applyPresetToLoadout(DEFAULT_LOADOUT, item.slot, item.presetId);
    const opts = loadoutToBuildOpts(loadout);
    opts.withRifle = false;
    opts.scale = 0.72;
    targetPivot.add(buildStylizedHuman(opts).group);
    cam.position.set(0, 1.05, 2.15);
    cam.lookAt(0, 0.9, 0);
    return;
  }
  if (item.type === "outfit") {
    const loadout = applyOutfitToLoadout(DEFAULT_LOADOUT, item.id);
    const opts = loadoutToBuildOpts(loadout);
    opts.withRifle = false;
    opts.scale = 0.72;
    targetPivot.add(buildStylizedHuman(opts).group);
    cam.position.set(0, 1.05, 2.15);
    cam.lookAt(0, 0.9, 0);
    return;
  }
  targetPivot.add(buildAmongUsCharacter(item.skinId, 0.62).group);
  cam.position.set(0, 0.92, 1.85);
  cam.lookAt(0, 0.82, 0);
}

export function getShopItemThumbDataUrl(item) {
  if (!item?.id) return null;
  const key = `${item.id}_${THUMB_CACHE_VER}`;
  if (cache.has(key)) return cache.get(key);

  ensureThumbPreview();
  const lightsRef = { value: lightsAdded };
  addLightsToScene(scene, lightsRef);
  lightsAdded = lightsRef.value;
  clearGroup(pivot);

  if (item.type === "weapon" || item.type === "weapon_unlock") {
    const gun = buildShopWeaponMesh(item);
    if (!gun) return null;
    pivot.add(gun);
    frameObject(gun, camera, weaponFrameZoom(item.weapon));
  } else {
    addNonWeaponToPivot(item, pivot, camera);
  }

  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL("image/png");
  cache.set(key, url);
  return url;
}

export async function getShopItemThumbDataUrlAsync(item) {
  await ensureWeaponsReady();
  if (item?.weapon === "revolver" && !isWeaponGltfReady("revolver")) {
    await ensureWeaponsReady();
  }
  return getShopItemThumbDataUrl(item);
}

export function stopShopFeaturedPreview() {
  if (featuredAnimId) {
    cancelAnimationFrame(featuredAnimId);
    featuredAnimId = 0;
  }
  if (featuredPivot) clearGroup(featuredPivot);
}

export async function mountShopFeaturedPreview(canvas, item) {
  if (!canvas || !item) return;
  stopShopFeaturedPreview();
  await ensureWeaponsReady();

  ensureFeaturedPreview(canvas);
  const lightsRef = { value: featuredLights };
  addLightsToScene(featuredScene, lightsRef);
  featuredLights = lightsRef.value;
  clearGroup(featuredPivot);

  const isWeapon = item.type === "weapon" || item.type === "weapon_unlock";
  if (isWeapon) {
    const gun = buildShopWeaponMesh(item);
    if (!gun) return;
    gun.scale.setScalar(weaponThumbScale(item.weapon) * 0.72);
    featuredPivot.add(gun);
    frameObject(gun, featuredCamera, weaponFrameZoom(item.weapon) * 0.92);
  } else {
    addNonWeaponToPivot(item, featuredPivot, featuredCamera);
  }

  let t0 = performance.now();
  const spin = isWeapon;
  const tick = (now) => {
    if (canvas !== featuredCanvas) return;
    if (spin) featuredPivot.rotation.y = (now - t0) * 0.00055;
    featuredRenderer.render(featuredScene, featuredCamera);
    featuredAnimId = requestAnimationFrame(tick);
  };
  featuredAnimId = requestAnimationFrame(tick);
}

export function clearShopThumbCache() {
  cache.clear();
}

/** Gera thumbs que faltam após preload (revolver Blockbench etc.) */
export async function warmShopThumbCache(items) {
  await ensureWeaponsReady();
  clearShopThumbCache();
  for (const item of items) {
    await getShopItemThumbDataUrlAsync(item);
  }
}
