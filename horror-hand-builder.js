/** Mãos gigantes — estilo Grimy Hand FPS (LN patient + manga STALKER) — fallback procedural HD */

import * as THREE from "three";
import { configureMonsterTexture, canvasTextureFrom, makeBumpFromCanvas, MONSTER_TEX_SIZE } from "./monster-texture-hd.js";

const SKIN_BASE = "#5f574f";
const SKIN_DARK = "#2d2925";
const SLEEVE_BASE = "#1f2a25";

let grimyThumbOverlay = null;

export function setGrimyThumbReference(tex) {
  grimyThumbOverlay = tex;
}

function makeSkinCanvas() {
  const c = document.createElement("canvas");
  c.width = MONSTER_TEX_SIZE;
  c.height = MONSTER_TEX_SIZE;
  const ctx = c.getContext("2d");

  ctx.fillStyle = SKIN_BASE;
  ctx.fillRect(0, 0, MONSTER_TEX_SIZE, MONSTER_TEX_SIZE);

  if (grimyThumbOverlay?.image) {
    ctx.globalAlpha = 0.42;
    ctx.drawImage(grimyThumbOverlay.image, 0, 0, MONSTER_TEX_SIZE, MONSTER_TEX_SIZE);
    ctx.globalAlpha = 1;
  }

  for (let y = 0; y < MONSTER_TEX_SIZE; y++) {
    const t = y / MONSTER_TEX_SIZE;
    ctx.fillStyle = `rgba(${90 + t * 25},${78 + t * 18},${68 + t * 12},0.09)`;
    ctx.fillRect(0, y, MONSTER_TEX_SIZE, 1);
  }

  for (let i = 0; i < 5200; i++) {
    const x = Math.random() * MONSTER_TEX_SIZE;
    const y = Math.random() * MONSTER_TEX_SIZE;
    const r = 0.4 + Math.random() * 3.2;
    ctx.fillStyle = `rgba(${45 + Math.random() * 40},${38 + Math.random() * 30},${32 + Math.random() * 25},${0.04 + Math.random() * 0.09})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 28; i++) {
    ctx.strokeStyle = `rgba(35,25,20,${0.07 + Math.random() * 0.1})`;
    ctx.lineWidth = 1 + Math.random() * 2.5;
    ctx.beginPath();
    const sy = 20 + i * (MONSTER_TEX_SIZE / 30);
    ctx.moveTo(0, sy);
    ctx.bezierCurveTo(MONSTER_TEX_SIZE * 0.23, sy - 18, MONSTER_TEX_SIZE * 0.7, sy + 24, MONSTER_TEX_SIZE, sy - 10);
    ctx.stroke();
  }

  for (let i = 0; i < 14; i++) {
    ctx.strokeStyle = `rgba(90,40,35,${0.1 + Math.random() * 0.12})`;
    ctx.lineWidth = 2 + Math.random() * 3;
    const vx = 60 + i * (MONSTER_TEX_SIZE / 15);
    ctx.beginPath();
    ctx.moveTo(vx, 0);
    ctx.bezierCurveTo(vx + 30, MONSTER_TEX_SIZE * 0.27, vx - 20, MONSTER_TEX_SIZE * 0.6, vx + 15, MONSTER_TEX_SIZE);
    ctx.stroke();
  }

  for (let i = 0; i < 55; i++) {
    ctx.fillStyle = `rgba(${25 + Math.random() * 20},${18 + Math.random() * 15},${14 + Math.random() * 12},0.12 + Math.random() * 0.2)`;
    const w = 12 + Math.random() * 48;
    const h = 3 + Math.random() * 10;
    ctx.fillRect(Math.random() * (MONSTER_TEX_SIZE - 64), Math.random() * (MONSTER_TEX_SIZE - 64), w, h);
  }

  for (let i = 0; i < 18; i++) {
    ctx.fillStyle = `rgba(120,35,30,${0.08 + Math.random() * 0.15})`;
    ctx.beginPath();
    ctx.arc(Math.random() * MONSTER_TEX_SIZE, Math.random() * MONSTER_TEX_SIZE, 4 + Math.random() * 18, 0, Math.PI * 2);
    ctx.fill();
  }

  return c;
}

function makeSleeveCanvas() {
  const c = document.createElement("canvas");
  c.width = MONSTER_TEX_SIZE;
  c.height = MONSTER_TEX_SIZE;
  const ctx = c.getContext("2d");

  ctx.fillStyle = SLEEVE_BASE;
  ctx.fillRect(0, 0, MONSTER_TEX_SIZE, MONSTER_TEX_SIZE);

  for (let i = 0; i < 4000; i++) {
    const g = 50 + Math.random() * 35;
    ctx.fillStyle = `rgba(${g},${g + 8},${g - 5},0.06)`;
    ctx.fillRect(Math.random() * MONSTER_TEX_SIZE, Math.random() * MONSTER_TEX_SIZE, 2 + Math.random() * 6, 1 + Math.random() * 4);
  }

  for (let i = 0; i < 40; i++) {
    ctx.strokeStyle = `rgba(20,22,18,${0.08 + Math.random() * 0.12})`;
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath();
    const y = 30 + i * (MONSTER_TEX_SIZE / 42);
    ctx.moveTo(0, y);
    ctx.lineTo(MONSTER_TEX_SIZE, y + (Math.random() - 0.5) * 12);
    ctx.stroke();
  }

  for (let i = 0; i < 80; i++) {
    ctx.fillStyle = `rgba(${20 + Math.random() * 25},${22 + Math.random() * 25},${18 + Math.random() * 20},0.15 + Math.random() * 0.25)`;
    ctx.fillRect(Math.random() * MONSTER_TEX_SIZE, Math.random() * MONSTER_TEX_SIZE, 8 + Math.random() * 40, 4 + Math.random() * 16);
  }

  return c;
}

function makeMaterials() {
  const skinCanvas = makeSkinCanvas();
  const sleeveCanvas = makeSleeveCanvas();
  const skinMap = canvasTextureFrom(skinCanvas);
  const sleeveMap = canvasTextureFrom(sleeveCanvas);
  const skinBump = makeBumpFromCanvas(skinCanvas, 1.5);
  const sleeveBump = makeBumpFromCanvas(sleeveCanvas, 1.2);
  configureMonsterTexture(skinBump.map);
  configureMonsterTexture(sleeveBump.map);

  const flesh = new THREE.MeshStandardMaterial({
    map: skinMap,
    color: 0x9a8a7e,
    roughness: 0.78,
    metalness: 0.02,
    bumpMap: skinBump.map,
    bumpScale: skinBump.scale,
  });
  const fleshDark = flesh.clone();
  fleshDark.color = new THREE.Color(0x6a5a50);
  fleshDark.roughness = 0.84;
  const fleshPale = flesh.clone();
  fleshPale.color = new THREE.Color(0xb0a090);
  const sleeve = new THREE.MeshStandardMaterial({
    map: sleeveMap,
    color: 0x4a5248,
    roughness: 0.92,
    metalness: 0.02,
    bumpMap: sleeveBump.map,
    bumpScale: sleeveBump.scale,
  });
  const nail = new THREE.MeshStandardMaterial({
    color: 0xf0e8dc,
    roughness: 0.28,
    metalness: 0.08,
  });
  const nailDirty = nail.clone();
  nailDirty.color = new THREE.Color(0xc8b8a0);
  const nailLunula = nail.clone();
  nailLunula.color = new THREE.Color(0xf8f4ee);
  const blood = new THREE.MeshStandardMaterial({
    color: 0x5a0606,
    roughness: 0.42,
    metalness: 0.05,
    emissive: 0x3a0000,
    emissiveIntensity: 0.65,
  });
  const bloodWet = blood.clone();
  bloodWet.emissiveIntensity = 0.9;
  bloodWet.roughness = 0.25;
  const vein = new THREE.MeshStandardMaterial({
    color: 0x4a2820,
    roughness: 0.88,
    emissive: 0x1a0808,
    emissiveIntensity: 0.2,
  });
  const tendon = new THREE.MeshStandardMaterial({
    color: 0xc8b0a0,
    roughness: 0.55,
    metalness: 0.02,
  });
  const crease = new THREE.MeshStandardMaterial({
    color: 0x4a3830,
    roughness: 0.94,
  });
  return { flesh, fleshDark, fleshPale, sleeve, nail, nailDirty, nailLunula, blood, bloodWet, vein, tendon, crease };
}

function addKnuckle(parent, x, y, z, radius, mat) {
  const k = new THREE.Mesh(new THREE.SphereGeometry(radius, 14, 12), mat);
  k.position.set(x, y, z);
  k.scale.set(1.15, 0.85, 1.1);
  parent.add(k);
}

function buildNail(parent, radius, tipZ, matNail, matLunula, dirty = false) {
  const nailGroup = new THREE.Group();
  nailGroup.position.z = tipZ;

  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(radius * 1.85, 0.028, radius * 1.35),
    dirty ? matNail.clone() : matNail
  );
  plate.position.z = radius * 0.35;
  plate.rotation.x = 0.06;
  nailGroup.add(plate);

  const lunula = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.55, 10, 8),
    matLunula
  );
  lunula.scale.set(1.2, 0.35, 0.9);
  lunula.position.set(0, 0.01, radius * 0.08);
  nailGroup.add(lunula);

  if (dirty) {
    const grime = new THREE.Mesh(
      new THREE.BoxGeometry(radius * 1.6, 0.015, radius * 0.4),
      matNail
    );
    grime.position.set(0, -0.008, radius * 0.55);
    grime.material = matNail.clone();
    grime.material.color = new THREE.Color(0x4a3828);
    nailGroup.add(grime);
  }

  parent.add(nailGroup);
  return nailGroup;
}

function buildPhalanx(parent, length, radiusStart, radiusEnd, mat, rx = 0) {
  const ph = new THREE.Mesh(
    new THREE.CapsuleGeometry((radiusStart + radiusEnd) / 2, length, 12, 16),
    mat
  );
  ph.rotation.x = Math.PI / 2 + rx;
  ph.position.z = length * 0.48;
  ph.scale.set(1, 1, 1);
  parent.add(ph);
  return ph;
}

function buildFinger(opts) {
  const {
    mats,
    radius,
    lengths,
    xSpread,
    curl = 0,
    cutOff = false,
    severed = false,
  } = opts;
  const finger = new THREE.Group();
  finger.position.set(xSpread, 0, 0);

  if (cutOff) {
    const stump = new THREE.Mesh(
      new THREE.CapsuleGeometry(radius * 1.05, lengths[0] * 0.38, 12, 16),
      mats.fleshDark
    );
    stump.rotation.x = Math.PI / 2 + 0.15;
    stump.position.z = lengths[0] * 0.15;
    finger.add(stump);

    addKnuckle(finger, 0, 0.02, lengths[0] * 0.08, radius * 1.15, mats.fleshDark);

    const wound = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.25, 14, 12), mats.bloodWet);
    wound.scale.set(1.1, 0.65, 1);
    wound.position.set(0, 0, lengths[0] * 0.32);
    finger.add(wound);

    const bonePeek = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.35, radius * 0.42, 0.06, 8),
      mats.fleshPale
    );
    bonePeek.rotation.x = Math.PI / 2;
    bonePeek.position.set(0, 0.02, lengths[0] * 0.3);
    finger.add(bonePeek);

    for (let d = 0; d < 6; d++) {
      const drip = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.022 + d * 0.004, 0.14 + d * 0.08, 6, 8),
        mats.blood
      );
      drip.position.set((d - 2.5) * 0.035, -0.06 - d * 0.04, 0.2 + d * 0.05);
      finger.add(drip);
    }

    if (severed) {
      const chunk = new THREE.Group();
      const ph = buildPhalanx(chunk, lengths[0] * 0.55, radius * 0.9, radius * 0.75, mats.flesh, 0.35);
      ph.position.set(0.1, -0.1, 0.3);
      buildNail(chunk, radius * 0.75, lengths[0] * 0.45, mats.nailDirty, mats.nailLunula, true);
      chunk.position.set(0.06, -0.08, 0.45);
      chunk.rotation.z = 0.4;
      finger.add(chunk);
    }
    return finger;
  }

  const joint0 = new THREE.Group();
  finger.add(joint0);
  buildPhalanx(joint0, lengths[0], radius, radius * 0.92, mats.flesh);
  addKnuckle(joint0, 0, 0.02, lengths[0] * 0.05, radius * 1.12, mats.flesh);
  joint0.rotation.x = curl;

  const joint1 = new THREE.Group();
  joint1.position.z = lengths[0] * 0.92;
  joint0.add(joint1);
  buildPhalanx(joint1, lengths[1], radius * 0.9, radius * 0.82, mats.flesh);
  addKnuckle(joint1, 0, 0.015, lengths[1] * 0.05, radius * 1.05, mats.flesh);
  joint1.rotation.x = curl * 0.7;

  const joint2 = new THREE.Group();
  joint2.position.z = lengths[1] * 0.9;
  joint1.add(joint2);
  buildPhalanx(joint2, lengths[2], radius * 0.82, radius * 0.68, mats.fleshPale);
  addKnuckle(joint2, 0, 0.01, lengths[2] * 0.04, radius * 0.95, mats.flesh);
  joint2.rotation.x = curl * 0.45;

  const pad = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.75, 10, 8), mats.fleshPale);
  pad.scale.set(1.1, 0.45, 0.95);
  pad.position.set(0, -0.02, lengths[2] * 0.35);
  joint2.add(pad);

  buildNail(joint2, radius * 0.72, lengths[2] * 0.82, mats.nail, mats.nailLunula, true);

  return finger;
}

function buildThumb(mats, radius, side) {
  const thumb = new THREE.Group();
  thumb.position.set(side * 0.48, -0.04, -0.1);
  thumb.rotation.z = side * -0.62;
  thumb.rotation.x = -0.3;

  const j0 = new THREE.Group();
  thumb.add(j0);
  buildPhalanx(j0, 0.16, radius * 1.1, radius, mats.flesh);
  addKnuckle(j0, 0, 0.02, 0.04, radius * 1.15, mats.flesh);

  const j1 = new THREE.Group();
  j1.position.z = 0.15;
  j0.add(j1);
  buildPhalanx(j1, 0.13, radius * 0.95, radius * 0.85, mats.flesh);
  addKnuckle(j1, 0, 0.015, 0.04, radius * 1.05, mats.flesh);

  const j2 = new THREE.Group();
  j2.position.z = 0.13;
  j1.add(j2);
  buildPhalanx(j2, 0.11, radius * 0.82, radius * 0.7, mats.fleshPale);
  buildNail(j2, radius * 0.7, 0.1, mats.nail, mats.nailLunula, true);

  return thumb;
}

function buildPalm(mats, s) {
  const palm = new THREE.Group();

  const palmBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.58 * s * 1.12, 0.16 * s * 1.08, 0.68 * s * 1.1),
    mats.flesh
  );
  palmBase.position.set(0, 0, 0.06 * s);
  palm.add(palmBase);

  const palmCurve = new THREE.Mesh(new THREE.SphereGeometry(0.28 * s, 16, 14), mats.flesh);
  palmCurve.scale.set(1.05, 0.55, 1.15);
  palmCurve.position.set(0, -0.02 * s, 0.2 * s);
  palm.add(palmCurve);

  const heel = new THREE.Mesh(new THREE.SphereGeometry(0.22 * s, 14, 12), mats.fleshDark);
  heel.scale.set(1.1, 0.5, 0.95);
  heel.position.set(0, -0.03 * s, -0.12 * s);
  palm.add(heel);

  for (let i = 0; i < 5; i++) {
    const pad = new THREE.Mesh(new THREE.SphereGeometry(0.07 * s, 10, 8), mats.fleshPale);
    pad.scale.set(1.2, 0.4, 1);
    const px = (i - 2) * 0.11 * s;
    pad.position.set(px, -0.05 * s, 0.08 * s + (i % 2) * 0.06 * s);
    palm.add(pad);
  }

  for (let i = 0; i < 4; i++) {
    const crease = new THREE.Mesh(
      new THREE.BoxGeometry(0.38 * s, 0.008 * s, 0.02 * s),
      mats.crease
    );
    crease.position.set(0, -0.04 * s, 0.05 * s + i * 0.1 * s);
    crease.rotation.x = -0.15;
    palm.add(crease);
  }

  return palm;
}

function buildBackOfHand(mats, s) {
  const back = new THREE.Group();
  back.position.set(0, 0.06 * s, 0.1 * s);

  for (let i = 0; i < 4; i++) {
    const meta = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.045 * s, 0.22 * s, 8, 12),
      mats.flesh
    );
    meta.rotation.x = Math.PI / 2;
    meta.rotation.z = (i - 1.5) * 0.08;
    meta.position.set((i - 1.5) * 0.12 * s, 0, 0.08 * s + i * 0.02 * s);
    back.add(meta);
  }

  for (let i = 0; i < 5; i++) {
    const tendon = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.014 * s, 0.35 * s, 6, 8),
      mats.tendon
    );
    tendon.rotation.x = Math.PI / 2;
    tendon.position.set((i - 2) * 0.09 * s, 0.02 * s, -0.05 * s);
    back.add(tendon);
  }

  for (let i = 0; i < 8; i++) {
    const hair = new THREE.Mesh(
      new THREE.CylinderGeometry(0.004 * s, 0.003 * s, 0.025 * s, 4),
      mats.fleshDark
    );
    hair.position.set(
      (Math.random() - 0.5) * 0.35 * s,
      0.04 * s,
      (Math.random() - 0.3) * 0.25 * s
    );
    hair.rotation.x = -0.3 + Math.random() * 0.4;
    hair.rotation.z = (Math.random() - 0.5) * 0.5;
    back.add(hair);
  }

  return back;
}

function buildForearm(mats, s) {
  const arm = new THREE.Group();

  const upper = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.3 * s, 1.05 * s, 14, 18),
    mats.sleeve
  );
  upper.rotation.x = Math.PI / 2;
  upper.position.z = -1.15 * s;
  arm.add(upper);

  const muscle = new THREE.Mesh(new THREE.SphereGeometry(0.22 * s, 14, 12), mats.sleeve);
  muscle.scale.set(0.9, 1.2, 1.1);
  muscle.position.set(0.06 * s, 0.02 * s, -0.75 * s);
  arm.add(muscle);

  const muscle2 = new THREE.Mesh(new THREE.SphereGeometry(0.18 * s, 12, 10), mats.sleeve);
  muscle2.scale.set(0.85, 1.15, 0.95);
  muscle2.position.set(-0.08 * s, 0.01 * s, -0.95 * s);
  arm.add(muscle2);

  for (let v = 0; v < 4; v++) {
    const veinLine = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.014 * s, 0.28 * s + v * 0.08 * s, 6, 8),
      mats.vein
    );
    veinLine.rotation.x = Math.PI / 2;
    veinLine.rotation.z = (v - 1.5) * 0.12;
    veinLine.position.set((v - 1.5) * 0.06 * s, 0.03 * s, -0.5 * s - v * 0.18 * s);
    arm.add(veinLine);
  }

  const wristBone = new THREE.Mesh(
    new THREE.BoxGeometry(0.38 * s, 0.1 * s, 0.14 * s),
    mats.fleshPale
  );
  wristBone.position.set(0, 0, -0.38 * s);
  arm.add(wristBone);

  const wrist = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.24 * s, 0.5 * s, 12, 16),
    mats.fleshDark
  );
  wrist.rotation.x = Math.PI / 2;
  wrist.position.z = -0.38 * s;
  arm.add(wrist);

  return arm;
}

/**
 * Uma mão completa com punho e antebraço
 * cutIndex: índice do dedo cortado (0=indicador) ou -1
 */
export function buildRealisticGiantHand(side = 1, cutIndex = 1, opts = {}) {
  const scale = opts.scale ?? 1.38;
  const fatness = opts.fatness ?? 1;
  const wristOnly = opts.wristOnly ?? false;
  const ci = opts.cutIndex ?? cutIndex;
  const mats = makeMaterials();
  const hand = new THREE.Group();
  const s = scale * fatness;

  if (!wristOnly) {
    hand.add(buildForearm(mats, s));
  } else {
    const stub = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.14 * s, 0.12 * s, 10, 12),
      mats.fleshDark
    );
    stub.rotation.x = Math.PI / 2;
    stub.position.z = -0.08 * s;
    hand.add(stub);
  }

  const palmGroup = buildPalm(mats, s);
  palmGroup.position.set(0, 0, 0.08 * s);
  hand.add(palmGroup);

  const backGroup = buildBackOfHand(mats, s);
  hand.add(backGroup);

  const spreads = [-0.19, -0.06, 0.06, 0.19];
  const lengths = [
    [0.19, 0.14, 0.12],
    [0.24, 0.17, 0.13],
    [0.22, 0.15, 0.12],
    [0.17, 0.12, 0.1],
  ];
  const curls = [0.18, 0.1, 0.12, 0.22];
  const fingerRoots = new THREE.Group();
  fingerRoots.position.set(0, 0, 0.36 * s);
  hand.add(fingerRoots);

  for (let i = 0; i < 4; i++) {
    const isCut = i === ci;
    const finger = buildFinger({
      mats,
      radius: 0.072 * s,
      lengths: lengths[i].map((l) => l * s * 1.05),
      xSpread: spreads[i] * s,
      curl: curls[i],
      cutOff: isCut,
      severed: isCut,
    });
    fingerRoots.add(finger);
  }

  const thumb = buildThumb(mats, 0.072 * s, side);
  hand.add(thumb);

  if (ci >= 0) {
    const pool = new THREE.Mesh(
      new THREE.CircleGeometry(0.16 * s, 12),
      mats.bloodWet
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(spreads[ci] * s, 0.01, 0.42 * s);
    hand.add(pool);

    const smear = new THREE.Mesh(
      new THREE.PlaneGeometry(0.1 * s, 0.32 * s),
      mats.blood
    );
    smear.position.set(spreads[ci] * s + 0.07 * s, 0.06 * s, 0.5 * s);
    smear.rotation.x = -0.45;
    hand.add(smear);

    const smear2 = smear.clone();
    smear2.position.x -= 0.04 * s;
    smear2.rotation.z = 0.2;
    hand.add(smear2);
  }

  hand.rotation.y = side * 0.1;
  hand.userData.isGiantHand = true;
  return { group: hand, mats };
}

/** Mão gorda para o janitor — só punho + palma (sem manga) */
export function buildFatJanitorHand(side = 1, cutIndex = -1) {
  return buildRealisticGiantHand(side, cutIndex, {
    scale: 1.62,
    fatness: 1.48,
    wristOnly: true,
    cutIndex,
  });
}

/** Par de mãos nas paredes — procedural grimy FPS */
export function buildProceduralGiantWallHandsPair() {
  const root = new THREE.Group();
  const left = buildRealisticGiantHand(-1, -1, { scale: 1.72, fatness: 1.18 });
  const right = buildRealisticGiantHand(1, 1, { scale: 1.72, fatness: 1.18 });

  left.group.position.set(-1.85, 2.85, 0);
  left.group.rotation.x = -0.38;
  left.group.rotation.z = 0.06;
  right.group.position.set(1.85, 2.85, 0);
  right.group.rotation.x = -0.38;
  right.group.rotation.z = -0.06;

  const aura = new THREE.PointLight(0x44ff88, 0.55, 7);
  aura.position.set(0, 3.1, 0.4);
  const danger = new THREE.PointLight(0xff2200, 0.35, 5);
  danger.position.set(0, 2.55, 0.2);
  root.add(aura, danger);

  root.add(left.group, right.group);
  return { group: root, parts: { handL: left.group, handR: right.group }, source: "procedural" };
}
