/** Arena colorida do modo Mecha Camaleão — patches de cor + props pra se camuflar/colar */

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
const TILE = 3.5;
const N = Math.round((HALF * 2) / TILE);

function seededRand(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Monta a arena. Retorna hooks de consulta (colorAt/lightAt) + listas de colisão/colar. */
export function buildChameleonArena(seed = 1) {
  const rand = seededRand(seed * 9973 + 17);
  const group = new THREE.Group();
  const colliders = []; // {minX,maxX,minZ,maxZ}
  const stickables = []; // {x,z,radius,color:THREE.Color}

  // ---- Patches de cor no chão (Voronoi simplificado por sementes) ----
  const seeds = [];
  const seedCount = 12;
  for (let i = 0; i < seedCount; i++) {
    seeds.push({
      x: (rand() * 2 - 1) * HALF * 0.92,
      z: (rand() * 2 - 1) * HALF * 0.92,
      color: CHAMELEON_PALETTE[Math.floor(rand() * CHAMELEON_PALETTE.length)].hex,
    });
  }

  const tileGrid = [];
  const tileGeo = new THREE.BoxGeometry(TILE * 0.98, 0.1, TILE * 0.98);
  for (let ix = 0; ix < N; ix++) {
    tileGrid[ix] = [];
    for (let iz = 0; iz < N; iz++) {
      const x = -HALF + TILE / 2 + ix * TILE;
      const z = -HALF + TILE / 2 + iz * TILE;
      let best = seeds[0];
      let bestD = Infinity;
      for (const s of seeds) {
        const d = (s.x - x) ** 2 + (s.z - z) ** 2;
        if (d < bestD) {
          bestD = d;
          best = s;
        }
      }
      const mat = new THREE.MeshStandardMaterial({ color: best.color, roughness: 0.88, metalness: 0.02 });
      const tile = new THREE.Mesh(tileGeo, mat);
      tile.position.set(x, 0.05, z);
      group.add(tile);
      tileGrid[ix][iz] = { color: new THREE.Color(best.color) };
    }
  }

  function tileIndex(x, z) {
    let ix = Math.floor((x + HALF) / TILE);
    let iz = Math.floor((z + HALF) / TILE);
    ix = Math.max(0, Math.min(N - 1, ix));
    iz = Math.max(0, Math.min(N - 1, iz));
    return { ix, iz };
  }

  function colorAt(x, z) {
    const { ix, iz } = tileIndex(x, z);
    return tileGrid[ix][iz].color;
  }

  // ---- Props espalhados (crates, pilares, arbustos) — colar/camuflagem ----
  const propCount = 26;
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x20201f, roughness: 0.9 });
  for (let i = 0; i < propCount; i++) {
    let x, z;
    let tries = 0;
    do {
      x = (rand() * 2 - 1) * HALF * 0.86;
      z = (rand() * 2 - 1) * HALF * 0.86;
      tries++;
    } while (Math.hypot(x, z) < 4 && tries < 12);

    const { color: tileColor } = colorAtIndexed(x, z);
    const matchTile = rand() < 0.55;
    const hex = matchTile ? tileColor.getHex() : CHAMELEON_PALETTE[Math.floor(rand() * CHAMELEON_PALETTE.length)].hex;
    const propMat = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.8, metalness: 0.05 });

    const kind = Math.floor(rand() * 3);
    let mesh;
    let radius;
    if (kind === 0) {
      const s = 0.9 + rand() * 0.5;
      mesh = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), propMat);
      mesh.position.set(x, s / 2, z);
      radius = s * 0.75;
      const trim = new THREE.Mesh(new THREE.BoxGeometry(s * 1.02, s * 0.08, s * 1.02), darkMat);
      trim.position.set(x, s * 0.05, z);
      group.add(trim);
    } else if (kind === 1) {
      const h = 1.4 + rand() * 1.6;
      const r = 0.32 + rand() * 0.22;
      mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.05, h, 10), propMat);
      mesh.position.set(x, h / 2, z);
      radius = r + 0.45;
    } else {
      const r = 0.55 + rand() * 0.4;
      mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), propMat);
      mesh.position.set(x, r * 0.8, z);
      mesh.scale.set(1, 0.8, 1);
      radius = r + 0.35;
    }
    mesh.rotation.y = rand() * Math.PI;
    group.add(mesh);

    colliders.push({ minX: x - radius * 0.6, maxX: x + radius * 0.6, minZ: z - radius * 0.6, maxZ: z + radius * 0.6 });
    stickables.push({ x, z, radius: radius + 0.55, color: new THREE.Color(hex), mesh });
  }

  function colorAtIndexed(x, z) {
    return { color: colorAt(x, z) };
  }

  // ---- Muro/cerca colorida no limite da arena ----
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
    for (const c of colliders) {
      if (nx + r > c.minX && nx - r < c.maxX && nz + r > c.minZ && nz - r < c.maxZ) {
        const overlapX = Math.min(nx + r - c.minX, c.maxX - (nx - r));
        const overlapZ = Math.min(nz + r - c.minZ, c.maxZ - (nz - r));
        if (overlapX < overlapZ) {
          nx += nx < (c.minX + c.maxX) / 2 ? -overlapX : overlapX;
        } else {
          nz += nz < (c.minZ + c.maxZ) / 2 ? -overlapZ : overlapZ;
        }
      }
    }
    return { x: nx, z: nz };
  }

  return {
    group,
    half: HALF,
    colorAt,
    lightAt,
    findStickable,
    resolveCollision,
    stickables,
    spawnPlayer: { x: 0, z: HALF * 0.6 },
    spawnHunter: { x: 0, z: -HALF * 0.6 },
  };
}
