#!/usr/bin/env node
/**
 * Gera um pacote de modelos editaveis no Blockbench + GLBs prontos pro jogo.
 * Uso: node generate-blockbench-pack.js
 */

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const SRC_DIR = path.join(ROOT, "assets", "blockbench");
const MODEL_DIR = path.join(ROOT, "assets", "models", "blockbench");

const FACE_NAMES = ["north", "south", "east", "west", "up", "down"];
const COLORS = {
  skin: 0xc4956a,
  cloth: 0x25324a,
  armor: 0x334455,
  boot: 0x111318,
  shoeWhite: 0xf2f2f8,
  shoeAccent: 0x00ccff,
  metal: 0x7a7f88,
  dark: 0x11151c,
  wood: 0x6b4423,
  tan: 0xb88a56,
  glass: 0x8fc8ff,
  rockDark: 0x454842,
  rockMid: 0x696d65,
  rockLight: 0x85887f,
  snow: 0xd8dde6,
  purple: 0x644a88,
  slime: 0x5d3374,
  red: 0xb51d16,
  plush: 0x8a5a32,
  bone: 0xd6d0c4,
  leather: 0x6b3f1f,
  leatherDark: 0x3a2416,
  denim: 0x25466f,
  poncho: 0x9b3c24,
  gold: 0xd6a44e,
  ammoGreen: 0x445533,
  cactus: 0x2f6f45,
  clothRed: 0x8f2720,
  canopy: 0xff5533,
  riverBlue: 0x2d83c5,
  trimBlue: 0x26384d,
  suitBlue: 0x1f4f8f,
  neonCyan: 0x00e5ff,
  shadowBlack: 0x12091f,
  solarOrange: 0xff8a22,
  galaxy: 0x0a0824,
};

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function hexParts(color) {
  return [(color >> 16) & 255, (color >> 8) & 255, color & 255];
}

function dataTexture(color) {
  const [r, g, b] = hexParts(color);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="rgb(${r},${g},${b})"/></svg>`;
  return "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64");
}

function uuid(i) {
  return `sz-${String(i).padStart(4, "0")}`;
}

function face(textureIndex) {
  const faces = {};
  for (const name of FACE_NAMES) faces[name] = { uv: [0, 0, 16, 16], texture: `#${textureIndex}` };
  return faces;
}

function writeBbModel(filePath, model) {
  const mats = [...new Set(model.parts.map((p) => p.mat || "dark"))];
  const matIndex = new Map(mats.map((m, i) => [m, i]));
  const elements = model.parts.map((p, i) => {
    const s = model.blockbenchScale || 16;
    const isSphere = p.shape === "sphere";
    const hw = isSphere ? p.r : p.w / 2;
    const hh = isSphere ? p.r : p.h / 2;
    const hd = isSphere ? p.r : p.d / 2;
    const from = [(p.x - hw) * s, (p.y - hh) * s, (p.z - hd) * s];
    const to = [(p.x + hw) * s, (p.y + hh) * s, (p.z + hd) * s];
    const origin = [p.x * s, p.y * s, p.z * s];
    const el = {
      uuid: uuid(i),
      name: p.name || `part_${i}`,
      from: from.map((v) => Number(v.toFixed(3))),
      to: to.map((v) => Number(v.toFixed(3))),
      color: matIndex.get(p.mat || "dark"),
      faces: face(matIndex.get(p.mat || "dark")),
    };
    if (p.ry) el.rotation = { angle: Number((p.ry * 180 / Math.PI).toFixed(2)), axis: "y", origin };
    if (p.rx) el.rotation = { angle: Number((p.rx * 180 / Math.PI).toFixed(2)), axis: "x", origin };
    if (p.rz) el.rotation = { angle: Number((p.rz * 180 / Math.PI).toFixed(2)), axis: "z", origin };
    return el;
  });

  const textures = mats.map((name, i) => ({
    path: `${name}.svg`,
    name,
    folder: "Strike Zone",
    namespace: "",
    id: String(i),
    particle: false,
    render_mode: "default",
    visible: true,
    mode: "bitmap",
    saved: true,
    uuid: `tex-${i}`,
    source: dataTexture(COLORS[name] || COLORS.dark),
  }));

  fs.writeFileSync(filePath, JSON.stringify({
    meta: {
      format_version: "4.10",
      model_format: "free",
      box_uv: true,
    },
    name: model.name,
    model_identifier: model.id,
    visible_box: [3, 3, 3],
    variable_placeholders: "",
    resolution: { width: 64, height: 64 },
    elements,
    outliner: elements.map((e) => e.uuid),
    textures,
  }, null, 2));
}

function rotateY(x, z, ry = 0) {
  const c = Math.cos(ry), s = Math.sin(ry);
  return [x * c - z * s, x * s + z * c];
}

const part = (name, mat, x, y, z, w, h, d, ry = 0, rx = 0, rz = 0) =>
  ({ name, mat, x, y, z, w, h, d, ry, rx, rz, shape: "box" });

function sphere(name, mat, x, y, z, r) {
  return { name, mat, x, y, z, r, shape: "sphere" };
}

