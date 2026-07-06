/**
 * Ilha Frontier — Battle Royale 2000m
 * Mapa refeito: biomas (deserto, savana, selva, costa), 10 POIs únicos, estradas e loot.
 */

export const FRONTIER_THEME = {
  mode: "open_world",
  name: "Ilha Frontier — 2000m",
  scale: 1,
  sky: 0x6ec8ff,
  fog: 0xa8d4f0,
  floorColor: 0x5f9a48,
  wallColor: 0x8a7a58,
  accentColor: 0x7d6a44,
  ceilColor: 0xe8f4ff,
  woodColor: 0x7a4f2a,
  propTint: { barrel: 0x4f5b68, supply: 0x556b35 },
  spawnCT: { x: 80, z: -16 },
  spawnT: { x: 120, z: -40 },
  bombSites: [],
  floorW: 2000,
  floorH: 2000,
  bounds: { limX: 980, limZ: 980 },
  skipBossRoom: true,
  skipAmmoChests: false,
  openWorld: true,
  safeZoneCenter: { x: 80, z: -40 },
  maxBots: 100,
  defaultBotCount: 100,
};

/** Pontos de interesse — cada um com identidade visual e loot dedicado */
export const FRONTIER_COMPOUNDS = [
  { id: "mercado", name: "Mercado Central", x: 80, z: -40, accent: 0xd4a832, biome: "savanna", tier: "hub" },
  { id: "saloon", name: "Saloon Ridge", x: -620, z: -480, accent: 0xb87834, biome: "desert", tier: "high" },
  { id: "pirate", name: "Baia dos Corsarios", x: 760, z: -580, accent: 0x4a6878, biome: "coast", tier: "high" },
  { id: "ranch", name: "Rancho Esmeralda", x: -180, z: 380, accent: 0x6f9a3f, biome: "savanna", tier: "mid" },
  { id: "crash", name: "Queda Alpha", x: 520, z: 420, accent: 0x6a5844, biome: "jungle", tier: "high" },
  { id: "oasis", name: "Oasis Palmares", x: -480, z: 620, accent: 0x3f8fb5, biome: "jungle", tier: "mid" },
  { id: "mina", name: "Mina Cascavel", x: -680, z: 80, accent: 0x6b5a45, biome: "rock", tier: "mid" },
  { id: "signal", name: "Morro do Sinal", x: 620, z: 620, accent: 0x5577aa, biome: "rock", tier: "high" },
  { id: "fort", name: "Forte Redstone", x: 0, z: -820, accent: 0x9a4545, biome: "desert", tier: "high" },
  { id: "hangar", name: "Hangar Delta", x: -320, z: -720, accent: 0x445a78, biome: "desert", tier: "mid" },
];

/** Rota do avião de queda — diagonal sobre a ilha */
export const FRONTIER_DROP_ROUTE = {
  start: { x: -880, z: -720 },
  end: { x: 880, z: 760 },
  altitude: 92,
};

const BIOME_COLORS = {
  desert: 0xc9ad72,
  savanna: 0x5f9a48,
  jungle: 0x3a7a38,
  coast: 0xc4b078,
  rock: 0x8a7968,
  water: 0x4a8a68,
};

function seededPoint(i, radius = 780, ox = 0, oz = 0) {
  const a = i * 2.399963;
  const r = 90 + ((i * 73) % radius);
  return {
    x: Math.round(ox + Math.cos(a) * r),
    z: Math.round(oz + Math.sin(a) * r),
  };
}

/** Bioma dominante num ponto — usado para cor do terreno e props */
export function getFrontierBiome(x, z) {
  const dist = Math.hypot(x / 1000, z / 1000);
  if (dist > 0.86) return "coast";
  if (z < -420 && Math.abs(x) < 720) return "desert";
  if (x > 280 && z > -320) return "jungle";
  if (x < -320 && z > 180) return "jungle";
  if (getOpenWorldGroundY(x, z) > 9) return "rock";
  return "savanna";
}

export function getFrontierTerrainColor(biome) {
  return BIOME_COLORS[biome] || BIOME_COLORS.savanna;
}

