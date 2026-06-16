/** Layout base compartilhado — mapas de tiro usam a mesma planta */

import { buildLabyrinthLayout } from "./labyrinth-layout.js";

export const CEILING_H = 4.2;

/** [x, z, largura, profundidade, altura] */
export const BASE_WALLS = [
  [-25, 0, 2, 40, CEILING_H],
  [25, 0, 2, 40, CEILING_H],
  [0, -22, 50, 2, CEILING_H],
  [0, 22, 50, 2, CEILING_H],
  [-8, 0, 2, 16, CEILING_H * 0.78],
  [8, 0, 2, 16, CEILING_H * 0.78],
  [0, -10, 14, 2, CEILING_H * 0.78],
  [0, 10, 14, 2, CEILING_H * 0.78],
  [-14, -14, 8, 2, CEILING_H * 0.78],
  [14, -14, 2, 8, CEILING_H * 0.78],
  [-14, 14, 8, 2, CEILING_H * 0.78],
  [14, 14, 2, 8, CEILING_H * 0.78],
  [-3.5, 0, 1.2, 6, CEILING_H],
];

export const INNER_ROOM = {
  minX: 0.4,
  maxX: 9,
  minZ: -3.2,
  maxZ: 3.2,
  floorY: 0,
  wallH: CEILING_H,
  doorGap: { side: "west", width: 2.6, centerZ: 0 },
};

export const BASE_COVERS = [
  { x: -12, z: -8, w: 3, d: 1.5, h: 1.2 },
  { x: -12, z: 8, w: 3, d: 1.5, h: 1.2 },
  { x: 12, z: 0, w: 2, d: 4, h: 1.2 },
  { x: 0, z: -16, w: 4, d: 2, h: 1.2 },
];

export const PATROL_POINTS = [
  { x: -20, z: -12 }, { x: -20, z: 12 }, { x: -14, z: 0 },
  { x: -8, z: -16 }, { x: -8, z: 16 }, { x: 0, z: -18 },
  { x: 0, z: 18 }, { x: 14, z: -14 }, { x: 14, z: 14 },
  { x: 20, z: -8 }, { x: 20, z: 8 }, { x: 20, z: 0 },
  { x: 10, z: -18 }, { x: -10, z: 18 }, { x: 16, z: 0 },
];

export const BASE_TABLES = [
  { x: -16, z: 10, rot: 0.2 },
  { x: 12, z: 7, rot: -0.4 },
  { x: -16, z: -18, rot: 0 },
  { x: -12, z: -2, rot: 0.8 },
];

export const BASE_PROPS = [
  { type: "barrel", x: -16, z: -10 },
  { type: "crate", x: 16.5, z: 12 },
  { type: "sandbags", x: 10, z: -12, rot: -0.5 },
  { type: "tires", x: -20, z: 8 },
  { type: "supply", x: 6, z: 14 },
  { type: "barrel", x: 18, z: -6 },
  { type: "cone", x: -8, z: -18 },
  { type: "lamp", x: 17.5, z: -14 },
  { type: "hydrant", x: -18, z: -6 },
  { type: "toolbox", x: 8, z: 16 },
  { type: "pallet", x: -2, z: 7 },
  { type: "dumpster", x: 12, z: -5 },
  { type: "woodpile", x: -12, z: 5 },
  { type: "barrel", x: 0, z: 13.5 },
  { type: "crate", x: -14, z: 0 },
  { type: "sandbags", x: 5, z: 5.5, rot: 0.3 },
  { type: "pallet", x: 16, z: 2.5 },
  { type: "dumpster", x: -5, z: 16.5 },
];

export const DOOR = {
  x: 0,
  z: 0,
  width: 2.2,
  height: 2.35,
  depth: 0.12,
};

