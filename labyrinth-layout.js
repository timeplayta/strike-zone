/** Labirinto procedural gigante — paredes, spawn, saída e pickups */

const CEILING_H = 4.2;
const WALL_T = 0.38;

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function createMazeCells(cols, rows) {
  const cells = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => ({
      row: r,
      col: c,
      visited: false,
      walls: { n: true, e: true, s: true, w: true },
    }))
  );

  function carve(r, c) {
    cells[r][c].visited = true;
    const dirs = shuffle([
      [-1, 0, "n", "s"],
      [0, 1, "e", "w"],
      [1, 0, "s", "n"],
      [0, -1, "w", "e"],
    ]);
    for (const [dr, dc, wall, opp] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !cells[nr][nc].visited) {
        cells[r][c].walls[wall] = false;
        cells[nr][nc].walls[opp] = false;
        carve(nr, nc);
      }
    }
  }

  carve(0, 0);
  return cells;
}

function cellCenter(col, row, cols, rows, cellSize) {
  const ox = -(cols * cellSize) / 2;
  const oz = -(rows * cellSize) / 2;
  return {
    x: ox + col * cellSize + cellSize / 2,
    z: oz + row * cellSize + cellSize / 2,
  };
}

function wallsFromMaze(cells, cols, rows, cellSize) {
  const walls = [];
  const h = CEILING_H;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const { x, z } = cellCenter(col, row, cols, rows, cellSize);
      const c = cells[row][col];
      if (c.walls.n) walls.push([x, z - cellSize / 2, cellSize + WALL_T, WALL_T, h]);
      if (c.walls.w) walls.push([x - cellSize / 2, z, WALL_T, cellSize + WALL_T, h]);
      if (row === rows - 1 && c.walls.s) walls.push([x, z + cellSize / 2, cellSize + WALL_T, WALL_T, h]);
      if (col === cols - 1 && c.walls.e) walls.push([x + cellSize / 2, z, WALL_T, cellSize + WALL_T, h]);
    }
  }

  const ox = -(cols * cellSize) / 2;
  const oz = -(rows * cellSize) / 2;
  const fw = cols * cellSize + WALL_T * 2;
  const fh = rows * cellSize + WALL_T * 2;
  walls.push([0, oz - cellSize / 2 - WALL_T / 2, fw, WALL_T, h]);
  walls.push([0, oz + rows * cellSize + cellSize / 2 + WALL_T / 2, fw, WALL_T, h]);
  walls.push([ox - cellSize / 2 - WALL_T / 2, 0, WALL_T, fh, h]);
  walls.push([ox + cols * cellSize + cellSize / 2 + WALL_T / 2, 0, WALL_T, fh, h]);

  return walls;
}

function bfsPath(cells, cols, rows, sr, sc, er, ec) {
  const q = [[sr, sc]];
  const prev = new Map();
  const key = (r, c) => `${r},${c}`;
  prev.set(key(sr, sc), null);

  while (q.length) {
    const [r, c] = q.shift();
    if (r === er && c === ec) {
      const path = [];
      let cur = { r, c };
      while (cur) {
        path.unshift({ r: cur.r, c: cur.c });
        cur = prev.get(key(cur.r, cur.c));
      }
      return path;
    }
    const cell = cells[r][c];
    const moves = [
      [-1, 0, "n"],
      [0, 1, "e"],
      [1, 0, "s"],
      [0, -1, "w"],
    ];
    for (const [dr, dc, wall] of moves) {
      if (cell.walls[wall]) continue;
      const nr = r + dr;
      const nc = c + dc;
      const nk = key(nr, nc);
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || prev.has(nk)) continue;
      prev.set(nk, { r, c });
      q.push([nr, nc]);
    }
  }
  return [{ r: sr, c: sc }];
}

function pathPointAt(path, t, cols, rows, cellSize) {
  const idx = Math.min(path.length - 1, Math.max(0, Math.floor(path.length * t)));
  return cellCenter(path[idx].c, path[idx].r, cols, rows, cellSize);
}

function clearSpawnPoint(path, cols, rows, cellSize) {
  const spawn = cellCenter(0, 0, cols, rows, cellSize);
  if (!path || path.length < 2) return spawn;
  const next = cellCenter(path[1].c, path[1].r, cols, rows, cellSize);
  const dx = next.x - spawn.x;
  const dz = next.z - spawn.z;
  const len = Math.hypot(dx, dz) || 1;
  return {
    x: spawn.x + (dx / len) * 1.5,
    z: spawn.z + (dz / len) * 1.5,
  };
}

function scatterDecor() {
  return { props: [], pillars: [] };
}

/** Monstros encostados na parede — fora do centro do corredor */
function monsterSpawnsOffPath(path, cols, rows, cellSize, distances = [42, 58, 72]) {
  const spawns = [];
  if (!path?.length) return spawns;
  let acc = 0;
  const inset = cellSize * 0.44;

  for (let i = 1; i < path.length && spawns.length < distances.length; i++) {
    const a = cellCenter(path[i - 1].c, path[i - 1].r, cols, rows, cellSize);
    const b = cellCenter(path[i].c, path[i].r, cols, rows, cellSize);
    acc += Math.hypot(b.x - a.x, b.z - a.z);
    if (acc >= distances[spawns.length]) {
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const len = Math.hypot(dx, dz) || 1;
      const px = -dz / len;
      const pz = dx / len;
      const side = spawns.length % 2 === 0 ? 1 : -1;
      spawns.push({
        x: b.x + px * side * inset,
        z: b.z + pz * side * inset,
      });
    }
  }
  return spawns;
}

export function buildLabyrinthLayout(cols = 33, rows = 33, cellSize = 3.6) {
  const cells = createMazeCells(cols, rows);
  const walls = wallsFromMaze(cells, cols, rows, cellSize);
  const path = bfsPath(cells, cols, rows, 0, 0, cols - 1, rows - 1);
  const spawn = clearSpawnPoint(path, cols, rows, cellSize);
  const exit = cellCenter(cols - 1, rows - 1, cols, rows, cellSize);

  const meleePickups = [
    { id: "facao", ...pathPointAt(path, 0.5, cols, rows, cellSize) },
    { id: "porrete", ...pathPointAt(path, 0.68, cols, rows, cellSize) },
    { id: "katana", ...pathPointAt(path, 0.85, cols, rows, cellSize) },
  ];

  const monsterSpawns = monsterSpawnsOffPath(path, cols, rows, cellSize, [48, 64, 82]);

  const { props, pillars } = scatterDecor();
  const floorW = cols * cellSize + 12;
  const floorH = rows * cellSize + 12;
  const bound = Math.max(floorW, floorH) / 2 - 1;

  return {
    walls,
    covers: [],
    tables: [],
    props,
    pillars,
    patrolPoints: path.filter((_, i) => i % 8 === 0).map((p) =>
      cellCenter(p.c, p.r, cols, rows, cellSize)
    ),
    monsterSpawns,
    spawnPlayer: spawn,
    spawnCT: spawn,
    spawnT: exit,
    exitZone: { x: exit.x, z: exit.z, radius: 2.8 },
    meleePickups,
    floorW,
    floorH,
    bounds: { limX: bound, limZ: bound },
    skipBossRoom: true,
    skipAmmoChests: true,
    noCombat: true,
    innerRoom: { minX: 999, maxX: 1000, minZ: 0, maxZ: 0, wallH: CEILING_H, doorGap: { width: 0, centerZ: 0 } },
    bombSites: [],
    bossSpawn: exit,
    innerBomb: exit,
    ceilingH: CEILING_H,
  };
}
