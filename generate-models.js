#!/usr/bin/env node
/**
 * generate-models.js — Gerador de modelos 3D GLB
 * Uso: node generate-models.js
 *
 * Gera arquivos .glb em assets/models/weapons/ e assets/models/
 * Zero dependências externas — usa apenas Node.js built-ins.
 */

'use strict';
const fs = require('fs');
const path = require('path');

// ============================================================
// MATH UTILS
// ============================================================

function rotateVec(x, y, z, rx, ry, rz) {
  // Z
  let nx = x * Math.cos(rz) - y * Math.sin(rz);
  let ny = x * Math.sin(rz) + y * Math.cos(rz);
  let nz = z;
  // Y
  let mx = nx * Math.cos(ry) + nz * Math.sin(ry);
  let my = ny;
  let mz = -nx * Math.sin(ry) + nz * Math.cos(ry);
  // X
  return [
    mx,
    my * Math.cos(rx) - mz * Math.sin(rx),
    my * Math.sin(rx) + mz * Math.cos(rx),
  ];
}

function normalize(x, y, z) {
  const len = Math.sqrt(x * x + y * y + z * z) || 1;
  return [x / len, y / len, z / len];
}

// ============================================================
// GEOMETRY PRIMITIVES
// ============================================================

function createBox(w, h, d) {
  const hw = w / 2, hh = h / 2, hd = d / 2;
  const faces = [
    { n: [0, 0, 1],  v: [[-hw,-hh,hd],[hw,-hh,hd],[hw,hh,hd],[-hw,hh,hd]] },
    { n: [0, 0,-1],  v: [[hw,-hh,-hd],[-hw,-hh,-hd],[-hw,hh,-hd],[hw,hh,-hd]] },
    { n: [1, 0, 0],  v: [[hw,-hh,hd],[hw,-hh,-hd],[hw,hh,-hd],[hw,hh,hd]] },
    { n: [-1, 0, 0], v: [[-hw,-hh,-hd],[-hw,-hh,hd],[-hw,hh,hd],[-hw,hh,-hd]] },
    { n: [0, 1, 0],  v: [[-hw,hh,hd],[hw,hh,hd],[hw,hh,-hd],[-hw,hh,-hd]] },
    { n: [0,-1, 0],  v: [[-hw,-hh,-hd],[hw,-hh,-hd],[hw,-hh,hd],[-hw,-hh,hd]] },
  ];
  const positions = [], normals = [], indices = [];
  let vi = 0;
  for (const { n, v } of faces) {
    for (const p of v) { positions.push(...p); normals.push(...n); }
    indices.push(vi, vi+1, vi+2, vi, vi+2, vi+3);
    vi += 4;
  }
  return { positions: new Float32Array(positions), normals: new Float32Array(normals), indices: new Uint32Array(indices) };
}

function createCylinder(rt, rb, h, seg) {
  const hh = h / 2;
  const positions = [], normals = [], indices = [];
  let vi = 0;

  // Lados com normais suaves
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI * 2;
    const a1 = ((i + 1) / seg) * Math.PI * 2;
    const [c0, s0] = [Math.cos(a0), Math.sin(a0)];
    const [c1, s1] = [Math.cos(a1), Math.sin(a1)];
    positions.push(c0*rt, hh, s0*rt, c1*rt, hh, s1*rt, c1*rb, -hh, s1*rb, c0*rb, -hh, s0*rb);
    normals.push(c0, 0, s0, c1, 0, s1, c1, 0, s1, c0, 0, s0);
    indices.push(vi, vi+1, vi+2, vi, vi+2, vi+3);
    vi += 4;
  }
  // Tampa superior
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI * 2;
    const a1 = ((i + 1) / seg) * Math.PI * 2;
    positions.push(0, hh, 0, Math.cos(a0)*rt, hh, Math.sin(a0)*rt, Math.cos(a1)*rt, hh, Math.sin(a1)*rt);
    normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0);
    indices.push(vi, vi+1, vi+2);
    vi += 3;
  }
  // Tampa inferior
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI * 2;
    const a1 = ((i + 1) / seg) * Math.PI * 2;
    positions.push(0, -hh, 0, Math.cos(a1)*rb, -hh, Math.sin(a1)*rb, Math.cos(a0)*rb, -hh, Math.sin(a0)*rb);
    normals.push(0, -1, 0, 0, -1, 0, 0, -1, 0);
    indices.push(vi, vi+1, vi+2);
    vi += 3;
  }
  return { positions: new Float32Array(positions), normals: new Float32Array(normals), indices: new Uint32Array(indices) };
}