/** Altura do terreno — ilha com crista central, mesa desértica e bordas íngremes */
export function getOpenWorldGroundY(x, z, mapData = {}) {
  const size = mapData.floorW || 2000;
  const half = size * 0.5;
  const nx = x / half;
  const nz = z / half;
  const dist = Math.hypot(nx, nz);

  const edgeDrop = Math.max(0, dist - 0.7) ** 2 * 32;

  const ridge = Math.exp(-((x + 60) ** 2 + (z - 160) ** 2) / 200000) * 22;
  const mesaNorth = Math.exp(-((x * 0.6) ** 2 + (z + 620) ** 2) / 280000) * 14;
  const mesaWest = Math.exp(-((x + 580) ** 2 + (z + 120) ** 2) / 160000) * 10;

  const hills =
    Math.sin(x * 0.0045) * Math.cos(z * 0.0038) * 3.6 +
    Math.sin(x * 0.009 + z * 0.007) * 1.6 +
    Math.cos(x * 0.0022 - z * 0.0018) * 2.1;

  const creek = Math.sin(x * 0.014 + z * 0.011) * 0.9;

  return ridge + mesaNorth + mesaWest + hills + creek - edgeDrop;
}

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

function addRoad(props, x, z, w, d, rot = 0, tint = 0x5a5340) {
  props.push({ type: "br_road", x, z, w, d, rot, tint });
}

function scatterBiome(props, biome, cx, cz, count, radius) {
  for (let i = 0; i < count; i++) {
    const a = i * 1.37 + cx * 0.01;
    const r = 40 + (i % 7) * (radius / 7);
    const x = Math.round(cx + Math.cos(a) * r);
    const z = Math.round(cz + Math.sin(a) * r);
    if (biome === "desert") {
      props.push({ type: i % 3 === 0 ? "rock" : "cactus", x, z, scale: 0.9 + (i % 4) * 0.2 });
    } else if (biome === "jungle") {
      props.push({ type: "tree", x, z, scale: 1.4 + (i % 5) * 0.25 });
      if (i % 5 === 0) props.push({ type: "rock", x: x + 8, z: z - 6, scale: 1.1 });
    } else if (biome === "coast") {
      props.push({ type: i % 2 === 0 ? "rock" : "tree", x, z, scale: 1.0 + (i % 3) * 0.15 });
    } else if (biome === "rock") {
      props.push({ type: "rock", x, z, scale: 1.6 + (i % 4) * 0.35 });
    } else {
      props.push({ type: i % 4 === 0 ? "rock" : "tree", x, z, scale: 1.1 + (i % 4) * 0.18 });
    }
  }
}