const THEMES = {
  dust: {
    mode: "shooting",
    name: "Dust Alley",
    scale: 1,
    sky: 0x87ceeb,
    fog: 0xc9b896,
    floorColor: 0xe8c878,
    wallColor: 0xc49a6c,
    accentColor: 0xb88850,
    ceilColor: 0xf5ecd8,
    woodColor: 0x7a4f2a,
    propTint: { barrel: 0x663322, supply: 0x445533 },
    spawnCT: { x: -18, z: 0 },
    spawnT: { x: 18, z: 0 },
    bombSites: [{ x: 12, z: -8, id: "A" }, { x: 12, z: 8, id: "B" }],
  },
  warehouse: {
    mode: "shooting",
    name: "Cold Storage",
    scale: 0.92,
    sky: 0xaabbcc,
    fog: 0x8899aa,
    floorColor: 0x8899aa,
    wallColor: 0x556677,
    accentColor: 0x667788,
    ceilColor: 0xb0bcc8,
    woodColor: 0x5a4a3a,
    propTint: { barrel: 0x334455, supply: 0x334466 },
    spawnCT: { x: -16.5, z: 0 },
    spawnT: { x: 16.5, z: 0 },
    bombSites: [{ x: 11, z: -7, id: "A" }, { x: 11, z: 7, id: "B" }],
  },
  horror: {
    mode: "horror",
    name: "Por onde você não deveria passar",
    scale: 1,
    sky: 0x120e14,
    fog: 0x080608,
    floorColor: 0x2a2220,
    wallColor: 0x1a1612,
    accentColor: 0x2a1818,
    ceilColor: 0x0e0c0a,
    woodColor: 0x2a1810,
    propTint: { barrel: 0x221111, supply: 0x1a1111 },
    spawnCT: { x: -18, z: 0 },
    spawnT: { x: 18, z: 0 },
    bombSites: [{ x: 12, z: -8, id: "A" }, { x: 12, z: 8, id: "B" }],
    monsterSpawns: [
      { x: -12, z: -6 },
      { x: 8, z: -14 },
      { x: 14, z: 10 },
    ],
  },
  labyrinth: {
    mode: "labyrinth",
    name: "O Labirinto — Fim das Trevas",
    scale: 1,
    sky: 0x0a0808,
    fog: 0x060404,
    floorColor: 0x080606,
    wallColor: 0x060504,
    accentColor: 0x0a0808,
    ceilColor: 0x040302,
    woodColor: 0x120808,
    propTint: { barrel: 0x110808, supply: 0x0a0606 },
  },
  frontier: {
    mode: "open_world",
    name: "Ilha Frontier — 2000m",
    scale: 1,
    sky: 0x7ecbff,
    fog: 0xb8d9ff,
    floorColor: 0x6aa04d,
    wallColor: 0x8a7a58,
    accentColor: 0x7d6a44,
    ceilColor: 0xdff3ff,
    woodColor: 0x7a4f2a,
    propTint: { barrel: 0x4f5b68, supply: 0x556b35 },
    spawnCT: { x: -820, z: -760 },
    spawnT: { x: 780, z: 720 },
    bombSites: [],
    floorW: 2000,
    floorH: 2000,
    bounds: { limX: 980, limZ: 980 },
    skipBossRoom: true,
    skipAmmoChests: false,
    openWorld: true,
    maxBots: 100,
    defaultBotCount: 100,
  },
};

function seededPoint(i, radius = 780) {
  const a = i * 2.399963;
  const r = 90 + ((i * 73) % radius);
  return {
    x: Math.round(Math.cos(a) * r),
    z: Math.round(Math.sin(a) * r),
  };
}

const FRONTIER_COMPOUNDS = [
  { id: "norte", name: "Vila Norte", x: -610, z: -610, accent: 0x9d6b42 },
  { id: "porto", name: "Porto Fantasma", x: 610, z: -560, accent: 0x5f7688 },
  { id: "fazenda", name: "Fazenda Alta", x: -590, z: 600, accent: 0x6f8a3f },
  { id: "ruinas", name: "Ruinas do Titan", x: 600, z: 560, accent: 0x765a8c },
  { id: "cowboy", name: "Cidade Cowboy", x: 40, z: -710, accent: 0xb87834 },
  { id: "mina", name: "Mina Cascavel", x: -740, z: 60, accent: 0x6b5a45 },
  { id: "oasis", name: "Oasis Azul", x: 720, z: 40, accent: 0x3f8fb5 },
];