function createSphere(r, wseg, hseg) {
  const positions = [], normals = [], indices = [];
  let vi = 0;
  for (let lat = 0; lat < hseg; lat++) {
    const phi0 = (lat / hseg) * Math.PI;
    const phi1 = ((lat + 1) / hseg) * Math.PI;
    for (let lon = 0; lon < wseg; lon++) {
      const th0 = (lon / wseg) * Math.PI * 2;
      const th1 = ((lon + 1) / wseg) * Math.PI * 2;
      const verts = [
        [Math.sin(phi0)*Math.cos(th0), Math.cos(phi0), Math.sin(phi0)*Math.sin(th0)],
        [Math.sin(phi0)*Math.cos(th1), Math.cos(phi0), Math.sin(phi0)*Math.sin(th1)],
        [Math.sin(phi1)*Math.cos(th1), Math.cos(phi1), Math.sin(phi1)*Math.sin(th1)],
        [Math.sin(phi1)*Math.cos(th0), Math.cos(phi1), Math.sin(phi1)*Math.sin(th0)],
      ];
      for (const v of verts) { positions.push(v[0]*r, v[1]*r, v[2]*r); normals.push(...normalize(...v)); }
      if (lat < hseg - 1 || lon < wseg - 1) {
        indices.push(vi, vi+1, vi+2, vi, vi+2, vi+3);
      }
      vi += 4;
    }
  }
  return { positions: new Float32Array(positions), normals: new Float32Array(normals), indices: new Uint32Array(indices) };
}

// ============================================================
// GEOMETRY TRANSFORMS & MERGE
// ============================================================

function transformGeom(geom, tx, ty, tz, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  const p = geom.positions;
  const n = geom.normals;
  const np = new Float32Array(p.length);
  const nn = new Float32Array(n.length);
  for (let i = 0; i < p.length; i += 3) {
    const [px, py, pz] = rotateVec(p[i]*sx, p[i+1]*sy, p[i+2]*sz, rx, ry, rz);
    np[i] = px + tx; np[i+1] = py + ty; np[i+2] = pz + tz;
    const [nx2, ny2, nz2] = normalize(...rotateVec(n[i], n[i+1], n[i+2], rx, ry, rz));
    nn[i] = nx2; nn[i+1] = ny2; nn[i+2] = nz2;
  }
  return { positions: np, normals: nn, indices: geom.indices };
}

function mergeGeoms(geoms) {
  let totalP = 0, totalI = 0;
  for (const g of geoms) { totalP += g.positions.length; totalI += g.indices.length; }
  const positions = new Float32Array(totalP);
  const normals = new Float32Array(totalP);
  const indices = new Uint32Array(totalI);
  let po = 0, io = 0, vo = 0;
  for (const g of geoms) {
    positions.set(g.positions, po);
    normals.set(g.normals, po);
    for (let i = 0; i < g.indices.length; i++) indices[io + i] = g.indices[i] + vo;
    po += g.positions.length;
    io += g.indices.length;
    vo += g.positions.length / 3;
  }
  return { positions, normals, indices };
}

// ============================================================
// GLB WRITER
// ============================================================