function sphereGeom(p, seg = 14) {
  const positions = [], normals = [], indices = [];
  const r = p.r;
  for (let lat = 0; lat <= seg; lat++) {
    const v = lat / seg;
    const phi = v * Math.PI;
    for (let lon = 0; lon <= seg; lon++) {
      const u = lon / seg;
      const theta = u * Math.PI * 2;
      const x = r * Math.sin(phi) * Math.cos(theta) + p.x;
      const y = r * Math.cos(phi) + p.y;
      const z = r * Math.sin(phi) * Math.sin(theta) + p.z;
      positions.push(x, y, z);
      normals.push(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta));
    }
  }
  for (let lat = 0; lat < seg; lat++) {
    for (let lon = 0; lon < seg; lon++) {
      const a = lat * (seg + 1) + lon;
      const b = a + seg + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  return { positions, normals, indices };
}

function geomPart(p) {
  return p.shape === "sphere" ? sphereGeom(p) : boxGeom(p);
}

function boxGeom(p) {
  const hw = p.w / 2, hh = p.h / 2, hd = p.d / 2;
  const corners = [
    [-hw, -hh, -hd], [hw, -hh, -hd], [hw, hh, -hd], [-hw, hh, -hd],
    [-hw, -hh, hd], [hw, -hh, hd], [hw, hh, hd], [-hw, hh, hd],
  ];
  const faces = [
    [4, 5, 6, 7, [0, 0, 1]],
    [1, 0, 3, 2, [0, 0, -1]],
    [5, 1, 2, 6, [1, 0, 0]],
    [0, 4, 7, 3, [-1, 0, 0]],
    [7, 6, 2, 3, [0, 1, 0]],
    [0, 1, 5, 4, [0, -1, 0]],
  ];
  const positions = [], normals = [], indices = [];
  let vi = 0;
  for (const f of faces) {
    for (let k = 0; k < 4; k++) {
      const c = corners[f[k]];
      const [rx, rz] = rotateY(c[0], c[2], p.ry || 0);
      positions.push(rx + p.x, c[1] + p.y, rz + p.z);
      const [nx, nz] = rotateY(f[4][0], f[4][2], p.ry || 0);
      normals.push(nx, f[4][1], nz);
    }
    indices.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3);
    vi += 4;
  }
  return { positions, normals, indices };
}

function merge(parts) {
  const positions = [], normals = [], indices = [];
  let offset = 0;
  for (const p of parts) {
    const g = geomPart(p);
    positions.push(...g.positions);
    normals.push(...g.normals);
    indices.push(...g.indices.map((i) => i + offset));
    offset += g.positions.length / 3;
  }
  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint32Array(indices),
  };
}

function pad4(buf) {
  const pad = (4 - (buf.length % 4)) % 4;
  return pad ? Buffer.concat([buf, Buffer.alloc(pad)]) : buf;
}

function padJson(buf) {
  const pad = (4 - (buf.length % 4)) % 4;
  return pad ? Buffer.concat([buf, Buffer.alloc(pad, 0x20)]) : buf;
}

function writeGlb(filePath, model) {
  const matNames = [...new Set(model.parts.map((p) => p.mat || "dark"))];
  const matIndex = new Map(matNames.map((m, i) => [m, i]));
  const bufferViews = [], accessors = [], meshes = [], materials = [], nodes = [], chunks = [];
  let byteOffset = 0;

  for (const matName of matNames) {
    const [r, g, b] = hexParts(COLORS[matName] || COLORS.dark).map((v) => v / 255);
    materials.push({
      name: matName,
      pbrMetallicRoughness: {
        baseColorFactor: [r, g, b, 1],
        metallicFactor: matName === "metal" ? 0.65 : 0.05,
        roughnessFactor: matName === "metal" ? 0.32 : 0.78,
      },
    });
  }

  const partNodeIndices = [];
  for (const p of model.parts) {
    const geom = geomPart(p);
    const pos = Buffer.from(new Float32Array(geom.positions).buffer);
    const nor = Buffer.from(new Float32Array(geom.normals).buffer);
    const idx = Buffer.from(new Uint32Array(geom.indices).buffer);

    const posView = bufferViews.length;
    bufferViews.push({ buffer: 0, byteOffset, byteLength: pos.length, target: 34962 });
    byteOffset += pos.length;
    chunks.push(pos);

    const norView = bufferViews.length;
    bufferViews.push({ buffer: 0, byteOffset, byteLength: nor.length, target: 34962 });
    byteOffset += nor.length;
    chunks.push(nor);

    const idxView = bufferViews.length;
    bufferViews.push({ buffer: 0, byteOffset, byteLength: idx.length, target: 34963 });
    byteOffset += idx.length;
    chunks.push(idx);

    let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (let i = 0; i < geom.positions.length; i += 3) {
      minX = Math.min(minX, geom.positions[i]); maxX = Math.max(maxX, geom.positions[i]);
      minY = Math.min(minY, geom.positions[i + 1]); maxY = Math.max(maxY, geom.positions[i + 1]);
      minZ = Math.min(minZ, geom.positions[i + 2]); maxZ = Math.max(maxZ, geom.positions[i + 2]);
    }

    const posAcc = accessors.length;
    accessors.push({ bufferView: posView, componentType: 5126, count: geom.positions.length / 3, type: "VEC3", min: [minX, minY, minZ], max: [maxX, maxY, maxZ] });
    const norAcc = accessors.length;
    accessors.push({ bufferView: norView, componentType: 5126, count: geom.normals.length / 3, type: "VEC3" });
    const idxAcc = accessors.length;
    accessors.push({ bufferView: idxView, componentType: 5125, count: geom.indices.length, type: "SCALAR" });

    const meshIdx = meshes.length;
    meshes.push({
      name: p.name || `part_${meshIdx}`,
      primitives: [{
        attributes: { POSITION: posAcc, NORMAL: norAcc },
        indices: idxAcc,
        material: matIndex.get(p.mat || "dark"),
      }],
    });

    const nodeIdx = nodes.length;
    nodes.push({ name: p.name || `part_${nodeIdx}`, mesh: meshIdx });
    partNodeIndices.push(nodeIdx);
  }

  const rootIdx = nodes.length;
  nodes.push({ name: model.id, children: partNodeIndices });

  const json = Buffer.from(JSON.stringify({
    asset: { version: "2.0", generator: "Strike Zone Blockbench Pack" },
    scene: 0,
    scenes: [{ name: model.name, nodes: [rootIdx] }],
    nodes,
    meshes,
    materials,
    accessors,
    bufferViews,
    buffers: [{ byteLength: byteOffset }],
  }));
  const jsonBuf = padJson(json);
  const binBuf = pad4(Buffer.concat(chunks));
  const totalLen = 12 + 8 + jsonBuf.length + 8 + binBuf.length;
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(totalLen, 8);
  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonBuf.length, 0); jsonHeader.writeUInt32LE(0x4e4f534a, 4);
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(binBuf.length, 0); binHeader.writeUInt32LE(0x004e4942, 4);
  fs.writeFileSync(filePath, Buffer.concat([header, jsonHeader, jsonBuf, binHeader, binBuf]));
}

