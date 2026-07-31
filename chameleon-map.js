/** Arena do modo Esconde-Bicho — chão sólido + zonas de cor + objetos (jarras, patos) pra se camuflar/colar */

import * as THREE from "three";

export const CHAMELEON_PALETTE = [
  { name: "Vermelho", hex: 0xe74c3c },
  { name: "Laranja", hex: 0xf39c12 },
  { name: "Amarelo", hex: 0xf1d430 },
  { name: "Verde", hex: 0x2ecc71 },
  { name: "Azul", hex: 0x3498db },
  { name: "Roxo", hex: 0x9b59b6 },
  { name: "Rosa", hex: 0xff6fa5 },
  { name: "Branco", hex: 0xf2f2f2 },
  { name: "Preto", hex: 0x2b2b2e },
];

const HALF = 21;
const FLOOR_HEX = 0xb9ac93; // areia — chão sólido de uma cor só

function seededRand(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Textura de bolinhas/listras pra dar "desenho" nos objetos */
function makePatternTexture(baseHex, patternHex, kind) {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d");
  ctx.fillStyle = `#${baseHex.toString(16).padStart(6, "0")}`;
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = `#${patternHex.toString(16).padStart(6, "0")}`;
  if (kind === "dots") {
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        ctx.beginPath();
        ctx.arc(16 + x * 32 + (y % 2) * 16, 16 + y * 32, 7, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (kind === "stripes") {
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(0, 8 + i * 32, 128, 12);
    }
  } else {
    // flores simples
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 2; x++) {
        const cx = 32 + x * 64;
        const cy = 32 + y * 64;
        for (let p = 0; p < 5; p++) {
          const a = (p / 5) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(cx + Math.cos(a) * 9, cy + Math.sin(a) * 9, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Jarra/vaso — corpo bojudo + gargalo. Branca ou com desenho. */
function buildJar(rand, colorHex, patternHex) {
  const g = new THREE.Group();
  const withPattern = patternHex != null;
  const mat = withPattern
    ? new THREE.MeshStandardMaterial({ map: makePatternTexture(colorHex, patternHex, rand() < 0.5 ? "stripes" : "dots"), roughness: 0.55 })
    : new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.5, metalness: 0.04 });

  const h = 1.1 + rand() * 0.7;
  const body = new THREE.Mesh(new THREE.SphereGeometry(h * 0.34, 14, 12), mat);
  body.scale.set(1, 1.25, 1);
  body.position.y = h * 0.42;
  g.add(body);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(h * 0.13, h * 0.2, h * 0.34, 12), mat);
  neck.position.y = h * 0.85;
  g.add(neck);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(h * 0.15, h * 0.035, 8, 14), mat);
  lip.rotation.x = Math.PI / 2;
  lip.position.y = h * 1.02;
  g.add(lip);
  return { group: g, radius: h * 0.4, height: h };
}

/** Pato de borracha — corpo + cabeça + bico. Alguns com bolinhas desenhadas. */
function buildDuck(rand, colorHex, patternHex) {
  const g = new THREE.Group();
  const withPattern = patternHex != null;
  const mat = withPattern
    ? new THREE.MeshStandardMaterial({ map: makePatternTexture(colorHex, patternHex, "dots"), roughness: 0.45 })
    : new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.4, metalness: 0.03 });
  const beakMat = new THREE.MeshStandardMaterial({ color: 0xff8c26, roughness: 0.5 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x18120e, roughness: 0.4 });

  const s = 0.85 + rand() * 0.8;
  const body = new THREE.Mesh(new THREE.SphereGeometry(s * 0.5, 16, 12), mat);
  body.scale.set(1.15, 0.9, 1.35);
  body.position.y = s * 0.45;
  g.add(body);
  const tail = new THREE.Mesh(new THREE.SphereGeometry(s * 0.2, 10, 8), mat);
  tail.scale.set(0.8, 0.9, 1);
  tail.position.set(0, s * 0.62, -s * 0.58);
  tail.rotation.x = -0.6;
  g.add(tail);
  const head = new THREE.Mesh(new THREE.SphereGeometry(s * 0.3, 14, 12), mat);
  head.position.set(0, s * 0.95, s * 0.42);
  g.add(head);
  const beak = new THREE.Mesh(new THREE.BoxGeometry(s * 0.24, s * 0.1, s * 0.22), beakMat);
  beak.position.set(0, s * 0.9, s * 0.72);
  g.add(beak);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(s * 0.045, 8, 6), eyeMat);
    eye.position.set(side * s * 0.14, s * 1.02, s * 0.62);
    g.add(eye);
  }
  return { group: g, radius: s * 0.62, height: s };
}

