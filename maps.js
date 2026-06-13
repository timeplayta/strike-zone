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
};

function scaleVal(v, s) {
  return Math.round(v * s * 100) / 100;
}

export function getMap(key) {
  const theme = THEMES[key] || THEMES.dust;

  if (key === "labyrinth") {
    const layout = buildLabyrinthLayout(33, 33, 3.6);
    return { ...theme, ...layout, key: "labyrinth", scale: 1 };
  }

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