function pushHouseCollision(covers, x, z, w, d, h, doorW = 4) {
  const t = 0.8;
  const frontSeg = Math.max(2, (w - doorW) / 2);
  covers.push(
    { x, z: z + d / 2, w, d: t, h },
    { x: x - w / 2, z, w: t, d, h },
    { x: x + w / 2, z, w: t, d, h },
    { x: x - (doorW / 2 + frontSeg / 2), z: z - d / 2, w: frontSeg, d: t, h },
    { x: x + (doorW / 2 + frontSeg / 2), z: z - d / 2, w: frontSeg, d: t, h }
  );
}

function buildFrontierProps() {
  const props = [];
  props.push(
    { type: "br_road", x: 0, z: -585, w: 1220, d: 16, rot: 0, tint: 0x5c533e },
    { type: "br_road", x: -620, z: -260, w: 700, d: 13, rot: Math.PI / 2, tint: 0x5c533e },
    { type: "br_road", x: 620, z: -250, w: 700, d: 13, rot: Math.PI / 2, tint: 0x5c533e },
    { type: "br_road", x: 0, z: 540, w: 1160, d: 14, rot: 0.03, tint: 0x5f6548 },
    { type: "br_bridge", x: 358, z: -592, rot: 0.05 },
    { type: "br_bridge", x: -356, z: 548, rot: -0.05 },
    { type: "br_balloon", x: -120, z: -80, tint: 0xff5533 },
    { type: "br_balloon", x: 340, z: 340, tint: 0x3377ff }
  );
  const towns = [
    { x: -520, z: -360, n: 9 },
    { x: 180, z: -520, n: 8 },
    { x: 520, z: 280, n: 10 },
    { x: -160, z: 420, n: 7 },
  ];
  for (const town of towns) {
    for (let i = 0; i < town.n; i++) {
      const col = i % 3;
      const row = Math.floor(i / 3);
      props.push({
        type: i % 4 === 0 ? "house2" : "house",
        x: town.x + (col - 1) * 42 + (i % 2) * 9,
        z: town.z + (row - 1) * 38,
        rot: (i % 5) * 0.22,
      });
    }
  }
  for (let i = 0; i < 70; i++) {
    const p = seededPoint(i, 850);
    props.push({ type: i % 3 === 0 ? "rock" : "tree", x: p.x, z: p.z, scale: 0.8 + (i % 5) * 0.16 });
  }
  for (let i = 0; i < 44; i++) {
    const x = -890 + (i % 11) * 64;
    const z = -120 + Math.floor(i / 11) * 92;
    props.push({ type: "cactus", x, z, scale: 0.85 + (i % 4) * 0.18 });
  }
  for (let i = 0; i < 116; i++) {
    const side = i % 4;
    const t = -980 + (Math.floor(i / 4) % 29) * 70;
    const edge = 935;
    props.push({
      type: "mountain",
      x: side === 0 ? t : side === 1 ? edge : side === 2 ? t : -edge,
      z: side === 0 ? -edge : side === 1 ? t : side === 2 ? edge : t,
      scale: 0.95 + (i % 5) * 0.08,
      rot: side === 0 ? 0 : side === 1 ? Math.PI / 2 : side === 2 ? Math.PI : -Math.PI / 2,
    });
  }
  for (const c of FRONTIER_COMPOUNDS) {
    props.push({ type: "br_pad", x: c.x, z: c.z, scale: 1, tint: c.accent });
    props.push({ type: "br_billboard", x: c.x + 88, z: c.z + 86, rot: -0.45, tint: c.accent });
    props.push({ type: "br_ramp", x: c.x - 18, z: c.z + 92, rot: 0.25, tint: c.accent });
    props.push({ type: "br_house", x: c.x - 46, z: c.z - 28, w: 34, d: 24, floors: 2, tint: c.accent });
    props.push({ type: "br_house", x: c.x + 42, z: c.z + 30, w: 28, d: 22, floors: 1, tint: c.accent });
    props.push({ type: "br_warehouse", x: c.x + 6, z: c.z - 58, w: 44, d: 26, tint: c.accent });
    props.push({ type: "br_tower", x: c.x - 90, z: c.z + 70, tint: c.accent });
    props.push({ type: "br_monster", x: c.x + 96, z: c.z - 88, scale: 1.35, tint: c.accent });
    if (c.id === "cowboy") {
      props.push({ type: "cactus", x: c.x - 118, z: c.z - 20, scale: 1.65 });
      props.push({ type: "cactus", x: c.x + 132, z: c.z - 18, scale: 1.35 });
      props.push({ type: "br_billboard", x: c.x - 4, z: c.z - 114, rot: 0, tint: 0xb87834 });
    }
    if (c.id === "oasis") {
      props.push({ type: "br_road", x: c.x - 70, z: c.z, w: 120, d: 28, rot: 0.38, tint: 0x487f6d });
    }

    for (let i = 0; i < 22; i++) {
      const a = i * 0.72 + (c.x + c.z) * 0.002;
      const r = 92 + (i % 6) * 24;
      props.push({
        type: i % 4 === 0 ? "rock" : "tree",
        x: Math.round(c.x + Math.cos(a) * r),
        z: Math.round(c.z + Math.sin(a) * r),
        scale: i % 4 === 0 ? 1.8 + (i % 3) * 0.35 : 1.25 + (i % 5) * 0.18,
      });
    }
  }
  return props;
}

