/** O Gosmento — blob roxo estilo Muk, textura de cola/gosma, ~2.25 m */

import * as THREE from "three";
import {
  MONSTER_TEX_SIZE,
  canvasTextureFrom,
  makeBumpFromCanvas,
  configureMonsterTexture,
} from "./monster-texture-hd.js";

export const GOSMENTO_TARGET_HEIGHT = 2.25;

function makeGooTexture() {
  const c = document.createElement("canvas");
  c.width = MONSTER_TEX_SIZE;
  c.height = MONSTER_TEX_SIZE;
  const ctx = c.getContext("2d");

  ctx.fillStyle = "#7a5a98";
  ctx.fillRect(0, 0, MONSTER_TEX_SIZE, MONSTER_TEX_SIZE);

  for (let i = 0; i < 280; i++) {
    const x = Math.random() * MONSTER_TEX_SIZE;
    const y = Math.random() * MONSTER_TEX_SIZE;
    const r = 10 + Math.random() * 55;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${110 + Math.random() * 40},${70 + Math.random() * 30},${140 + Math.random() * 40},0.38)`);
    g.addColorStop(1, "rgba(40,25,55,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = `rgba(${50 + Math.random() * 35},${30 + Math.random() * 25},${70 + Math.random() * 40},${0.05 + Math.random() * 0.12})`;
    ctx.beginPath();
    ctx.arc(Math.random() * MONSTER_TEX_SIZE, Math.random() * MONSTER_TEX_SIZE, 0.5 + Math.random() * 4, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 220; i++) {
    ctx.fillStyle = `rgba(220,210,240,${0.04 + Math.random() * 0.16})`;
    ctx.beginPath();
    ctx.arc(Math.random() * MONSTER_TEX_SIZE, Math.random() * MONSTER_TEX_SIZE, 1 + Math.random() * 8, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 45; i++) {
    ctx.strokeStyle = `rgba(35,20,50,${0.12 + Math.random() * 0.22})`;
    ctx.lineWidth = 3 + Math.random() * 10;
    ctx.beginPath();
    ctx.moveTo(Math.random() * MONSTER_TEX_SIZE, Math.random() * MONSTER_TEX_SIZE);
    ctx.bezierCurveTo(
      Math.random() * MONSTER_TEX_SIZE, Math.random() * MONSTER_TEX_SIZE,
      Math.random() * MONSTER_TEX_SIZE, Math.random() * MONSTER_TEX_SIZE,
      Math.random() * MONSTER_TEX_SIZE, Math.random() * MONSTER_TEX_SIZE
    );
    ctx.stroke();
  }

  for (let i = 0; i < 80; i++) {
    ctx.fillStyle = `rgba(180,160,220,${0.03 + Math.random() * 0.08})`;
    ctx.fillRect(Math.random() * MONSTER_TEX_SIZE, Math.random() * MONSTER_TEX_SIZE, 4 + Math.random() * 20, 2 + Math.random() * 8);
  }

  return c;
}

function makeGooMaterials() {
  const gooCanvas = makeGooTexture();
  const map = canvasTextureFrom(gooCanvas);
  const bump = makeBumpFromCanvas(gooCanvas, 1.6);
  configureMonsterTexture(bump.map);

  const goo = new THREE.MeshPhysicalMaterial({
    map,
    bumpMap: bump.map,
    bumpScale: bump.scale,
    color: 0x9a78b8,
    roughness: 0.16,
    metalness: 0.1,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    emissive: 0x4a2868,
    emissiveIntensity: 0.38,
  });
  const gooDark = goo.clone();
  gooDark.color = new THREE.Color(0x5a4070);
  gooDark.emissiveIntensity = 0.22;
  const gooWet = goo.clone();
  gooWet.roughness = 0.06;
  gooWet.clearcoatRoughness = 0.04;
  gooWet.transparent = true;
  gooWet.opacity = 0.9;
  const inner = goo.clone();
  inner.transparent = true;
  inner.opacity = 0.75;
  inner.color = new THREE.Color(0x6a5088);
  return { goo, gooDark, gooWet, inner, map };
}

function fitHeight(group, targetH) {
  group.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(group);
  const h = box.max.y - box.min.y;
  if (h > 0.01) {
    group.scale.setScalar(targetH / h);
    group.updateMatrixWorld(true);
    const box2 = new THREE.Box3().setFromObject(group);
    group.position.y = -box2.min.y;
  }
}

export function buildGosmentoMukMesh(targetHeight = GOSMENTO_TARGET_HEIGHT) {
  const group = new THREE.Group();
  const mats = makeGooMaterials();

  const puddle = new THREE.Mesh(new THREE.SphereGeometry(1.05, 28, 24), mats.gooWet);
  puddle.scale.set(1.55, 0.14, 1.45);
  puddle.position.y = 0.06;
  puddle.userData.isPuddle = true;
  puddle.userData.baseScale = new THREE.Vector3(1.55, 0.14, 1.45);
  group.add(puddle);

  const bodyBlobs = [
    { x: 0, y: 0.55, z: 0.1, sx: 1.35, sy: 0.95, sz: 1.2, r: 0.72 },
    { x: -0.35, y: 0.42, z: -0.15, sx: 0.85, sy: 0.8, sz: 0.9, r: 0.48 },
    { x: 0.38, y: 0.38, z: -0.12, sx: 0.8, sy: 0.75, sz: 0.85, r: 0.45 },
    { x: 0, y: 1.05, z: 0.05, sx: 1.05, sy: 0.88, sz: 1, r: 0.58 },
    { x: -0.22, y: 1.35, z: 0.2, sx: 0.7, sy: 0.72, sz: 0.68, r: 0.38 },
    { x: 0.25, y: 1.28, z: 0.18, sx: 0.68, sy: 0.7, sz: 0.65, r: 0.36 },
    { x: 0, y: 1.62, z: -0.05, sx: 0.82, sy: 0.75, sz: 0.78, r: 0.42 },
  ];

  const coreParts = [];
  for (let i = 0; i < bodyBlobs.length; i++) {
    const b = bodyBlobs[i];
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(b.r, 24, 22), i % 2 ? mats.inner : mats.goo);
    mesh.position.set(b.x, b.y, b.z);
    mesh.scale.set(b.sx, b.sy, b.sz);
    mesh.userData.wobble = i * 1.3;
    mesh.userData.baseY = b.y;
    mesh.userData.basePos = new THREE.Vector3(b.x, b.y, b.z);
    coreParts.push(mesh);
    group.add(mesh);
  }

  const anchors = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const rad = 0.55 + (i % 2) * 0.15;
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), mats.gooDark);
    foot.position.set(Math.cos(a) * rad, 0.04, Math.sin(a) * rad);
    foot.userData.isAnchor = true;
    foot.userData.baseY = 0.04;
    group.add(foot);

    const strand = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.35 + i * 0.06, 8, 10), mats.gooWet);
    strand.position.set(Math.cos(a) * rad * 0.85, 0.22, Math.sin(a) * rad * 0.85);
    strand.rotation.x = 0.35;
    strand.rotation.z = Math.cos(a) * 0.2;
    strand.userData.isStrand = true;
    strand.userData.baseLen = 0.35 + i * 0.06;
    strand.userData.angle = a;
    anchors.push(strand);
    group.add(strand);
  }

  const trails = [];
  for (let i = 0; i < 5; i++) {
    const trail = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.28, 6, 8), mats.inner);
    trail.position.set((i - 2) * 0.22, 0.35 + i * 0.08, -0.55 - i * 0.05);
    trail.rotation.x = -0.5;
    trail.userData.isTrail = true;
    trail.userData.trailIdx = i;
    trails.push(trail);
    group.add(trail);
  }

  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const drip = new THREE.Mesh(new THREE.SphereGeometry(0.08 + (i % 3) * 0.04, 8, 8), mats.gooWet);
    const h = 0.15 + (i % 4) * 0.35;
    drip.position.set(Math.cos(a) * (0.75 + i * 0.03), h, Math.sin(a) * (0.75 + i * 0.03));
    drip.userData.wobble = i * 0.6;
    drip.userData.baseY = h;
    group.add(drip);
  }

  const mouthHole = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.08, 12, 24),
    new THREE.MeshStandardMaterial({
      color: 0x1a0a20,
      roughness: 0.95,
      emissive: 0x220818,
      emissiveIntensity: 0.5,
    })
  );
  mouthHole.position.set(0, 1.05, 0.62);
  mouthHole.rotation.x = 0.35;
  group.add(mouthHole);

  const eyeWhite = new THREE.MeshStandardMaterial({ color: 0xf0eef8, roughness: 0.4 });
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12), eyeWhite);
  eyeL.position.set(-0.14, 1.38, 0.58);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.14;
  const pupilMat = new THREE.MeshStandardMaterial({ color: 0x0a0810 });
  const pupilL = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), pupilMat);
  pupilL.position.set(-0.14, 1.38, 0.68);
  const pupilR = pupilL.clone();
  pupilR.position.x = 0.14;
  group.add(eyeL, eyeR, pupilL, pupilR);

  fitHeight(group, targetHeight);

  return {
    group,
    parts: {
      core: coreParts[3] || coreParts[0],
      puddle,
      anchors,
      trails,
      bodyBlobs: coreParts,
    },
  };
}

/** Animação “grudando” — squash, rastros e fios de gosma */
export function animateGosmentoMuk(m, t) {
  const { group, parts, def } = m;
  if (!group || def?.type !== "gosmento") return;

  const vx = m.moveVelX ?? 0;
  const vz = m.moveVelZ ?? 0;
  const moveMag = Math.min(1, Math.hypot(vx, vz) / 2.5);
  const stick = Math.sin(t * 6 + m.animSeed);
  const stick2 = Math.sin(t * 6 + m.animSeed + Math.PI * 0.5);

  if (moveMag > 0.05) {
    const leanX = -vz * 0.22 * moveMag;
    const leanZ = vx * 0.22 * moveMag;
    group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, leanX, 0.12);
    group.rotation.z = THREE.MathUtils.lerp(group.rotation.z, leanZ, 0.12);
    const squash = 0.9 + Math.abs(stick) * 0.06 * moveMag;
    const stretch = 1.04 + moveMag * 0.06;
    group.scale.y = m.baseScale * squash;
    group.scale.x = m.baseScale * stretch;
    group.scale.z = m.baseScale * stretch;
    group.position.y = 0.015 + Math.abs(stick2) * 0.025 * moveMag;
  } else {
    group.rotation.x *= 0.92;
    group.rotation.z *= 0.92;
    const breathe = 1 + Math.sin(t * 2.2 + m.animSeed) * 0.03;
    group.scale.setScalar(m.baseScale * breathe);
    group.position.y = 0;
  }

  if (parts?.puddle?.userData.baseScale) {
    const bs = parts.puddle.userData.baseScale;
    const spread = 1 + moveMag * 0.12 + Math.abs(stick) * 0.04;
    parts.puddle.scale.set(bs.x * spread, bs.y, bs.z * spread);
  }

  for (const strand of parts?.anchors ?? []) {
    if (!strand.userData.isStrand) continue;
    const pull = 0.35 + moveMag * 0.45 + Math.abs(stick) * 0.15;
    strand.scale.y = pull / strand.userData.baseLen;
    strand.position.y = 0.12 + pull * 0.15;
  }

  for (const trail of parts?.trails ?? []) {
    const i = trail.userData.trailIdx ?? 0;
    const lag = moveMag * (0.35 + i * 0.08);
    trail.position.z = -0.55 - i * 0.05 - lag * Math.sin(t * 8 + i);
    trail.scale.y = 0.8 + lag * 1.2 + Math.abs(stick) * 0.2;
    trail.rotation.x = -0.5 - lag * 0.4;
  }

  for (const c of group.children) {
    if (c.userData?.wobble !== undefined && c.userData.baseY !== undefined) {
      const by = c.userData.baseY;
      const wobble = Math.sin(t * 3.5 + c.userData.wobble) * 0.05;
      const drag = moveMag * Math.sin(t * 7 + c.userData.wobble) * 0.08;
      c.position.y = by + wobble - drag * 0.3;
      if (c.userData.basePos) {
        c.position.x = c.userData.basePos.x + vx * drag * 0.15;
        c.position.z = c.userData.basePos.z + vz * drag * 0.15;
      }
    }
    if (c.userData?.isAnchor) {
      c.position.y = c.userData.baseY + Math.abs(stick) * 0.02 * moveMag;
      c.scale.setScalar(1 + moveMag * 0.15);
    }
  }
}

export function initGosmentoMonsterState(m, built) {
  m.baseScale = built.group.scale.x;
  m.moveVelX = 0;
  m.moveVelZ = 0;
}