/** Monta a arena. Retorna hooks de consulta (colorAt/lightAt) + listas de colisão/colar. */
export function buildChameleonArena(seed = 1) {
  const rand = seededRand(seed * 9973 + 17);
  const group = new THREE.Group();
  const colliders = []; // {minX,maxX,minZ,maxZ}
  const stickables = []; // {x,z,radius,color:THREE.Color}
  const floorColor = new THREE.Color(FLOOR_HEX);

  // ---- Chão sólido de uma cor só ----
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(HALF * 2, 0.1, HALF * 2),
    new THREE.MeshStandardMaterial({ color: FLOOR_HEX, roughness: 0.92, metalness: 0.02 })
  );
  floor.position.y = 0.0;
  group.add(floor);

  // ---- Zonas de cor: tapetes redondos pintados no chão ----
  const zones = []; // {x,z,radius,color}
  const zoneCount = 8;
  const zoneGeoCache = new Map();
  for (let i = 0; i < zoneCount; i++) {
    const paletteEntry = CHAMELEON_PALETTE[i % CHAMELEON_PALETTE.length];
    const radius = 2.6 + rand() * 1.8;
    let x, z, tries = 0;
    do {
      x = (rand() * 2 - 1) * (HALF - radius - 1);
      z = (rand() * 2 - 1) * (HALF - radius - 1);
      tries++;
    } while (
      tries < 20 &&
      (Math.hypot(x, z) < 4 || zones.some((zn) => Math.hypot(zn.x - x, zn.z - z) < zn.radius + radius + 1.2))
    );
    const key = Math.round(radius * 10);
    if (!zoneGeoCache.has(key)) zoneGeoCache.set(key, new THREE.CircleGeometry(radius, 36));
    const disc = new THREE.Mesh(
      zoneGeoCache.get(key),
      new THREE.MeshStandardMaterial({ color: paletteEntry.hex, roughness: 0.85, metalness: 0.02 })
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(x, 0.06, z);
    group.add(disc);
    zones.push({ x, z, radius, color: new THREE.Color(paletteEntry.hex) });
  }

  function colorAt(x, z) {
    for (const zn of zones) {
      if (Math.hypot(zn.x - x, zn.z - z) <= zn.radius) return zn.color;
    }
    return floorColor;
  }

  // ---- Objetos: jarras brancas, jarras com desenho, patos ----
  const propCount = 22;
  for (let i = 0; i < propCount; i++) {
    let x, z;
    let tries = 0;
    do {
      x = (rand() * 2 - 1) * HALF * 0.86;
      z = (rand() * 2 - 1) * HALF * 0.86;
      tries++;
    } while (Math.hypot(x, z) < 4 && tries < 12);

    const roll = rand();
    let built;
    let dominantHex;
    if (roll < 0.42) {
      // jarra branca (algumas com listras/bolinhas coloridas)
      const withPattern = rand() < 0.45;
      const patternHex = withPattern
        ? CHAMELEON_PALETTE[Math.floor(rand() * 7)].hex
        : null;
      built = buildJar(rand, 0xf2efe6, patternHex);
      dominantHex = 0xf2efe6;
    } else if (roll < 0.72) {
      // pato — branco, amarelo ou colorido; alguns com bolinhas
      const duckBase = rand();
      const baseHex = duckBase < 0.4 ? 0xf2f2f2 : duckBase < 0.75 ? 0xf1d430 : CHAMELEON_PALETTE[Math.floor(rand() * 7)].hex;
      const patternHex = rand() < 0.4 ? CHAMELEON_PALETTE[Math.floor(rand() * 7)].hex : null;
      built = buildDuck(rand, baseHex, patternHex);
      dominantHex = baseHex;
    } else {
      // jarra colorida combinando com a zona mais próxima (ou cor aleatória)
      const zoneColor = colorAt(x, z);
      const useZone = zoneColor !== floorColor && rand() < 0.7;
      dominantHex = useZone ? zoneColor.getHex() : CHAMELEON_PALETTE[Math.floor(rand() * CHAMELEON_PALETTE.length)].hex;
      built = buildJar(rand, dominantHex, null);
    }

    built.group.position.set(x, 0.05, z);
    built.group.rotation.y = rand() * Math.PI * 2;
    group.add(built.group);

    const r = built.radius;
    colliders.push({ minX: x - r * 0.6, maxX: x + r * 0.6, minZ: z - r * 0.6, maxZ: z + r * 0.6 });
    stickables.push({ x, z, radius: r + 0.55, color: new THREE.Color(dominantHex), mesh: built.group });
  }

  // ---- Muro/cerca no limite da arena ----
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x20201f, roughness: 0.9 });
  const fenceMat = new THREE.MeshStandardMaterial({
    color: 0x14141a,
    emissive: 0x2a1a3a,
    emissiveIntensity: 0.4,
    roughness: 0.6,
  });
  const fenceH = 2.4;
  const fenceT = 0.4;
  [
    [0, -HALF - fenceT / 2, HALF * 2 + fenceT * 2, fenceT],
    [0, HALF + fenceT / 2, HALF * 2 + fenceT * 2, fenceT],
  ].forEach(([x, z, w, d]) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, fenceH, d), fenceMat);
    wall.position.set(x, fenceH / 2, z);
    group.add(wall);
    colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  });
  [
    [-HALF - fenceT / 2, 0, fenceT, HALF * 2 + fenceT * 2],
    [HALF + fenceT / 2, 0, fenceT, HALF * 2 + fenceT * 2],
  ].forEach(([x, z, w, d]) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, fenceH, d), fenceMat);
    wall.position.set(x, fenceH / 2, z);
    group.add(wall);
    colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  });

  // ---- Luzes: poças claras + base escura (mecânica de nível de luz) ----
  const lights = [];
  const lightCount = 6;
  for (let i = 0; i < lightCount; i++) {
    const x = (rand() * 2 - 1) * HALF * 0.75;
    const z = (rand() * 2 - 1) * HALF * 0.75;
    const pl = new THREE.PointLight(0xffdca8, 1.6, 9, 2);
    pl.position.set(x, 2.6, z);
    group.add(pl);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.6, 6), darkMat);
    pole.position.set(x, 1.3, z);
    group.add(pole);
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xffe8b0, emissive: 0xffcf80, emissiveIntensity: 1.6 })
    );
    bulb.position.set(x, 2.6, z);
    group.add(bulb);
    lights.push({ x, z, range: 9, intensity: 1.6 });
  }

  function lightAt(x, z) {
    let v = 0.16; // piso ambiente — arena é escura por padrão
    for (const l of lights) {
      const d = Math.hypot(l.x - x, l.z - z);
      if (d < l.range) v += (1 - d / l.range) ** 1.6 * 0.85;
    }
    return Math.max(0, Math.min(1, v));
  }

  function findStickable(x, z, maxDist = 1.15) {
    let best = null;
    let bestD = maxDist;
    for (const s of stickables) {
      const d = Math.hypot(s.x - x, s.z - z) - (s.radius - 0.55);
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    return best;
  }

  function resolveCollision(x, z, r) {
    let nx = x;
    let nz = z;
    nx = Math.max(-HALF + r, Math.min(HALF - r, nx));
    nz = Math.max(-HALF + r, Math.min(HALF - r, nz));
    for (let pass = 0; pass < 4; pass++) {
      for (const c of colliders) {
        if (nx + r > c.minX && nx - r < c.maxX && nz + r > c.minZ && nz - r < c.maxZ) {
          const overlapX = Math.min(nx + r - c.minX, c.maxX - (nx - r));
          const overlapZ = Math.min(nz + r - c.minZ, c.maxZ - (nz - r));
          if (overlapX < overlapZ) {
            nx += nx < (c.minX + c.maxX) / 2 ? -overlapX - 0.01 : overlapX + 0.01;
          } else {
            nz += nz < (c.minZ + c.maxZ) / 2 ? -overlapZ - 0.01 : overlapZ + 0.01;
          }
        }
      }
      nx = Math.max(-HALF + r, Math.min(HALF - r, nx));
      nz = Math.max(-HALF + r, Math.min(HALF - r, nz));
    }
    return { x: nx, z: nz };
  }

  return {
    group,
    half: HALF,
    colliders,
    colorAt,
    lightAt,
    findStickable,
    resolveCollision,
    stickables,
    spawnPlayer: { x: 0, z: HALF * 0.6 },
    spawnHunter: { x: 0, z: -HALF * 0.6 },
  };
}
