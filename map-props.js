import * as THREE from "three";
import { upgradeWithBlockbenchModel } from "./blockbench-model-loader.js";

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

function house(x, z, rot = 0, floors = 1) {
  const g = new THREE.Group();
  const wall = mat(0xb98f66);
  const roof = mat(0x7a2e1f);
  const dark = mat(0x1b1f28);
  const wood = woodMat(0x5c3a1e);
  const h = floors === 2 ? 4.4 : 2.6;
  g.add(mesh(new THREE.BoxGeometry(5.8, h, 4.8), wall, [0, h / 2, 0]));
  g.add(mesh(new THREE.ConeGeometry(4.3, 1.25, 4), roof, [0, h + 0.62, 0]));
  g.children[g.children.length - 1].rotation.y = Math.PI / 4;
  g.add(mesh(new THREE.BoxGeometry(0.95, 1.6, 0.08), wood, [0, 0.8, -2.43]));
  for (const sx of [-1.9, 1.9]) {
    g.add(mesh(new THREE.BoxGeometry(0.75, 0.65, 0.08), dark, [sx, 1.65, -2.44]));
    if (floors === 2) g.add(mesh(new THREE.BoxGeometry(0.75, 0.65, 0.08), dark, [sx, 3.25, -2.44]));
  }
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  return g;
}

function rock(x, z, scale = 1, color = 0x686860) {
  const g = new THREE.Group();
  const m = mat(color);
  for (let i = 0; i < 3; i++) {
    const r = mesh(new THREE.DodecahedronGeometry((0.8 + i * 0.22) * scale, 0), m, [(i - 1) * 0.6 * scale, 0.45 * scale, (i % 2) * 0.38 * scale]);
    r.scale.y = 0.55 + i * 0.12;
    r.rotation.set(0.3 * i, 0.8 * i, 0.1);
    g.add(r);
  }
  g.position.set(x, 0, z);
  return g;
}

function pineTree(x, z, scale = 1) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.16 * scale, 0.22 * scale, 1.6 * scale, 6), woodMat(0x5b3318), [0, 0.8 * scale, 0]));
  const leaf = mat(0x24441f);
  for (let i = 0; i < 3; i++) {
    g.add(mesh(new THREE.ConeGeometry((1.05 - i * 0.18) * scale, 1.35 * scale, 8), leaf, [0, (1.55 + i * 0.7) * scale, 0]));
  }
  g.position.set(x, 0, z);
  return g;
}

function borderMountain(x, z, scale = 1, rot = 0) {
  const g = new THREE.Group();
  const rockDark = mat(0x44483f);
  const rockMid = mat(0x666a60);
  const rockLight = mat(0x7d8074);
  const snow = mat(0xd8dde6);
  const pine = mat(0x203b1f);

  // Cordilheira baixa e comprida: vários volumes sobrepostos, não um triângulo isolado.
  const base = mesh(new THREE.DodecahedronGeometry(22 * scale, 1), rockDark, [0, 12 * scale, 0]);
  base.scale.set(2.45, 0.62, 0.9);
  base.rotation.set(0.08, rot, -0.03);
  g.add(base);

  const offsets = [-42, -24, -7, 14, 33, 51];
  for (let i = 0; i < offsets.length; i++) {
    const off = offsets[i] * scale;
    const h = (24 + (i % 3) * 7 + (i === 3 ? 8 : 0)) * scale;
    const r = (11 + (i % 4) * 2.2) * scale;
    const body = mesh(new THREE.IcosahedronGeometry(r, 1), i % 2 ? rockMid : rockLight, [off, h * 0.48, (i % 2 ? -2.5 : 2.5) * scale]);
    body.scale.set(1.05 + (i % 2) * 0.35, 1.35 + (i % 3) * 0.18, 0.82);
    body.rotation.set(0.16 * i, rot + i * 0.37, -0.08 + i * 0.03);
    g.add(body);

    const cap = mesh(new THREE.ConeGeometry(r * 0.42, h * 0.28, 6), snow, [off, h * 0.94, (i % 2 ? -2.8 : 2.8) * scale]);
    cap.rotation.y = rot + Math.PI * 0.16 * i;
    g.add(cap);
  }

  // Faixas horizontais e talus no pé dão leitura de rocha, não de cone.
  for (let i = 0; i < 5; i++) {
    const stripe = mesh(new THREE.BoxGeometry((78 - i * 7) * scale, 1.3 * scale, 2.2 * scale), i % 2 ? rockDark : rockMid, [0, (5 + i * 3.6) * scale, (9 + i * 0.8) * scale]);
    stripe.rotation.y = rot + 0.04 * (i - 2);
    stripe.rotation.z = -0.08 + i * 0.025;
    g.add(stripe);
  }

  for (let i = 0; i < 7; i++) {
    const sx = (-39 + i * 13) * scale;
    const tree = mesh(new THREE.ConeGeometry(2.2 * scale, 6.2 * scale, 6), pine, [sx, 3.1 * scale, -12 * scale]);
    tree.rotation.y = i * 0.7;
    g.add(tree);
  }

  g.position.set(x, 0, z);
  g.rotation.y = rot;
  return g;
}

