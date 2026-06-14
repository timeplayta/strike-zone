/** Miniaturas 3D para itens da loja (arma ou personagem) */

import * as THREE from "three";
import { buildNpcWeapon } from "./npc-weapon.js";
import { buildAmongUsCharacter } from "./among-us-model.js";
import { buildStylizedHuman } from "./stylized-character.js";
import { DEFAULT_LOADOUT, applyOutfitToLoadout, applyPresetToLoadout, loadoutToBuildOpts } from "./character-loadout.js";
import { applyWeaponSkin } from "./weapon-skin-apply.js";

const cache = new Map();
let renderer;
let scene;
let camera;
let pivot;
let lightsAdded = false;

function ensurePreview() {
  if (renderer) return;
  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(120, 88);
  renderer.setClearColor(0x000000, 0);
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(32, 120 / 88, 0.05, 20);
  pivot = new THREE.Group();
  scene.add(pivot);
}

function clearPivot() {
  while (pivot.children.length) {
    const ch = pivot.children[0];
    pivot.remove(ch);
    ch.traverse((o) => {
      if (o.geometry) o.geometry.dispose?.();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose?.());
        else o.material.dispose?.();
      }
    });
  }
}

function addLights() {
  if (lightsAdded) return;
  scene.add(new THREE.AmbientLight(0xffffff, 0.75));
  const key = new THREE.DirectionalLight(0xfff0dd, 1.25);
  key.position.set(2.5, 4, 3.5);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x6688cc, 0.55);
  fill.position.set(-2, 1.5, 2);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffaa66, 0.35);
  rim.position.set(0, 2, -3);
  scene.add(rim);
  lightsAdded = true;
}

export function getShopItemThumbDataUrl(item) {
  if (!item?.id) return null;
  const key = `${item.id}_v6`;
  if (cache.has(key)) return cache.get(key);

  ensurePreview();
  addLights();
  clearPivot();

  if (item.type === "weapon") {
    const gun = buildNpcWeapon(item.weapon, item.color);
    applyWeaponSkin(gun, item.weapon, item.color, item.id);
    gun.rotation.set(-0.08, Math.PI / 2, 0);
    gun.scale.setScalar(2.45);
    pivot.add(gun);
    camera.position.set(0.02, 0.04, 1.05);
    camera.lookAt(0, 0, 0);
  } else if (item.type === "loadout") {
    const loadout = applyPresetToLoadout(DEFAULT_LOADOUT, item.slot, item.presetId);
    const opts = loadoutToBuildOpts(loadout);
    opts.withRifle = false;
    opts.scale = 0.72;
    const body = buildStylizedHuman(opts);
    pivot.add(body.group);
    camera.position.set(0, 1.05, 2.15);
    camera.lookAt(0, 0.9, 0);
  } else if (item.type === "outfit") {
    const loadout = applyOutfitToLoadout(DEFAULT_LOADOUT, item.id);
    const opts = loadoutToBuildOpts(loadout);
    opts.withRifle = false;
    opts.scale = 0.72;
    const body = buildStylizedHuman(opts);
    pivot.add(body.group);
    camera.position.set(0, 1.05, 2.15);
    camera.lookAt(0, 0.9, 0);
  } else {
    const body = buildAmongUsCharacter(item.skinId, 0.62);
    pivot.add(body.group);
    camera.position.set(0, 0.92, 1.85);
    camera.lookAt(0, 0.82, 0);
  }

  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL("image/png");
  cache.set(key, url);
  return url;
}

/** Limpa cache após troca de modelos */
export function clearShopThumbCache() {
  cache.clear();
}
