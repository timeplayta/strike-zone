/** Armas reconhecíveis — GLTF quando disponível + modelos HD */

import * as THREE from "three";
import { buildWeaponModel, preloadWeaponModels } from "./weapon-gltf-loader.js";

export { preloadWeaponModels, isWeaponGltfReady } from "./weapon-gltf-loader.js";

/** Offsets no gunPivot do rig estilizado — mesmo eixo do rifle procedural (-Z = cano) */
export const STYLIZED_GRIP = {
  ak47: { pos: [0.02, -0.03, -0.05], rot: [-1.5708, Math.PI, 0.06], scale: 0.52 },
  scar: { pos: [0, 0, 0], rot: [0, 0, 0], scale: 0.5 },
  m4: { pos: [0, 0, 0], rot: [0, 0, 0], scale: 0.5 },
  ump45: { pos: [0, 0, 0.01], rot: [0, 0, 0], scale: 0.48 },
  awm: { pos: [0, 0, 0], rot: [0, 0, 0], scale: 0.52 },
  doze: { pos: [0, 0.005, 0.02], rot: [0, 0, 0], scale: 0.5 },
  bazooka: { pos: [0, -0.01, 0.05], rot: [0, 0, 0], scale: 0.36 },
  glock: { pos: [0, 0, 0.03], rot: [0, 0, 0], scale: 0.58 },
  revolver: { pos: [0, 0, 0.02], rot: [0, 0, 0], scale: 0.55 },
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
  return buildWeaponModel(type, tint);
}

export function attachStylizedWeapon(rig, gun, weaponType = "ak47") {
  if (!gun || !rig?.gunPivot) return { gun, pivot: null };

  rig.gunPivot.clear();
  const cfg = STYLIZED_GRIP[weaponType] || STYLIZED_GRIP.ak47;
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