function operator() {
  const hero = playerHeroStylized();
  return { id: "operator", name: "Strike Zone Operator", parts: hero.parts };
}

/** Jogador padrão — cabeça/mãos redondas, tênis (editável no Blockbench) */
function playerHeroStylized() {
  const p = [
    part("torso", "suitBlue", 0, 1.02, 0, 0.42, 0.52, 0.2),
    part("vest", "armor", 0, 1.06, -0.12, 0.36, 0.4, 0.05),
    part("belt", "leatherDark", 0, 0.78, -0.01, 0.46, 0.07, 0.24),
    part("backpack", "dark", 0, 1.0, 0.14, 0.32, 0.44, 0.12),
    sphere("head", "skin", 0, 1.48, 0.02, 0.17),
    sphere("helmet", "trimBlue", 0, 1.56, -0.02, 0.19),
    part("visor", "glass", 0, 1.5, -0.14, 0.18, 0.05, 0.03),
    part("collar", "armor", 0, 1.28, -0.02, 0.34, 0.06, 0.18),
    part("knee_pad_l", "armor", -0.12, 0.28, -0.08, 0.14, 0.09, 0.04),
    part("knee_pad_r", "armor", 0.12, 0.28, -0.08, 0.14, 0.09, 0.04),
  ];
  for (const sx of [-1, 1]) {
    p.push(
      part("upper_arm", "suitBlue", sx * 0.34, 1.14, 0, 0.13, 0.4, 0.13, sx * 0.12),
      part("forearm", "skin", sx * 0.38, 0.78, 0.02, 0.11, 0.32, 0.11, sx * -0.08),
      sx === 1 ? sphere("hand_r", "skin", sx * 0.38, 0.6, 0.05, 0.07) : sphere("hand_l", "skin", sx * 0.38, 0.6, 0.05, 0.07),
      part("pants", "denim", sx * 0.12, 0.46, 0, 0.14, 0.52, 0.15),
      part("sneaker_sole", "shoeWhite", sx * 0.12, 0.05, 0.06, 0.2, 0.07, 0.26),
      part("sneaker_body", "suitBlue", sx * 0.12, 0.12, -0.01, 0.18, 0.11, 0.24),
      part("sneaker_tongue", "shoeAccent", sx * 0.12, 0.16, -0.1, 0.1, 0.05, 0.06),
      part("sneaker_lace", "shoeWhite", sx * 0.12, 0.17, -0.04, 0.08, 0.02, 0.04)
    );
  }
  return { id: "player_hero", name: "Strike Zone Hero", parts: p };
}

