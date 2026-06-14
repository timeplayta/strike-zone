/** Animação — mapas de tiro: Mixamo limpo | mapa terror: corpos tortos/flutuantes */

import { RIFLE_HOLD } from "./stylized-character.js";

const GLTF_AIM = {
  shoulderR: { x: -1.62, y: -0.02, z: -1.55 },
  armR: { x: -0.05, y: 0.02, z: 0 },
  foreR: { x: -0.62, y: 0, z: 0.02 },
  shoulderL: { x: -1.42, y: 0.06, z: 1.22 },
  armL: { x: -0.15, y: -0.02, z: 0.12 },
  foreL: { x: -0.88, y: 0, z: 0.04 },
};

const GLTF_RIFLE = {
  shoulderR: { x: -1.57, y: 0, z: -1.52 },
  armR: { x: -0.12, y: 0, z: 0.02 },
  foreR: { x: -0.55, y: 0, z: 0 },
  shoulderL: { x: -1.35, y: 0.08, z: 1.18 },
  armL: { x: -0.25, y: 0, z: 0.15 },
  foreL: { x: -0.78, y: 0, z: 0.05 },
};

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpPose(a, b, t) {
  const out = {};
  for (const k of Object.keys(a)) {
    out[k] = {
      x: lerp(a[k].x, b[k].x, t),
      y: lerp(a[k].y, b[k].y, t),
      z: lerp(a[k].z, b[k].z, t),
    };
  }
  return out;
}

function smooth(cur, target, dt, speed = 10) {
  return lerp(cur, target, Math.min(1, dt * speed));
}

export function initCharacterAnim(entity) {
  entity.animTime = Math.random() * Math.PI * 2;
  entity._lastAnimX = entity.group.position.x;
  entity._lastAnimZ = entity.group.position.z;
  entity._lastRotY = entity.group?.rotation?.y ?? 0;
  entity._turnLean = 0;
  entity._horrorSide = Math.random() < 0.5 ? -1 : 1;
  entity._animState = { hipL: 0, hipR: 0, kneeL: 0, kneeR: 0, bob: 0, leanZ: 0, leanX: 0, headY: 0 };
  entity._gltfAnim = entity.mixer ? "idle" : null;
  entity._aimBlend = 0;
  entity._shootRecoil = 0;
  entity.alwaysHoldWeapon = !!entity.gun && !entity.horrorMode;
}

function applyGltfArmPose(entity, pose, dt, sway = 0, speed = 22) {
  const b = entity.bones;
  if (!b) return;
  const sp = Math.min(1, dt * speed);

  const apply = (bone, p, swayMul = 0) => {
    if (!bone || !p) return;
    bone.rotation.x = lerp(bone.rotation.x, p.x + sway * swayMul, sp);
    bone.rotation.y = lerp(bone.rotation.y, p.y, sp);
    bone.rotation.z = lerp(bone.rotation.z, p.z, sp);
  };

  apply(b.shoulderR, pose.shoulderR, 0.5);
  apply(b.armR, pose.armR);
  apply(b.foreR, pose.foreR);
  apply(b.shoulderL, pose.shoulderL, -0.4);
  apply(b.armL, pose.armL);
  apply(b.foreL, pose.foreL);
}

function applyJumpPose(entity, dt, jumpH, jumpVel, aiming) {
  const b = entity.bones;
  if (!b || jumpH < 0.02) return;
  const sp = Math.min(1, dt * 14);
  const rise = jumpVel > 0.5;
  const tuck = rise ? 0.08 : 0.05;
  const legBend = rise ? -0.1 : -0.06;

  if (b.upLegL) b.upLegL.rotation.x = lerp(b.upLegL.rotation.x, tuck, sp);
  if (b.upLegR) b.upLegR.rotation.x = lerp(b.upLegR.rotation.x, tuck, sp);
  if (b.legL) b.legL.rotation.x = lerp(b.legL.rotation.x, legBend, sp);
  if (b.legR) b.legR.rotation.x = lerp(b.legR.rotation.x, legBend, sp);
  if (b.hips) b.hips.rotation.x = lerp(b.hips.rotation.x, 0, sp);
  if (b.spine) b.spine.rotation.x = lerp(b.spine.rotation.x, 0, sp);
  if (b.neck) b.neck.rotation.x = lerp(b.neck.rotation.x, 0, sp);

  if (!aiming && b.armR) {
    b.armR.rotation.x = lerp(b.armR.rotation.x, rise ? -0.035 : 0.02, sp);
    if (b.foreR) b.foreR.rotation.x = lerp(b.foreR.rotation.x, rise ? -0.025 : 0.015, sp);
  }
}

