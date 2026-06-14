/** Modelos de arma detalhados - silhueta FPS reconhecivel (CS / FF) */

import * as THREE from "three";

function tagMat(m, part) {
  m.userData.weaponPart = part;
  return m;
}

export function matMetal(c = 0x7a7a88) {
  return tagMat(
    new THREE.MeshStandardMaterial({
      color: c,
      roughness: 0.22,
      metalness: 0.92,
    }),
    "metal"
  );
}

export function matDark(c = 0x1a1a22) {
  return tagMat(
    new THREE.MeshStandardMaterial({ color: c, roughness: 0.48, metalness: 0.55 }),
    "dark"
  );
}

export function matGrip(c = 0x2a2220) {
  return tagMat(
    new THREE.MeshStandardMaterial({ color: c, roughness: 0.78, metalness: 0.06 }),
    "grip"
  );
}

export function matBody(c = 0x6b4423) {
  return tagMat(
    new THREE.MeshStandardMaterial({ color: c, roughness: 0.72, metalness: 0.08 }),
    "body"
  );
}

function box(w, h, d, mat, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.castShadow = false;
  m.receiveShadow = false;
  return m;
}

function cyl(rt, rb, h, seg, mat, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.castShadow = false;
  m.receiveShadow = false;
  return m;
}

function tube(r, h, seg, mat, x, y, z, rx = 0) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg, 1, false), mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, 0, 0);
  m.castShadow = false;
  m.receiveShadow = false;
  return m;
}

function cloneMat(mat) {
  const c = mat.clone();
  c.userData.weaponPart = mat.userData.weaponPart;
  return c;
}

function addRail(g, mat, zStart, zEnd, y = 0.06) {
  g.add(box(0.05, 0.008, zEnd - zStart, mat, 0, y, (zStart + zEnd) / 2));
  const count = Math.max(3, Math.floor((zEnd - zStart) / 0.045));
  for (let i = 0; i < count; i++) {
    const z = zStart + (i + 0.5) * ((zEnd - zStart) / count);
    g.add(box(0.058, 0.011, 0.014, mat, 0, y + 0.008, z));
  }
}

function addIronSights(g, dark, frontZ, rearZ) {
  g.add(box(0.044, 0.012, 0.018, dark, 0, 0.078, rearZ));
  g.add(box(0.008, 0.035, 0.01, dark, -0.014, 0.096, rearZ));
  g.add(box(0.008, 0.035, 0.01, dark, 0.014, 0.096, rearZ));
  g.add(box(0.008, 0.036, 0.01, dark, 0, 0.09, frontZ));
}

function addMuzzleBrake(g, metal, z, big = false) {
  const radius = big ? 0.027 : 0.018;
  g.add(tube(radius, big ? 0.07 : 0.052, 18, metal, 0, 0.02, z, Math.PI / 2));
  g.add(box(radius * 1.7, 0.006, 0.012, metal, 0, 0.02, z - 0.008));
  g.add(box(radius * 1.7, 0.006, 0.012, metal, 0, 0.02, z + 0.008));
}

function addSidePanels(g, mat, zStart, zEnd, y = 0.028, x = 0.04) {
  const len = zEnd - zStart;
  g.add(box(0.008, 0.032, len, mat, x, y, (zStart + zEnd) / 2));
  g.add(box(0.008, 0.032, len, mat, -x, y, (zStart + zEnd) / 2));
  for (let i = 0; i < 4; i++) {
    const z = zStart + (i + 0.5) * (len / 4);
    g.add(box(0.012, 0.008, 0.028, cloneMat(mat), x + 0.002, y + 0.025, z));
    g.add(box(0.012, 0.008, 0.028, cloneMat(mat), -x - 0.002, y + 0.025, z));
  }
}

function addTriggerGuard(g, dark, z = 0.055) {
  g.add(box(0.06, 0.006, 0.052, dark, 0, -0.045, z));
  g.add(box(0.006, 0.04, 0.006, dark, -0.028, -0.03, z));
  g.add(box(0.006, 0.04, 0.006, dark, 0.028, -0.03, z));
}

