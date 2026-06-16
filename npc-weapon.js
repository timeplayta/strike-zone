/** Armas reconhecíveis — GLTF quando disponível + modelos HD */

import * as THREE from "three";
import { buildWeaponModel, preloadWeaponModels } from "./weapon-gltf-loader.js";

export { preloadWeaponModels, isWeaponGltfReady } from "./weapon-gltf-loader.js";

/** Offsets Mixamo — mão direita, cano para frente (+Z local da mão) */
const HAND_GRIP = {
  ak47: { pos: [0.02, 0.04, 0.02], rot: [1.57, 0, 1.57], scale: 0.85 },
  scar: { pos: [0.02, 0.038, 0.018], rot: [1.57, 0, 1.57], scale: 0.82 },
  m4: { pos: [0.02, 0.036, 0.016], rot: [1.57, 0, 1.57], scale: 0.8 },
  ump45: { pos: [0.018, 0.034, 0.014], rot: [1.57, 0, 1.57], scale: 0.78 },
  awm: { pos: [0.024, 0.042, 0.02], rot: [1.57, 0, 1.57], scale: 0.88 },
  doze: { pos: [0.02, 0.04, 0.02], rot: [1.57, 0, 1.55], scale: 0.85 },
  bazooka: { pos: [0.03, 0.055, 0.02], rot: [1.57, 0, 1.57], scale: 0.9 },
  glock: { pos: [0.01, 0.03, 0.01], rot: [1.57, 0, 1.57], scale: 0.7 },
  revolver: { pos: [0.012, 0.032, 0.012], rot: [1.57, 0, 1.57], scale: 0.74 },
};

export function pickNpcWeaponType(index, total = 4, role = null) {
  const pool = ["ak47", "m4", "scar", "ump45", "awm"];
  if (total === 1 || role === "solo") return "ak47";
  if (role === "sniper") return "awm";
  if (role === "rusher") return index % 2 === 0 ? "ump45" : "ak47";
  if (role === "flanker") return index % 2 === 0 ? "m4" : "scar";
  return pool[index % pool.length];
}

export function buildNpcWeapon(type = "ak47", tint = 0x5c3a1e) {
  return buildWeaponModel(type, tint);
}

export function attachNpcWeapon(bones, gun, weaponType = "ak47") {
  if (!gun) return { gun: null, pivot: null };
  const handR = bones?.handR;
  const foreR = bones?.foreR;
  const anchor = handR || foreR || bones?.spine;
  if (!anchor) return { gun, pivot: null };

  const pivot = new THREE.Group();
  pivot.name = "weaponPivot";
  anchor.add(pivot);

  const cfg = HAND_GRIP[weaponType] || HAND_GRIP.ak47;
  gun.scale.setScalar(cfg.scale);
  gun.position.set(...cfg.pos);
  gun.rotation.set(...cfg.rot);
  pivot.add(gun);

  gun.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = false;
      o.frustumCulled = true;
    }
  });

  return { gun, pivot };
}