function buildFrontierMap(theme) {
  const covers = [
    { x: -760, z: -710, w: 18, d: 8, h: 2.2 },
    { x: 710, z: 690, w: 18, d: 8, h: 2.2 },
    { x: -40, z: -30, w: 24, d: 10, h: 2.4 },
  ];
  const brDoors = [];
  const brLoot = [];
  for (const c of FRONTIER_COMPOUNDS) {
    pushHouseCollision(covers, c.x - 46, c.z - 28, 34, 24, 5.2, 4.6);
    pushHouseCollision(covers, c.x + 42, c.z + 30, 28, 22, 3.2, 4.2);
    pushHouseCollision(covers, c.x + 6, c.z - 58, 44, 26, 4.0, 5.2);
    brDoors.push(
      { id: `${c.id}-casa`, x: c.x - 46, z: c.z - 40.15, w: 4.6, h: 3.1, tint: c.accent },
      { id: `${c.id}-cabana`, x: c.x + 42, z: c.z + 18.85, w: 4.2, h: 2.65, tint: c.accent },
      { id: `${c.id}-galpao`, x: c.x + 6, z: c.z - 71.15, w: 5.2, h: 3.35, tint: c.accent }
    );
    const lootIds = ["ak47", "m4", "scar", "ump45", "awm", "doze", "glock", "revolver", "faca", "katana", "facao"];
    const lootPoints = [
      [-52, -12], [-38, -36], [-4, -58], [22, -46], [48, 12],
      [34, 42], [-8, 38], [-70, 54], [72, -18], [6, 72],
    ];
    for (let i = 0; i < lootPoints.length; i++) {
      const [dx, dz] = lootPoints[i];
      const id = lootIds[(i + c.id.length) % lootIds.length];
      brLoot.push({ kind: "weapon", id, x: c.x + dx, z: c.z + dz });
    }
    for (let i = 0; i < 8; i++) {
      const dx = -80 + (i % 4) * 48;
      const dz = -86 + Math.floor(i / 4) * 112;
      brLoot.push({ kind: "ammo", ammo: i % 3 === 0 ? "doze" : "ar", x: c.x + dx, z: c.z + dz });
    }
  }
  brLoot.push(
    { kind: "weapon", id: "revolver", x: -90, z: -74 },
    { kind: "weapon", id: "awm", x: -132, z: -92 },
    { kind: "ammo", ammo: "ar", x: -105, z: -112 },
    { kind: "weapon", id: "scar", x: 320, z: 318 },
    { kind: "weapon", id: "katana", x: 360, z: 364 },
    { kind: "ammo", ammo: "doze", x: 340, z: 384 }
  );
  const patrolPoints = [];
  for (let i = 0; i < 120; i++) patrolPoints.push(seededPoint(i, 900));
  for (const c of FRONTIER_COMPOUNDS) {
    patrolPoints.push({ x: c.x, z: c.z }, { x: c.x + 70, z: c.z - 70 }, { x: c.x - 70, z: c.z + 70 });
  }
  patrolPoints.push(theme.spawnCT, theme.spawnT);
  return {
    ...theme,
    key: "frontier",
    ceilingH: 0,
    walls: [],
    covers,
    tables: [],
    props: buildFrontierProps(),
    brDoors,
    brLoot,
    brCompounds: FRONTIER_COMPOUNDS,
    patrolPoints,
    bossSpawn: { x: 0, z: 0 },
    innerBomb: { x: 0, z: 0 },
    innerRoom: {
      minX: 5000,
      maxX: 5010,
      minZ: 5000,
      maxZ: 5010,
      wallH: 0,
      doorGap: { side: "west", width: 0, centerZ: 0 },
    },
    door: { x: 5000, z: 5000, width: 0, height: 0, depth: 0 },
  };
}

