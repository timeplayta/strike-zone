/** IA tática — plano individual por bot, separação, anti-parede */

export const ENEMY_ROLES = ["rusher", "flanker", "sniper", "support"];

const ROLE_PLANS = {
  rusher: { idealMin: 4, idealMax: 11, aggression: 1.28, flankWeight: 0.28 },
  flanker: { idealMin: 9, idealMax: 19, aggression: 1.0, flankWeight: 1.25 },
  sniper: { idealMin: 16, idealMax: 30, aggression: 0.62, flankWeight: 0.42 },
  support: { idealMin: 10, idealMax: 22, aggression: 0.78, flankWeight: 0.68 },
};

export function assignEnemyRole(index, total) {
  if (total === 1) return "solo";
  return ENEMY_ROLES[index % ENEMY_ROLES.length];
}

export function initEnemyBrain(e, index = 0, total = 1) {
  e.role = assignEnemyRole(index, total);
  e.plan = ROLE_PLANS[e.role] || ROLE_PLANS.flanker;
  e.strafeDir = index % 2 === 0 ? 1 : -1;
  e.strafePhase = Math.random() * Math.PI * 2;
  e.movePattern = e.role === "rusher" ? "advance" : e.role === "sniper" ? "hold" : "flank";
  e.patternTimer = 0;
  e.burstCount = 0;
  e.burstPauseUntil = 0;
  e.moveVx = 0;
  e.moveVz = 0;
  e.stuckTimer = 0;
  e.lastPosX = e.group?.position?.x ?? 0;
  e.lastPosZ = e.group?.position?.z ?? 0;
  e.waypoint = null;
  e.waypointUntil = 0;
}

export function pickSafePosition(mapData, collidesFn, fromX, fromZ, avoidX, avoidZ, who = "npc", minDistFromAvoid = 7) {
  const pts = [...(mapData.patrolPoints || [])].sort(() => Math.random() - 0.5);
  let best = null;
  let bestScore = -1;

  for (const p of pts) {
    for (let t = 0; t < 6; t++) {
      const x = p.x + (Math.random() - 0.5) * 6;
      const z = p.z + (Math.random() - 0.5) * 6;
      if (collidesFn(x, z, 0.48, who)) continue;
      const dAvoid = Math.hypot(x - avoidX, z - avoidZ);
      const dFrom = Math.hypot(x - fromX, z - fromZ);
      if (dAvoid < minDistFromAvoid) continue;
      const score = dAvoid + dFrom * 0.35 + Math.random() * 2;
      if (score > bestScore) {
        bestScore = score;
        best = { x, z };
      }
    }
  }

  if (best) return best;

  for (let i = 0; i < 40; i++) {
    const lim = 18 * (mapData.scale || 1);
    const x = (Math.random() - 0.5) * lim * 1.6;
    const z = (Math.random() - 0.5) * lim * 1.4;
    if (!collidesFn(x, z, 0.48, who)) return { x, z };
  }
  return { x: fromX, z: fromZ };
}

/** Empurra bots para não ficarem no mesmo ponto */
export function computeSeparation(e, others, minDist = 2.4) {
  let sx = 0;
  let sz = 0;
  for (const o of others) {
    if (o === e || !o.alive || o.isBoss) continue;
    const dx = e.group.position.x - o.group.position.x;
    const dz = e.group.position.z - o.group.position.z;
    const d = Math.hypot(dx, dz);
    if (d < minDist && d > 0.05) {
      const f = ((minDist - d) / minDist) ** 1.5;
      sx += (dx / d) * f * 3.5;
      sz += (dz / d) * f * 3.5;
    }
  }
  return { sx, sz };
}