function playerCharacter(id, name, variant = "hero") {
  const shirt = variant === "neon" ? "neonCyan" : variant === "shadow" ? "shadowBlack" : variant === "birthday" ? "solarOrange" : "suitBlue";
  const trim = variant === "shadow" ? "purple" : variant === "birthday" ? "gold" : "armor";
  const p = [
    part("torso_armored_jacket", shirt, 0, 1.1, 0, 0.5, 0.68, 0.26),
    part("chest_plate", trim, 0, 1.16, -0.16, 0.42, 0.44, 0.055),
    part("belt", "leatherDark", 0, 0.79, -0.01, 0.54, 0.08, 0.29),
    part("head", "skin", 0, 1.64, -0.02, 0.27, 0.3, 0.24),
    part("hair_cap", variant === "shadow" ? "dark" : "leatherDark", 0, 1.82, -0.01, 0.31, 0.12, 0.27),
    part("visor", variant === "neon" ? "neonCyan" : "glass", 0, 1.65, -0.15, 0.2, 0.055, 0.035),
    part("backpack", trim, 0, 1.08, 0.18, 0.42, 0.52, 0.16),
  ];
  if (variant === "birthday") p.push(part("party_badge", "gold", 0.18, 1.25, -0.19, 0.09, 0.09, 0.025));
  if (variant === "shadow") p.push(part("hood", "shadowBlack", 0, 1.76, -0.02, 0.42, 0.22, 0.34));
  for (const sx of [-1, 1]) {
    p.push(part("upper_arm", shirt, sx * 0.36, 1.18, 0, 0.15, 0.48, 0.15, sx * 0.14));
    p.push(part("forearm_guard", trim, sx * 0.4, 0.84, -0.02, 0.13, 0.34, 0.13, sx * -0.08));
    p.push(part("glove", "leatherDark", sx * 0.4, 0.58, -0.03, 0.13, 0.1, 0.14));
    p.push(part("thigh", variant === "neon" ? "dark" : "denim", sx * 0.14, 0.49, 0, 0.16, 0.58, 0.17));
    p.push(part("knee_pad", trim, sx * 0.14, 0.31, -0.09, 0.17, 0.1, 0.035));
    p.push(part("boot", "boot", sx * 0.14, 0.12, -0.03, 0.2, 0.18, 0.3));
  }
  return { id, name, parts: p };
}

function cowboyCharacter(id, name, variant = 0) {
  const shirt = variant === 1 ? "clothRed" : variant === 2 ? "poncho" : "denim";
  const pants = variant === 1 ? "leatherDark" : "denim";
  const p = [
    part("torso_shirt", shirt, 0, 1.1, 0, 0.46, 0.64, 0.24),
    part("belt", "leatherDark", 0, 0.8, -0.01, 0.52, 0.08, 0.28),
    part("buckle", "gold", 0, 0.8, -0.16, 0.11, 0.08, 0.035),
    part("head", "skin", 0, 1.62, -0.02, 0.26, 0.28, 0.24),
    part("hat_crown", "leather", 0, 1.84, -0.02, 0.3, 0.16, 0.26),
    part("hat_brim", "leatherDark", 0, 1.76, -0.02, 0.58, 0.045, 0.46),
    part("bandana", variant === 2 ? "purple" : "clothRed", 0, 1.46, -0.15, 0.27, 0.08, 0.035),
    part("holster", "leatherDark", 0.25, 0.7, -0.04, 0.13, 0.3, 0.09, -0.2),
  ];
  if (variant === 2) p.push(part("poncho_front", "poncho", 0, 1.12, -0.17, 0.58, 0.52, 0.05));
  for (const sx of [-1, 1]) {
    p.push(part("upper_arm", shirt, sx * 0.34, 1.18, 0, 0.14, 0.46, 0.14, sx * 0.16));
    p.push(part("forearm", "skin", sx * 0.38, 0.84, 0, 0.12, 0.32, 0.12, sx * -0.08));
    p.push(part("glove", "leatherDark", sx * 0.38, 0.58, -0.02, 0.13, 0.09, 0.14));
    p.push(part("leg", pants, sx * 0.13, 0.48, 0, 0.15, 0.58, 0.16));
    p.push(part("boot", "leatherDark", sx * 0.13, 0.12, -0.03, 0.19, 0.18, 0.3));
    p.push(part("spur", "gold", sx * 0.13, 0.13, 0.12, 0.16, 0.035, 0.035));
  }
  return { id, name, parts: p };
}

function monsterGigante() {
  const p = [
    part("thin_body", "dark", 0, 1.05, 0, 0.34, 1.4, 0.22),
    part("old_head", "skin", 0, 1.9, -0.02, 0.24, 0.28, 0.22),
    part("red_eyes", "red", 0, 1.92, -0.145, 0.18, 0.04, 0.035),
  ];
  for (const sx of [-1, 1]) {
    p.push(part("long_arm_a", "dark", sx * 0.48, 1.24, 0, 0.12, 1.25, 0.12, sx * 0.28));
    p.push(part("long_arm_b", "skin", sx * 0.75, 0.62, -0.05, 0.1, 1.05, 0.1, sx * -0.2));
    p.push(part("giant_hand", "skin", sx * 0.86, 0.02, -0.08, 0.32, 0.16, 0.42));
  }
  return { id: "horror_gigante", name: "O que mora nas paredes", parts: p };
}

function monsterGosmento() {
  return {
    id: "horror_gosmento",
    name: "O Gosmento Refeito",
    parts: [
      part("wide_slime_base", "slime", 0, 0.34, 0, 1.05, 0.58, 0.82),
      part("torso_blob", "purple", -0.08, 0.78, 0.02, 0.7, 0.78, 0.62, 0.15),
      part("shoulder_blob", "slime", 0.22, 1.08, 0.08, 0.62, 0.5, 0.5, -0.2),
      part("head_blob", "slime", 0.08, 1.38, -0.08, 0.52, 0.46, 0.42, -0.12),
      part("jaw", "dark", 0.02, 1.18, -0.36, 0.36, 0.08, 0.04),
      part("eye_left", "bone", -0.11, 1.43, -0.31, 0.09, 0.08, 0.04),
      part("eye_right", "bone", 0.15, 1.4, -0.31, 0.08, 0.07, 0.04),
      part("pupil_left", "dark", -0.11, 1.43, -0.34, 0.035, 0.035, 0.02),
      part("pupil_right", "dark", 0.15, 1.4, -0.34, 0.03, 0.03, 0.02),
      part("tentacle_l", "purple", -0.52, 0.42, -0.04, 0.18, 0.78, 0.18, -0.52),
      part("tentacle_r", "purple", 0.55, 0.4, -0.02, 0.16, 0.72, 0.16, 0.48),
      part("drip_1", "slime", -0.22, 0.08, -0.34, 0.12, 0.32, 0.12),
      part("drip_2", "slime", 0.26, 0.1, -0.3, 0.1, 0.28, 0.1),
    ],
  };
}