function addScope(g, metal, dark, z = -0.18, long = false) {
  const len = long ? 0.18 : 0.12;
  g.add(box(0.014, 0.035, 0.08, dark, 0, 0.072, z + len * 0.1));
  g.add(tube(long ? 0.032 : 0.026, len, 20, metal, 0, 0.115, z, Math.PI / 2));
  g.add(tube(long ? 0.039 : 0.031, 0.035, 20, dark, 0, 0.115, z - len / 2, Math.PI / 2));
  g.add(tube(long ? 0.036 : 0.029, 0.028, 20, dark, 0, 0.115, z + len / 2, Math.PI / 2));
}

function addRibbedGrip(g, grip, x, y, z, h = 0.11) {
  g.add(box(0.032, h, 0.044, grip, x, y, z, 0.18));
  for (let i = 0; i < 4; i++) {
    g.add(box(0.034, 0.004, 0.047, cloneMat(grip), x, y - h * 0.32 + i * 0.018, z - 0.002, 0.18));
  }
}

function markWeapon(g, type) {
  g.userData.weaponType = type;
  g.traverse((o) => {
    if (o.isMesh) o.userData.weaponType = type;
  });
  return g;
}

function rifleCore(g, tint, opts = {}) {
  const {
    barrelLen = 0.42,
    stockLen = 0.24,
    receiverLen = 0.22,
    handguardLen = 0.18,
    modern = false,
  } = opts;

  const metal = matMetal();
  const dark = matDark();
  const body = matBody(tint);
  const grip = matGrip();

  g.add(box(0.062, 0.07, receiverLen, modern ? body : dark, 0, 0.005, 0.045));
  g.add(box(0.052, 0.045, handguardLen, body, 0, 0.015, -0.105));
  g.add(box(0.048, 0.024, stockLen, body, 0, 0.01, 0.21 + stockLen * 0.12));
  g.add(box(0.062, 0.05, 0.08, body, 0, -0.005, 0.16));
  g.add(box(0.068, 0.01, receiverLen * 0.72, metal, 0, 0.046, 0.04));
  g.add(box(0.008, 0.024, receiverLen * 0.46, dark, 0.036, 0.012, 0.035));
  g.add(box(0.008, 0.024, receiverLen * 0.46, dark, -0.036, 0.012, 0.035));
  g.add(tube(0.013, barrelLen, 20, metal, 0, 0.024, -barrelLen / 2 - 0.16, Math.PI / 2));
  g.add(tube(0.019, 0.09, 16, metal, 0, 0.024, -0.16, Math.PI / 2));
  addRail(g, dark, -0.18, 0.14, 0.057);
  addRibbedGrip(g, grip, 0, -0.07, -0.02);
  g.add(box(0.05, 0.03, 0.06, dark, 0, -0.02, -0.09));
  g.add(box(0.045, 0.008, 0.055, dark, 0, -0.03, 0.035));
  g.add(box(0.01, 0.038, 0.012, metal, 0, -0.046, 0.038, 0.18));
  addSidePanels(g, modern ? metal : body, -0.16, 0.1);
  addTriggerGuard(g, dark);
  return { metal, dark, body, grip };
}

export function buildHdAk47(tint = 0x6b4423) {
  const g = new THREE.Group();
  const { metal, dark, body } = rifleCore(g, tint, {
    barrelLen: 0.44,
    stockLen: 0.28,
    receiverLen: 0.22,
    handguardLen: 0.16,
  });

  g.add(box(0.029, 0.16, 0.07, dark, 0.032, -0.045, -0.055, 0.18, 0, -0.05));
  g.add(box(0.018, 0.12, 0.045, body, 0, 0.035, 0.135));
  g.add(tube(0.007, 0.36, 10, metal, 0, 0.044, -0.11, Math.PI / 2));
  g.add(box(0.034, 0.018, 0.17, metal, 0, 0.041, 0.02));
  g.add(box(0.052, 0.012, 0.06, dark, 0, 0.072, 0.085));
  g.add(box(0.075, 0.028, 0.11, body, 0, 0.026, -0.19));
  addIronSights(g, dark, -0.32, 0.11);
  addMuzzleBrake(g, metal, -0.61);

  return markWeapon(g, "ak47");
}

