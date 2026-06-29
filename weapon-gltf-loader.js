/** Armas GLTF (Blockbench / assets locais) com fallback procedural */

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
  bazooka: ['./assets/models/blockbench/weapons/bazooka.glb'],
  revolver: [
    '/assets/models/blockbench/weapons/revolver.glb',
    './assets/models/blockbench/weapons/revolver.glb',
  ],
};

/** Só usa o GLB Blockbench — nunca o modelo procedural HD */
export const BLOCKBENCH_ONLY = new Set(["revolver"]);

const templates = new Map();
let loadPromise = null;

const BLOCKBENCH_PART_BY_MAT = {
  gold: "metal",
  metal: "metal",
  leather: "grip",
  leatherdark: "grip",
  dark: "dark",
  wood: "body",
  tan: "body",
};

function tagMeshMaterials(root) {
  root.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (m.userData.weaponPart) continue;
      const matName = String(m.name || "").toLowerCase().replace(/[^a-z]/g, "");
      if (BLOCKBENCH_PART_BY_MAT[matName]) {
        m.userData.weaponPart = BLOCKBENCH_PART_BY_MAT[matName];
      } else {
        const metalness = m.metalness ?? m.metalnessFactor ?? 0;
        m.userData.weaponPart = metalness > 0.5 ? "metal" : "body";
      }
    }
  });
}

function cloneBlockbenchMaterials(root) {
  root.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    if (Array.isArray(o.material)) {
      o.material = o.material.map((m) => {
        const c = m.clone();
        c.userData.weaponPart = m.userData?.weaponPart;
        return c;
      });
    } else {
      const c = o.material.clone();
      c.userData.weaponPart = o.material.userData?.weaponPart;
      o.material = c;
    }
  });
}

function applyWeaponTint(root, tint) {
  const bodyColor = new THREE.Color(tint);
  const gripColor = bodyColor.clone().multiplyScalar(0.55);
  root.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      const part = m.userData?.weaponPart;
      if (part === "body") m.color.copy(bodyColor);
      else if (part === "grip") m.color.copy(gripColor);
      else if (!part || part === "dark") {
        if (!m.color || m.color.getHex() === 0xffffff) m.color.setHex(0x1a1a22);
      }
    }
  });
}

function fixUntaggedMeshes(root) {
  root.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (!m.userData.weaponPart) {
        m.userData.weaponPart = "metal";
        if (!m.color || m.color.getHex() === 0xffffff) m.color.setHex(0x7a7a88);
      }
    }
  });
}

function normalizeWeaponScale(g, type) {
  g.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(g);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  g.position.sub(center);

  const maxDim = Math.max(size.x, size.y, size.z, 0.01);
  const target = type === "glock" || type === "revolver" ? 0.42 : 0.52;
  g.scale.setScalar(target / maxDim);
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
  if (BLOCKBENCH_ONLY.has(type)) {
    console.error(`Strike Zone: revólver Blockbench não carregou (${urls.join(", ")})`);
  }
  return null;
}

export function preloadWeaponModels() {
  if (loadPromise) return loadPromise;
  loadPromise = loadOne("revolver").then(() =>
    Promise.all(
      Object.keys(WEAPON_SOURCES)
        .filter((t) => t !== "revolver")
        .map((t) => loadOne(t))
    )
  );
  return loadPromise;
}

export function isWeaponGltfReady(type) {
  return templates.has(type);
}

export function isBlockbenchWeapon(type) {
  return BLOCKBENCH_ONLY.has(type);
}

/** Monta arma Blockbench preservando cores originais do GLB */
export function buildBlockbenchWeapon(type) {
  const template = templates.get(type);
  if (!template) {
    console.warn(`Strike Zone: ${type} Blockbench indisponível — aguarde o preload ou Ctrl+Shift+R`);
    const empty = new THREE.Group();
    empty.userData.weaponType = type;
    empty.userData.blockbenchMissing = true;
    return empty;
  }

  const g = template.clone(true);
  tagMeshMaterials(g);
  cloneBlockbenchMaterials(g);
  normalizeWeaponScale(g, type);

  g.userData.weaponType = type;
  g.userData.isGltf = true;
  g.userData.blockbench = true;
  return g;
}

export function buildGltfWeapon(type, tint = 0x5c3a1e) {
  if (BLOCKBENCH_ONLY.has(type)) return buildBlockbenchWeapon(type);

  const template = templates.get(type);
  if (!template) return buildHdWeapon(type, tint);

  const g = template.clone(true);
  tagMeshMaterials(g);
  fixUntaggedMeshes(g);
  normalizeWeaponScale(g, type);
  applyWeaponTint(g, tint);

  g.userData.weaponType = type;
  g.userData.isGltf = true;
  return g;
}

export function buildWeaponModel(type, tint = 0x5c3a1e) {
  if (BLOCKBENCH_ONLY.has(type)) {
    return buildBlockbenchWeapon(type);
  }

  const g = buildHdWeapon(type, tint);
  applyWeaponTint(g, tint);
  fixUntaggedMeshes(g);
  g.userData.weaponType = type;
  return g;
}
