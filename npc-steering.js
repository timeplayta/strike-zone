/** Movimento inteligente — evita paredes, desencalha bots */

export function pathClear(x0, z0, x1, z1, collidesFn, who = "npc", steps = 10) {
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t;
    const z = z0 + (z1 - z0) * t;
    if (collidesFn(x, z, 0.42, who)) return false;
  }
  return true;
}

/** Escolhe direção livre mais alinhada ao alvo (steering) */
export function steerDirection(ex, ez, tx, tz, collidesFn, who = "npc", radius = 0.42, probeCount = 20) {
  const dx = tx - ex;
  const dz = tz - ez;
  const dist = Math.hypot(dx, dz) || 1;
  const desired = Math.atan2(dx, dz);

  let bestAngle = desired;
  let bestScore = -999;
  const n = Math.max(8, probeCount | 0);

  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2;
    const probe = 1.4;
    const nx = ex + Math.sin(ang) * probe;
    const nz = ez + Math.cos(ang) * probe;
    if (collidesFn(nx, nz, radius, who)) continue;

    let diff = ang - desired;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const align = 1 - Math.abs(diff) / Math.PI;
    const score = align * 2 + Math.random() * 0.02;
    if (score > bestScore) {
      bestScore = score;
      bestAngle = ang;
    }
  }

  if (bestScore < -900) {
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2;
      const nx = ex + Math.sin(ang) * 1.2;
      const nz = ez + Math.cos(ang) * 1.2;
      if (!collidesFn(nx, nz, radius, who)) {
        return { x: Math.sin(ang), z: Math.cos(ang), escape: true };
      }
    }
    return { x: 0, z: 0, escape: true };
  }

  return { x: Math.sin(bestAngle), z: Math.cos(bestAngle), escape: false };
}

/** Destino final com waypoint se caminho bloqueado */
export function resolveNavTarget(e, tx, tz, mapData, collidesFn, px, pz) {
  const ex = e.group.position.x;
  const ez = e.group.position.z;
  const safe = sanitizeInline(ex, ez, tx, tz, collidesFn);

  if (pathClear(ex, ez, safe.x, safe.z, collidesFn)) {
    e.navWaypoint = null;
    return safe;
  }

  const now = performance.now();
  if (
    !e.navWaypoint ||
    now > (e.waypointUntil || 0) ||
    Math.hypot(ex - e.navWaypoint.x, ez - e.navWaypoint.z) < 1.2
  ) {
    e.navWaypoint = pickWaypointInline(mapData, collidesFn, ex, ez, px, pz);
    e.waypointUntil = now + 4000;
  }

  if (e.navWaypoint) return { x: e.navWaypoint.x, z: e.navWaypoint.z, viaWaypoint: true };
  return safe;
}

function sanitizeInline(ex, ez, tx, tz, collidesFn) {
  if (!collidesFn(tx, tz, 0.42, "npc")) return { x: tx, z: tz };
  for (let r = 1; r <= 8; r++) {
    for (let a = 0; a < 16; a++) {
      const ang = (a / 16) * Math.PI * 2;
      const nx = tx + Math.cos(ang) * r * 0.85;
      const nz = tz + Math.sin(ang) * r * 0.85;
      if (!collidesFn(nx, nz, 0.42, "npc")) return { x: nx, z: nz };
    }
  }
  for (let a = 0; a < 12; a++) {
    const ang = (a / 12) * Math.PI * 2;
    const nx = ex + Math.cos(ang) * 2.5;
    const nz = ez + Math.sin(ang) * 2.5;
    if (!collidesFn(nx, nz, 0.42, "npc")) return { x: nx, z: nz };
  }
  return { x: ex, z: ez };
}

function pickWaypointInline(mapData, collidesFn, fromX, fromZ, avoidX, avoidZ) {
  const pts = [...(mapData.patrolPoints || [])].sort(() => Math.random() - 0.5);
  let best = null;
  let bestScore = -1;
  for (const p of pts) {
    for (let t = 0; t < 5; t++) {
      const x = p.x + (Math.random() - 0.5) * 4;
      const z = p.z + (Math.random() - 0.5) * 4;
      if (collidesFn(x, z, 0.42, "npc")) continue;
      if (!pathClear(fromX, fromZ, x, z, collidesFn, "npc", 6)) continue;
      const d = Math.hypot(x - avoidX, z - avoidZ);
      const score = d + Math.hypot(x - fromX, z - fromZ) * 0.2;
      if (score > bestScore) {
        bestScore = score;
        best = { x, z };
      }
    }
  }
  return best || { x: fromX, z: fromZ };
}

/** Aplica steering + velocidade suave — retorna se moveu */
export function applyNpcSteering(entity, tx, tz, maxSpeed, dt, collidesFn, who = "npc") {
  const mesh = entity.group;
  if (!mesh) return false;

  const ex = mesh.position.x;
  const ez = mesh.position.z;
  const mobile = typeof document !== "undefined" && document.body.classList.contains("mode-mobile");
  const dir = steerDirection(ex, ez, tx, tz, collidesFn, who, 0.42, mobile ? 8 : 20);
  const r = 0.42;
  const accel = Math.min(1, dt * 16);

  if (dir.escape && dir.x === 0 && dir.z === 0) {
    entity.moveVx = (entity.moveVx || 0) * 0.5;
    entity.moveVz = (entity.moveVz || 0) * 0.5;
    entity.stuckTimer = (entity.stuckTimer || 0) + dt;
    return false;
  }

  const wantVx = dir.x * maxSpeed;
  const wantVz = dir.z * maxSpeed;
  entity.moveVx = (entity.moveVx || 0) + (wantVx - (entity.moveVx || 0)) * accel;
  entity.moveVz = (entity.moveVz || 0) + (wantVz - (entity.moveVz || 0)) * accel;

  let nx = ex + (entity.moveVx || 0) * dt;
  let nz = ez + (entity.moveVz || 0) * dt;

  if (!collidesFn(nx, ez, r, who)) mesh.position.x = nx;
  else {
    entity.moveVx = 0;
    nx = ex;
  }
  if (!collidesFn(mesh.position.x, nz, r, who)) mesh.position.z = nz;
  else {
    entity.moveVz = 0;
    nz = ez;
  }

  if (nx === ex && nz === ez) {
    const slide = steerDirection(ex, ez, ex + dir.x * 3, ez + dir.z * 3, collidesFn, who);
    const sx = ex + slide.x * maxSpeed * dt * 0.9;
    const sz = ez + slide.z * maxSpeed * dt * 0.9;
    if (!collidesFn(sx, ez, r, who)) mesh.position.x = sx;
    if (!collidesFn(mesh.position.x, sz, r, who)) mesh.position.z = sz;
  }

  return Math.hypot(mesh.position.x - ex, mesh.position.z - ez) > 0.002;
}