/** Valida destino — se atrás de parede, busca ponto livre próximo */
export function sanitizeMoveTarget(ex, ez, tx, tz, collidesFn) {
  if (!collidesFn(tx, tz, 0.45, "npc")) return { x: tx, z: tz };

  for (let r = 1; r <= 6; r++) {
    for (let a = 0; a < 12; a++) {
      const ang = (a / 12) * Math.PI * 2;
      const nx = tx + Math.cos(ang) * r * 0.9;
      const nz = tz + Math.sin(ang) * r * 0.9;
      if (!collidesFn(nx, nz, 0.45, "npc")) return { x: nx, z: nz };
    }
  }

  for (let a = 0; a < 8; a++) {
    const ang = (a / 8) * Math.PI * 2;
    const nx = ex + Math.cos(ang) * 2.5;
    const nz = ez + Math.sin(ang) * 2.5;
    if (!collidesFn(nx, nz, 0.45, "npc")) return { x: nx, z: nz };
  }

  return { x: ex, z: ez };
}

/** Plano de combate por papel — cada bot tem meta diferente */
export function getEnemyMoveTarget(e, px, pz, dt, others = []) {
  const ex = e.group.position.x;
  const ez = e.group.position.z;
  const dist = Math.hypot(px - ex, pz - ez);
  const intel = e.intelligence ?? 0.5;
  const plan = e.plan || ROLE_PLANS.flanker;
  const role = e.role || "flanker";
  const lowHp = e.health < e.maxHealth * 0.35;

  e.strafePhase = (e.strafePhase || 0) + dt * (3.2 + intel * 2.5);
  e.patternTimer = (e.patternTimer || 0) + dt;

  const moved = Math.hypot(ex - (e.lastPosX ?? ex), ez - (e.lastPosZ ?? ez));
  if (moved < 0.015) e.stuckTimer = (e.stuckTimer || 0) + dt;
  else e.stuckTimer = 0;
  e.lastPosX = ex;
  e.lastPosZ = ez;

  if ((e.stuckTimer || 0) > 0.42) {
    e.stuckTimer = 0;
    e.strafeDir = -(e.strafeDir || 1);
    e.waypoint = null;
    const escapeAng = Math.atan2(ez - pz, ex - px) + (Math.random() > 0.5 ? 1.2 : -1.2);
    return {
      x: ex + Math.cos(escapeAng) * 4,
      z: ez + Math.sin(escapeAng) * 4,
      strafe: true,
      sprint: true,
      stuck: true,
    };
  }

  const toPlayer = Math.atan2(px - ex, pz - ez);
  const perpL = toPlayer + Math.PI / 2;
  const perpR = toPlayer - Math.PI / 2;
  const flankSide = (e.strafeDir || 1) > 0 ? perpL : perpR;

  let tx = px;
  let tz = pz;

  if (lowHp && dist < 18) {
    const ang = Math.atan2(ez - pz, ex - px);
    tx = ex + Math.cos(ang) * 6;
    tz = ez + Math.sin(ang) * 6;
  } else if (role === "solo" || intel > 0.92) {
    if (dist > plan.idealMax) {
      tx = px;
      tz = pz;
    } else if (dist < plan.idealMin) {
      const ang = Math.atan2(ez - pz, ex - px);
      tx = ex + Math.cos(ang) * 3;
      tz = ez + Math.sin(ang) * 3;
    } else {
      const strafe = Math.sin(e.strafePhase) * 5;
      tx = ex + Math.cos(flankSide) * strafe + Math.sin(toPlayer) * 1.5;
      tz = ez + Math.sin(flankSide) * strafe + Math.cos(toPlayer) * 1.5;
    }
  } else if (role === "rusher") {
    tx = px + Math.sin(toPlayer) * 1.2;
    tz = pz + Math.cos(toPlayer) * 1.2;
  } else if (role === "flanker") {
    const offset = 6 + (e.indexInSquad ?? 0) * 1.5;
    tx = px + Math.cos(flankSide) * offset;
    tz = pz + Math.sin(flankSide) * offset;
  } else if (role === "sniper") {
    if (dist < plan.idealMin) {
      const ang = Math.atan2(ez - pz, ex - px);
      tx = ex + Math.cos(ang) * 4;
      tz = ez + Math.sin(ang) * 4;
    } else if (dist > plan.idealMax) {
      tx = px + Math.sin(toPlayer) * (dist - plan.idealMax);
      tz = pz + Math.cos(toPlayer) * (dist - plan.idealMax);
    } else {
      tx = ex + Math.cos(flankSide) * 2;
      tz = ez + Math.sin(flankSide) * 2;
    }
  } else if (role === "support") {
    const back = Math.min(dist * 0.35, 8);
    tx = ex + Math.sin(toPlayer) * back * 0.3 + Math.cos(flankSide) * 3;
    tz = ez + Math.cos(toPlayer) * back * 0.3 + Math.sin(flankSide) * 3;
  }

  if (intel > 0.62 && dist < 22 && Math.random() < 0.015) {
    e.strafeDir = -(e.strafeDir || 1);
  }

  const sep = computeSeparation(e, others, role === "rusher" ? 2.8 : 3.4);
  tx += sep.sx;
  tz += sep.sz;

  return {
    x: tx,
    z: tz,
    strafe: role !== "rusher",
    sprint: role === "rusher" || role === "solo",
    role,
  };
}