function buildCompoundLayout(props, c) {
  const t = c.accent;
  props.push({ type: "br_pad", x: c.x, z: c.z, tint: t });
  props.push({ type: "br_billboard", x: c.x + 82, z: c.z + 78, rot: -0.42, tint: t });
  props.push({ type: "br_ramp", x: c.x - 22, z: c.z + 88, rot: 0.22, tint: t });

  if (c.id === "mercado") {
    props.push({ type: "br_market", x: c.x, z: c.z, w: 58, d: 36, tint: t });
    props.push({ type: "br_market", x: c.x - 72, z: c.z + 28, w: 42, d: 28, tint: 0xc49a28 });
    props.push({ type: "br_house", x: c.x + 68, z: c.z - 32, w: 30, d: 22, floors: 1, tint: t });
    props.push({ type: "br_balloon", x: c.x - 40, z: c.z - 58, tint: 0xff5533 });
    props.push({ type: "br_balloon", x: c.x + 52, z: c.z + 48, tint: 0x3377ff });
    scatterBiome(props, "savanna", c.x, c.z, 14, 110);
    return;
  }

  if (c.id === "saloon") {
    props.push({ type: "br_house", x: c.x, z: c.z, w: 38, d: 26, floors: 2, tint: t });
    props.push({ type: "br_market", x: c.x + 58, z: c.z - 18, w: 36, d: 24, tint: 0x8a5020 });
    props.push({ type: "cactus", x: c.x - 95, z: c.z - 12, scale: 1.8 });
    props.push({ type: "cactus", x: c.x + 102, z: c.z + 8, scale: 1.5 });
    props.push({ type: "br_tower", x: c.x - 68, z: c.z + 62, tint: t });
    scatterBiome(props, "desert", c.x, c.z, 20, 130);
    return;
  }

  if (c.id === "pirate") {
    props.push({ type: "br_warehouse", x: c.x, z: c.z, w: 52, d: 30, tint: t });
    props.push({ type: "br_house", x: c.x - 58, z: c.z + 36, w: 32, d: 22, floors: 1, tint: 0x3a5060 });
    props.push({ type: "br_bridge", x: c.x - 120, z: c.z - 40, rot: 0.15 });
    props.push({ type: "crate", x: c.x + 42, z: c.z - 28 });
    props.push({ type: "crate", x: c.x + 48, z: c.z - 22 });
    scatterBiome(props, "coast", c.x, c.z, 16, 120);
    return;
  }

  if (c.id === "ranch") {
    props.push({ type: "br_warehouse", x: c.x + 12, z: c.z - 48, w: 48, d: 28, tint: t });
    props.push({ type: "br_house", x: c.x - 52, z: c.z + 22, w: 34, d: 24, floors: 1, tint: 0x8a6a32 });
    props.push({ type: "br_tower", x: c.x + 78, z: c.z + 58, tint: 0xc8b060 });
    props.push({ type: "br_balloon", x: c.x - 30, z: c.z - 70, tint: 0xff8844 });
    scatterBiome(props, "savanna", c.x, c.z, 22, 140);
    return;
  }

  if (c.id === "crash") {
    props.push({ type: "br_warehouse", x: c.x, z: c.z, w: 40, d: 22, tint: t });
    props.push({ type: "br_monster", x: c.x + 88, z: c.z - 72, scale: 1.15, tint: t });
    props.push({ type: "supply", x: c.x - 38, z: c.z + 28 });
    props.push({ type: "supply", x: c.x - 32, z: c.z + 34 });
    scatterBiome(props, "jungle", c.x, c.z, 24, 150);
    return;
  }

  if (c.id === "oasis") {
    props.push({ type: "br_river", x: c.x, z: c.z, w: 140, d: 48, rot: 0.12 });
    props.push({ type: "br_market", x: c.x + 48, z: c.z - 38, w: 44, d: 28, tint: t });
    props.push({ type: "br_house", x: c.x - 44, z: c.z + 32, w: 28, d: 20, floors: 1, tint: 0x4a9088 });
    props.push({ type: "br_tower", x: c.x + 8, z: c.z + 72, tint: 0x6a9aaa });
    scatterBiome(props, "jungle", c.x, c.z, 26, 130);
    return;
  }

  if (c.id === "mina") {
    props.push({ type: "br_warehouse", x: c.x, z: c.z, w: 46, d: 28, tint: t });
    props.push({ type: "br_house", x: c.x + 54, z: c.z + 38, w: 26, d: 20, floors: 1, tint: 0x5a4a38 });
    props.push({ type: "br_ramp", x: c.x - 48, z: c.z - 42, rot: -0.3, tint: t });
    props.push({ type: "rock", x: c.x - 78, z: c.z + 12, scale: 2.4 });
    scatterBiome(props, "rock", c.x, c.z, 18, 110);
    return;
  }

  if (c.id === "signal") {
    props.push({ type: "br_tower", x: c.x, z: c.z, tint: t });
    props.push({ type: "br_house", x: c.x - 58, z: c.z - 42, w: 30, d: 22, floors: 2, tint: t });
    props.push({ type: "br_monster", x: c.x + 72, z: c.z + 48, scale: 1.25, tint: t });
    props.push({ type: "br_billboard", x: c.x + 12, z: c.z - 88, rot: 0, tint: t });
    scatterBiome(props, "rock", c.x, c.z, 16, 100);
    return;
  }

  if (c.id === "fort") {
    props.push({ type: "br_house", x: c.x - 42, z: c.z, w: 36, d: 26, floors: 2, tint: t });
    props.push({ type: "br_house", x: c.x + 44, z: c.z, w: 36, d: 26, floors: 2, tint: 0x7a3838 });
    props.push({ type: "br_tower", x: c.x, z: c.z + 58, tint: 0x6a3030 });
    props.push({ type: "br_ramp", x: c.x, z: c.z - 62, rot: Math.PI, tint: t });
    props.push({ type: "cactus", x: c.x - 110, z: c.z - 28, scale: 1.4 });
    scatterBiome(props, "desert", c.x, c.z, 20, 120);
    return;
  }

  if (c.id === "hangar") {
    props.push({ type: "br_warehouse", x: c.x, z: c.z, w: 62, d: 34, tint: t });
    props.push({ type: "br_warehouse", x: c.x + 78, z: c.z + 18, w: 38, d: 24, tint: 0x3a5068 });
    props.push({ type: "br_bridge", x: c.x - 90, z: c.z + 8, rot: Math.PI / 2 });
    props.push({ type: "br_balloon", x: c.x + 20, z: c.z - 72, tint: 0xffaa22 });
    scatterBiome(props, "desert", c.x, c.z, 14, 100);
    return;
  }

  props.push({ type: "br_house", x: c.x - 46, z: c.z - 28, w: 34, d: 24, floors: 2, tint: t });
  props.push({ type: "br_warehouse", x: c.x + 6, z: c.z - 58, w: 44, d: 26, tint: t });
  scatterBiome(props, c.biome || "savanna", c.x, c.z, 18, 120);
}