function updateWeaponVisual(entity, dt, shooting, aimBlend) {
  const pivot = entity.weaponPivot;
  if (!pivot && !entity.gun) return;

  if (shooting) entity._shootRecoil = Math.max(entity._shootRecoil ?? 0, 1);
  entity._shootRecoil = Math.max(0, (entity._shootRecoil ?? 0) - dt * 16);
  const recoil = (entity._shootRecoil ?? 0) * 0.12;

  if (pivot) {
    pivot.rotation.x = smooth(pivot.rotation.x, -aimBlend * 0.06 - recoil, dt, shooting ? 24 : 14);
    pivot.rotation.y = smooth(pivot.rotation.y, shooting ? -recoil * 0.3 : 0, dt, shooting ? 20 : 10);
  }

  if (entity.gun && shooting) {
    entity.gun.traverse((o) => {
      if (o.isMesh && o.material?.emissive) {
        o.material.emissive.setHex(0xff6600);
        o.material.emissiveIntensity = 0.65;
      }
    });
  } else if (entity.gun) {
    entity.gun.traverse((o) => {
      if (o.isMesh && o.material?.emissiveIntensity != null) {
        o.material.emissiveIntensity = smooth(o.material.emissiveIntensity || 0, 0, dt, 18);
      }
    });
  }
}

/** Pose assustadora — só no mapa de terror */
function applyHorrorPose(entity, dt, opts) {
  const g = entity.group;
  const b = entity.bones;
  const t = (entity.animTime = (entity.animTime || 0) + dt * 0.85);
  const side = entity._horrorSide ?? 1;
  const moving = opts.moving || false;

  g.rotation.x = smooth(g.rotation.x, 1.05 + Math.sin(t * 1.1) * 0.18, dt, 4);
  g.rotation.z = smooth(
    g.rotation.z,
    side * (0.55 + Math.sin(t * 0.75) * 0.22) + (moving ? Math.sin(t * 2.2) * 0.12 : 0),
    dt,
    4
  );

  const floatY = (entity.baseY ?? 0) + 0.35 + Math.sin(t * 1.6) * 0.28 + (moving ? 0.08 : 0);
  g.position.y = smooth(g.position.y, floatY, dt, 6);

  if (b?.spine) {
    b.spine.rotation.x = smooth(b.spine.rotation.x, 0.65 + Math.sin(t * 0.9) * 0.15, dt, 5);
    b.spine.rotation.z = smooth(b.spine.rotation.z, side * 0.35, dt, 5);
  }
  if (b?.hips) {
    b.hips.rotation.x = smooth(b.hips.rotation.x, 0.25, dt, 5);
    b.hips.rotation.z = smooth(b.hips.rotation.z, side * 0.4, dt, 5);
  }
  if (b?.neck) {
    b.neck.rotation.x = smooth(b.neck.rotation.x, -0.5 + Math.sin(t * 1.4) * 0.2, dt, 6);
    b.neck.rotation.y = smooth(b.neck.rotation.y, Math.sin(t * 0.6) * 0.5, dt, 4);
  }
  if (b?.armR) {
    b.armR.rotation.x = smooth(b.armR.rotation.x, -0.3 + Math.sin(t * 1.8) * 0.4, dt, 5);
    b.foreR.rotation.x = smooth(b.foreR.rotation.x, -1.2, dt, 5);
  }
  if (b?.armL) {
    b.armL.rotation.x = smooth(b.armL.rotation.x, 0.5 + Math.cos(t * 1.5) * 0.3, dt, 5);
  }
  if (b?.upLegL) b.upLegL.rotation.x = smooth(b.upLegL.rotation.x, 0.4, dt, 5);
  if (b?.upLegR) b.upLegR.rotation.x = smooth(b.upLegR.rotation.x, -0.2 + Math.sin(t) * 0.3, dt, 5);
}

function resetGroupTilt(entity, dt) {
  const g = entity.group;
  if (!g) return;
  g.rotation.x = smooth(g.rotation.x, 0, dt, 18);
  g.rotation.z = smooth(g.rotation.z, 0, dt, 18);
}