function brCompoundPad(x, z, tint = 0x6f8a3f) {
  const g = new THREE.Group();
  const dirt = new THREE.Mesh(
    new THREE.CircleGeometry(150, 32),
    new THREE.MeshLambertMaterial({ color: 0x6b684c, transparent: true, opacity: 0.82 })
  );
  dirt.rotation.x = -Math.PI / 2;
  dirt.position.y = 0.021;
  g.add(dirt);
  const plaza = new THREE.Mesh(
    new THREE.PlaneGeometry(86, 62),
    new THREE.MeshLambertMaterial({ color: tint })
  );
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.y = 0.026;
  g.add(plaza);
  for (let i = 0; i < 14; i++) {
    const stripe = mesh(new THREE.BoxGeometry(8 + (i % 3) * 4, 0.035, 0.65), mat(0x3d3a32), [(-6.5 + i) * 11, 0.045, -34 + (i % 5) * 15]);
    stripe.rotation.y = (i % 2 ? 0.28 : -0.18);
    g.add(stripe);
  }
  g.position.set(x, 0, z);
  return g;
}

function brHouse(x, z, w = 32, d = 24, floors = 2, tint = 0x9d6b42) {
  const g = new THREE.Group();
  const h = floors === 2 ? 5.2 : 3.2;
  const wall = mat(0xc4a17a);
  const trim = mat(0x2b2f38);
  const roof = mat(0x7a2e1f);
  const glass = new THREE.MeshStandardMaterial({ color: 0x88c7ff, roughness: 0.18, metalness: 0.05, transparent: true, opacity: 0.52 });

  // Parede em 4 partes, frente com vão aberto para porta física do gameplay.
  g.add(
    mesh(new THREE.BoxGeometry(w, h, 0.7), wall, [0, h / 2, d / 2]),
    mesh(new THREE.BoxGeometry(0.7, h, d), wall, [-w / 2, h / 2, 0]),
    mesh(new THREE.BoxGeometry(0.7, h, d), wall, [w / 2, h / 2, 0]),
    mesh(new THREE.BoxGeometry((w - 4.8) / 2, h, 0.7), wall, [-(w + 4.8) / 4, h / 2, -d / 2]),
    mesh(new THREE.BoxGeometry((w - 4.8) / 2, h, 0.7), wall, [(w + 4.8) / 4, h / 2, -d / 2])
  );
  g.add(mesh(new THREE.BoxGeometry(w + 2.5, 1.35, d + 2.4), roof, [0, h + 0.68, 0]));
  g.add(mesh(new THREE.BoxGeometry(w * 0.6, 0.32, 0.36), mat(tint), [0, h + 1.42, -d / 2 - 0.15]));

  const winRows = floors === 2 ? [1.9, 3.75] : [1.75];
  for (const wy of winRows) {
    for (const sx of [-1, 1]) {
      g.add(mesh(new THREE.BoxGeometry(3.2, 1.35, 0.14), glass, [sx * w * 0.24, wy, -d / 2 - 0.38]));
      g.add(mesh(new THREE.BoxGeometry(0.16, 1.55, 0.18), trim, [sx * w * 0.24, wy, -d / 2 - 0.48]));
      g.add(mesh(new THREE.BoxGeometry(3.45, 0.16, 0.18), trim, [sx * w * 0.24, wy, -d / 2 - 0.49]));
    }
  }

  // Piso interno visível pelo vão.
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(w - 2, d - 2), new THREE.MeshLambertMaterial({ color: 0x5b4b36 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.045;
  g.add(floor);
  g.position.set(x, 0, z);
  return g;
}

function brWarehouse(x, z, w = 44, d = 26, tint = 0x5f7688) {
  const g = brHouse(0, 0, w, d, 1, tint);
  g.children.forEach((c) => {
    if (c.material?.color) c.material.color.offsetHSL(0, -0.1, -0.08);
  });
  g.add(mesh(new THREE.BoxGeometry(w + 4, 0.45, d + 4), mat(0x28313a), [0, 4.15, 0]));
  for (let i = 0; i < 4; i++) {
    const vent = mesh(new THREE.BoxGeometry(3.5, 0.38, 0.3), mat(0x11151c), [-15 + i * 10, 3.35, -d / 2 - 0.55]);
    g.add(vent);
  }
  g.position.set(x, 0, z);
  return g;
}

function brTower(x, z, tint = 0x9d6b42) {
  const g = new THREE.Group();
  const metal = metalMat(0x333840);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = mesh(new THREE.CylinderGeometry(0.18, 0.24, 10, 6), metal, [sx * 2.2, 5, sz * 2.2]);
    leg.rotation.z = sx * 0.05;
    g.add(leg);
  }
  g.add(mesh(new THREE.BoxGeometry(6.2, 0.5, 6.2), mat(tint), [0, 9.4, 0]));
  g.add(mesh(new THREE.BoxGeometry(5.4, 2.2, 5.4), mat(0x2c333b), [0, 10.65, 0]));
  g.add(mesh(new THREE.ConeGeometry(4.4, 1.2, 4), mat(0x20242c), [0, 12.25, 0]));
  g.children[g.children.length - 1].rotation.y = Math.PI / 4;
  g.position.set(x, 0, z);
  return g;
}

function brMonster(x, z, scale = 1.2, tint = 0x765a8c) {
  const g = new THREE.Group();
  const body = mat(0x3d3a32);
  const accent = mat(tint);
  const bone = mat(0xd6d0c4);
  g.add(mesh(new THREE.CylinderGeometry(3.6 * scale, 5.4 * scale, 10 * scale, 9), body, [0, 5 * scale, 0]));
  g.add(mesh(new THREE.SphereGeometry(3.8 * scale, 14, 10), body, [0, 11.5 * scale, 0]));
  for (const sx of [-1, 1]) {
    const arm = mesh(new THREE.CylinderGeometry(0.8 * scale, 1.05 * scale, 8.5 * scale, 8), body, [sx * 4.8 * scale, 7.3 * scale, 0]);
    arm.rotation.z = sx * 0.62;
    g.add(arm);
    const horn = mesh(new THREE.ConeGeometry(0.8 * scale, 2.6 * scale, 8), bone, [sx * 2.2 * scale, 14.2 * scale, 0]);
    horn.rotation.z = sx * -0.38;
    g.add(horn);
  }
  g.add(mesh(new THREE.BoxGeometry(4.2 * scale, 0.55 * scale, 0.45 * scale), accent, [0, 10.6 * scale, -3.65 * scale]));
  g.position.set(x, 0, z);
  g.rotation.y = (x + z) * 0.002;
  return g;
}

function cactus(x, z, scale = 1) {
  const g = new THREE.Group();
  const green = mat(0x2f6f45);
  g.add(mesh(new THREE.CylinderGeometry(0.22 * scale, 0.25 * scale, 2.3 * scale, 7), green, [0, 1.15 * scale, 0]));
  for (const sx of [-1, 1]) {
    const arm = mesh(new THREE.CylinderGeometry(0.12 * scale, 0.13 * scale, 0.92 * scale, 7), green, [sx * 0.38 * scale, 1.25 * scale, 0]);
    arm.rotation.z = sx * 0.45;
    g.add(arm);
  }
  g.position.set(x, 0, z);
  return withBlockbenchModel(g, "cactus_prop", { targetWidth: 1.6 * scale, targetHeight: 2.5 * scale });
}

function brRoad(x, z, w = 120, d = 12, rot = 0, color = 0x5b5642) {
  const g = new THREE.Group();
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.82 })
  );
  road.rotation.x = -Math.PI / 2;
  road.position.y = 0.028;
  g.add(road);
  for (let i = 0; i < Math.floor(w / 20); i++) {
    const stripe = mesh(new THREE.BoxGeometry(7, 0.025, 0.38), mat(0xd5c66a), [-w / 2 + 12 + i * 20, 0.05, 0]);
    g.add(stripe);
  }
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  return g;
}

