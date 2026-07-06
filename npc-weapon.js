/** Armas reconhecíveis — GLTF quando disponível + modelos HD */

import * as THREE from "three";
import { buildGltfWeapon, preloadWeaponModels } from "./weapon-gltf-loader.js";

export { preloadWeaponModels, isWeaponGltfReady } from "./weapon-gltf-loader.js";

/** Pivot na mão direita do Blockbench — alinhado com pose de rifle do personagem */
export const HAND_GUN_PIVOT = {
  pos: [0.04, -0.02, 0.06],
  rot: [-0.12, 0, 0.08],
};

/** Offsets para armas GLB Blockbench (cano em -Z, já normalizadas) */
export const BLOCKBENCH_GRIP = {
  ak47: { pos: [0.02, -0.05, 0.07], rot: [0, 0, 0], scale: 0.78 },
  scar: { pos: [0.02, -0.05, 0.07], rot: [0, 0, 0], scale: 0.78 },
  m4: { pos: [0.02, -0.05, 0.07], rot: [0, 0, 0], scale: 0.76 },
  ump45: { pos: [0.02, -0.04, 0.06], rot: [0, 0, 0], scale: 0.74 },
  awm: { pos: [0.02, -0.05, 0.08], rot: [0, 0, 0], scale: 0.8 },
  doze: { pos: [0.02, -0.04, 0.07], rot: [0, 0, 0], scale: 0.76 },
  bazooka: { pos: [0, -0.03, 0.1], rot: [0, 0, 0], scale: 0.62 },
  glock: { pos: [0, -0.025, 0.035], rot: [0, 0, 0], scale: 0.82 },
  revolver: { pos: [0, -0.025, 0.035], rot: [0, 0, 0], scale: 0.8 },
};

/** Fallback procedural HD — eixo diferente do GLB */
export const STYLIZED_GRIP = {
  ak47: { pos: [0.02, -0.03, -0.05], rot: [-1.5708, Math.PI, 0.06], scale: 0.42 },
  scar: { pos: [0, 0, 0], rot: [0, 0, 0], scale: 0.4 },
  m4: { pos: [0, 0, 0], rot: [0, 0, 0], scale: 0.4 },
  ump45: { pos: [0, 0, 0.01], rot: [0, 0, 0], scale: 0.38 },
  awm: { pos: [0, 0, 0], rot: [0, 0, 0], scale: 0.42 },
  doze: { pos: [0, 0.005, 0.02], rot: [0, 0, 0], scale: 0.4 },
  bazooka: { pos: [0, -0.01, 0.05], rot: [0, 0, 0], scale: 0.3 },
  glock: { pos: [0, 0, 0.03], rot: [0, 0, 0], scale: 0.48 },
  revolver: { pos: [0, 0, 0.02], rot: [0, 0, 0], scale: 0.46 },
};

/** Offsets Mixamo — mão direita, cano para frente */
const HAND_GRIP = {
  ak47: { pos: [0.03, 0.025, 0.01], rot: [-1.5708, Math.PI, 0], scale: 0.44 },
  scar: { pos: [0.03, 0.024, 0.008], rot: [-1.5708, Math.PI, 0], scale: 0.42 },
  m4: { pos: [0.028, 0.022, 0.008], rot: [-1.5708, Math.PI, 0], scale: 0.4 },
  ump45: { pos: [0.026, 0.02, 0.006], rot: [-1.5708, Math.PI, 0], scale: 0.38 },
  awm: { pos: [0.032, 0.028, 0.01], rot: [-1.5708, Math.PI, 0], scale: 0.46 },
  doze: { pos: [0.03, 0.025, 0.01], rot: [-1.5708, Math.PI, 0.02], scale: 0.44 },
  bazooka: { pos: [0.034, 0.038, 0.012], rot: [-1.5708, Math.PI, 0], scale: 0.48 },
  glock: { pos: [0.018, 0.018, 0.006], rot: [-1.5708, Math.PI, 0], scale: 0.36 },
  revolver: { pos: [0.02, 0.02, 0.008], rot: [-1.5708, Math.PI, 0], scale: 0.38 },
};

function tuneWeaponMeshes(gun) {
  gun?.traverse?.((o) => {
    if (o.isMesh) {
      o.castShadow = false;
      o.frustumCulled = true;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (!m?.isMeshStandardMaterial) continue;
        if (m.userData?.weaponPart === "metal") {
          m.metalness = Math.min(Math.max(m.metalness ?? 0.7, 0.55), 0.92);
          m.roughness = Math.min(Math.max(m.roughness ?? 0.35, 0.18), 0.42);
        } else if (m.userData?.weaponPart === "grip" || m.userData?.weaponPart === "body") {
          m.roughness = Math.max(m.roughness ?? 0.72, 0.62);
          m.metalness = Math.min(m.metalness ?? 0.08, 0.15);
        }
      }
    }
  });
}

export function pickNpcWeaponType(index, total = 4, role = null) {
  const pool = ["ak47", "m4", "scar", "ump45", "awm"];
  if (total === 1 || role === "solo") return "ak47";
  if (role === "sniper") return "awm";
  if (role === "rusher") return index % 2 === 0 ? "ump45" : "ak47";
  if (role === "flanker") return index % 2 === 0 ? "m4" : "scar";
  return pool[index % pool.length];
}

export function buildNpcWeapon(type = "ak47", tint = 0x5c3a1e) {
  return buildGltfWeapon(type, tint);
}

export function ensureHandGunPivot(anchor) {
  if (!anchor) return null;
  let gunPivot = anchor.getObjectByName("gunPivot");
  if (!gunPivot) {
    gunPivot = new THREE.Group();
    gunPivot.name = "gunPivot";
    gunPivot.position.set(...HAND_GUN_PIVOT.pos);
    gunPivot.rotation.set(...HAND_GUN_PIVOT.rot);
    anchor.add(gunPivot);
  }
  return gunPivot;
}

export function attachStylizedWeapon(rig, gun, weaponType = "ak47") {
  if (!gun || !rig?.gunPivot) return { gun, pivot: null };

  rig.gunPivot.clear();
  const gripTable = gun.userData?.isGltf ? BLOCKBENCH_GRIP : STYLIZED_GRIP;
  const cfg = gripTable[weaponType] || gripTable.ak47;
  gun.scale.setScalar(cfg.scale);
  gun.position.set(...cfg.pos);
  gun.rotation.set(...cfg.rot);
  rig.gunPivot.add(gun);
  tuneWeaponMeshes(gun);
  rig.gun = gun;

  return { gun, pivot: rig.gunPivot };
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
  tuneWeaponMeshes(gun);

  return { gun, pivot };
}

export function attachWeaponToCharacter(body, gun, weaponType = "ak47") {
  if (body?.rig?.gunPivot) {
    return attachStylizedWeapon(body.rig, gun, weaponType);
  }
  return attachNpcWeapon(
    { handR: body?.handR, foreR: body?.foreR || body?.handR, spine: body?.bones?.spine },
    gun,
    weaponType
  );
}