export function shouldEnemyShoot(e, now, baseFireMs) {
  if (e.reloading) return false;
  if (now < (e.burstPauseUntil || 0)) return false;
  const roleMul = e.role === "sniper" ? 1.1 : e.role === "rusher" ? 0.92 : 1;
  const interval = baseFireMs * roleMul;
  return now - (e.lastShot || 0) >= interval;
}

export function registerEnemyShot(e) {
  const burstSize = e.role === "sniper" ? 2 : e.role === "rusher" ? 5 : 3;
  e.burstCount = (e.burstCount || 0) + 1;
  if (e.burstCount >= burstSize) {
    e.burstCount = 0;
    e.burstPauseUntil = performance.now() + (e.role === "sniper" ? 520 : 320);
  }
}

export function getEnemyAccuracy(e, dist, crouching) {
  const role = e.role || "flanker";
  let acc = crouching ? (e.coverAcc ?? 0.38) : (e.chaseAcc ?? 0.34);
  if (role === "sniper") acc = dist > 12 && dist < 32 ? 0.76 : 0.48;
  else if (role === "rusher") acc = dist < 10 ? 0.58 : 0.38;
  else if (role === "flanker") acc += dist < 18 ? 0.05 : 0.02;
  else if (role === "solo") acc = 0.62 + (dist < 14 ? 0.15 : 0);
  if (crouching) acc += 0.08;
  return Math.min(0.94, Math.max(0.18, acc));
}

export function shouldNpcJump(e, dist, seesTarget) {
  if (!e.grounded || (e.jumpCooldown || 0) > 0) return false;
  if (!seesTarget) return false;
  if (dist > 5 && dist < 16 && Math.random() < 0.018) return true;
  if ((e.stuckTimer || 0) > 0.35 && Math.random() < 0.25) return true;
  return false;
}

export function getHelperMoveTarget(h, i, px, pz, target, helpers, intel) {
  if (!target) {
    return { x: px - 2 + i * 2.8, z: pz + 2.5 + i * 0.5, aimX: px, aimZ: pz };
  }
  const tx = target.group.position.x;
  const tz = target.group.position.z;
  const hd = Math.hypot(tx - h.group.position.x, tz - h.group.position.z);
  let mx = tx;
  let mz = tz;
  if (intel > 0.4 && hd < 10) {
    const ang = Math.atan2(h.group.position.z - tz, h.group.position.x - tx) + (i === 0 ? 0.85 : -0.85);
    mx = tx + Math.cos(ang) * 7;
    mz = tz + Math.sin(ang) * 7;
  } else if (hd < 6) {
    const ang = Math.atan2(h.group.position.z - pz, h.group.position.x - px) + i * 1.2;
    mx = tx + Math.cos(ang) * 4;
    mz = tz + Math.sin(ang) * 4;
  }
  return { x: mx, z: mz, aimX: tx, aimZ: tz };
}
