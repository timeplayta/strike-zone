import * as THREE from "three";
import { MAX_TEXTURE_ANISO } from "./perf-config.js";

/** Bricks094 — ambientCG CC0 https://ambientcg.com/view?id=Bricks094 */
const DUST_BRICKS_BASE = "./assets/textures/dust/bricks094/Bricks094_1K-JPG";
/** WoodFloor062 — chão Dust Alley https://ambientcg.com/view?id=WoodFloor062 */
const DUST_WOOD_BASE = "./assets/textures/dust/woodfloor062/WoodFloor062_1K-JPG";
/** DiamondPlate009 — Fim das Trevas https://ambientcg.com/view?id=DiamondPlate009 */
const LABYRINTH_DIAMOND_BASE = "./assets/textures/labyrinth/diamondplate009/DiamondPlate009_1K-JPG";

let dustBricksCache = null;
let dustBricksLoadPromise = null;
let dustWoodCache = null;
let labyrinthDiamondCache = null;
let extraTexturesPromise = null;

function noise(ctx, w, h, amount = 8) {
  const img = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * amount;
    img.data[i] = Math.min(255, Math.max(0, img.data[i] + n));
    img.data[i + 1] = Math.min(255, Math.max(0, img.data[i + 1] + n));
    img.data[i + 2] = Math.min(255, Math.max(0, img.data[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);
}

function hexToRgb(hex) {
  return { r: (hex >> 16) & 255, g: (hex >> 8) & 255, b: hex & 255 };
}

function configureColorMap(tex, repeatX, repeatY) {
  if (!tex) return tex;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = MAX_TEXTURE_ANISO;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  return tex;
}

function configureDataMap(tex, repeatX, repeatY) {
  if (!tex) return tex;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = MAX_TEXTURE_ANISO;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  return tex;
}

function cloneMap(tex, repeatX, repeatY, isColor = true) {
  const t = tex.clone();
  t.repeat.set(repeatX, repeatY);
  if (isColor) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

async function loadPbrPack(loader, base, withMetalness = false) {
  const metalnessPromise = withMetalness
    ? loader.loadAsync(`${base}_Metalness.jpg`).catch(() => null)
    : Promise.resolve(null);
  const [color, normal, roughness, metalness] = await Promise.all([
    loader.loadAsync(`${base}_Color.jpg`),
    loader.loadAsync(`${base}_NormalGL.jpg`),
    loader.loadAsync(`${base}_Roughness.jpg`),
    metalnessPromise,
  ]);
  configureColorMap(color, 1, 1);
  configureDataMap(normal, 1, 1);
  configureDataMap(roughness, 1, 1);
  if (metalness) configureDataMap(metalness, 1, 1);
  return { color, normal, roughness, metalness };
}

function makePbrMaterial(pack, repeatX, repeatY, opts = {}) {
  const {
    color = 0xffffff,
    metalness = 0.02,
    normalScale = 0.75,
  } = opts;
  const map = cloneMap(pack.color, repeatX, repeatY, true);
  const normalMap = cloneMap(pack.normal, repeatX, repeatY, false);
  const roughnessMap = cloneMap(pack.roughness, repeatX, repeatY, false);
  const mat = new THREE.MeshStandardMaterial({
    map,
    normalMap,
    roughnessMap,
    color,
    roughness: 1,
    metalness: pack.metalness ? 1 : metalness,
    normalScale: new THREE.Vector2(normalScale, normalScale),
  });
  if (pack.metalness) {
    mat.metalnessMap = cloneMap(pack.metalness, repeatX, repeatY, false);
  }
  return mat;
}

export async function preloadDustBricksTextures() {
  await preloadMapSurfaceTextures();
  return dustBricksCache;
}

export async function preloadMapSurfaceTextures() {
  if (dustBricksCache && dustWoodCache && labyrinthDiamondCache) {
    return { dustBricksCache, dustWoodCache, labyrinthDiamondCache };
  }

  if (!dustBricksLoadPromise) {
    const loader = new THREE.TextureLoader();
    dustBricksLoadPromise = loadPbrPack(loader, DUST_BRICKS_BASE, false)
      .then((pack) => {
        dustBricksCache = pack;
        return pack;
      })
      .catch((err) => {
        console.warn("[Strike Zone] Bricks094 não carregou:", err);
        dustBricksLoadPromise = null;
        return null;
      });
  }

  if (!extraTexturesPromise) {
    const loader = new THREE.TextureLoader();
    extraTexturesPromise = Promise.all([
      loadPbrPack(loader, DUST_WOOD_BASE, false).catch((err) => {
        console.warn("[Strike Zone] WoodFloor062 não carregou:", err);
        return null;
      }),
      loadPbrPack(loader, LABYRINTH_DIAMOND_BASE, true).catch((err) => {
        console.warn("[Strike Zone] DiamondPlate009 não carregou:", err);
        return null;
      }),
    ]).then(([wood, diamond]) => {
      if (wood) dustWoodCache = wood;
      if (diamond) labyrinthDiamondCache = diamond;
      return { wood, diamond };
    });
  }

  await Promise.all([dustBricksLoadPromise, extraTexturesPromise]);
  return { dustBricksCache, dustWoodCache, labyrinthDiamondCache };
}

function dustBricksMaterials() {
  if (!dustBricksCache) return null;

  const { color, normal, roughness } = dustBricksCache;

  const wallMap = cloneMap(color, 4, 2.8, true);
  const wallNormal = cloneMap(normal, 4, 2.8, false);
  const wallRough = cloneMap(roughness, 4, 2.8, false);

  const accentMap = cloneMap(color, 3, 2.2, true);
  const accentNormal = cloneMap(normal, 3, 2.2, false);
  const accentRough = cloneMap(roughness, 3, 2.2, false);

  const floorMat = dustWoodCache
    ? makePbrMaterial(dustWoodCache, 14, 12, {
        color: 0xe8dcc8,
        metalness: 0.02,
        normalScale: 0.5,
      })
    : new THREE.MeshStandardMaterial({
        map: cloneMap(color, 16, 14, true),
        normalMap: cloneMap(normal, 16, 14, false),
        roughnessMap: cloneMap(roughness, 16, 14, false),
        color: 0xd8c8a8,
        roughness: 1,
        metalness: 0.02,
        normalScale: new THREE.Vector2(0.65, 0.65),
      });

  const wallMat = new THREE.MeshStandardMaterial({
    map: wallMap,
    normalMap: wallNormal,
    roughnessMap: wallRough,
    color: 0xffffff,
    roughness: 1,
    metalness: 0.03,
    normalScale: new THREE.Vector2(0.85, 0.85),
  });

  const accentMat = new THREE.MeshStandardMaterial({
    map: accentMap,
    normalMap: accentNormal,
    roughnessMap: accentRough,
    color: 0xc8a878,
    roughness: 1,
    metalness: 0.04,
    normalScale: new THREE.Vector2(0.75, 0.75),
  });

  return {
    floorMat,
    wallMat,
    accentMat,
    floorMap: floorMat.map,
    wallMap,
  };
}

function labyrinthDiamondMaterials() {
  if (!labyrinthDiamondCache) return null;

  const floorMat = makePbrMaterial(labyrinthDiamondCache, 26, 22, {
    color: 0x4a4a50,
    metalness: 0.82,
    normalScale: 0.7,
  });

  const wallMat = makePbrMaterial(labyrinthDiamondCache, 4.2, 3.4, {
    color: 0xb0b0b8,
    metalness: 0.94,
    normalScale: 1.15,
  });

  const accentMat = makePbrMaterial(labyrinthDiamondCache, 3.2, 2.6, {
    color: 0x9a9aa2,
    metalness: 0.9,
    normalScale: 1.05,
  });

  return {
    floorMat,
    wallMat,
    accentMat,
    floorMap: floorMat.map,
    wallMap: wallMat.map,
  };
}

/** Piso desértico (dust) / concreto (warehouse) / terra rachada (terror) */
function floorTexture(mapKey, baseColor) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d");
  const { r, g, b } = hexToRgb(baseColor);

  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, 256, 256);

  if (mapKey === "horror" || mapKey === "labyrinth") {
    for (let i = 0; i < 40; i++) {
      ctx.strokeStyle = `rgba(0,0,0,${0.15 + Math.random() * 0.2})`;
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.beginPath();
      let x = Math.random() * 256;
      let y = Math.random() * 256;
      ctx.moveTo(x, y);
      for (let s = 0; s < 4; s++) {
        x += (Math.random() - 0.5) * 60;
        y += (Math.random() - 0.5) * 60;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    for (let i = 0; i < 18; i++) {
      ctx.fillStyle = `rgba(60,10,10,${0.08 + Math.random() * 0.12})`;
      ctx.beginPath();
      ctx.ellipse(Math.random() * 256, Math.random() * 256, 8 + Math.random() * 20, 4 + Math.random() * 10, Math.random(), 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (mapKey === "dust") {
    const tile = 48;
    for (let y = 0; y < 256; y += tile) {
      for (let x = 0; x < 256; x += tile) {
        const shade = ((x + y) / tile) % 2 === 0 ? 6 : -4;
        ctx.fillStyle = `rgb(${Math.min(255, r + shade)},${Math.min(255, g + shade)},${Math.min(255, b + shade)})`;
        ctx.fillRect(x + 1, y + 1, tile - 2, tile - 2);
      }
    }
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = `rgba(180,140,80,${0.04 + Math.random() * 0.06})`;
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 6 + Math.random() * 14, 3 + Math.random() * 6);
    }
  } else {
    const tile = 36;
    for (let y = 0; y < 256; y += tile) {
      for (let x = 0; x < 256; x += tile) {
        const shade = ((x + y) / tile) % 2 === 0 ? 8 : -6;
        ctx.fillStyle = `rgb(${Math.min(255, r + shade)},${Math.min(255, g + shade)},${Math.min(255, b + shade)})`;
        ctx.fillRect(x + 2, y + 2, tile - 4, tile - 4);
        ctx.strokeStyle = "rgba(15,20,28,0.45)";
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 0.5, y + 0.5, tile - 1, tile - 1);
      }
    }
  }

  noise(ctx, 256, 256, mapKey === "horror" ? 10 : 5);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(mapKey === "horror" ? 8 : 10, mapKey === "horror" ? 7 : 8);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Paredes — adobe (deserto) / metal (armazém) / concreto manchado (terror) */
function wallTexture(mapKey, baseColor) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d");
  const { r, g, b } = hexToRgb(baseColor);

  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, 256, 256);

  if (mapKey === "horror" || mapKey === "labyrinth") {
    for (let y = 0; y < 256; y += 28) {
      const shade = y % 56 === 0 ? 6 : -8;
      ctx.fillStyle = `rgb(${Math.max(0, r + shade)},${Math.max(0, g + shade)},${Math.max(0, b + shade)})`;
      ctx.fillRect(0, y, 256, 26);
    }
    for (let i = 0; i < 35; i++) {
      ctx.fillStyle = `rgba(80,8,8,${0.06 + Math.random() * 0.14})`;
      ctx.beginPath();
      ctx.ellipse(Math.random() * 256, Math.random() * 256, 4 + Math.random() * 18, 6 + Math.random() * 22, Math.random(), 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 20; i++) {
      ctx.fillStyle = `rgba(0,0,0,${0.05 + Math.random() * 0.1})`;
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 10 + Math.random() * 30, 4 + Math.random() * 12);
    }
  } else if (mapKey === "dust") {
    const bw = 64;
    const bh = 28;
    for (let row = 0; row < 10; row++) {
      const off = (row % 2) * (bw / 2);
      for (let col = -1; col < 5; col++) {
        const x = col * bw + off;
        const y = row * bh;
        const shade = (row + col) % 2 === 0 ? 12 : -8;
        ctx.fillStyle = `rgb(${Math.min(255, r + shade)},${Math.min(255, g + shade - 4)},${Math.min(255, b + shade - 8)})`;
        ctx.fillRect(x + 2, y + 2, bw - 4, bh - 4);
        ctx.strokeStyle = "rgba(90,60,30,0.5)";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, bw, bh);
      }
    }
  } else {
    for (let y = 0; y < 256; y += 24) {
      const shade = y % 48 === 0 ? 12 : -10;
      ctx.fillStyle = `rgb(${Math.min(255, r + shade)},${Math.min(255, g + shade)},${Math.min(255, b + shade)})`;
      ctx.fillRect(0, y, 256, 22);
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fillRect(0, y + 2, 256, 2);
      ctx.fillStyle = "rgba(0,0,0,0.1)";
      ctx.fillRect(0, y + 20, 256, 2);
    }
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    for (let x = 0; x < 256; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 256);
      ctx.stroke();
    }
  }

  noise(ctx, 256, 256, mapKey === "horror" ? 12 : 7);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function accentTexture(baseColor, mapKey) {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext("2d");
  const { r, g, b } = hexToRgb(baseColor);
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, 64, 64);
  ctx.strokeStyle = mapKey === "horror" ? "rgba(80,20,20,0.35)" : "rgba(0,0,0,0.3)";
  for (let i = 0; i < 64; i += 8) {
    ctx.strokeRect(i, 0, 8, 64);
    ctx.strokeRect(0, i, 64, 8);
  }
  noise(ctx, 64, 64, 4);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1.5, 1.5);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function proceduralMapMaterials(mapData, mapKey) {
  const floorMap = floorTexture(mapKey, mapData.floorColor);
  const wallMap = wallTexture(mapKey, mapData.wallColor);
  const accentMap = accentTexture(mapData.accentColor, mapKey);

  const floorMat = new THREE.MeshStandardMaterial({
    map: floorMap,
    roughness: mapKey === "horror" ? 0.95 : 0.85,
    metalness: 0.02,
  });

  const wallMat = new THREE.MeshStandardMaterial({
    map: wallMap,
    roughness: mapKey === "horror" ? 0.92 : 0.8,
    metalness: mapKey === "warehouse" ? 0.12 : 0.03,
  });

  const accentMat = new THREE.MeshStandardMaterial({
    map: accentMap,
    roughness: 0.85,
    metalness: 0.05,
  });

  return { floorMat, wallMat, accentMat, floorMap, wallMap };
}

export function createMapMaterials(mapData, mapKey) {
  if (mapKey === "labyrinth") {
    const diamond = labyrinthDiamondCache ? labyrinthDiamondMaterials() : null;
    if (diamond) return diamond;
  }
  if (mapKey === "dust" && dustBricksCache) {
    const bricks = dustBricksMaterials();
    if (bricks) return bricks;
  }
  return proceduralMapMaterials(mapData, mapKey);
}

export function addWallBaseboard(scene, x, z, w, d, h, mapKey) {
  const color = mapKey === "horror" ? 0x0a0808 : mapKey === "labyrinth" ? 0x060504 : mapKey === "dust" ? 0x5a4530 : 0x3a4248;
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
  const board = new THREE.Mesh(new THREE.BoxGeometry(w + 0.06, 0.14, d + 0.06), mat);
  board.position.set(x, 0.07, z);
  scene.add(board);
}