function fpsHands() {
  const p = [
    part("left_palm", "leatherDark", -0.38, 0.18, -0.08, 0.28, 0.16, 0.24),
    part("right_palm", "leatherDark", 0.38, 0.18, -0.08, 0.28, 0.16, 0.24),
    part("left_wrist", "cloth", -0.43, 0.04, 0.08, 0.22, 0.18, 0.22),
    part("right_wrist", "cloth", 0.43, 0.04, 0.08, 0.22, 0.18, 0.22),
  ];
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const x = sx * (0.28 + i * 0.035);
      p.push(part("finger_a", "leatherDark", x, 0.28, -0.18, 0.035, 0.12, 0.045, sx * 0.08));
      p.push(part("finger_b", "leatherDark", x, 0.36, -0.23, 0.03, 0.1, 0.04, sx * 0.12));
    }
    p.push(part("thumb", "leatherDark", sx * 0.55, 0.16, -0.02, 0.055, 0.16, 0.055, sx * -0.55));
  }
  return { id: "fps_hands_rework", name: "Mãos FPS Refeitas", parts: p };
}

function flyingVehicle() {
  const p = [
    part("main_body", "trimBlue", 0, 0.7, 0, 3.4, 0.7, 1.15),
    part("nose", "trimBlue", 1.9, 0.72, 0, 0.72, 0.58, 0.9),
    part("tail", "dark", -1.95, 1.08, 0, 0.45, 1.1, 0.16),
    part("wing_l", "trimBlue", 0, 0.76, -1.55, 1.9, 0.12, 2.2),
    part("wing_r", "trimBlue", 0, 0.76, 1.55, 1.9, 0.12, 2.2),
    part("window_1", "glass", -0.7, 0.9, -0.6, 0.32, 0.2, 0.035),
    part("window_2", "glass", -0.25, 0.9, -0.6, 0.32, 0.2, 0.035),
    part("window_3", "glass", 0.2, 0.9, -0.6, 0.32, 0.2, 0.035),
    part("stripe", "gold", 0, 0.48, -0.62, 2.9, 0.08, 0.035),
    part("rotor_l", "gold", 0.15, 0.78, -2.75, 0.75, 0.08, 0.75),
    part("rotor_r", "gold", 0.15, 0.78, 2.75, 0.75, 0.08, 0.75),
  ];
  return { id: "flying_drop_vehicle", name: "Automóvel Voador Drop", parts: p, blockbenchScale: 10 };
}

function parachuteAsset() {
  return {
    id: "parachute_default",
    name: "Paraquedas Padrão",
    parts: [
      part("canopy_center", "canopy", 0, 1.7, 0, 2.8, 0.34, 1.15),
      part("canopy_left", "canopy", -1.25, 1.55, 0, 1.15, 0.22, 1.0, -0.18),
      part("canopy_right", "canopy", 1.25, 1.55, 0, 1.15, 0.22, 1.0, 0.18),
      part("line_l1", "dark", -0.9, 0.78, -0.34, 0.035, 1.55, 0.035, -0.22),
      part("line_l2", "dark", -0.9, 0.78, 0.34, 0.035, 1.55, 0.035, -0.22),
      part("line_r1", "dark", 0.9, 0.78, -0.34, 0.035, 1.55, 0.035, 0.22),
      part("line_r2", "dark", 0.9, 0.78, 0.34, 0.035, 1.55, 0.035, 0.22),
    ],
    blockbenchScale: 10,
  };
}

function brHouseAsset() {
  return {
    id: "br_house_enterable",
    name: "Casa Battle Royale Entrável",
    parts: [
      part("back_wall", "tan", 0, 1.2, 0.8, 2.8, 2.4, 0.12),
      part("left_wall", "tan", -1.4, 1.2, 0, 0.12, 2.4, 1.7),
      part("right_wall", "tan", 1.4, 1.2, 0, 0.12, 2.4, 1.7),
      part("front_l", "tan", -0.86, 1.2, -0.85, 1.05, 2.4, 0.12),
      part("front_r", "tan", 0.86, 1.2, -0.85, 1.05, 2.4, 0.12),
      part("roof", "leather", 0, 2.55, 0, 3.1, 0.26, 2.05),
      part("ceiling", "wood", 0, 2.34, 0, 2.75, 0.08, 1.62),
      part("window_l", "glass", -0.82, 1.35, -0.94, 0.42, 0.42, 0.035),
      part("window_r", "glass", 0.82, 1.35, -0.94, 0.42, 0.42, 0.035),
    ],
    blockbenchScale: 8,
  };
}

