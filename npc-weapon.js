/** Armas reconhecíveis — modelos HD no boneco/NPC + GLB só onde obrigatório */

import * as THREE from "three";
import { buildWeaponModel, preloadWeaponModels } from "./weapon-gltf-loader.js";

export { preloadWeaponModels, isWeaponGltfReady } from "./weapon-gltf-loader.js";

const DEFAULT_HAND = new THREE.Vector3(0.1, 0.92, -0.34);

/** Grip das armas HD na mão do Blockbench (cano já aponta para -Z) */
export const NPC_HD_GRIP = {
  ak47: { pos: [0, 0.07, 0.04], rot: [0.04, 0, 0.02], scale: 1 },
  scar: { pos: [0, 0.07, 0.04], rot: [0.04, 0, 0.02], scale: 1 },
  m4: { pos: [0, 0.07, 0.04], rot: [0.04, 0, 0.02], scale: 1 },
  ump45: { pos: [0, 0.065, 0.035], rot: [0.04, 0, 0.02], scale: 1 },
  awm: { pos: [0, 0.075, 0.045], rot: [0.04, 0, 0.02], scale: 1 },
  doze: { pos: [0, 0.07, 0.04], rot: [0.04, 0, 0.02], scale: 1 },
  bazooka: { pos: [0, 0.06, 0.06], rot: [0.02, 0, 0], scale: 1 },
  glock: { pos: [0, 0.055, 0.025], rot: [0.08, 0, 0], scale: 1 },
  revolver: { pos: [0, 0.055, 0.025], rot: [0.08, 0, 0], scale: 1 },
};

/** Offsets para armas GLB Blockbench (loot / revólver) */
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

/** Compat — alias antigo */
export const STYLIZED_GRIP = NPC_HD_GRIP;

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

function getMeshGeometryCenter(mesh) {
  if (!mesh?.geometry) return null;
  if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
  const c = new THREE.Vector3();
  mesh.geometry.boundingBox.getCenter(c);
  return c;
}

function purgeStaleGunPivots(model) {
  if (!model) return;
  const remove = [];
  model.traverse((o) => {
    if (o.name === "gunPivot" && o.parent !== model.getObjectByName("weaponRig")) {
      remove.push(o);
    }
  });
  for (const o of remove) o.parent?.remove(o);
}

/**
 * Blockbench exporta cada parte como mesh na raiz com vértices no espaço do modelo.
 * Filho da mão cai no chão — o pivot precisa ficar na raiz, na posição real da mão.
 */
export function ensureBlockbenchGunPivot(model, handName = "hand_r") {
  if (!model) return null;

  purgeStaleGunPivots(model);

  let rig = model.getObjectByName("weaponRig");
  let gunPivot = rig?.getObjectByName("gunPivot");

  if (!rig) {
    rig = new THREE.Group();
    rig.name = "weaponRig";
    model.add(rig);
  }
  if (!gunPivot) {
    gunPivot = new THREE.Group();
    gunPivot.name = "gunPivot";
    rig.add(gunPivot);
  }

  const hand = model.getObjectByName(handName) || model.getObjectByName("handR");
  const handC = hand?.isMesh ? getMeshGeometryCenter(hand) : null;
  const fore = model.getObjectByName("forearm_r");
  const foreC = fore?.isMesh ? getMeshGeometryCenter(fore) : null;

  if (handC) rig.position.copy(handC);
  else rig.position.copy(DEFAULT_HAND);

  if (handC && foreC) {
    const dir = new THREE.Vector3().subVectors(handC, foreC);
    if (dir.lengthSq() > 1e-6) {
      dir.normalize();
      gunPivot.rotation.set(
        Math.asin(THREE.MathUtils.clamp(-dir.y, -1, 1)),
        Math.atan2(dir.x, -dir.z),
        0
      );
    }
  } else {
    gunPivot.rotation.set(-0.3, 0.15, 0.05);
  }

  return gunPivot;
}

/** @deprecated Use ensureBlockbenchGunPivot no boneco Blockbench */
export function ensureHandGunPivot(anchor, model = null) {
  if (model) return ensureBlockbenchGunPivot(model);
  if (!anchor) return null;
  let gunPivot = anchor.getObjectByName("gunPivot");
  if (!gunPivot) {
    gunPivot = new THREE.Group();
    gunPivot.name = "gunPivot";
    gunPivot.position.set(0.04, -0.02, 0.06);
    gunPivot.rotation.set(-0.12, 0, 0.08);
    anchor.add(gunPivot);
  }
  return gunPivot;
}

function tuneWeaponMeshes(gun) {
  gun?.traverse?.((o) => {
    if (o.isMesh) {
      o.castShadow = false;
      o.frustumCulled = true;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (!m?.isMeshStandardMaterial) continue;
        if (m.userData?.weaponPart === "metal") {
          m.metalness = Math.min(Math.max(m.metalness ?? 0.7, 0.62), 0.94);
          m.roughness = Math.min(Math.max(m.roughness ?? 0.35, 0.16), 0.38);
        } else if (m.userData?.weaponPart === "grip" || m.userData?.weaponPart === "body") {
          m.roughness = Math.max(m.roughness ?? 0.72, 0.58);
          m.metalness = Math.min(m.metalness ?? 0.08, 0.12);
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

/** Arma HD detalhada para boneco, NPC, loja e preview */
export function buildNpcWeapon(type = "ak47", tint = 0x5c3a1e) {
  return buildWeaponModel(type, tint);
}

export function attachStylizedWeapon(rig, gun, weaponType = "ak47") {
  if (!gun || !rig?.gunPivot) return { gun, pivot: null };

  rig.gunPivot.clear();
  const gripTable =
    gun.userData?.blockbench || (gun.userData?.isGltf && !gun.userData?.isNpcDisplay)
      ? BLOCKBENCH_GRIP
      : NPC_HD_GRIP;
  const cfg = gripTable[weaponType] || gripTable.ak47;

  const baseScale = gun.userData?.baseScale ?? 1;
  gun.scale.setScalar(cfg.scale * baseScale);
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
