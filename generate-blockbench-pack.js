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
    const from = [(p.x - p.w / 2) * s, (p.y - p.h / 2) * s, (p.z - p.d / 2) * s];
    const to = [(p.x + p.w / 2) * s, (p.y + p.h / 2) * s, (p.z + p.d / 2) * s];
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
    const g = boxGeom(p);
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
  const bufferViews = [], accessors = [], meshes = [], materials = [], nodes = [], chunks = [];
  let byteOffset = 0;

  for (const matName of matNames) {
    const geom = merge(model.parts.filter((p) => (p.mat || "dark") === matName));
    const pos = Buffer.from(geom.positions.buffer);
    const nor = Buffer.from(geom.normals.buffer);
    const idx = Buffer.from(geom.indices.buffer);
    const posView = bufferViews.length; bufferViews.push({ buffer: 0, byteOffset, byteLength: pos.length, target: 34962 }); byteOffset += pos.length; chunks.push(pos);
    const norView = bufferViews.length; bufferViews.push({ buffer: 0, byteOffset, byteLength: nor.length, target: 34962 }); byteOffset += nor.length; chunks.push(nor);
    const idxView = bufferViews.length; bufferViews.push({ buffer: 0, byteOffset, byteLength: idx.length, target: 34963 }); byteOffset += idx.length; chunks.push(idx);

    let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (let i = 0; i < geom.positions.length; i += 3) {
      minX = Math.min(minX, geom.positions[i]); maxX = Math.max(maxX, geom.positions[i]);
      minY = Math.min(minY, geom.positions[i + 1]); maxY = Math.max(maxY, geom.positions[i + 1]);
      minZ = Math.min(minZ, geom.positions[i + 2]); maxZ = Math.max(maxZ, geom.positions[i + 2]);
    }

    const posAcc = accessors.length; accessors.push({ bufferView: posView, componentType: 5126, count: geom.positions.length / 3, type: "VEC3", min: [minX, minY, minZ], max: [maxX, maxY, maxZ] });
    const norAcc = accessors.length; accessors.push({ bufferView: norView, componentType: 5126, count: geom.normals.length / 3, type: "VEC3" });
    const idxAcc = accessors.length; accessors.push({ bufferView: idxView, componentType: 5125, count: geom.indices.length, type: "SCALAR" });

    const [r, g, b] = hexParts(COLORS[matName] || COLORS.dark).map((v) => v / 255);
    const matIdx = materials.length;
    materials.push({
      name: matName,
      pbrMetallicRoughness: {
        baseColorFactor: [r, g, b, 1],
        metallicFactor: matName === "metal" ? 0.65 : 0.05,
        roughnessFactor: matName === "metal" ? 0.32 : 0.78,
      },
    });
    meshes.push({ name: `${model.id}_${matName}`, primitives: [{ attributes: { POSITION: posAcc, NORMAL: norAcc }, indices: idxAcc, material: matIdx }] });
    nodes.push({ mesh: meshes.length - 1, name: `${model.id}_${matName}` });
  }

  const json = Buffer.from(JSON.stringify({
    asset: { version: "2.0", generator: "Strike Zone Blockbench Pack" },
    scene: 0,
    scenes: [{ nodes: nodes.map((_, i) => i) }],
    nodes, meshes, materials, accessors, bufferViews,
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

const part = (name, mat, x, y, z, w, h, d, ry = 0) => ({ name, mat, x, y, z, w, h, d, ry });

function operator() {
  const p = [
    part("torso", "cloth", 0, 1.1, 0, 0.46, 0.68, 0.24),
    part("vest", "armor", 0, 1.12, -0.14, 0.5, 0.54, 0.08),
    part("head", "skin", 0, 1.62, -0.02, 0.26, 0.28, 0.24),
    part("helmet", "armor", 0, 1.78, -0.02, 0.32, 0.14, 0.28),
    part("visor", "glass", 0, 1.63, -0.15, 0.22, 0.08, 0.035),
  ];
  for (const sx of [-1, 1]) {
    p.push(part("upper_arm", "cloth", sx * 0.34, 1.18, 0, 0.14, 0.48, 0.14, sx * 0.16));
    p.push(part("forearm", "skin", sx * 0.38, 0.82, 0, 0.12, 0.36, 0.12, sx * -0.1));
    p.push(part("hand", "skin", sx * 0.38, 0.58, -0.02, 0.13, 0.09, 0.14));
    p.push(part("leg", "cloth", sx * 0.13, 0.48, 0, 0.15, 0.58, 0.16));
    p.push(part("boot", "boot", sx * 0.13, 0.12, -0.03, 0.18, 0.17, 0.28));
  }
  return { id: "operator", name: "Strike Zone Operator", parts: p };
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
    name: "O Gosmento",
    parts: [
      part("base_blob", "slime", 0, 0.45, 0, 0.78, 0.72, 0.68),
      part("back_lump", "purple", -0.16, 0.88, 0.06, 0.45, 0.55, 0.45, 0.24),
      part("head_lump", "slime", 0.12, 1.18, -0.08, 0.46, 0.42, 0.38, -0.18),
      part("eye_left", "bone", -0.1, 1.22, -0.3, 0.08, 0.07, 0.04),
      part("eye_right", "bone", 0.12, 1.2, -0.3, 0.08, 0.07, 0.04),
      part("mouth", "dark", 0.02, 1.08, -0.32, 0.28, 0.05, 0.035),
    ],
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
  ];
  if (id === "awm") {
    p.push(part("scope", "metal", 0, 0.44, -0.08, 0.13, 0.13, 0.34), part("long_barrel", "metal", 0, 0.2, -0.72, 0.045, 0.045, 0.45));
  } else if (id === "glock") {
    return { id, name, parts: [
      part("slide", "metal", 0, 0.24, -0.08, 0.16, 0.12, 0.38),
      part("frame", "dark", 0, 0.14, -0.03, 0.15, 0.12, 0.32),
      part("grip", "dark", 0, -0.05, 0.08, 0.13, 0.28, 0.13, -0.16),
      part("barrel_tip", "metal", 0, 0.24, -0.3, 0.07, 0.07, 0.07),
    ] };
  } else if (id === "doze") {
    p.push(part("second_barrel", "metal", 0.07, 0.2, -0.42, 0.05, 0.05, 0.5), part("pump", "wood", 0, 0.1, -0.28, 0.16, 0.12, 0.25));
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
  ];

  for (const item of models) {
    ensureDir(path.join(SRC_DIR, item.src));
    writeBbModel(path.join(SRC_DIR, item.src, `${item.model.id}.bbmodel`), item.model);
    writeGlb(path.join(MODEL_DIR, item.out, `${item.model.id}.glb`), item.model);
    console.log(`ok ${item.src}/${item.model.id}`);
  }
  console.log("\nFontes Blockbench: assets/blockbench/");
  console.log("GLBs do jogo: assets/models/blockbench/");
}

main();
