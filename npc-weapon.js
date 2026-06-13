/** Armas reconhecíveis — silhueta CS / Free Fire / Fortnite */

import * as THREE from "three";

function matMetal(c = 0x6a6a72) {
  return new THREE.MeshStandardMaterial({
    color: c, roughness: 0.25, metalness: 0.9, emissive: 0x000000, emissiveIntensity: 0,
  });
}

function matDark() {
  return new THREE.MeshStandardMaterial({ color: 0x1a1a20, roughness: 0.45, metalness: 0.5 });
}

function matGrip(c = 0x2a2220) {
  return new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, metalness: 0.08 });
}

function matWood(c = 0x6b4423) {
  return new THREE.MeshStandardMaterial({ color: c, roughness: 0.82, metalness: 0.04 });
}

function box(w, h, d, mat, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  return m;
}

function cyl(rt, rb, h, seg, mat, x, y, z, rx = 0) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, 0, 0);
  return m;
}

/** Offsets Mixamo — mão direita, cano para frente (+Z local da mão) */
const HAND_GRIP = {
  ak47: { pos: [0.02, 0.04, 0.02], rot: [1.57, 0, 1.57], scale: 0.85 },
  scar: { pos: [0.02, 0.038, 0.018], rot: [1.57, 0, 1.57], scale: 0.82 },
  m4: { pos: [0.02, 0.036, 0.016], rot: [1.57, 0, 1.57], scale: 0.8 },
  ump45: { pos: [0.018, 0.034, 0.014], rot: [1.57, 0, 1.57], scale: 0.78 },
  awm: { pos: [0.024, 0.042, 0.02], rot: [1.57, 0, 1.57], scale: 0.88 },
  doze: { pos: [0.02, 0.04, 0.02], rot: [1.57, 0, 1.55], scale: 0.85 },
  glock: { pos: [0.01, 0.03, 0.01], rot: [1.57, 0, 1.57], scale: 0.7 },
};

export function pickNpcWeaponType(index, total = 4, role = null) {
  const pool = ["ak47", "m4", "scar", "ump45", "awm"];
  if (total === 1 || role === "solo") return "ak47";
  if (role === "sniper") return "awm";
  if (role === "rusher") return index % 2 === 0 ? "ump45" : "ak47";
  if (role === "flanker") return index % 2 === 0 ? "m4" : "scar";
  return pool[index % pool.length];
}

function rifleBase(gun, barrelLen, tint) {
  const metal = matMetal();
  const dark = matDark();
  const wood = matWood(tint);
  const grip = matGrip();
  gun.add(box(0.05, 0.07, 0.22, dark, 0, 0, 0.04));
  gun.add(cyl(0.014, 0.014, barrelLen, 12, metal, 0, 0.018, -barrelLen / 2 + 0.02, Math.PI / 2));
  gun.add(box(0.045, 0.09, 0.16, wood, 0, -0.01, 0.14));
  gun.add(box(0.035, 0.11, 0.04, grip, 0, -0.07, -0.02, 0.15, 0, 0));
  gun.add(box(0.055, 0.025, 0.05, dark, 0, -0.015, -0.1));
  return gun;
}

export function buildNpcAk47(tint = 0x6b4423) {
  const g = new THREE.Group();
  rifleBase(g, 0.38, tint);
  g.add(box(0.022, 0.14, 0.06, matDark(), 0.028, -0.04, -0.06, 0.08));
  g.userData.weaponType = "ak47";
  return g;
}

export function buildNpcScar(tint = 0x3a4550) {
  const g = new THREE.Group();
  rifleBase(g, 0.36, tint);
  g.add(box(0.04, 0.06, 0.12, matGrip(0x252528), 0, 0.01, 0.1));
  g.userData.weaponType = "scar";
  return g;
}

export function buildNpcM4(tint = 0x3d4a38) {
  const g = new THREE.Group();
  rifleBase(g, 0.34, tint);
  g.add(box(0.006, 0.014, 0.26, matMetal(0x888890), 0, 0.038, -0.12));
  g.add(box(0.012, 0.022, 0.08, matDark(), 0, 0.032, -0.28));
  g.userData.weaponType = "m4";
  return g;
}

export function buildNpcUmp45(tint = 0x2a2a32) {
  const g = new THREE.Group();
  const metal = matMetal();
  g.add(box(0.042, 0.055, 0.18, metal, 0, 0, -0.02));
  g.add(cyl(0.011, 0.011, 0.26, 12, metal, 0, 0.014, -0.18, Math.PI / 2));
  g.add(box(0.03, 0.08, 0.07, matGrip(tint), 0, -0.005, 0.06));
  g.add(box(0.022, 0.09, 0.035, matGrip(), 0, -0.058, -0.015, 0.12, 0, 0));
  g.add(cyl(0.02, 0.02, 0.035, 10, metal, 0, 0.012, -0.32, Math.PI / 2));
  g.userData.weaponType = "ump45";
  return g;
}

export function buildNpcAwm(tint = 0x5c4030) {
  const g = new THREE.Group();
  const metal = matMetal();
  g.add(box(0.038, 0.05, 0.28, metal, 0, 0, -0.06));
  g.add(cyl(0.016, 0.014, 0.5, 14, metal, 0, 0.016, -0.38, Math.PI / 2));
  g.add(cyl(0.028, 0.028, 0.04, 12, matDark(), 0, 0.02, -0.62, Math.PI / 2));
  g.add(box(0.034, 0.1, 0.2, matWood(tint), 0, -0.008, 0.16));
  g.add(cyl(0.04, 0.04, 0.05, 12, matDark(), 0, 0.04, -0.48));
  g.userData.weaponType = "awm";
  return g;
}

export function buildNpcShotgun(tint = 0x6b4423) {
  const g = new THREE.Group();
  g.add(box(0.05, 0.075, 0.2, matWood(tint), 0, 0, 0.04));
  g.add(cyl(0.03, 0.032, 0.4, 12, matMetal(), 0, 0.022, -0.26, Math.PI / 2));
  g.add(cyl(0.024, 0.026, 0.08, 10, matMetal(0x555560), 0, 0.02, -0.5, Math.PI / 2));
  g.userData.weaponType = "doze";
  return g;
}

export function buildNpcPistol(tint = 0x2a2a30) {
  const g = new THREE.Group();
  g.add(box(0.032, 0.11, 0.13, matGrip(tint), 0, 0, 0.02));
  g.add(cyl(0.01, 0.012, 0.11, 10, matMetal(), 0, 0.04, -0.08, Math.PI / 2));
  g.add(box(0.026, 0.035, 0.05, matDark(), 0, -0.035, 0.04));
  g.userData.weaponType = "glock";
  return g;
}

export function buildNpcWeapon(type = "ak47", tint = 0x5c3a1e) {
  switch (type) {
    case "scar": return buildNpcScar(tint);
    case "m4": return buildNpcM4(tint);
    case "ump45": return buildNpcUmp45(tint);
    case "awm": return buildNpcAwm(tint);
    case "doze": return buildNpcShotgun(tint);
    case "glock": return buildNpcPistol(tint);
    default: return buildNpcAk47(tint);
  }
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