export function buildFrontierProps() {
  const props = [];

  addRoad(props, 80, -40, 1300, 14, 0.04, 0x5c5642);
  addRoad(props, 80, -40, 14, 1180, 0.02, 0x5c5642);
  addRoad(props, -620, -480, 680, 12, 0.18, 0x6a5e48);
  addRoad(props, 760, -580, 620, 12, -0.12, 0x5a6458);
  addRoad(props, -180, 380, 720, 12, -0.08, 0x5f6a48);
  addRoad(props, 520, 420, 580, 12, 0.22, 0x4a6a42);

  props.push(
    { type: "br_river", x: -420, z: 120, w: 1180, d: 38, rot: 0.55 },
    { type: "br_river", x: 280, z: -180, w: 520, d: 32, rot: 0.38 },
    { type: "br_bridge", x: -60, z: 88, rot: 0.55 },
    { type: "br_bridge", x: 180, z: -42, rot: 0.38 },
    { type: "br_bridge", x: -480, z: -280, rot: 0.18 }
  );

  for (const c of FRONTIER_COMPOUNDS) {
    buildCompoundLayout(props, c);
  }

  for (let i = 0; i < 85; i++) {
    const p = seededPoint(i, 820);
    const biome = getFrontierBiome(p.x, p.z);
    if (biome === "desert") {
      props.push({ type: i % 2 === 0 ? "cactus" : "rock", x: p.x, z: p.z, scale: 0.85 + (i % 5) * 0.2 });
    } else if (biome === "jungle") {
      props.push({ type: "tree", x: p.x, z: p.z, scale: 1.35 + (i % 4) * 0.22 });
    } else if (biome === "coast") {
      props.push({ type: "rock", x: p.x, z: p.z, scale: 1.1 + (i % 3) * 0.15 });
    } else {
      props.push({ type: i % 3 === 0 ? "rock" : "tree", x: p.x, z: p.z, scale: 1.0 + (i % 5) * 0.16 });
    }
  }

  const mountainRing = [
    { x: -920, z: -820, scale: 2.5, rot: 0.2 },
    { x: 920, z: -780, scale: 2.65, rot: -0.15 },
    { x: -880, z: 820, scale: 2.55, rot: Math.PI * 0.45 },
    { x: 880, z: 860, scale: 2.7, rot: -Math.PI * 0.35 },
    { x: 0, z: -960, scale: 2.35, rot: 0 },
    { x: -960, z: 0, scale: 2.4, rot: Math.PI / 2 },
    { x: 960, z: 40, scale: 2.45, rot: -Math.PI / 2 },
    { x: 40, z: 960, scale: 2.3, rot: Math.PI },
  ];
  for (const m of mountainRing) {
    props.push({ type: "mountain", ...m });
  }

  for (let i = 0; i < 48; i++) {
    const side = i % 4;
    const t = -960 + (Math.floor(i / 4) % 12) * 88;
    const edge = 910;
    props.push({
      type: "mountain",
      x: side === 0 ? t : side === 1 ? edge : side === 2 ? t : -edge,
      z: side === 0 ? -edge : side === 1 ? t : side === 2 ? edge : t,
      scale: 0.85 + (i % 4) * 0.1,
      rot: side * (Math.PI / 2),
    });
  }

  return props;
}

const LOOT_WEAPONS = ["ak47", "m4", "scar", "ump45", "awm", "doze", "glock", "revolver", "faca", "katana", "facao"];

function buildCompoundLoot(brLoot, c) {
  const lootPoints = [
    [-58, -18], [-42, -38], [-8, -62], [24, -48], [52, 14],
    [38, 46], [-12, 42], [-74, 58], [78, -22], [10, 78],
  ];
  for (let i = 0; i < lootPoints.length; i++) {
    const [dx, dz] = lootPoints[i];
    const id = LOOT_WEAPONS[(i + c.id.length) % LOOT_WEAPONS.length];
    brLoot.push({ kind: "weapon", id, x: c.x + dx, z: c.z + dz });
    if (!["faca", "katana", "facao"].includes(id)) {
      brLoot.push({ kind: "ammo", ammo: id === "doze" ? "doze" : "ar", x: c.x + dx + 3.2, z: c.z + dz + 2.4 });
    }
  }
  for (let i = 0; i < 6; i++) {
    brLoot.push({
      kind: "ammo",
      ammo: i % 3 === 0 ? "doze" : "ar",
      x: c.x - 76 + (i % 3) * 52,
      z: c.z - 82 + Math.floor(i / 3) * 108,
    });
  }
}

