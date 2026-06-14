/** Bam-Bam — texturas HD de pelúcia */

import * as THREE from "three";
import {
  MONSTER_TEX_SIZE,
  canvasTextureFrom,
  makeBumpFromCanvas,
  configureMonsterTexture,
} from "./monster-texture-hd.js";

function makeFurCanvas() {
  const c = document.createElement("canvas");
  c.width = MONSTER_TEX_SIZE;
  c.height = MONSTER_TEX_SIZE;
  const ctx = c.getContext("2d");

  ctx.fillStyle = "#9a6840";
  ctx.fillRect(0, 0, MONSTER_TEX_SIZE, MONSTER_TEX_SIZE);

  for (let y = 0; y < MONSTER_TEX_SIZE; y++) {
    const t = y / MONSTER_TEX_SIZE;
    ctx.fillStyle = `rgba(${120 + t * 30},${75 + t * 18},${40 + t * 12},0.12)`;
    ctx.fillRect(0, y, MONSTER_TEX_SIZE, 1);
  }

  for (let i = 0; i < 14000; i++) {
    const x = Math.random() * MONSTER_TEX_SIZE;
    const y = Math.random() * MONSTER_TEX_SIZE;
    const len = 3 + Math.random() * 14;
    const a = Math.random() * Math.PI * 2;
    ctx.strokeStyle = `rgba(${70 + Math.random() * 50},${45 + Math.random() * 35},${25 + Math.random() * 25},${0.15 + Math.random() * 0.35})`;
    ctx.lineWidth = 0.6 + Math.random() * 1.8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }

  for (let i = 0; i < 4500; i++) {
    ctx.fillStyle = `rgba(${50 + Math.random() * 40},${32 + Math.random() * 28},${18 + Math.random() * 20},${0.04 + Math.random() * 0.1})`;
    ctx.beginPath();
    ctx.arc(Math.random() * MONSTER_TEX_SIZE, Math.random() * MONSTER_TEX_SIZE, 0.5 + Math.random() * 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = `rgba(30,20,12,${0.08 + Math.random() * 0.15})`;
    ctx.fillRect(Math.random() * MONSTER_TEX_SIZE, Math.random() * MONSTER_TEX_SIZE, 6 + Math.random() * 28, 3 + Math.random() * 10);
  }

  return c;
}

function makeBellyCanvas() {
  const c = document.createElement("canvas");
  c.width = MONSTER_TEX_SIZE;
  c.height = MONSTER_TEX_SIZE;
  const ctx = c.getContext("2d");

  ctx.fillStyle = "#d8c4a0";
  ctx.fillRect(0, 0, MONSTER_TEX_SIZE, MONSTER_TEX_SIZE);

  for (let i = 0; i < 8000; i++) {
    ctx.fillStyle = `rgba(${180 + Math.random() * 40},${150 + Math.random() * 35},${110 + Math.random() * 30},${0.05 + Math.random() * 0.12})`;
    ctx.beginPath();
    ctx.arc(Math.random() * MONSTER_TEX_SIZE, Math.random() * MONSTER_TEX_SIZE, 0.4 + Math.random() * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  return c;
}

export function makePeluciaMaterials() {
  const furCanvas = makeFurCanvas();
  const bellyCanvas = makeBellyCanvas();
  const furMap = canvasTextureFrom(furCanvas);
  const bellyMap = canvasTextureFrom(bellyCanvas);

  const furBump = makeBumpFromCanvas(furCanvas, 1.4);
  const bellyBump = makeBumpFromCanvas(bellyCanvas, 0.8);
  configureMonsterTexture(furBump.map);
  configureMonsterTexture(bellyBump.map);

  const fur = new THREE.MeshStandardMaterial({
    map: furMap,
    color: 0xa87044,
    roughness: 0.94,
    metalness: 0.02,
    bumpMap: furBump.map,
    bumpScale: furBump.scale,
    emissive: 0x1a0a06,
    emissiveIntensity: 0.1,
  });

  const belly = new THREE.MeshStandardMaterial({
    map: bellyMap,
    color: 0xd8c4a0,
    roughness: 0.9,
    bumpMap: bellyBump.map,
    bumpScale: bellyBump.scale,
  });

  const eyeW = new THREE.MeshStandardMaterial({
    color: 0x0a0a0a,
    roughness: 0.35,
    metalness: 0.15,
    emissive: 0x1a0000,
    emissiveIntensity: 0.45,
  });

  const eyeB = new THREE.MeshStandardMaterial({
    color: 0x050505,
    roughness: 0.3,
    emissive: 0xff1a1a,
    emissiveIntensity: 1.1,
  });

  return { fur, belly, eyeW, eyeB };
}
