/**
 * Gigante de mãos — modelo GLB Grimy Hand (Sketchfab hvarley, CC BY)
 * https://sketchfab.com/3d-models/grimy-hand-first-person-6020367b1d034b5191ac03f16a794d87
 *
 * Coloque o download em: assets/models/grimyhand.glb
 */

import * as THREE from "three";
import { GLTFLoader } from "./vendor/GLTFLoader.js";
import { clone as cloneSkeleton } from "./vendor/SkeletonUtils.js";
import { MAX_TEXTURE_ANISO } from "./perf-config.js";
import { buildProceduralGiantWallHandsPair } from "./horror-hand-builder.js";

const MODEL_URLS = [
  "./assets/models/grimyhand.glb",
  "./assets/models/GrimyHand.glb",
  "./assets/models/grimy-hand.glb",
];

const THUMB_URL = "./assets/models/grimy-hand-thumb.jpg";
const GIANT_HAND_HEIGHT = 2.35;

export { GIANT_HAND_HEIGHT };

let gltfTemplate = null;
let loadPromise = null;

function upgradeMeshMaterials(root) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.castShadow = true;
    obj.receiveShadow = true;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of mats) {
      if (!m) continue;
      m.roughness = Math.min(m.roughness ?? 0.78, 0.82);
      m.metalness = m.metalness ?? 0.04;
      if (m.map) {
        m.map.colorSpace = THREE.SRGBColorSpace;
        m.map.anisotropy = MAX_TEXTURE_ANISO;
        m.map.minFilter = THREE.LinearMipmapLinearFilter;
        m.map.generateMipmaps = true;
      }
      if (m.normalMap) {
        m.normalMap.anisotropy = MAX_TEXTURE_ANISO;
      }
    }
  });
}

function normalizeHandRoot(root) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 0.01);
  const scale = GIANT_HAND_HEIGHT / maxDim;
  root.scale.setScalar(scale);
  root.updateMatrixWorld(true);
  const box2 = new THREE.Box3().setFromObject(root);
  root.position.y -= box2.min.y;
  return root;
}

function cloneHandInstance(templateScene) {
  const hand = cloneSkeleton(templateScene);
  upgradeMeshMaterials(hand);
  return normalizeHandRoot(hand);
}

function buildPairFromGltf() {
  const root = new THREE.Group();
  const handL = cloneHandInstance(gltfTemplate.scene);
  const handR = cloneHandInstance(gltfTemplate.scene);

  handL.position.set(-1.75, 2.75, 0.15);
  handL.rotation.set(-0.32, 0.18, 0.12);
  handR.position.set(1.75, 2.75, 0.15);
  handR.rotation.set(-0.32, -0.18, -0.12);
  handR.scale.x *= -1;

  root.add(handL, handR);
  return { group: root, parts: { handL, handR }, source: "gltf" };
}

export async function preloadGrimyHand() {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const thumb = await enhanceGrimyHandThumbTexture();
      if (thumb) {
        const { setGrimyThumbReference } = await import("./horror-hand-builder.js");
        setGrimyThumbReference(thumb);
      }
    } catch { /* thumb opcional */ }

    for (const url of MODEL_URLS) {
      try {
        const gltf = await new GLTFLoader().loadAsync(url);
        if (!gltf?.scene) continue;
        gltfTemplate = gltf;
        upgradeMeshMaterials(gltf.scene);
        console.info("[Strike Zone] Grimy Hand GLB carregado:", url);
        return gltf;
      } catch {
        /* tenta próximo path */
      }
    }
    console.info(
      "[Strike Zone] grimyhand.glb não encontrado — usando mãos procedurais grimy. " +
        "Baixe o modelo em https://skfb.ly/pHRIB e salve em assets/models/grimyhand.glb"
    );
    return null;
  })();
  return loadPromise;
}

export function isGrimyHandGltfReady() {
  return !!gltfTemplate;
}

/** Par de mãos gigantes — GLB HD se disponível, senão procedural grimy */
export function buildGiantWallHandsPair() {
  if (gltfTemplate) return buildPairFromGltf();
  return buildProceduralGiantWallHandsPair();
}

/** Uma mão GLB em tamanho gigante (padrão 2.35 m) */
export function buildGiantHandFromGltf(targetHandHeight = GIANT_HAND_HEIGHT) {
  if (!gltfTemplate) return null;
  const hand = cloneSkeleton(gltfTemplate.scene);
  upgradeMeshMaterials(hand);
  hand.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(hand);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 0.01);
  const scale = targetHandHeight / maxDim;
  hand.scale.setScalar(scale);
  hand.updateMatrixWorld(true);
  const box2 = new THREE.Box3().setFromObject(hand);
  hand.position.y -= box2.min.y;
  return hand;
}

export async function enhanceGrimyHandThumbTexture() {
  try {
    const tex = await new THREE.TextureLoader().loadAsync(THUMB_URL);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  } catch {
    return null;
  }
}