function writeGlb(filePath, meshGroups) {
  // meshGroups: [{name, geoms, color, metalness, roughness}]
  const bufferViews = [], accessors = [], meshes = [], materials = [], nodes = [];
  const bufParts = [];
  let byteOffset = 0;

  for (const mg of meshGroups) {
    const geom = mergeGeoms(mg.geoms);
    const { positions, normals, indices } = geom;

    const pBuf = Buffer.from(positions.buffer);
    const nBuf = Buffer.from(normals.buffer);
    const iBuf = Buffer.from(indices.buffer);

    const posView = bufferViews.length;
    bufferViews.push({ buffer: 0, byteOffset, byteLength: pBuf.length, target: 34962 });
    byteOffset += pBuf.length;
    bufParts.push(pBuf);

    const norView = bufferViews.length;
    bufferViews.push({ buffer: 0, byteOffset, byteLength: nBuf.length, target: 34962 });
    byteOffset += nBuf.length;
    bufParts.push(nBuf);

    const idxView = bufferViews.length;
    bufferViews.push({ buffer: 0, byteOffset, byteLength: iBuf.length, target: 34963 });
    byteOffset += iBuf.length;
    bufParts.push(iBuf);

    let minX=Infinity, minY=Infinity, minZ=Infinity, maxX=-Infinity, maxY=-Infinity, maxZ=-Infinity;
    for (let i = 0; i < positions.length; i += 3) {
      minX = Math.min(minX, positions[i]);   maxX = Math.max(maxX, positions[i]);
      minY = Math.min(minY, positions[i+1]); maxY = Math.max(maxY, positions[i+1]);
      minZ = Math.min(minZ, positions[i+2]); maxZ = Math.max(maxZ, positions[i+2]);
    }

    const posAcc = accessors.length;
    accessors.push({ bufferView: posView, componentType: 5126, count: positions.length/3, type: 'VEC3', min: [minX,minY,minZ], max: [maxX,maxY,maxZ] });
    const norAcc = accessors.length;
    accessors.push({ bufferView: norView, componentType: 5126, count: normals.length/3, type: 'VEC3' });
    const idxAcc = accessors.length;
    accessors.push({ bufferView: idxView, componentType: 5125, count: indices.length, type: 'SCALAR' });

    const c = mg.color || 0x888888;
    const matIdx = materials.length;
    materials.push({
      name: mg.name + '_mat',
      pbrMetallicRoughness: {
        baseColorFactor: [((c>>16)&0xFF)/255, ((c>>8)&0xFF)/255, (c&0xFF)/255, 1],
        metallicFactor: mg.metalness ?? 0.5,
        roughnessFactor: mg.roughness ?? 0.5,
      },
    });

    const nodeIdx = nodes.length;
    meshes.push({ name: mg.name, primitives: [{ attributes: { POSITION: posAcc, NORMAL: norAcc }, indices: idxAcc, material: matIdx }] });
    nodes.push({ mesh: nodeIdx, name: mg.name });
  }

  const gltf = {
    asset: { version: '2.0', generator: 'Strike Zone Model Generator v1' },
    scene: 0,
    scenes: [{ nodes: nodes.map((_, i) => i) }],
    nodes, meshes, materials, accessors,
    bufferViews,
    buffers: [{ byteLength: byteOffset }],
  };

  const jsonStr = JSON.stringify(gltf);
  const jsonPad = (4 - (jsonStr.length % 4)) % 4;
  const jsonBuf = Buffer.from(jsonStr + ' '.repeat(jsonPad));
  const binRaw = Buffer.concat(bufParts);
  const binPad = (4 - (binRaw.length % 4)) % 4;
  const binBuf = binPad > 0 ? Buffer.concat([binRaw, Buffer.alloc(binPad)]) : binRaw;
  const totalLen = 12 + 8 + jsonBuf.length + 8 + binBuf.length;

  const hdr = Buffer.alloc(12);
  hdr.writeUInt32LE(0x46546C67, 0); hdr.writeUInt32LE(2, 4); hdr.writeUInt32LE(totalLen, 8);
  const jChunkHdr = Buffer.alloc(8);
  jChunkHdr.writeUInt32LE(jsonBuf.length, 0); jChunkHdr.writeUInt32LE(0x4E4F534A, 4);
  const bChunkHdr = Buffer.alloc(8);
  bChunkHdr.writeUInt32LE(binBuf.length, 0); bChunkHdr.writeUInt32LE(0x004E4942, 4);

  fs.writeFileSync(filePath, Buffer.concat([hdr, jChunkHdr, jsonBuf, bChunkHdr, binBuf]));
}

