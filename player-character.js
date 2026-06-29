/**
 * Personagem do JOGADOR — corpo humano base (pele nos braços/rosto) + peças do loadout.
 * Skins completas (Among Us, Neon, Cowboy…) usam modelos Blockbench próprios.
 * Inimigos continuam no human-model.js (Mixamo Soldier).
 */

import * as THREE from "three";
import { buildStylizedHuman } from "./stylized-character.js";
import { loadoutToBuildOpts, normalizeLoadout } from "./character-loadout.js";
import { buildAmongUsCharacter } from "./among-us-model.js";
import { upgradeWithBlockbenchModel } from "./blockbench-model-loader.js";
import { buildNpcWeapon, attachStylizedWeapon, attachWeaponToCharacter } from "./npc-weapon.js";

const BLOCKBENCH_FULL_BODY = {
  neon_runner: { key: "player_neon_runner", w: 1.05, h: 1.82 },
  shadow: { key: "player_shadow", w: 1.02, h: 1.78 },
  trevas_horror: { key: "player_shadow", w: 1.08, h: 1.85 },
  birthday_hero: { key: "player_birthday", w: 1.06, h: 1.8 },
  cowboy_sheriff: { key: "cowboy_sheriff", w: 1.05, h: 1.82 },
  cowboy_outlaw: { key: "cowboy_outlaw", w: 1.05, h: 1.82 },
  cowboy_vaqueiro: { key: "cowboy_vaqueiro", w: 1.04, h: 1.8 },
};

export function getPlayerBlockbenchSkin(skinId) {
  return BLOCKBENCH_FULL_BODY[skinId] || null;
}

function buildBlockbenchPlayer(skinId, opts) {
  const cfg = BLOCKBENCH_FULL_BODY[skinId];
  const root = new THREE.Group();
  const anchor = new THREE.Group();
  anchor.name = "playerBody";
  root.add(anchor);
  upgradeWithBlockbenchModel(root, cfg.key, {
    targetWidth: cfg.w,
    targetHeight: opts.portrait ? cfg.h * 0.95 : cfg.h,
  });

  const handR = new THREE.Group();
  handR.position.set(0.32, cfg.h * 0.58, 0.1);
  root.add(handR);

  const headHit = new THREE.Mesh(
    new THREE.SphereGeometry(0.11 * (opts.scale || 1), 10, 10),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  headHit.userData.hitPart = "head";
  headHit.position.set(0, cfg.h * 0.88, 0);
  root.add(headHit);

  let gun = null;
  let weaponPivot = null;
  if (opts.withRifle !== false) {
    const weaponType = opts.weaponType || "ak47";
    const wp = buildNpcWeapon(weaponType, opts.shirt || 0x2266aa);
    const gunPivot = new THREE.Group();
    gunPivot.name = "gunPivot";
    handR.add(gunPivot);
    const attached = attachStylizedWeapon({ gunPivot }, wp, weaponType);
    gun = attached.gun;
    weaponPivot = attached.pivot;
  }

  root.scale.setScalar(opts.scale || 1);
  root.userData.playerAvatar = true;

  return {
    group: root,
    hitMeshes: [headHit],
    head: headHit,
    gun,
    weaponPivot,
    handR,
    rig: null,
    mixer: null,
    playerModel: true,
  };
}

function equipRealWeapon(body, buildOpts, weaponType, withRifle) {
  if (!withRifle) return;
  const wp = buildNpcWeapon(weaponType, buildOpts.shirt);
  const attached = attachWeaponToCharacter(body, wp, weaponType);
  body.gun = attached.gun;
  body.weaponPivot = attached.pivot;
  body.weaponType = weaponType;
  if (body.rig?.handL && weaponType !== "glock" && weaponType !== "revolver") {
    body.rig.handL.position.z = 0.04;
  }
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

  if (skinId.startsWith("among")) {
    const among = buildAmongUsCharacter(skinId, scale * (portrait ? 0.95 : 1.1), normalized);
    among.group.userData.playerAvatar = true;
    return { ...among, playerModel: true };
  }

  if (BLOCKBENCH_FULL_BODY[skinId]) {
    const buildOpts = loadoutToBuildOpts(normalized);
    return buildBlockbenchPlayer(skinId, {
      scale,
      portrait,
      withRifle,
      weaponType,
      shirt: buildOpts.shirt,
    });
  }

  const buildOpts = loadoutToBuildOpts(normalized);
  buildOpts.scale = scale;
  buildOpts.withRifle = false;
  buildOpts.team = team;

  const body = buildStylizedHuman(buildOpts);
  equipRealWeapon(body, buildOpts, weaponType, withRifle);
  body.group.userData.playerAvatar = true;
  return { ...body, playerModel: true };
}