export function buildHdScar(tint = 0x3a4550) {
  const g = new THREE.Group();
  const { metal, dark, body, grip } = rifleCore(g, tint, {
    barrelLen: 0.39,
    stockLen: 0.21,
    receiverLen: 0.24,
    handguardLen: 0.21,
    modern: true,
  });

  g.add(box(0.068, 0.048, 0.25, body, 0, 0.016, -0.055));
  g.add(box(0.06, 0.014, 0.34, dark, 0, 0.069, -0.07));
  g.add(box(0.048, 0.056, 0.1, grip, 0, 0.012, 0.095));
  g.add(box(0.03, 0.08, 0.026, dark, 0, 0.04, 0.145));
  g.add(box(0.016, 0.02, 0.09, metal, 0, 0.05, -0.235));
  addScope(g, metal, dark, -0.08, false);
  addIronSights(g, dark, -0.34, 0.12);
  addMuzzleBrake(g, metal, -0.56);

  return markWeapon(g, "scar");
}

export function buildHdM4(tint = 0x3d4a38) {
  const g = new THREE.Group();
  const { metal, dark, body, grip } = rifleCore(g, tint, {
    barrelLen: 0.37,
    stockLen: 0.2,
    receiverLen: 0.2,
    handguardLen: 0.2,
    modern: true,
  });

  g.add(box(0.064, 0.045, 0.18, body, 0, 0.02, -0.045));
  g.add(box(0.05, 0.018, 0.28, metal, 0, 0.046, -0.12));
  g.add(box(0.018, 0.024, 0.1, dark, 0, 0.04, -0.285));
  for (let i = 0; i < 5; i++) {
    g.add(box(0.005, 0.012, 0.145, cloneMat(metal), 0.027, 0.019, -0.02 - i * 0.032));
    g.add(box(0.005, 0.012, 0.145, cloneMat(metal), -0.027, 0.019, -0.02 - i * 0.032));
  }
  g.add(box(0.04, 0.058, 0.072, grip, 0, -0.004, 0.092));
  addScope(g, metal, dark, -0.09, false);
  addIronSights(g, dark, -0.31, 0.1);
  addMuzzleBrake(g, metal, -0.52);

  return markWeapon(g, "m4");
}

export function buildHdUmp45(tint = 0x2a2a32) {
  const g = new THREE.Group();
  const metal = matMetal();
  const dark = matDark();
  const grip = matGrip(tint);

  g.add(box(0.062, 0.062, 0.22, metal, 0, 0.004, -0.015));
  g.add(box(0.055, 0.035, 0.2, dark, 0, 0.03, -0.02));
  g.add(tube(0.012, 0.29, 16, metal, 0, 0.017, -0.22, Math.PI / 2));
  addMuzzleBrake(g, metal, -0.38);
  g.add(box(0.035, 0.09, 0.078, grip, 0, -0.01, 0.072));
  addRibbedGrip(g, matGrip(), 0, -0.064, -0.018, 0.095);
  g.add(box(0.04, 0.026, 0.055, dark, 0, -0.013, -0.11));
  addRail(g, dark, -0.09, 0.09, 0.058);
  addSidePanels(g, grip, -0.13, 0.08, 0.018, 0.038);
  addIronSights(g, dark, -0.25, 0.08);

  return markWeapon(g, "ump45");
}

export function buildHdAwm(tint = 0x5c4030) {
  const g = new THREE.Group();
  const metal = matMetal();
  const dark = matDark();
  const body = matBody(tint);

  g.add(box(0.044, 0.054, 0.34, metal, 0, 0.002, -0.09));
  g.add(tube(0.015, 0.62, 24, metal, 0, 0.022, -0.47, Math.PI / 2));
  addMuzzleBrake(g, dark, -0.79, true);
  g.add(box(0.04, 0.105, 0.26, body, 0, -0.012, 0.18));
  g.add(box(0.05, 0.032, 0.28, body, 0, 0.01, 0.02));
  addScope(g, metal, dark, -0.24, true);
  g.add(box(0.036, 0.032, 0.13, dark, 0, 0.064, -0.13));
  g.add(box(0.052, 0.012, 0.42, dark, 0, 0.048, -0.32));
  g.add(box(0.012, 0.052, 0.03, dark, -0.025, -0.045, 0.13, 0.35));
  g.add(box(0.012, 0.052, 0.03, dark, 0.025, -0.045, 0.13, 0.35));
  g.add(box(0.026, 0.06, 0.035, dark, 0.032, -0.03, -0.02, 0.08));

  return markWeapon(g, "awm");
}

