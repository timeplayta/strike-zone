/** Personagens especiais compráveis — John Cravóixq e Miriã Vóixquisa (corpo 100% procedural) */

import * as THREE from "three";
import { buildStylizedHuman } from "./stylized-character.js";
import { buildNpcWeapon, attachStylizedWeapon } from "./npc-weapon.js";

function addLongHair(rig, color) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.05 });
  const neck = rig.neckPivot;
  if (!neck) return;
  const strand = (y, z, len, r) => {
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 8), mat);
    m.position.set(0, y, z);
    return m;
  };
  neck.add(strand(-0.08, -0.06, 0.22, 0.075));
  neck.add(strand(-0.2, -0.07, 0.16, 0.06));
  const sideL = strand(-0.1, -0.02, 0.2, 0.045);
  sideL.position.x = -0.09;
  sideL.rotation.z = 0.12;
  neck.add(sideL);
  const sideR = strand(-0.1, -0.02, 0.2, 0.045);
  sideR.position.x = 0.09;
  sideR.rotation.z = -0.12;
  neck.add(sideR);
}

function attachWeapon(body, weaponType, tint) {
  if (!body.rig?.gunPivot) return;
  const gun = buildNpcWeapon(weaponType, tint);
  const attached = attachStylizedWeapon({ gunPivot: body.rig.gunPivot }, gun, weaponType);
  body.gun = attached.gun;
  body.weaponPivot = attached.pivot;
}

function finalize(body, skinId, weaponType) {
  body.group.userData.playerAvatar = true;
  body.group.userData.specialCharacter = skinId;
  return {
    group: body.group,
    hitMeshes: body.hitMeshes,
    head: body.head,
    gun: body.gun,
    weaponPivot: body.weaponPivot,
    rig: body.rig,
    mixer: null,
    playerModel: true,
    weaponType,
  };
}

function buildJohn(opts) {
  const body = buildStylizedHuman({
    shirt: 0xf0ece2,
    pants: 0x33343e,
    skin: 0xf2d9c6,
    gloves: 0x232327,
    shoes: 0x1c1c20,
    scale: 1,
    muscular: false,
    withRifle: false,
    faceProfile: { beard: true, hairColor: 0x2a2018, skinTone: 0xf2d9c6, headStyle: "face" },
  });
  const targetH = 1.7 / 1.82;
  body.group.scale.set(targetH * 0.85, targetH, targetH * 0.88);
  if (opts.withRifle !== false) attachWeapon(body, "pens", 0x2255aa);
  return finalize(body, "john_cravoixq", "pens");
}

function buildMiria(opts) {
  const body = buildStylizedHuman({
    shirt: 0xb3384f,
    pants: 0x24242c,
    skin: 0xa9754a,
    gloves: 0x1c1c1c,
    shoes: 0x1a1a1a,
    scale: 1,
    muscular: false,
    withRifle: false,
    faceProfile: { hairColor: 0x1c120c, skinTone: 0xa9754a, headStyle: "face" },
  });
  addLongHair(body.rig, 0x1c120c);
  const targetH = 1.6 / 1.82;
  body.group.scale.set(targetH * 1.02, targetH, targetH * 1.04);
  if (opts.withRifle !== false) attachWeapon(body, opts.weaponType || "ak47", opts.shirt ?? 0x2266aa);
  return finalize(body, "miria_voixquisa", opts.weaponType || "ak47");
}

const BUILDERS = {
  john_cravoixq: buildJohn,
  miria_voixquisa: buildMiria,
};

export function isSpecialCharacter(skinId) {
  return !!BUILDERS[skinId];
}

export function buildSpecialCharacter(skinId, opts = {}) {
  const fn = BUILDERS[skinId];
  if (!fn) return null;
  const body = fn(opts);
  if (opts.scale) body.group.scale.multiplyScalar(opts.scale);
  return body;
}