function brBillboard(x, z, rot = 0, tint = 0x9d6b42) {
  const g = new THREE.Group();
  const wood = woodMat(0x5c3a1e);
  const sign = mat(tint);
  g.add(mesh(new THREE.CylinderGeometry(0.16, 0.18, 5.6, 6), wood, [-2.4, 2.8, 0]));
  g.add(mesh(new THREE.CylinderGeometry(0.16, 0.18, 5.6, 6), wood, [2.4, 2.8, 0]));
  g.add(mesh(new THREE.BoxGeometry(6.2, 2.6, 0.32), sign, [0, 4.3, 0]));
  g.add(mesh(new THREE.BoxGeometry(5.4, 0.28, 0.38), mat(0x11151c), [0, 4.9, -0.08]));
  g.add(mesh(new THREE.BoxGeometry(4.2, 0.2, 0.4), mat(0xffd36b), [0, 4.1, -0.1]));
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  return g;
}

function brRamp(x, z, rot = 0, tint = 0x7a4f2a) {
  const g = new THREE.Group();
  const matRamp = woodMat(tint);
  const deck = mesh(new THREE.BoxGeometry(7.2, 0.36, 5.6), matRamp, [0, 1.35, 0]);
  deck.rotation.x = -0.34;
  g.add(deck);
  for (const sx of [-1, 1]) {
    g.add(mesh(new THREE.BoxGeometry(0.28, 1.6, 5.8), matRamp, [sx * 3.45, 0.8, 0]));
  }
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  return g;
}