export function buildHdShotgun(tint = 0x6b4423) {
  const g = new THREE.Group();
  const metal = matMetal();
  const dark = matDark();
  const body = matBody(tint);

  g.add(box(0.056, 0.08, 0.24, body, 0, 0.004, 0.06));
  g.add(tube(0.03, 0.46, 18, metal, -0.014, 0.028, -0.29, Math.PI / 2));
  g.add(tube(0.03, 0.46, 18, metal, 0.014, 0.028, -0.29, Math.PI / 2));
  g.add(tube(0.026, 0.12, 14, dark, -0.014, 0.026, -0.58, Math.PI / 2));
  g.add(tube(0.026, 0.12, 14, dark, 0.014, 0.026, -0.58, Math.PI / 2));
  g.add(box(0.048, 0.06, 0.09, dark, 0, 0.012, 0.02));
  g.add(box(0.038, 0.032, 0.16, body, 0, -0.005, -0.16));
  addRibbedGrip(g, matGrip(), 0, -0.057, -0.02, 0.1);
  addSidePanels(g, body, -0.44, -0.05, 0.025, 0.05);
  g.add(box(0.018, 0.04, 0.06, dark, 0, 0.041, 0.105));
  addIronSights(g, dark, -0.48, 0.095);

  return markWeapon(g, "doze");
}

export function buildHdGlock(tint = 0x2a2a30) {
  const g = new THREE.Group();
  const metal = matMetal();
  const dark = matDark();
  const grip = matGrip(tint);

  g.add(box(0.04, 0.12, 0.145, grip, 0, -0.002, 0.02, 0.06));
  g.add(box(0.052, 0.044, 0.17, metal, 0, 0.055, -0.055));
  g.add(box(0.046, 0.012, 0.165, dark, 0, 0.08, -0.055));
  g.add(tube(0.011, 0.13, 14, metal, 0, 0.056, -0.155, Math.PI / 2));
  g.add(box(0.032, 0.04, 0.06, dark, 0, -0.042, 0.042));
  g.add(box(0.01, 0.012, 0.045, metal, 0, 0.084, -0.02));
  g.add(box(0.028, 0.009, 0.075, dark, 0, 0.069, -0.112));
  g.add(box(0.026, 0.004, 0.12, cloneMat(dark), 0.029, 0.058, -0.055));
  g.add(box(0.026, 0.004, 0.12, cloneMat(dark), -0.029, 0.058, -0.055));
  addTriggerGuard(g, dark, 0.005);

  return markWeapon(g, "glock");
}

export function buildHdBazooka(tint = 0x45305f) {
  const g = new THREE.Group();
  const metal = matMetal(0x8a8a96);
  const dark = matDark(0x17131f);
  const body = matBody(tint);
  const grip = matGrip(0x24182f);

  g.add(tube(0.07, 0.72, 28, body, 0, 0.03, -0.18, Math.PI / 2));
  g.add(tube(0.086, 0.08, 28, metal, 0, 0.03, -0.58, Math.PI / 2));
  g.add(tube(0.092, 0.1, 28, dark, 0, 0.03, 0.22, Math.PI / 2));
  g.add(box(0.15, 0.032, 0.42, dark, 0, 0.115, -0.08));
  addRail(g, metal, -0.35, 0.1, 0.145);
  addScope(g, metal, dark, -0.08, true);
  addRibbedGrip(g, grip, 0, -0.08, 0.02, 0.13);
  g.add(box(0.12, 0.08, 0.14, body, 0, -0.005, 0.18));
  g.add(box(0.036, 0.12, 0.05, grip, 0, -0.055, -0.18, -0.18));
  g.add(box(0.18, 0.018, 0.06, metal, 0, 0.035, -0.6));
  g.add(box(0.16, 0.018, 0.06, metal, 0, 0.035, 0.27));
  addSidePanels(g, metal, -0.44, 0.12, 0.03, 0.08);

  return markWeapon(g, "bazooka");
}

export function buildHdWeapon(type = "ak47", tint = 0x5c3a1e) {
  switch (type) {
    case "scar": return buildHdScar(tint);
    case "m4": return buildHdM4(tint);
    case "ump45": return buildHdUmp45(tint);
    case "awm": return buildHdAwm(tint);
    case "doze": return buildHdShotgun(tint);
    case "bazooka": return buildHdBazooka(tint);
    case "glock": return buildHdGlock(tint);
    default: return buildHdAk47(tint);
  }
}