function buildCompoundDoors(brDoors, covers, c) {
  if (c.id === "mercado") {
    pushHouseCollision(covers, c.x + 68, c.z - 32, 30, 22, 3.2, 4.2);
    brDoors.push({ id: `${c.id}-loja`, x: c.x + 68, z: c.z - 42.85, w: 4.2, h: 2.65, tint: c.accent });
    return;
  }
  if (c.id === "saloon") {
    pushHouseCollision(covers, c.x, c.z, 38, 26, 5.4, 4.8);
    brDoors.push({ id: `${c.id}-saloon`, x: c.x, z: c.z - 12.85, w: 4.8, h: 3.2, tint: c.accent });
    return;
  }
  if (c.id === "pirate") {
    pushHouseCollision(covers, c.x, c.z, 52, 30, 4.2, 5.2);
    pushHouseCollision(covers, c.x - 58, c.z + 36, 32, 22, 3.2, 4.2);
    brDoors.push(
      { id: `${c.id}-armazem`, x: c.x, z: c.z - 14.85, w: 5.2, h: 3.35, tint: c.accent },
      { id: `${c.id}-cabana`, x: c.x - 58, z: c.z + 24.85, w: 4.2, h: 2.65, tint: c.accent }
    );
    return;
  }
  if (c.id === "fort") {
    pushHouseCollision(covers, c.x - 42, c.z, 36, 26, 5.2, 4.6);
    pushHouseCollision(covers, c.x + 44, c.z, 36, 26, 5.2, 4.6);
    brDoors.push(
      { id: `${c.id}-oeste`, x: c.x - 42, z: c.z - 12.85, w: 4.6, h: 3.1, tint: c.accent },
      { id: `${c.id}-leste`, x: c.x + 44, z: c.z - 12.85, w: 4.6, h: 3.1, tint: 0x7a3838 }
    );
    return;
  }
  pushHouseCollision(covers, c.x, c.z, 40, 26, 4.0, 5.0);
  brDoors.push({ id: `${c.id}-principal`, x: c.x, z: c.z - 12.85, w: 5.0, h: 3.2, tint: c.accent });
}

export function buildFrontierMap(theme) {
  const covers = [
    { x: 80, z: -40, w: 20, d: 10, h: 2.4 },
    { x: -620, z: -480, w: 16, d: 8, h: 2.2 },
    { x: 520, z: 420, w: 18, d: 8, h: 2.2 },
  ];
  const brDoors = [];
  const brLoot = [];

  for (const c of FRONTIER_COMPOUNDS) {
    buildCompoundDoors(brDoors, covers, c);
    buildCompoundLoot(brLoot, c);
  }

  brLoot.push(
    { kind: "weapon", id: "bazooka", x: -680, z: 120 },
    { kind: "ammo", ammo: "rocket", x: -676, z: 124 },
    { kind: "weapon", id: "bazooka", x: 620, z: 640 },
    { kind: "ammo", ammo: "rocket", x: 624, z: 636 },
    { kind: "weapon", id: "bazooka", x: 0, z: -800 },
    { kind: "ammo", ammo: "rocket", x: 4, z: -796 },
    { kind: "weapon", id: "revolver", x: 92, z: -28 },
    { kind: "weapon", id: "awm", x: 58, z: -52 },
    { kind: "ammo", ammo: "ar", x: 72, z: -68 },
    { kind: "weapon", id: "scar", x: 528, z: 408 },
    { kind: "weapon", id: "katana", x: -628, z: -468 },
    { kind: "ammo", ammo: "doze", x: 768, z: -568 }
  );

  const patrolPoints = [];
  for (let i = 0; i < 100; i++) patrolPoints.push(seededPoint(i, 880));
  for (const c of FRONTIER_COMPOUNDS) {
    patrolPoints.push(
      { x: c.x, z: c.z },
      { x: c.x + 80, z: c.z - 70 },
      { x: c.x - 80, z: c.z + 70 }
    );
  }
  patrolPoints.push(theme.spawnCT, theme.spawnT);

  const botDropZones = [
    ...FRONTIER_COMPOUNDS.filter((c) => c.tier === "high" || c.tier === "mid").map((c) => ({ x: c.x, z: c.z })),
    { x: -880, z: -720 },
    { x: 880, z: 760 },
    { x: 0, z: 0 },
  ];

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
    botDropZones,
    patrolPoints,
    dropRoute: FRONTIER_DROP_ROUTE,
    bossSpawn: { x: 620, z: 620 },
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