function brBridge(x, z, rot = 0) {
  const g = new THREE.Group();
  const wood = woodMat(0x6b4423);
  g.add(mesh(new THREE.BoxGeometry(22, 0.45, 5.2), wood, [0, 0.55, 0]));
  for (let i = 0; i < 9; i++) {
    g.add(mesh(new THREE.BoxGeometry(0.35, 0.28, 5.8), wood, [-9.2 + i * 2.3, 0.86, 0]));
  }
  for (const sz of [-1, 1]) {
    g.add(mesh(new THREE.BoxGeometry(22.4, 0.22, 0.24), mat(0x2a1810), [0, 1.25, sz * 2.85]));
  }
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  return g;
}

function brBalloon(x, z, tint = 0xff5533) {
  const g = new THREE.Group();
  const crate = supplyBox(0, 0, 0x445533);
  crate.scale.set(1.8, 1.8, 1.8);
  crate.position.y = 0.08;
  g.add(crate);
  const balloon = mesh(new THREE.SphereGeometry(2.4, 18, 12), mat(tint), [0, 8.4, 0]);
  balloon.scale.y = 1.25;
  g.add(balloon);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const rope = mesh(new THREE.CylinderGeometry(0.035, 0.035, 6.4, 5), mat(0x111111), [sx * 1.3, 4.5, sz * 1.0]);
    rope.rotation.z = sx * 0.12;
    g.add(rope);
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
    house: [3.8, 2.8],
    house2: [4.2, 4.8],
    br_pad: [0, 0],
    br_house: [0, 0],
    br_warehouse: [0, 0],
    br_tower: [3.2, 12.5],
    br_monster: [6.5 * (prop.scale || 1), 16 * (prop.scale || 1)],
    br_road: [0, 0],
    br_billboard: [6.4, 5.8],
    br_ramp: [7.2, 2.2],
    br_bridge: [22, 1.4],
    br_balloon: [5.8, 12],
    cactus: [1.2 * (prop.scale || 1), 2.8 * (prop.scale || 1)],
    rock: [1.6 * (prop.scale || 1), 1.2 * (prop.scale || 1)],
    tree: [0.75 * (prop.scale || 1), 4.2 * (prop.scale || 1)],
    mountain: [42 * (prop.scale || 1), 34 * (prop.scale || 1)],
  }[prop.type] || [0.5, 0.8];
  return { x: prop.x, z: prop.z, w: r[0], h: r[1] };
}