// ============================================================
// WEAPON HELPERS (espelham weapon-models-hd.js em geometry raw)
// ============================================================
const PI2 = Math.PI / 2;

function box(w, h, d, tx, ty, tz, rx=0, ry=0, rz=0) {
  return transformGeom(createBox(w, h, d), tx, ty, tz, rx, ry, rz);
}
function cyl(rt, rb, h, seg, tx, ty, tz, rx=0, ry=0, rz=0) {
  return transformGeom(createCylinder(rt, rb, h, seg), tx, ty, tz, rx, ry, rz);
}

// Rail Picatinny
function rail(geoms, zStart, zEnd, y=0.06) {
  const len = zEnd - zStart;
  geoms.push(box(0.05, 0.008, len, 0, y, (zStart+zEnd)/2));
  const cnt = Math.max(3, Math.floor(len/0.045));
  for (let i=0; i<cnt; i++) {
    const z = zStart + (i+0.5)*(len/cnt);
    geoms.push(box(0.058, 0.011, 0.014, 0, y+0.008, z));
  }
}

function ironSights(geoms, frontZ, rearZ) {
  geoms.push(
    box(0.044, 0.012, 0.018, 0, 0.078, rearZ),
    box(0.008, 0.035, 0.01, -0.014, 0.096, rearZ),
    box(0.008, 0.035, 0.01,  0.014, 0.096, rearZ),
    box(0.008, 0.036, 0.01,  0,     0.09,  frontZ),
  );
}

function muzzleBrake(geoms, z, big=false) {
  const r = big ? 0.027 : 0.018;
  geoms.push(
    cyl(r, r, big?0.07:0.052, 18, 0, 0.02, z, PI2),
    box(r*1.7, 0.006, 0.012, 0, 0.02, z-0.008),
    box(r*1.7, 0.006, 0.012, 0, 0.02, z+0.008),
  );
}

function scope(geoms, z, long=false) {
  const len = long ? 0.18 : 0.12;
  geoms.push(
    box(0.014, 0.035, 0.08, 0, 0.072, z+len*0.1),
    cyl(long?0.032:0.026, long?0.032:0.026, len, 20, 0, 0.115, z, PI2),
    cyl(long?0.039:0.031, long?0.039:0.031, 0.035, 20, 0, 0.115, z-len/2, PI2),
    cyl(long?0.036:0.029, long?0.036:0.029, 0.028, 20, 0, 0.115, z+len/2, PI2),
  );
}

// Núcleo comum de rifle
function rifleCore(geoms, tint, opts={}) {
  const { barrelLen=0.42, stockLen=0.24, receiverLen=0.22, handguardLen=0.18 } = opts;
  geoms.push(
    box(0.062, 0.07, receiverLen, 0, 0.005, 0.045),
    box(0.052, 0.045, handguardLen, 0, 0.015, -0.105),
    box(0.048, 0.024, stockLen, 0, 0.01, 0.21+stockLen*0.12),
    box(0.062, 0.05, 0.08, 0, -0.005, 0.16),
    box(0.068, 0.01, receiverLen*0.72, 0, 0.046, 0.04),
    box(0.008, 0.024, receiverLen*0.46, 0.036, 0.012, 0.035),
    box(0.008, 0.024, receiverLen*0.46, -0.036, 0.012, 0.035),
    cyl(0.013, 0.013, barrelLen, 20, 0, 0.024, -barrelLen/2-0.16, PI2),
    cyl(0.019, 0.019, 0.09, 16, 0, 0.024, -0.16, PI2),
    box(0.032, 0.11, 0.044, 0, -0.07, -0.02, 0.18),
    box(0.008, 0.024, receiverLen*0.46, 0.036, 0.012, 0.035),
    box(0.006, 0.04, 0.006, -0.028, -0.03, 0.055),
    box(0.006, 0.04, 0.006,  0.028, -0.03, 0.055),
  );
  rail(geoms, -0.18, 0.14, 0.057);
}