function scaleVal(v, s) {
  return Math.round(v * s * 100) / 100;
}

export function getMap(key) {
  const theme = THEMES[key] || THEMES.dust;

  if (key === "labyrinth") {
    const layout = buildLabyrinthLayout(33, 33, 3.6);
    return { ...theme, ...layout, key: "labyrinth", scale: 1 };
  }

  if (key === "frontier") return buildFrontierMap(theme);

  const s = theme.scale;
  return {
    ...theme,
    key,
    ceilingH: CEILING_H * s,
    walls: BASE_WALLS.map(([x, z, w, d, h]) => [
      scaleVal(x, s), scaleVal(z, s), scaleVal(w, s), scaleVal(d, s), scaleVal(h, s),
    ]),
    covers: BASE_COVERS.map((c) => ({
      x: scaleVal(c.x, s), z: scaleVal(c.z, s),
      w: scaleVal(c.w, s), d: scaleVal(c.d, s), h: scaleVal(c.h, s),
    })),
    tables: BASE_TABLES.map((t) => ({
      x: scaleVal(t.x, s), z: scaleVal(t.z, s), rot: t.rot,
    })),
    props: BASE_PROPS.map((p) => ({
      ...p, x: scaleVal(p.x, s), z: scaleVal(p.z, s),
    })),
    door: {
      ...DOOR,
      x: 0, z: 0,
      width: scaleVal(DOOR.width, s),
      height: scaleVal(DOOR.height, s),
      depth: scaleVal(DOOR.depth, s),
    },
    innerRoom: {
      minX: scaleVal(INNER_ROOM.minX, s),
      maxX: scaleVal(INNER_ROOM.maxX, s),
      minZ: scaleVal(INNER_ROOM.minZ, s),
      maxZ: scaleVal(INNER_ROOM.maxZ, s),
      wallH: CEILING_H * s,
      doorGap: {
        side: "west",
        width: scaleVal(INNER_ROOM.doorGap.width, s),
        centerZ: 0,
      },
    },
    patrolPoints: PATROL_POINTS.map((p) => ({
      x: scaleVal(p.x, s), z: scaleVal(p.z, s),
    })),
    bossSpawn: { x: scaleVal(6, s), z: 0 },
    innerBomb: { x: scaleVal(6.5, s), z: scaleVal(1.5, s) },
  };
}

export const MAPS = {
  dust: getMap("dust"),
  warehouse: getMap("warehouse"),
  horror: getMap("horror"),
  labyrinth: getMap("labyrinth"),
  frontier: getMap("frontier"),
};

export function isHorrorMap(mapData) {
  return mapData?.mode === "horror";
}

export function isLabyrinthMap(mapData) {
  return mapData?.mode === "labyrinth";
}

export function isNoCombatMap(mapData) {
  return !!mapData?.noCombat || isLabyrinthMap(mapData);
}

export function isDarkMap(mapData) {
  return isHorrorMap(mapData) || isLabyrinthMap(mapData);
}

export function getMapMeta(key) {
  const m = MAPS[key] || MAPS.dust;
  const w = m.floorW || 52 * (m.scale || 1);
  const h = m.floorH || 48 * (m.scale || 1);
  return {
    key: m.key || key,
    name: m.name,
    mode: m.mode || "shooting",
    widthM: Math.round(w),
    heightM: Math.round(h),
    areaM2: Math.round(w * h),
  };
}

export const MAP_KEYS = Object.keys(MAPS);
