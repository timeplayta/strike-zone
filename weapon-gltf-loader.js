/** Armas GLTF (Poly Pizza / assets locais) com fallback procedural */

import * as THREE from "three";
import { GLTFLoader } from "./vendor/GLTFLoader.js";
import { buildHdWeapon } from "./weapon-models-hd.js";

const WEAPON_SOURCES = {
  ak47:  ['./assets/models/blockbench/weapons/ak47.glb', './assets/models/weapons/ak47.glb'],
  awm:   ['./assets/models/blockbench/weapons/awm.glb', './assets/models/weapons/awm.glb'],
  glock: ['./assets/models/blockbench/weapons/glock.glb', './assets/models/weapons/glock.glb'],
  scar:  ['./assets/models/blockbench/weapons/scar.glb', './assets/models/weapons/scar.glb'],
  m4:    ['./assets/models/blockbench/weapons/m4.glb', './assets/models/weapons/m4.glb'],
  ump45: ['./assets/models/blockbench/weapons/ump45.glb', './assets/models/weapons/ump45.glb'],
  doze:  ['./assets/models/blockbench/weapons/doze.glb', './assets/models/weapons/doze.glb'],
  revolver: ['./assets/models/blockbench/weapons/revolver.glb'],
};

const templates = new Map();
let loadPromise = null;

function tagMeshMaterials(root) {
  root.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (!m.userData.weaponPart) {
        const metalness = m.metalness ?? 0;
        m.userData.weaponPart = metalness > 0.5 ? "metal" : "body";
      }
    }
  });
}

async function loadOne(type) {
  const urls = WEAPON_SOURCES[type];
  if (!urls) return null;
  const loader = new GLTFLoader();
  for (const url of urls) {
    try {
      const gltf = await loader.loadAsync(url);
      if (!gltf?.scene) continue;
      tagMeshMaterials(gltf.scene);
      templates.set(type, gltf.scene);
      console.info("Strike Zone: arma GLTF carregada", type, url);
      return gltf.scene;
    } catch (err) {
      console.warn("Strike Zone: falha arma", type, url, err);
    }
  }
  return null;
}

export function preloadWeaponModels() {
  if (loadPromise) return loadPromise;
  loadPromise = Promise.all(Object.keys(WEAPON_SOURCES).map((t) => loadOne(t)));
  return loadPromise;
}

export function isWeaponGltfReady(type) {
  return templates.has(type);
}

export function buildGltfWeapon(type, tint = 0x5c3a1e) {
  const template = templates.get(type);
  if (!template) return buildHdWeapon(type, tint);

  const g = template.clone(true);
  tagMeshMaterials(g);

  const box = new THREE.Box3().setFromObject(g);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  g.position.sub(center);

  const maxDim = Math.max(size.x, size.y, size.z, 0.01);
  const target = type === "glock" || type === "revolver" ? 0.38 : 0.52;
  g.scale.setScalar(target / maxDim);

  g.userData.weaponType = type;
  g.userData.isGltf = true;
  return g;
}

export function buildWeaponModel(type, tint = 0x5c3a1e) {
  if (templates.has(type)) return buildGltfWeapon(type, tint);
  return buildHdWeapon(type, tint);
}