// ============================================================
// WEAPON BUILDERS
// ============================================================

function buildAk47() {
  const metalGeoms = [], darkGeoms = [], woodGeoms = [];
  rifleCore(darkGeoms, 0x6b4423, { barrelLen: 0.44, stockLen: 0.28, receiverLen: 0.22, handguardLen: 0.16 });
  // Cano e partes metálicas
  metalGeoms.push(
    cyl(0.013, 0.013, 0.44, 20, 0, 0.024, -0.38, PI2),
    cyl(0.007, 0.007, 0.36, 10, 0, 0.044, -0.11, PI2),
  );
  muzzleBrake(metalGeoms, -0.61);
  ironSights(metalGeoms, -0.32, 0.11);
  // Magazine curvo (AK style)
  woodGeoms.push(
    box(0.029, 0.16, 0.07, 0.032, -0.045, -0.055, 0.18, 0, -0.05),
    box(0.018, 0.12, 0.045, 0, 0.035, 0.135),
    box(0.034, 0.018, 0.17, 0, 0.041, 0.02),
    box(0.045, 0.012, 0.17, 0, 0.054, -0.19),
  );
  return [
    { name: 'ak47_metal', geoms: metalGeoms, color: 0x7a7a88, metalness: 0.92, roughness: 0.22 },
    { name: 'ak47_body',  geoms: darkGeoms,  color: 0x1a1a22, metalness: 0.55, roughness: 0.48 },
    { name: 'ak47_wood',  geoms: woodGeoms,  color: 0x6b4423, metalness: 0.08, roughness: 0.72 },
  ];
}

function buildAwm() {
  const metalGeoms = [], darkGeoms = [], woodGeoms = [];
  woodGeoms.push(
    box(0.044, 0.054, 0.34, 0, 0.002, -0.09),
    box(0.04, 0.105, 0.26, 0, -0.012, 0.18),
    box(0.05, 0.032, 0.28, 0, 0.01, 0.02),
    box(0.036, 0.032, 0.13, 0, 0.064, -0.13),
    box(0.052, 0.012, 0.42, 0, 0.048, -0.32),
    box(0.056, 0.014, 0.12, 0, -0.052, 0.23, -0.08),
  );
  metalGeoms.push(
    cyl(0.015, 0.015, 0.62, 24, 0, 0.022, -0.47, PI2),
    box(0.036, 0.024, 0.08, 0, 0.055, 0.04),
    cyl(0.009, 0.009, 0.18, 12, 0.038, 0.032, -0.27, PI2),
    cyl(0.009, 0.009, 0.18, 12, -0.038, 0.032, -0.27, PI2),
  );
  muzzleBrake(metalGeoms, -0.79, true);
  scope(darkGeoms, -0.24, true);
  darkGeoms.push(
    box(0.012, 0.052, 0.03, -0.025, -0.045, 0.13, 0.35),
    box(0.012, 0.052, 0.03,  0.025, -0.045, 0.13, 0.35),
    box(0.026, 0.06, 0.035, 0.032, -0.03, -0.02, 0.08),
  );
  return [
    { name: 'awm_metal', geoms: metalGeoms, color: 0x7a7a88, metalness: 0.92, roughness: 0.22 },
    { name: 'awm_dark',  geoms: darkGeoms,  color: 0x1a1a22, metalness: 0.55, roughness: 0.48 },
    { name: 'awm_wood',  geoms: woodGeoms,  color: 0x5c4030, metalness: 0.08, roughness: 0.72 },
  ];
}

