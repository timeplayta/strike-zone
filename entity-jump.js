/** Pulo e gravidade compartilhados — jogador, aliados e inimigos */

export const GRAVITY = 24;
export const JUMP_VELOCITY = 7.2;
export const PLAYER_EYE_HEIGHT = 1.65;

export function initJumpState(entity) {
  entity.velY = 0;
  entity.grounded = true;
  entity.jumpCooldown = 0;
  entity.jumping = false;
  entity.jumpOffset = 0;
}

export function tryJump(entity, strength = JUMP_VELOCITY) {
  if (!entity || entity.dead || entity.alive === false) return false;
  if (entity.jumpCooldown > 0 || !entity.grounded) return false;
  entity.velY = strength;
  entity.grounded = false;
  entity.jumping = true;
  entity.jumpCooldown = 0.22;
  return true;
}

export function updateJumpPhysics(entity, dt) {
  if (!entity) return;
  entity.jumpCooldown = Math.max(0, entity.jumpCooldown - dt);

  if (!entity.grounded) {
    entity.jumpOffset = (entity.jumpOffset || 0) + entity.velY * dt;
    entity.velY -= GRAVITY * dt;
    if (entity.jumpOffset <= 0) {
      entity.jumpOffset = 0;
      entity.velY = 0;
      entity.grounded = true;
      entity.jumping = false;
    }
  } else {
    entity.jumpOffset = 0;
  }
}

/** Aplica offset de pulo no grupo 3D ou na câmera */
export function applyJumpVisual(entity, isCamera = false) {
  const y = entity.jumpOffset || 0;
  if (isCamera) {
    entity.position.y = PLAYER_EYE_HEIGHT + y;
    return;
  }
  if (entity.group) entity.group.position.y = (entity.baseY ?? 0) + y;
}