function monsterPelucia() {
  const p = [
    part("body", "plush", 0, 0.48, 0, 0.5, 0.55, 0.42),
    part("belly", "tan", 0, 0.44, -0.22, 0.32, 0.34, 0.05),
    part("head", "plush", 0, 0.92, -0.02, 0.42, 0.36, 0.36),
    part("ear_l", "plush", -0.22, 1.16, 0, 0.16, 0.18, 0.12, 0.18),
    part("ear_r", "plush", 0.22, 1.16, 0, 0.16, 0.18, 0.12, -0.18),
    part("button_eye", "dark", 0.11, 0.94, -0.22, 0.08, 0.08, 0.035),
    part("white_eye", "bone", -0.11, 0.95, -0.22, 0.07, 0.07, 0.035),
    part("stitched_mouth", "dark", 0, 0.82, -0.24, 0.24, 0.035, 0.03),
  ];
  for (const sx of [-1, 1]) {
    p.push(part("arm", "plush", sx * 0.35, 0.48, 0, 0.13, 0.42, 0.13, sx * -0.45));
    p.push(part("leg", "plush", sx * 0.14, 0.1, -0.03, 0.15, 0.22, 0.14));
  }
  return { id: "horror_pelucia", name: "Bam-Bam Pelucia", parts: p };
}

function rockCluster() {
  return {
    id: "rock_cluster",
    name: "Rochas Frontier",
    parts: [
      part("rock_a", "rockDark", -0.28, 0.36, 0, 0.72, 0.72, 0.58, 0.5),
      part("rock_b", "rockMid", 0.24, 0.48, 0.12, 0.8, 0.96, 0.65, -0.35),
      part("rock_c", "rockLight", 0.82, 0.28, -0.08, 0.5, 0.56, 0.45, 0.18),
      part("ground_shadow", "dark", 0.18, 0.02, 0, 1.65, 0.04, 1.05),
    ],
  };
}

function borderMountain() {
  const p = [part("wide_base", "rockDark", 0, 0.65, 0, 5.8, 1.3, 1.4)];
  [-2.2, -1.2, -0.25, 0.8, 1.75, 2.55].forEach((x, i) => {
    p.push(part("peak", i % 2 ? "rockMid" : "rockLight", x, 1.55 + i * 0.08, 0, 0.95, 2.2 + (i % 3) * 0.35, 0.9, 0.18 * i));
    p.push(part("snow_cap", "snow", x, 2.55 + i * 0.08, -0.02, 0.46, 0.28, 0.5, 0.18 * i));
  });
  p.push(part("strata_1", "rockMid", 0, 0.9, -0.72, 5.1, 0.12, 0.12, 0.06));
  p.push(part("strata_2", "rockDark", 0.25, 1.25, -0.75, 4.3, 0.1, 0.12, -0.05));
  return { id: "border_mountain", name: "Cordilheira Frontier", parts: p, blockbenchScale: 5 };
}

function battleMonster() {
  const p = [
    part("body", "rockDark", 0, 1.15, 0, 0.8, 1.65, 0.62),
    part("head", "rockMid", 0, 2.15, -0.02, 0.68, 0.58, 0.58),
    part("mouth_plate", "purple", 0, 1.95, -0.34, 0.54, 0.12, 0.05),
  ];
  for (const sx of [-1, 1]) {
    p.push(part("horn", "bone", sx * 0.24, 2.55, -0.02, 0.14, 0.55, 0.14, sx * -0.28));
    p.push(part("arm", "rockDark", sx * 0.58, 1.22, 0, 0.22, 1.1, 0.22, sx * 0.48));
  }
  return { id: "br_monster", name: "Titan Frontier", parts: p };
}

function lootAmmo(id, name, type = "ar") {
  const p = [
    part("ammo_box", type === "doze" ? "clothRed" : "ammoGreen", 0, 0.16, 0, 0.78, 0.3, 0.52),
    part("box_lid", "dark", 0, 0.33, 0, 0.82, 0.06, 0.56),
    part("label", "gold", 0, 0.34, -0.3, 0.42, 0.05, 0.035),
  ];
  const count = type === "doze" ? 6 : 10;
  for (let i = 0; i < count; i++) {
    const col = i % 5;
    const row = Math.floor(i / 5);
    p.push(part("round", type === "doze" ? "clothRed" : "gold", -0.32 + col * 0.16, 0.52, -0.15 + row * 0.22, 0.055, 0.16, 0.055, 0.2));
    p.push(part("round_tip", "metal", -0.32 + col * 0.16, 0.62, -0.15 + row * 0.22, 0.04, 0.055, 0.04));
  }
  return { id, name, parts: p };
}

function lootCrate() {
  return {
    id: "loot_crate",
    name: "Caixa de Loot Battle Royale",
    parts: [
      part("crate_body", "ammoGreen", 0, 0.28, 0, 1.1, 0.56, 0.78),
      part("crate_lid", "dark", 0, 0.6, 0, 1.18, 0.08, 0.84),
      part("left_strap", "metal", -0.36, 0.32, -0.02, 0.08, 0.62, 0.86),
      part("right_strap", "metal", 0.36, 0.32, -0.02, 0.08, 0.62, 0.86),
      part("glow_label", "gold", 0, 0.42, -0.44, 0.42, 0.16, 0.035),
    ],
  };
}

