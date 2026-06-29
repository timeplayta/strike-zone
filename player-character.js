/**
 * Personagem do JOGADOR — modelo Blockbench (player_hero.glb).
 * Edite em assets/blockbench/characters/player_hero.bbmodel
 */

import * as THREE from "three";
import { loadoutToBuildOpts, normalizeLoadout } from "./character-loadout.js";
import { buildAmongUsCharacter } from "./among-us-model.js";
import {
  upgradeWithBlockbenchModel,
  cloneBlockbenchModelSync,
  preloadBlockbenchModels,
  isBlockbenchModelReady,
} from "./blockbench-model-loader.js";
import { buildNpcWeapon, attachStylizedWeapon, attachWeaponToCharacter } from "./npc-weapon.js";

const BLOCKBENCH_FULL_BODY = {
  soldier: { key: "player_hero", w: 1.05, h: 1.82 },
  neon_runner: { key: "player_neon_runner", w: 1.05, h: 1.82 },
  shadow: { key: "player_shadow", w: 1.02, h: 1.78 },
  trevas_horror: { key: "player_shadow", w: 1.08, h: 1.85 },
  birthday_hero: { key: "player_birthday", w: 1.06, h: 1.8 },
  cowboy_sheriff: { key: "cowboy_sheriff", w: 1.05, h: 1.82 },
  cowboy_outlaw: { key: "cowboy_outlaw", w: 1.05, h: 1.82 },
  cowboy_vaqueiro: { key: "cowboy_vaqueiro", w: 1.04, h: 1.8 },
};

export function getPlayerBlockbenchSkin(skinId) {
  return BLOCKBENCH_FULL_BODY[skinId] || BLOCKBENCH_FULL_BODY.soldier;
}

export function preloadPlayerCharacterModels() {
  return preloadBlockbenchModels(Object.values(BLOCKBENCH_FULL_BODY).map((c) => c.key));
}

function attachWeaponToBlockbenchBody(bodyGroup, model, weaponType, shirt, withRifle) {
  if (!withRifle) return { gun: null, weaponPivot: null, handR: null };

  const handR = new THREE.Group();
  handR.name = "handR";
  handR.position.set(0.38, 0.6, 0.05);
  (model || bodyGroup).add(handR);

  const gunPivot = new THREE.Group();
  gunPivot.name = "gunPivot";
  handR.add(gunPivot);

  const wp = buildNpcWeapon(weaponType, shirt);
  const attached = attachStylizedWeapon({ gunPivot }, wp, weaponType);
  return { gun: attached.gun, weaponPivot: attached.pivot, handR };
}

function buildBlockbenchPlayer(skinId, opts) {
  const cfg = getPlayerBlockbenchSkin(skinId);
  const root = new THREE.Group();
  const body = new THREE.Group();
  body.name = "playerBody";
  root.add(body);

  const targetH = opts.portrait ? cfg.h * 0.95 : cfg.h;
  let model = cloneBlockbenchModelSync(cfg.key, { targetWidth: cfg.w, targetHeight: targetH });

  if (model) {
    body.add(model);
    body.userData.blockbenchApplied = true;
    body.userData.blockbenchModel = model;
  } else {
    upgradeWithBlockbenchModel(body, cfg.key, {
      targetWidth: cfg.w,
      targetHeight: targetH,
      onReady: (m) => {
        model = m;
      },
    });
  }

  const headHit = new THREE.Mesh(
    new THREE.SphereGeometry(0.17 * (opts.scale || 1), 12, 12),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  headHit.userData.hitPart = "head";
  headHit.position.set(0, targetH * 0.82, 0.02);
  root.add(headHit);

  const weaponType = opts.weaponType || "ak47";
  const { gun, weaponPivot, handR } = attachWeaponToBlockbenchBody(
    body,
    model,
    weaponType,
    opts.shirt || 0x2266aa,
    opts.withRifle !== false
  );

  root.scale.setScalar(opts.scale || 1);
  root.userData.playerAvatar = true;
  root.userData.blockbenchHero = true;

  return {
    group: root,
    hitMeshes: [headHit],
    head: headHit,
    gun,
    weaponPivot,
    handR,
    rig: handR ? { gunPivot: handR.children.find((c) => c.name === "gunPivot"), handR } : null,
    mixer: null,
    playerModel: true,
  };
}

function equipRealWeapon(body, buildOpts, weaponType, withRifle) {
  if (!withRifle) return;
  const handR = body.handR || body.rig?.handR;
  if (handR) {
    const gunPivot = handR.children.find((c) => c.name === "gunPivot") || body.rig?.gunPivot;
    if (gunPivot) gunPivot.clear();
    const wp = buildNpcWeapon(weaponType, buildOpts.shirt);
    const attached = gunPivot
      ? attachStylizedWeapon({ gunPivot }, wp, weaponType)
      : attachWeaponToCharacter(body, wp, weaponType);
    body.gun = attached.gun;
    body.weaponPivot = attached.pivot;
    body.weaponType = weaponType;
    return;
  }
  const wp = buildNpcWeapon(weaponType, buildOpts.shirt);
  const attached = attachWeaponToCharacter(body, wp, weaponType);
  body.gun = attached.gun;
  body.weaponPivot = attached.pivot;
  body.weaponType = weaponType;
}

/**
 * Monta o personagem do jogador com loadout + skin de personagem.
 */
export function buildPlayerCharacter(options = {}) {
  const {
    loadout = null,
    characterSkin = "soldier",
    scale = 1,
    withRifle = true,
    weaponType = "ak47",
    team = "ct",
    portrait = false,
  } = options;

  const skinId = characterSkin || "soldier";
  const normalized = normalizeLoadout(
    loadout ?? (typeof window !== "undefined" ? window.__playerLoadout : null)
  );
  const buildOpts = loadoutToBuildOpts(normalized);

  if (skinId.startsWith("among")) {
    const among = buildAmongUsCharacter(skinId, scale * (portrait ? 0.95 : 1.1), normalized);
    among.group.userData.playerAvatar = true;
    return { ...among, playerModel: true };
  }

  const body = buildBlockbenchPlayer(skinId, {
    scale,
    portrait,
    withRifle,
    weaponType,
    shirt: buildOpts.shirt,
    team,
  });

  if (withRifle && weaponType !== body.weaponType) {
    equipRealWeapon(body, buildOpts, weaponType, withRifle);
  }

  return body;
}

export function isPlayerBlockbenchReady() {
  return isBlockbenchModelReady("player_hero");
}
