/** Texturas estilo Little Nightmares — Roger janitor (sem chapéu/máscara) HD */

import * as THREE from "three";
import {
  MONSTER_TEX_SIZE,
  canvasTextureFrom,
  makeBumpFromCanvas,
  configureMonsterTexture,
} from "./monster-texture-hd.js";

let thumbRef = null;

export function setRogerThumbReference(tex) {
  thumbRef = tex;
}

export function makeJanitorSuitTexture() {
  const c = document.createElement("canvas");
  c.width = MONSTER_TEX_SIZE;
  c.height = MONSTER_TEX_SIZE;
  const ctx = c.getContext("2d");

  ctx.fillStyle = "#4a5868";
  ctx.fillRect(0, 0, MONSTER_TEX_SIZE, MONSTER_TEX_SIZE);

  if (thumbRef?.image) {
    ctx.globalAlpha = 0.28;
    ctx.drawImage(thumbRef.image, 0, 0, MONSTER_TEX_SIZE, MONSTER_TEX_SIZE);
    ctx.globalAlpha = 1;
  }

  for (let y = 0; y < MONSTER_TEX_SIZE; y++) {
    const t = y / MONSTER_TEX_SIZE;
    ctx.fillStyle = `rgba(${55 + t * 20},${65 + t * 22},${78 + t * 25},0.14)`;
    ctx.fillRect(0, y, MONSTER_TEX_SIZE, 1);
  }

  for (let i = 0; i < 6500; i++) {
    ctx.fillStyle = `rgba(${30 + Math.random() * 35},${35 + Math.random() * 40},${45 + Math.random() * 45},${0.04 + Math.random() * 0.1})`;
    ctx.fillRect(Math.random() * MONSTER_TEX_SIZE, Math.random() * MONSTER_TEX_SIZE, 2 + Math.random() * 10, 1 + Math.random() * 6);
  }

  for (let i = 0; i < 55; i++) {
    ctx.strokeStyle = `rgba(25,30,38,${0.1 + Math.random() * 0.15})`;
    ctx.lineWidth = 2 + Math.random() * 5;
    ctx.beginPath();
    ctx.moveTo(0, 20 + i * 18);
    ctx.lineTo(MONSTER_TEX_SIZE, 18 + i * 18 + (Math.random() - 0.5) * 10);
    ctx.stroke();
  }

  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = `rgba(20,18,16,${0.1 + Math.random() * 0.22})`;
    ctx.beginPath();
    ctx.arc(Math.random() * MONSTER_TEX_SIZE, Math.random() * MONSTER_TEX_SIZE, 3 + Math.random() * 18, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 120; i++) {
    ctx.strokeStyle = `rgba(15,18,22,${0.06 + Math.random() * 0.1})`;
    ctx.lineWidth = 1 + Math.random() * 3;
    const x = Math.random() * MONSTER_TEX_SIZE;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + (Math.random() - 0.5) * 40, MONSTER_TEX_SIZE);
    ctx.stroke();
  }

  return c;
}

export function makeOldSkinTexture() {
  const c = document.createElement("canvas");
  c.width = MONSTER_TEX_SIZE;
  c.height = MONSTER_TEX_SIZE;
  const ctx = c.getContext("2d");

  ctx.fillStyle = "#b8a898";
  ctx.fillRect(0, 0, MONSTER_TEX_SIZE, MONSTER_TEX_SIZE);

  for (let i = 0; i < 5500; i++) {
    ctx.fillStyle = `rgba(${90 + Math.random() * 40},${70 + Math.random() * 30},${58 + Math.random() * 25},${0.04 + Math.random() * 0.09})`;
    ctx.beginPath();
    ctx.arc(Math.random() * MONSTER_TEX_SIZE, Math.random() * MONSTER_TEX_SIZE, 0.5 + Math.random() * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 40; i++) {
    ctx.strokeStyle = `rgba(70,50,42,${0.06 + Math.random() * 0.12})`;
    ctx.lineWidth = 0.8 + Math.random() * 2;
    ctx.beginPath();
    const sy = 25 + i * 24;
    ctx.moveTo(0, sy);
    ctx.bezierCurveTo(320, sy - 12, 720, sy + 18, MONSTER_TEX_SIZE, sy - 6);
    ctx.stroke();
  }

  for (let i = 0; i < 35; i++) {
    ctx.fillStyle = `rgba(60,40,32,${0.05 + Math.random() * 0.1})`;
    ctx.fillRect(Math.random() * MONSTER_TEX_SIZE, Math.random() * MONSTER_TEX_SIZE, 8 + Math.random() * 30, 2 + Math.random() * 6);
  }

  return c;
}

export function makeRogerMaterials() {
  const suitCanvas = makeJanitorSuitTexture();
  const skinCanvas = makeOldSkinTexture();
  const suitMap = canvasTextureFrom(suitCanvas);
  const skinMap = canvasTextureFrom(skinCanvas);
  const suitBump = makeBumpFromCanvas(suitCanvas, 1.3);
  const skinBump = makeBumpFromCanvas(skinCanvas, 1.1);
  configureMonsterTexture(suitBump.map);
  configureMonsterTexture(skinBump.map);

  const suit = new THREE.MeshStandardMaterial({
    map: suitMap,
    color: 0x5a6878,
    roughness: 0.86,
    metalness: 0.03,
    bumpMap: suitBump.map,
    bumpScale: suitBump.scale,
  });
  const suitDark = suit.clone();
  suitDark.color = new THREE.Color(0x3a4550);
  const skin = new THREE.MeshStandardMaterial({
    map: skinMap,
    color: 0xc8b8a8,
    roughness: 0.8,
    metalness: 0.02,
    bumpMap: skinBump.map,
    bumpScale: skinBump.scale,
  });
  const skinDark = skin.clone();
  skinDark.color = new THREE.Color(0x9a8878);
  return { suit, suitDark, skin, skinDark, suitMap, skinMap };
}