function cactusProp() {
  return {
    id: "cactus_prop",
    name: "Cacto Cowboy",
    parts: [
      part("trunk", "cactus", 0, 0.9, 0, 0.28, 1.8, 0.28),
      part("arm_l", "cactus", -0.3, 1.1, 0, 0.2, 0.78, 0.2, -0.28),
      part("arm_r", "cactus", 0.34, 1.32, 0, 0.18, 0.62, 0.18, 0.32),
      part("flower", "clothRed", 0.06, 1.86, -0.04, 0.14, 0.08, 0.14),
    ],
  };
}

function weapon(id, name, tint) {
  if (id === "bazooka") {
    return { id, name, parts: [
      part("main_tube", "metal", 0, 0.22, -0.08, 0.22, 0.22, 0.92),
      part("rear_cone", "dark", 0, 0.22, 0.48, 0.3, 0.3, 0.22),
      part("front_muzzle", "dark", 0, 0.22, -0.66, 0.32, 0.32, 0.18),
      part("heat_shield", tint, 0, 0.22, -0.08, 0.28, 0.07, 0.62),
      part("top_sight", "glass", 0, 0.42, -0.18, 0.1, 0.11, 0.24),
      part("front_grip", "leatherDark", 0, -0.02, -0.24, 0.1, 0.25, 0.1),
      part("trigger_box", "dark", 0, 0.04, 0.12, 0.16, 0.1, 0.18),
      part("warning_stripe", "gold", 0, 0.35, -0.52, 0.24, 0.045, 0.08),
    ] };
  }
  const p = [
    part("receiver", "dark", 0, 0.18, 0, 0.14, 0.16, 0.42),
    part("barrel", "metal", 0, 0.2, -0.42, 0.055, 0.055, 0.52),
    part("muzzle", "metal", 0, 0.2, -0.72, 0.075, 0.075, 0.08),
    part("stock", tint, 0, 0.18, 0.34, 0.12, 0.12, 0.28),
    part("grip", "dark", 0, -0.02, 0.08, 0.09, 0.25, 0.09, -0.18),
    part("magazine", tint, 0, -0.06, -0.08, 0.09, 0.28, 0.12, 0.18),
    part("top_rail", "metal", 0, 0.29, -0.06, 0.16, 0.035, 0.45),
    part("side_panel_l", "metal", -0.08, 0.18, -0.08, 0.025, 0.09, 0.34),
    part("side_panel_r", "metal", 0.08, 0.18, -0.08, 0.025, 0.09, 0.34),
    part("trigger_guard", "metal", 0, -0.07, 0.04, 0.14, 0.035, 0.12),
    part("rear_sight", "metal", 0, 0.36, 0.14, 0.13, 0.06, 0.06),
    part("front_sight", "metal", 0, 0.32, -0.62, 0.06, 0.08, 0.04),
    part("bolt", "metal", -0.095, 0.21, -0.08, 0.035, 0.05, 0.18),
    part("selector", "gold", 0.095, 0.2, 0.04, 0.025, 0.05, 0.05),
  ];
  if (id === "awm") {
    p.push(
      part("scope", "metal", 0, 0.44, -0.08, 0.13, 0.13, 0.34),
      part("scope_glass_front", "glass", 0, 0.44, -0.27, 0.1, 0.1, 0.025),
      part("scope_glass_back", "glass", 0, 0.44, 0.1, 0.1, 0.1, 0.025),
      part("long_barrel", "metal", 0, 0.2, -0.72, 0.045, 0.045, 0.45),
      part("bipod_l", "metal", -0.1, -0.03, -0.48, 0.035, 0.3, 0.035, -0.18),
      part("bipod_r", "metal", 0.1, -0.03, -0.48, 0.035, 0.3, 0.035, 0.18)
    );
  } else if (id === "glock") {
    return { id, name, parts: [
      part("slide", "metal", 0, 0.24, -0.08, 0.16, 0.12, 0.38),
      part("frame", "dark", 0, 0.14, -0.03, 0.15, 0.12, 0.32),
      part("grip", "dark", 0, -0.05, 0.08, 0.13, 0.28, 0.13, -0.16),
      part("barrel_tip", "metal", 0, 0.24, -0.3, 0.07, 0.07, 0.07),
      part("front_sight", "gold", 0, 0.32, -0.28, 0.035, 0.035, 0.025),
      part("rear_sight", "gold", 0, 0.32, 0.08, 0.06, 0.03, 0.025),
      part("slide_cuts_l", "dark", -0.085, 0.26, -0.1, 0.018, 0.055, 0.18),
      part("slide_cuts_r", "dark", 0.085, 0.26, -0.1, 0.018, 0.055, 0.18),
    ] };
  } else if (id === "doze") {
    p.push(part("second_barrel", "metal", 0.07, 0.2, -0.42, 0.05, 0.05, 0.5), part("pump", "wood", 0, 0.1, -0.28, 0.16, 0.12, 0.25), part("shell_holder", "clothRed", 0.09, 0.18, 0.22, 0.035, 0.1, 0.2));
  }
  return { id, name, parts: p };
}