function buildGlock() {
  const metalGeoms = [], darkGeoms = [], gripGeoms = [];
  gripGeoms.push(
    box(0.052, 0.122, 0.13, 0, -0.022, 0.055, -0.12),
  );
  metalGeoms.push(
    box(0.062, 0.05, 0.27, 0, 0.06, -0.09),
    cyl(0.013, 0.013, 0.19, 18, 0, 0.057, -0.205, PI2),
    box(0.025, 0.018, 0.08, 0, 0.09, -0.24),
  );
  darkGeoms.push(
    box(0.064, 0.016, 0.255, 0, 0.089, -0.09),
    box(0.055, 0.032, 0.19, 0, 0.034, -0.065),
    box(0.006, 0.04, 0.006, -0.028, -0.03, 0.055),
    box(0.006, 0.04, 0.006,  0.028, -0.03, 0.055),
  );
  ironSights(darkGeoms, -0.3, 0.09);
  return [
    { name: 'glock_metal', geoms: metalGeoms, color: 0xb8c2d0, metalness: 0.92, roughness: 0.18 },
    { name: 'glock_dark',  geoms: darkGeoms,  color: 0x090b10, metalness: 0.55, roughness: 0.45 },
    { name: 'glock_grip',  geoms: gripGeoms,  color: 0x2a2a30, metalness: 0.06, roughness: 0.82 },
  ];
}

function buildScar() {
  const metalGeoms = [], bodyGeoms = [], darkGeoms = [];
  rifleCore(bodyGeoms, 0x3a4550, { barrelLen: 0.39, stockLen: 0.21, receiverLen: 0.24, handguardLen: 0.21 });
  bodyGeoms.push(
    box(0.068, 0.048, 0.25, 0, 0.016, -0.055),
    box(0.048, 0.056, 0.1, 0, 0.012, 0.095),
  );
  darkGeoms.push(
    box(0.06, 0.014, 0.34, 0, 0.069, -0.07),
    box(0.03, 0.08, 0.026, 0, 0.04, 0.145),
  );
  metalGeoms.push(
    box(0.016, 0.02, 0.09, 0, 0.05, -0.235),
  );
  scope(metalGeoms, -0.08, false);
  muzzleBrake(metalGeoms, -0.56);
  ironSights(darkGeoms, -0.34, 0.12);
  return [
    { name: 'scar_metal', geoms: metalGeoms, color: 0x7a7a88, metalness: 0.92, roughness: 0.22 },
    { name: 'scar_body',  geoms: bodyGeoms,  color: 0x3a4550, metalness: 0.15, roughness: 0.65 },
    { name: 'scar_dark',  geoms: darkGeoms,  color: 0x1a1a22, metalness: 0.55, roughness: 0.48 },
  ];
}

function buildM4() {
  const metalGeoms = [], bodyGeoms = [], darkGeoms = [];
  rifleCore(bodyGeoms, 0x3d4a38, { barrelLen: 0.37, stockLen: 0.2, receiverLen: 0.2, handguardLen: 0.2 });
  bodyGeoms.push(
    box(0.064, 0.045, 0.18, 0, 0.02, -0.045),
    box(0.04, 0.058, 0.072, 0, -0.004, 0.092),
    box(0.025, 0.052, 0.035, 0.034, -0.022, 0.06, 0.1),
  );
  metalGeoms.push(
    box(0.05, 0.018, 0.28, 0, 0.046, -0.12),
    box(0.018, 0.024, 0.1, 0, 0.04, -0.285),
  );
  muzzleBrake(metalGeoms, -0.52);
  ironSights(darkGeoms, -0.31, 0.1);
  scope(darkGeoms, -0.09, false);
  return [
    { name: 'm4_metal', geoms: metalGeoms, color: 0x7a7a88, metalness: 0.92, roughness: 0.22 },
    { name: 'm4_body',  geoms: bodyGeoms,  color: 0x3d4a38, metalness: 0.15, roughness: 0.65 },
    { name: 'm4_dark',  geoms: darkGeoms,  color: 0x1a1a22, metalness: 0.55, roughness: 0.48 },
  ];
}