function mesh(geo, material, pos) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(pos[0], pos[1], pos[2]);
  return m;
}

function withBlockbenchModel(group, key, opts) {
  return upgradeWithBlockbenchModel(group, key, opts);
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
  house: (p) => house(p.x, p.z, p.rot || 0, 1),
  house2: (p) => house(p.x, p.z, p.rot || 0, 2),
  br_pad: (p) => brCompoundPad(p.x, p.z, p.tint || 0x6f8a3f),
  br_house: (p) => brHouse(p.x, p.z, p.w || 32, p.d || 24, p.floors || 2, p.tint || 0x9d6b42),
  br_warehouse: (p) => brWarehouse(p.x, p.z, p.w || 44, p.d || 26, p.tint || 0x5f7688),
  br_tower: (p) => brTower(p.x, p.z, p.tint || 0x9d6b42),
  br_road: (p) => brRoad(p.x, p.z, p.w || 120, p.d || 12, p.rot || 0, p.tint || 0x5b5642),
  br_billboard: (p) => brBillboard(p.x, p.z, p.rot || 0, p.tint || 0x9d6b42),
  br_ramp: (p) => brRamp(p.x, p.z, p.rot || 0, p.tint || 0x7a4f2a),
  br_bridge: (p) => brBridge(p.x, p.z, p.rot || 0),
  br_balloon: (p) => brBalloon(p.x, p.z, p.tint || 0xff5533),
  cactus: (p) => cactus(p.x, p.z, p.scale || 1),
  br_monster: (p) => withBlockbenchModel(
    brMonster(p.x, p.z, p.scale || 1.2, p.tint || 0x765a8c),
    "br_monster",
    { targetWidth: 11 * (p.scale || 1.2), targetHeight: 17 * (p.scale || 1.2) }
  ),
  rock: (p) => withBlockbenchModel(
    rock(p.x, p.z, p.scale || 1),
    "rock_cluster",
    { targetWidth: 4.8 * (p.scale || 1), targetHeight: 2.8 * (p.scale || 1) }
  ),
  tree: (p) => pineTree(p.x, p.z, p.scale || 1),
  mountain: (p) => withBlockbenchModel(
    borderMountain(p.x, p.z, p.scale || 1, p.rot || 0),
    "border_mountain",
    { targetWidth: 84 * (p.scale || 1), targetHeight: 34 * (p.scale || 1) }
  ),
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
