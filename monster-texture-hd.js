/** Texturas HD para monstros do Fim das Trevas */

import * as THREE from "three";
import { MAX_TEXTURE_ANISO } from "./perf-config.js";

export const MONSTER_TEX_SIZE = 1024;

export function configureMonsterTexture(tex) {
  if (!tex) return tex;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = MAX_TEXTURE_ANISO;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  return tex;
}

export function canvasTextureFrom(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  return configureMonsterTexture(t);
}

/** Bump procedural a partir do canvas de cor (grayscale) */
export function makeBumpFromCanvas(colorCanvas, strength = 1) {
  const c = document.createElement("canvas");
  c.width = colorCanvas.width;
  c.height = colorCanvas.height;
  const ctx = c.getContext("2d");
  ctx.drawImage(colorCanvas, 0, 0);
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const g = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
    d[i] = d[i + 1] = d[i + 2] = g;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = MAX_TEXTURE_ANISO;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  return { map: t, scale: 0.008 * strength };
}

export function applyHdMaterial(mat, colorMap, bumpStrength = 1) {
  if (!mat || !colorMap) return;
  configureMonsterTexture(colorMap);
  mat.map = colorMap;
  const bump = makeBumpFromCanvas(colorMap.image || colorCanvasFromTexture(colorMap), bumpStrength);
  mat.bumpMap = bump.map;
  mat.bumpScale = bump.scale;
}

function colorCanvasFromTexture(tex) {
  if (tex.image?.width) return tex.image;
  const c = document.createElement("canvas");
  c.width = MONSTER_TEX_SIZE;
  c.height = MONSTER_TEX_SIZE;
  return c;
}
