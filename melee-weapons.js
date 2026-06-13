/** Modelos 3D detalhados — facão, porrete, katana (mundo + FPS) */

import * as THREE from "three";

function bladeMat(color = 0x8899aa) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.28, metalness: 0.82 });
}

function woodMat(color = 0x3a2515) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.88, metalness: 0.04 });
}

function wrapMat(color = 0x1a1a1a) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0.02 });
}

export function buildFacaoModel() {
  const g = new THREE.Group();
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.52), bladeMat(0x7a8a9a));
  blade.position.set(0, 0, -0.28);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.015, 0.48), bladeMat(0xaabbcc));
  edge.position.set(0, 0.012, -0.28);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.22, 8), woodMat(0x4a3020));
  handle.rotation.x = Math.PI / 2;
  handle.position.set(0, 0, 0.08);
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.04), bladeMat(0x444444));
  guard.position.set(0, 0, -0.02);
  const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), bladeMat(0x555555));
  rivet.position.set(0, 0.02, 0.02);
  g.add(blade, edge, handle, guard, rivet);
  return g;
}

export function buildPorreteModel() {
  const g = new THREE.Group();
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.16, 10), woodMat(0x2a1810));
  head.rotation.x = Math.PI / 2;
  head.position.set(0, 0, -0.38);
  const spike = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 6), bladeMat(0x666666));
  spike.rotation.x = -Math.PI / 2;
  spike.position.set(0, 0, -0.48);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.62, 10), woodMat(0x3a2818));
  shaft.rotation.x = Math.PI / 2;
  shaft.position.set(0, 0, 0.02);
  for (let i = 0; i < 3; i++) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.012, 6, 12), bladeMat(0x333333));
    band.rotation.y = Math.PI / 2;
    band.position.set(0, 0, -0.12 + i * 0.14);
    g.add(band);
  }
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.048, 0.14, 8), wrapMat(0x111111));
  grip.rotation.x = Math.PI / 2;
  grip.position.set(0, 0, 0.28);
  g.add(head, spike, shaft, grip);
  return g;
}

export function buildKatanaModel() {
  const g = new THREE.Group();
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.012, 0.72), bladeMat(0xccddee));
  blade.position.set(0, 0, -0.38);
  const edgeLine = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, 0.68), bladeMat(0xffffff));
  edgeLine.position.set(0, 0.008, -0.38);
  const curve = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.01, 0.08), bladeMat(0x99aabb));
  curve.position.set(0, 0, -0.72);
  curve.rotation.x = -0.35;
  const tsuba = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.018, 12), bladeMat(0x222222));
  tsuba.rotation.x = Math.PI / 2;
  tsuba.position.set(0, 0, 0.02);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.2, 8), wrapMat(0x0a0808));
  handle.rotation.x = Math.PI / 2;
  handle.position.set(0, 0, 0.14);
  for (let i = 0; i < 5; i++) {
    const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.004, 4, 10), bladeMat(0x442222));
    wrap.rotation.y = Math.PI / 2;
    wrap.position.set(0, 0, 0.06 + i * 0.032);
    g.add(wrap);
  }
  g.add(blade, edgeLine, curve, tsuba, handle);
  return g;
}

const BUILDERS = {
  facao: buildFacaoModel,
  porrete: buildPorreteModel,
  katana: buildKatanaModel,
};

export function buildMeleeWorldModel(id) {
  const fn = BUILDERS[id];
  if (!fn) return new THREE.Group();
  const m = fn();
  m.scale.setScalar(1.15);
  m.rotation.x = -0.4;
  m.rotation.y = Math.PI * 0.25;
  return m;
}

export function buildMeleeFpsModel(id) {
  const fn = BUILDERS[id];
  if (!fn) return new THREE.Group();
  const m = fn();
  m.scale.setScalar(1.45);
  m.rotation.set(0.15, Math.PI, 0);
  m.position.set(0.08, -0.02, -0.05);
  return m;
}

export const MELEE_COLORS = {
  facao: 0x6688aa,
  porrete: 0x886644,
  katana: 0xaaccff,
};