function updateGltfAnimation(entity, dt, opts) {
  if (!entity.alive || entity.ragdoll) return;

  const horrorMode = !!opts.horrorMode;
  const {
    moving = false,
    speed = 2.5,
    shooting = false,
    aiming = false,
    sprint = false,
    crouching = false,
    jumping = false,
    jumpHeight = 0,
    jumpVel = 0,
  } = opts;

  if (!horrorMode) resetGroupTilt(entity, dt);

  entity.mixer.update(dt);

  const lx = entity._lastAnimX ?? entity.group.position.x;
  const lz = entity._lastAnimZ ?? entity.group.position.z;
  const dist = Math.hypot(entity.group.position.x - lx, entity.group.position.z - lz);
  entity._lastAnimX = entity.group.position.x;
  entity._lastAnimZ = entity.group.position.z;

  const isMoving = moving || dist > 0.004;
  const isRunning = isMoving && (sprint || speed > 3.2);
  const inAir = !horrorMode && (jumping || jumpHeight > 0.05);
  const actions = entity.animActions;

  if (actions) {
    let target = "idle";
    if (!inAir && isMoving) target = isRunning && actions.run ? "run" : actions.walk ? "walk" : "run";
    if (!inAir && crouching && isMoving && actions.walk) target = "walk";

    if (entity._gltfAnim !== target) {
      const prev = entity._gltfAnim && actions[entity._gltfAnim];
      if (prev) prev.fadeOut(inAir ? 0.08 : 0.15);
      const next = actions[target];
      if (next) {
        next.reset().setEffectiveWeight(1).fadeIn(inAir ? 0.08 : 0.15).play();
        entity._gltfAnim = target;
      }
    }

    const baseScale = inAir ? 0.55 : isRunning ? 1.05 + speed * 0.12 : isMoving ? 0.92 + speed * 0.16 : 1;
    const aimSlow = (aiming || shooting) && isMoving ? 0.92 : 1;
    const timeScale = baseScale * aimSlow;
    if (actions.walk) actions.walk.setEffectiveTimeScale(timeScale);
    if (actions.run) actions.run.setEffectiveTimeScale(timeScale * 1.08);
    if (actions.idle) actions.idle.setEffectiveTimeScale(inAir ? 0.45 : 1);
  }

  if (horrorMode) {
    applyHorrorPose(entity, dt, { moving: isMoving });
    updateWeaponVisual(entity, dt, shooting, shooting ? 1 : 0);
    return;
  }

  const inCombat = aiming || shooting;

  if (inAir) {
    applyJumpPose(entity, dt, jumpHeight, jumpVel, inCombat);
  }

  if (inCombat && entity.gun) {
    entity._aimBlend = smooth(entity._aimBlend ?? 0, 1, dt, shooting ? 22 : 14);
    const pose = lerpPose(GLTF_RIFLE, GLTF_AIM, entity._aimBlend);
    applyGltfArmPose(entity, pose, dt, 0, shooting ? 24 : 18);
  } else {
    entity._aimBlend = smooth(entity._aimBlend ?? 0, 0, dt, 12);
  }

  updateWeaponVisual(entity, dt, shooting, entity._aimBlend);
}