function buildUmp45() {
  const metalGeoms = [], bodyGeoms = [], darkGeoms = [];
  metalGeoms.push(
    box(0.062, 0.062, 0.22, 0, 0.004, -0.015),
    cyl(0.012, 0.012, 0.29, 16, 0, 0.017, -0.22, PI2),
    box(0.018, 0.02, 0.07, 0.035, 0.025, 0.045),
  );
  muzzleBrake(metalGeoms, -0.38);
  bodyGeoms.push(
    box(0.055, 0.035, 0.2, 0, 0.03, -0.02),
    box(0.035, 0.09, 0.078, 0, -0.01, 0.072),
    box(0.04, 0.026, 0.055, 0, -0.013, -0.11),
  );
  darkGeoms.push(
    box(0.032, 0.095, 0.044, 0, -0.064, -0.018, 0.18),
  );
  rail(darkGeoms, -0.09, 0.09, 0.058);
  ironSights(darkGeoms, -0.25, 0.08);
  return [
    { name: 'ump_metal', geoms: metalGeoms, color: 0x7a7a88, metalness: 0.92, roughness: 0.22 },
    { name: 'ump_body',  geoms: bodyGeoms,  color: 0x2a2a32, metalness: 0.35, roughness: 0.6  },
    { name: 'ump_dark',  geoms: darkGeoms,  color: 0x1a1a22, metalness: 0.55, roughness: 0.48 },
  ];
}

function buildShotgun() {
  const metalGeoms = [], bodyGeoms = [], darkGeoms = [];
  metalGeoms.push(
    cyl(0.03, 0.03, 0.46, 18, -0.014, 0.028, -0.29, PI2),
    cyl(0.03, 0.03, 0.46, 18,  0.014, 0.028, -0.29, PI2),
    cyl(0.026, 0.026, 0.12, 14, -0.014, 0.026, -0.58, PI2),
    cyl(0.026, 0.026, 0.12, 14,  0.014, 0.026, -0.58, PI2),
    box(0.04, 0.014, 0.23, 0, 0.068, -0.22),
  );
  bodyGeoms.push(
    box(0.056, 0.08, 0.24, 0, 0.004, 0.06),
    box(0.038, 0.032, 0.16, 0, -0.005, -0.16),
    box(0.032, 0.095, 0.044, 0, -0.057, -0.02, 0.18),
  );
  darkGeoms.push(
    box(0.048, 0.06, 0.09, 0, 0.012, 0.02),
    box(0.018, 0.04, 0.06, 0, 0.041, 0.105),
  );
  ironSights(darkGeoms, -0.48, 0.095);
  return [
    { name: 'doze_metal', geoms: metalGeoms, color: 0x7a7a88, metalness: 0.92, roughness: 0.22 },
    { name: 'doze_body',  geoms: bodyGeoms,  color: 0x6b4423, metalness: 0.08, roughness: 0.72 },
    { name: 'doze_dark',  geoms: darkGeoms,  color: 0x1a1a22, metalness: 0.55, roughness: 0.48 },
  ];
}