function revolver() {
  const p = [
    part("frame", "metal", 0, 0.2, -0.02, 0.18, 0.16, 0.24),
    part("barrel", "metal", 0, 0.22, -0.32, 0.075, 0.075, 0.36),
    part("barrel_top", "dark", 0, 0.27, -0.32, 0.09, 0.035, 0.34),
    part("cylinder", "metal", 0, 0.2, -0.12, 0.22, 0.22, 0.16),
    part("cylinder_band", "dark", 0, 0.2, -0.12, 0.24, 0.04, 0.18),
    part("hammer", "dark", 0, 0.34, 0.08, 0.07, 0.1, 0.07, -0.25),
    part("grip", "leather", 0, -0.03, 0.1, 0.13, 0.32, 0.14, -0.18),
    part("grip_cap", "gold", 0, -0.2, 0.13, 0.14, 0.05, 0.16, -0.18),
    part("trigger_guard", "gold", 0, 0.02, -0.01, 0.16, 0.05, 0.12),
    part("front_sight", "gold", 0, 0.29, -0.5, 0.035, 0.06, 0.035),
  ];
  for (let i = 0; i < 6; i++) {
    p.push(part("cylinder_chamber", "dark", (i - 2.5) * 0.035, 0.2 + (i % 2 ? 0.04 : -0.04), -0.21, 0.022, 0.022, 0.035));
  }
  return { id: "revolver", name: "Revólver Frontier", parts: p };
}

function main() {
  ensureDir(SRC_DIR);
  ensureDir(path.join(MODEL_DIR, "characters"));
  ensureDir(path.join(MODEL_DIR, "props"));
  ensureDir(path.join(MODEL_DIR, "weapons"));
  ensureDir(path.join(MODEL_DIR, "loot"));

  const models = [
    { model: operator(), src: "characters", out: "characters" },
    { model: fpsHands(), src: "characters", out: "characters" },
    { model: playerHeroStylized(), src: "characters", out: "characters" },
    { model: playerCharacter("player_neon_runner", "Jogador Neon Runner", "neon"), src: "characters", out: "characters" },
    { model: playerCharacter("player_shadow", "Jogador Sombra Cósmica", "shadow"), src: "characters", out: "characters" },
    { model: playerCharacter("player_birthday", "Jogador Aniversariante Solar", "birthday"), src: "characters", out: "characters" },
    { model: cowboyCharacter("cowboy_sheriff", "Sheriff do Sertao", 0), src: "characters", out: "characters" },
    { model: cowboyCharacter("cowboy_outlaw", "Fora-da-lei Frontier", 1), src: "characters", out: "characters" },
    { model: cowboyCharacter("cowboy_vaqueiro", "Vaqueiro Nomade", 2), src: "characters", out: "characters" },
    { model: monsterGigante(), src: "characters", out: "characters" },
    { model: monsterGosmento(), src: "characters", out: "characters" },
    { model: monsterPelucia(), src: "characters", out: "characters" },
    { model: rockCluster(), src: "props", out: "props" },
    { model: borderMountain(), src: "props", out: "props" },
    { model: battleMonster(), src: "props", out: "props" },
    { model: cactusProp(), src: "props", out: "props" },
    { model: flyingVehicle(), src: "props", out: "props" },
    { model: parachuteAsset(), src: "props", out: "props" },
    { model: brHouseAsset(), src: "props", out: "props" },
    { model: lootAmmo("loot_ammo_ar", "Munição AR no Chão", "ar"), src: "loot", out: "loot" },
    { model: lootAmmo("loot_ammo_doze", "Munição Doze no Chão", "doze"), src: "loot", out: "loot" },
    { model: lootCrate(), src: "loot", out: "loot" },
    { model: weapon("ak47", "AK-47 Blockbench", "wood"), src: "weapons", out: "weapons" },
    { model: weapon("awm", "AWM Blockbench", "tan"), src: "weapons", out: "weapons" },
    { model: weapon("glock", "Glock Blockbench", "dark"), src: "weapons", out: "weapons" },
    { model: revolver(), src: "weapons", out: "weapons" },
    { model: weapon("scar", "SCAR Blockbench", "tan"), src: "weapons", out: "weapons" },
    { model: weapon("m4", "M4 Blockbench", "armor"), src: "weapons", out: "weapons" },
    { model: weapon("ump45", "UMP45 Blockbench", "dark"), src: "weapons", out: "weapons" },
    { model: weapon("doze", "Doze Blockbench", "wood"), src: "weapons", out: "weapons" },
    { model: weapon("bazooka", "Bazuca Blockbench", "purple"), src: "weapons", out: "weapons" },
  ];

  const onlyArg = process.argv.find((a) => a.startsWith("--only="));
  const onlyIds = onlyArg ? onlyArg.slice(7).split(",").map((s) => s.trim()).filter(Boolean) : null;

  for (const item of models) {
    if (onlyIds && !onlyIds.includes(item.model.id)) continue;
    ensureDir(path.join(SRC_DIR, item.src));
    writeBbModel(path.join(SRC_DIR, item.src, `${item.model.id}.bbmodel`), item.model);
    writeGlb(path.join(MODEL_DIR, item.out, `${item.model.id}.glb`), item.model);
    console.log(`ok ${item.src}/${item.model.id}`);
  }
  console.log("\nFontes Blockbench: assets/blockbench/");
  console.log("GLBs do jogo: assets/models/blockbench/");
}

main();
