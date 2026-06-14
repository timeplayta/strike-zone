import * as THREE from "three";

const matCache = new Map();

function texCanvas(size, draw) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  draw(c.getContext("2d"), size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function rgbOf(color) {
  return { r: (color >> 16) & 255, g: (color >> 8) & 255, b: color & 255 };
}

/** Madeira com tábuas e veios */
function woodMat(color) {
  const key = "wood" + color;
  if (matCache.has(key)) return matCache.get(key);
  const { r, g, b } = rgbOf(color);
  const tex = texCanvas(64, (ctx, s) => {
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = `rgba(0,0,0,${i % 2 ? 0.12 : 0.05})`;
      ctx.fillRect(0, i * 16, s, 15);
    }
    ctx.strokeStyle = "rgba(30,18,8,0.4)";
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(0, Math.random() * s);
      ctx.bezierCurveTo(s * 0.3, Math.random() * s, s * 0.7, Math.random() * s, s, Math.random() * s);
      ctx.stroke();
    }
  });
  const m = new THREE.MeshLambertMaterial({ map: tex });
  matCache.set(key, m);
  return m;
}

/** Metal limpo e legível */
function metalMat(color) {
  const key = "metal" + color;
  if (matCache.has(key)) return matCache.get(key);
  const { r, g, b } = rgbOf(color);
  const tex = texCanvas(64, (ctx, s) => {
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.04 + Math.random() * 0.04})`;
      ctx.fillRect(Math.random() * s, Math.random() * s, 2 + Math.random() * 8, 1);
    }
  });
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4, metalness: 0.65 });
  matCache.set(key, m);
  return m;
}

/** Tecido áspero (sacos de areia) */
function fabricMat(color) {
  const key = "fab" + color;
  if (matCache.has(key)) return matCache.get(key);
  const { r, g, b } = rgbOf(color);
  const tex = texCanvas(32, (ctx, s) => {
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 3) {
      ctx.fillStyle = `rgba(0,0,0,${0.08 + (y % 6 ? 0 : 0.06)})`;
      ctx.fillRect(0, y, s, 1);
    }
    for (let x = 0; x < s; x += 3) {
      ctx.fillStyle = "rgba(0,0,0,0.05)";
      ctx.fillRect(x, 0, 1, s);
    }
  });
  const m = new THREE.MeshLambertMaterial({ map: tex });
  matCache.set(key, m);
  return m;
}

function mat(color) {
  return new THREE.MeshLambertMaterial({ color });
}

function barrel(x, z, color = 0x444455) {
  const g = new THREE.Group();
  const m = metalMat(color);
  const dark = metalMat(0x222228);
  g.add(mesh(new THREE.CylinderGeometry(0.42, 0.45, 1.05, 10), m, [0, 0.52, 0]));
  g.add(mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.06, 10), dark, [0, 0.2, 0]));
  g.add(mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.06, 10), dark, [0, 0.84, 0]));
  g.position.set(x, 0, z);
  return g;
}

function crateStack(x, z) {
  const g = new THREE.Group();
  const m = woodMat(0x8b6914);
  [[0.86, 0.6, 0.86, 0.3], [0.72, 0.5, 0.72, 0.85]].forEach(([w, h, d, y]) => {
    const box = mesh(new THREE.BoxGeometry(w, h, d), m, [0, y, 0]);
    g.add(box);
    g.add(mesh(new THREE.BoxGeometry(w * 0.95, 0.045, 0.05), m, [0, y + h * 0.25, d * 0.52]));
    g.add(mesh(new THREE.BoxGeometry(0.05, h * 0.86, 0.05), m, [-w * 0.36, y, d * 0.52]));
    g.add(mesh(new THREE.BoxGeometry(0.05, h * 0.86, 0.05), m, [w * 0.36, y, d * 0.52]));
  });
  g.position.set(x, 0, z);
  return g;
}

function sandbags(x, z, rot = 0) {
  const g = new THREE.Group();
  const m = fabricMat(0x9a8b6a);
  for (let row = 0; row < 2; row++)
    for (let col = 0; col < 4; col++)
      g.add(mesh(new THREE.BoxGeometry(0.6, 0.3, 0.34), m, [(col - 1.5) * 0.5, 0.15 + row * 0.28, row % 2 ? 0.08 : 0]));
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  return g;
}

function tireStack(x, z) {
  const g = new THREE.Group();
  const m = mat(0x1a1a1a);
  for (let i = 0; i < 3; i++) {
    const t = mesh(new THREE.TorusGeometry(0.32, 0.1, 4, 8), m, [0, 0.12 + i * 0.2, 0]);
    t.rotation.x = Math.PI / 2;
    g.add(t);
  }
  g.position.set(x, 0, z);
  return g;
}

function supplyBox(x, z, color = 0x556633) {
  const g = new THREE.Group();
  const m = woodMat(color);
  const metal = metalMat(0x333840);
  g.add(mesh(new THREE.BoxGeometry(1.12, 0.68, 0.68), m, [0, 0.34, 0]));
  g.add(mesh(new THREE.BoxGeometry(1.18, 0.06, 0.08), metal, [0, 0.62, 0.36]));
  g.add(mesh(new THREE.BoxGeometry(0.08, 0.72, 0.72), metal, [-0.34, 0.35, 0]));
  g.add(mesh(new THREE.BoxGeometry(0.08, 0.72, 0.72), metal, [0.34, 0.35, 0]));
  g.position.set(x, 0, z);
  return g;
}

function trafficCone(x, z) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.025, 0.26, 0.68, 8), mat(0xff6600), [0, 0.34, 0]));
  g.add(mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.035, 8), mat(0xffffff), [0, 0.43, 0]));
  g.add(mesh(new THREE.BoxGeometry(0.48, 0.05, 0.48), mat(0x333333), [0, 0.025, 0]));
  g.position.set(x, 0, z);
  return g;
}

function streetLamp(x, z) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.8, 5), mat(0x444444), [0, 1.4, 0]));
  g.add(mesh(new THREE.SphereGeometry(0.15, 6, 6), mat(0xffffcc), [0, 2.85, 0]));
  g.position.set(x, 0, z);
  return g;
}

function hydrant(x, z) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.55, 6), mat(0xcc2222), [0, 0.28, 0]));
  g.add(mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.35, 5), mat(0xcc2222), [0.2, 0.45, 0]));
  g.position.set(x, 0, z);
  return g;
}

function toolbox(x, z) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(0.68, 0.42, 0.36), mat(0xcc4400), [0, 0.21, 0]));
  g.add(mesh(new THREE.BoxGeometry(0.6, 0.07, 0.06), mat(0xaaaaaa), [0, 0.43, 0]));
  g.add(mesh(new THREE.BoxGeometry(0.64, 0.035, 0.38), mat(0x772200), [0, 0.42, 0]));
  g.position.set(x, 0, z);
  return g;
}

function pallet(x, z) {
  const g = new THREE.Group();
  const m = woodMat(0x8b6914);
  for (let i = 0; i < 3; i++) {
    g.add(mesh(new THREE.BoxGeometry(1.1, 0.08, 0.9), m, [0, 0.06 + i * 0.1, 0]));
  }
  g.position.set(x, 0, z);
  return g;
}

function dumpster(x, z) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(1.4, 1.0, 0.9), metalMat(0x3a5a3a), [0, 0.5, 0]));
  g.add(mesh(new THREE.BoxGeometry(1.35, 0.08, 0.85), metalMat(0x2a3a2a), [0, 1.02, 0]));
  g.position.set(x, 0, z);
  return g;
}

function woodpile(x, z) {
  const g = new THREE.Group();
  const m = woodMat(0x6b4423);
  for (let i = 0; i < 5; i++) {
    const log = mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.2, 5), m, [(i - 2) * 0.22, 0.35, 0]);
    log.rotation.z = Math.PI / 2;
    g.add(log);
  }
  g.position.set(x, 0, z);
  return g;
}

function wallTorch(x, z) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(0.12, 0.35, 0.18), mat(0x2a1810), [0, 1.5, 0.08]));
  const flame = mesh(new THREE.SphereGeometry(0.1, 6, 6), mat(0xff6622), [0, 1.72, 0.1]);
  g.add(flame);
  const light = new THREE.PointLight(0xff6622, 0.45, 7);
  light.position.set(0, 1.7, 0.15);
  g.add(light);
  g.position.set(x, 0, z);
  return g;
}

function skullPile(x, z, rot = 0) {
  const g = new THREE.Group();
  const bone = mat(0xccc4b8);
  for (let i = 0; i < 4; i++) {
    g.add(mesh(new THREE.SphereGeometry(0.1 + i * 0.02, 6, 6), bone, [(i - 1.5) * 0.12, 0.08 + i * 0.04, (i % 2) * 0.08]));
  }
  g.add(mesh(new THREE.BoxGeometry(0.04, 0.04, 0.2), bone, [0.15, 0.05, 0]));
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  return g;
}

function chainHang(x, z, rot = 0) {
  const g = new THREE.Group();
  const m = metalMat(0x444444);
  for (let i = 0; i < 6; i++) {
    const link = mesh(new THREE.TorusGeometry(0.06, 0.015, 4, 8), m, [0, 2.2 - i * 0.14, 0]);
    link.rotation.x = Math.PI / 2;
    g.add(link);
  }
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  return g;
}

/** Caixa de colisão aproximada para IA e física */
export function getPropCollider(prop) {
  const r = {
    barrel: [0.55, 1.1],
    crate: [1.0, 1.15],
    sandbags: [1.25, 0.78],
    tires: [0.55, 0.75],
    supply: [0.68, 0.78],
    cone: [0.42, 0.72],
    lamp: [0.2, 2.9],
    hydrant: [0.35, 0.65],
    toolbox: [0.5, 0.5],
    pallet: [0.75, 0.35],
    dumpster: [0.9, 1.1],
    woodpile: [0.85, 0.55],
    torch: [0.15, 2.0],
    skull_pile: [0.35, 0.25],
    chain: [0.2, 2.5],
  }[prop.type] || [0.5, 0.8];
  return { x: prop.x, z: prop.z, w: r[0], h: r[1] };
}

function mesh(geo, material, pos) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(pos[0], pos[1], pos[2]);
  return m;
}

const BUILDERS = {
  barrel: (p, t) => barrel(p.x, p.z, t.barrel || 0x444455),
  crate: (p) => crateStack(p.x, p.z),
  sandbags: (p) => sandbags(p.x, p.z, p.rot || 0),
  tires: (p) => tireStack(p.x, p.z),
  supply: (p, t) => supplyBox(p.x, p.z, t.supply || 0x556633),
  cone: (p) => trafficCone(p.x, p.z),
  lamp: (p) => streetLamp(p.x, p.z),
  hydrant: (p) => hydrant(p.x, p.z),
  toolbox: (p) => toolbox(p.x, p.z),
  pallet: (p) => pallet(p.x, p.z),
  dumpster: (p) => dumpster(p.x, p.z),
  woodpile: (p) => woodpile(p.x, p.z),
  torch: (p) => wallTorch(p.x, p.z),
  skull_pile: (p) => skullPile(p.x, p.z, p.rot || 0),
  chain: (p) => chainHang(p.x, p.z, p.rot || 0),
};

export function buildMapProps(scene, propList, propTint = {}) {
  for (const p of propList) {
    const fn = BUILDERS[p.type];
    if (fn) scene.add(fn(p, propTint));
  }
}

/** Parede leve (sem RoundedBox — melhor FPS) */
export function createWall(w, h, d, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.userData.capW = w;
  mesh.userData.capD = d;
  return mesh;
}