export function updateHumanAnimation(entity, dt, opts = {}) {
  if (entity.mixer) {
    updateGltfAnimation(entity, dt, opts);
    return;
  }

  const rig = entity.rig;
  if (!rig || !entity.alive || entity.ragdoll) return;

  const horrorMode = !!opts.horrorMode;
  const {
    moving = false,
    speed = 2.5,
    aiming = false,
    shooting = false,
    crouching = false,
    jumping = false,
    jumpHeight = 0,
    turnLean = 0,
  } = opts;

  if (!horrorMode) resetGroupTilt(entity, dt);

  const lx = entity._lastAnimX ?? entity.group.position.x;
  const lz = entity._lastAnimZ ?? entity.group.position.z;
  const dist = Math.hypot(entity.group.position.x - lx, entity.group.position.z - lz);
  entity._lastAnimX = entity.group.position.x;
  entity._lastAnimZ = entity.group.position.z;

  const isMoving = moving || dist > 0.004;
  const isRunning = isMoving && speed > 3.2;
  entity.animTime = (entity.animTime || 0) + dt * (isRunning ? speed * 1.2 : isMoving ? speed * 1.05 : 1.2);
  const t = entity.animTime;
  const st = entity._animState;

  if (horrorMode) {
    applyHorrorPose(entity, dt, { moving: isMoving });
    return;
  }

  if (isMoving && !jumping) {
    const freq = isRunning ? 12 : 10;
    const swing = Math.sin(t * freq);
    const swing2 = Math.sin(t * freq + Math.PI);
    const amp = isRunning ? 0.52 : 0.42;
    st.hipL = smooth(st.hipL, swing * amp, dt, isRunning ? 18 : 16);
    st.hipR = smooth(st.hipR, swing2 * amp, dt, isRunning ? 18 : 16);
    st.kneeL = smooth(st.kneeL, Math.max(0, -swing * 0.42) + (isRunning ? 0.08 : 0.05), dt, 16);
    st.kneeR = smooth(st.kneeR, Math.max(0, -swing2 * 0.42) + (isRunning ? 0.08 : 0.05), dt, 16);
    st.bob = smooth(st.bob, Math.abs(Math.sin(t * freq)) * (isRunning ? 0.045 : 0.032), dt, 16);
    st.leanZ = smooth(st.leanZ, swing * 0.028, dt, 12);
  } else if (!jumping) {
    st.hipL = smooth(st.hipL, 0, dt, 8);
    st.hipR = smooth(st.hipR, 0, dt, 8);
    st.kneeL = smooth(st.kneeL, 0, dt, 8);
    st.kneeR = smooth(st.kneeR, 0, dt, 8);
    st.bob = smooth(st.bob, 0, dt, 6);
    st.leanZ = smooth(st.leanZ, 0, dt, 8);
  }

  if (jumping || jumpHeight > 0.05) {
    st.hipL = smooth(st.hipL, 0.06, dt, 12);
    st.hipR = smooth(st.hipR, 0.06, dt, 12);
    st.kneeL = smooth(st.kneeL, 0.1, dt, 12);
    st.kneeR = smooth(st.kneeR, 0.1, dt, 12);
    st.bob = smooth(st.bob, jumpHeight * 0.025, dt, 12);
    st.leanZ = smooth(st.leanZ, 0, dt, 14);
  } else if (crouching) {
    st.kneeL = smooth(st.kneeL, 0.65, dt, 10);
    st.kneeR = smooth(st.kneeR, 0.65, dt, 10);
    st.bob = smooth(st.bob, -0.15, dt, 10);
  }

  rig.hipL.rotation.x = st.hipL;
  rig.hipR.rotation.x = st.hipR;
  rig.kneeL.rotation.x = st.kneeL;
  rig.kneeR.rotation.x = st.kneeR;

  entity._aimBlend = smooth(entity._aimBlend ?? 0, aiming || shooting ? 1 : 0, dt, shooting ? 20 : 12);
  applyRifleHold(rig, isMoving ? Math.sin(t * 10) * 0.02 : 0, entity._aimBlend);
  rig.bodyBob.position.y = st.bob;
  if (rig.torsoPivot) {
    rig.torsoPivot.rotation.x = jumping || jumpHeight > 0.05 ? smooth(rig.torsoPivot.rotation.x, 0, dt, 14) : rig.torsoPivot.rotation.x;
    rig.torsoPivot.rotation.z = st.leanZ;
  }
  updateWeaponVisual(entity, dt, shooting, entity._aimBlend);
}

function applyRifleHold(rig, swayZ = 0, aimTight = 0) {
  const h = rig.hold || RIFLE_HOLD;
  const t = aimTight;
  rig.shoulderR.rotation.set(h.shoulderR.x - t * 0.12, h.shoulderR.y, h.shoulderR.z + swayZ);
  rig.elbowR.rotation.set(h.elbowR.x - t * 0.1, h.elbowR.y, h.elbowR.z);
  rig.shoulderL.rotation.set(h.shoulderL.x - t * 0.08, h.shoulderL.y, h.shoulderL.z - swayZ * 0.6);
  rig.elbowL.rotation.set(h.elbowL.x - t * 0.08, h.elbowL.y, h.elbowL.z);
}

export function smoothTurn(group, targetX, targetZ, dt, turnSpeed = 14, entity = null) {
  const dx = targetX - group.position.x;
  const dz = targetZ - group.position.z;
  if (Math.hypot(dx, dz) < 0.06) return;
  const targetY = Math.atan2(dx, dz);
  let diff = targetY - group.rotation.y;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  group.rotation.y += diff * Math.min(1, dt * turnSpeed);
  if (entity && entity.horrorMode) {
    entity._turnLean = (entity._turnLean || 0) * 0.82 + diff * 2;
  }
}

export function getAnimOpts(entity, base = {}) {
  return {
    horrorMode: !!entity.horrorMode,
    jumpHeight: entity.horrorMode ? 0 : entity.jumpOffset || 0,
    jumpVel: entity.horrorMode ? 0 : entity.velY || 0,
    turnLean: entity._turnLean || 0,
    ...base,
  };
}