// ============================================================
// PERSONAGEM ESTÁTICO (pose T, gerado como GLB)
// ============================================================
function buildCharacter() {
  const skinGeoms = [], clothGeoms = [], armorGeoms = [], bootGeoms = [];

  // Torso (cápsula aproximada por cilindro)
  skinGeoms.push(cyl(0.13, 0.115, 0.52, 16, 0, 1.18, 0));
  // Pescoço
  skinGeoms.push(cyl(0.038, 0.038, 0.07, 12, 0, 1.52, 0));
  // Cabeça (esfera achatada)
  const headSph = createSphere(0.098, 16, 12);
  const headGeom = transformGeom(headSph, 0, 1.64, 0);
  skinGeoms.push(headGeom);
  // Capacete
  const helmetSph = createSphere(0.115, 16, 10);
  armorGeoms.push(transformGeom(helmetSph, 0, 1.66, 0));
  armorGeoms.push(box(0.18, 0.055, 0.05, 0, 1.645, 0.094));

  // Braços (cilindros com juntas)
  for (const sx of [-1, 1]) {
    // Ombro
    clothGeoms.push(cyl(0.048, 0.044, 0.24, 14, sx*0.22, 1.32, 0));
    // Antebraço
    skinGeoms.push(cyl(0.04, 0.036, 0.22, 14, sx*0.22, 1.06, 0));
    // Mão (bloco simples)
    skinGeoms.push(box(0.054, 0.04, 0.062, sx*0.22, 0.92, 0.018));
    // Pauldron (ombreira)
    armorGeoms.push(cyl(0.064, 0.058, 0.06, 16, sx*0.22, 1.47, 0));
  }

  // Pernas
  for (const sx of [-1, 1]) {
    // Coxa
    clothGeoms.push(cyl(0.078, 0.07, 0.34, 14, sx*0.1, 0.76, 0));
    // Canela
    clothGeoms.push(cyl(0.062, 0.054, 0.32, 14, sx*0.1, 0.39, 0));
    // Joelheira
    armorGeoms.push(box(0.088, 0.05, 0.055, sx*0.1, 0.52, 0.03));
    // Boot
    bootGeoms.push(box(0.09, 0.07, 0.22, sx*0.1, 0.19, 0.04));
    bootGeoms.push(box(0.094, 0.014, 0.225, sx*0.1, 0.152, 0.04));
  }

  // Colete tático
  armorGeoms.push(
    box(0.34, 0.38, 0.12, 0, 1.22, 0.02),
    box(0.07, 0.09, 0.05, -0.12, 1.08, 0.07),
    box(0.07, 0.09, 0.05,  0.12, 1.08, 0.07),
    box(0.24, 0.04, 0.09, 0, 1.02, 0.04),
  );

  return [
    { name: 'player_skin',  geoms: skinGeoms,  color: 0xc4956a, metalness: 0.02, roughness: 0.88 },
    { name: 'player_cloth', geoms: clothGeoms, color: 0x3a4530, metalness: 0.04, roughness: 0.86 },
    { name: 'player_armor', geoms: armorGeoms, color: 0x334455, metalness: 0.35, roughness: 0.55 },
    { name: 'player_boot',  geoms: bootGeoms,  color: 0x1a1a1a, metalness: 0.08, roughness: 0.72 },
  ];
}

// ============================================================
// MAIN
// ============================================================

function main() {
  const weaponDir = path.join(__dirname, 'assets', 'models', 'weapons');
  const modelDir  = path.join(__dirname, 'assets', 'models');
  fs.mkdirSync(weaponDir, { recursive: true });
  fs.mkdirSync(modelDir,  { recursive: true });

  const weapons = {
    'ak47':   buildAk47,
    'awm':    buildAwm,
    'glock':  buildGlock,
    'scar':   buildScar,
    'm4':     buildM4,
    'ump45':  buildUmp45,
    'doze':   buildShotgun,
  };

  for (const [name, builder] of Object.entries(weapons)) {
    const glbPath = path.join(weaponDir, name + '.glb');
    try {
      writeGlb(glbPath, builder());
      console.log('✓ ' + name + '.glb');
    } catch (e) {
      console.error('✗ ' + name + ': ' + e.message);
    }
  }

  try {
    writeGlb(path.join(modelDir, 'player-hd.glb'), buildCharacter());
    console.log('✓ player-hd.glb');
  } catch (e) {
    console.error('✗ player-hd: ' + e.message);
  }

  console.log('\nModelos gerados em assets/models/');
}

main();
