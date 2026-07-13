/**
 * Personagem do JOGADOR — SOMENTE Blockbench (player_hero.glb).
 * Edite: assets/blockbench/characters/player_hero.bbmodel
 * Exporte o .glb para: assets/models/blockbench/characters/player_hero.glb
 */

import * as THREE from "three";
import { loadoutToBuildOpts, normalizeLoadout } from "./character-loadout.js";
import { buildAmongUsCharacter } from "./among-us-model.js";
import {
  cloneBlockbenchModelSync,
  preloadBlockbenchModels,
  isBlockbenchModelReady,
  waitForBlockbenchModel,
  fitBlockbenchModel,
} from "./blockbench-model-loader.js";
import { buildNpcWeapon, attachStylizedWeapon, ensureHandGunPivot } from "./npc-weapon.js";

const FACE_COLORS = {
  eyeWhite: 0xf4f4f8,
  eyeDark: 0x181820,
  faceInk: 0x2a1810,
  skin: 0xc4956a,
};

function faceMat(color, rough = 0.78) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.04 });
}

function addFacePart(group, geo, color, x, y, z) {
  const mesh = new THREE.Mesh(geo, faceMat(color));
  mesh.position.set(x, y, z);
  mesh.castShadow = false;
  group.add(mesh);
  return mesh;
}

/** Rosto legível no boneco Blockbench (olhos abertos, nariz, boca) */
export function decorateBlockbenchFace(model) {
  if (!model || model.userData.faceDecorated) return;

  for (const legacy of ["eye_closed_l", "eye_closed_r", "mouth_closed"]) {
    const old = model.getObjectByName(legacy);
    if (old) old.visible = false;
  }

  const head = model.getObjectByName("head");
  const hasFace =
    model.getObjectByName("eye_white_l") ||
    model.getObjectByName("eye_pupil_l") ||
    model.getObjectByName("mouth_smile");
  if (hasFace) {
    model.userData.faceDecorated = true;
    return;
  }

  const headY = 1.5;
  const headR = 0.2;
  const fz = -headR + 0.03;
  const face = new THREE.Group();
  face.name = "runtimeFace";

  addFacePart(face, new THREE.BoxGeometry(0.05, 0.04, 0.02), FACE_COLORS.eyeWhite, -0.065, headY + 0.028, fz);
  addFacePart(face, new THREE.BoxGeometry(0.05, 0.04, 0.02), FACE_COLORS.eyeWhite, 0.065, headY + 0.028, fz);
  addFacePart(face, new THREE.BoxGeometry(0.024, 0.024, 0.014), FACE_COLORS.eyeDark, -0.065, headY + 0.024, fz + 0.012);
  addFacePart(face, new THREE.BoxGeometry(0.024, 0.024, 0.014), FACE_COLORS.eyeDark, 0.065, headY + 0.024, fz + 0.012);
  addFacePart(face, new THREE.BoxGeometry(0.052, 0.012, 0.018), FACE_COLORS.faceInk, -0.065, headY + 0.058, fz - 0.004);
  addFacePart(face, new THREE.BoxGeometry(0.052, 0.012, 0.018), FACE_COLORS.faceInk, 0.065, headY + 0.058, fz - 0.004);
  addFacePart(face, new THREE.BoxGeometry(0.03, 0.034, 0.024), FACE_COLORS.skin, 0, headY - 0.012, fz + 0.006);
  addFacePart(face, new THREE.BoxGeometry(0.082, 0.018, 0.026), FACE_COLORS.faceInk, 0, headY - 0.072, fz + 0.004);

  if (head) head.add(face);
  else model.add(face);

  model.userData.faceDecorated = true;
}

const BLOCKBENCH_FULL_BODY = {
  soldier: { key: "player_hero", w: 1.05, h: 1.82 },
  operator: { key: "operator", w: 1.05, h: 1.82 },
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
  const keys = [...new Set(Object.values(BLOCKBENCH_FULL_BODY).map((c) => c.key))];
  return preloadBlockbenchModels(keys);
}

function attachWeaponRig(model, weaponType, shirt, withRifle) {
  if (!withRifle || !model) {
    return { gun: null, weaponPivot: null, handR: null, gunPivot: null };
  }

  const handR = model.getObjectByName("hand_r") || model.getObjectByName("handR");
  const anchor = handR || model;

  let gunPivot = handR ? ensureHandGunPivot(anchor) : anchor.getObjectByName("gunPivot");
  if (!gunPivot && !handR) {
    gunPivot = new THREE.Group();
    gunPivot.name = "gunPivot";
    gunPivot.position.set(0.12, 0.92, -0.38);
    gunPivot.rotation.set(-1.45, 0, 0.05);
    anchor.add(gunPivot);
  } else if (gunPivot) {
    gunPivot.clear();
  }

  const wp = buildNpcWeapon(weaponType, shirt);
  const attached = attachStylizedWeapon({ gunPivot }, wp, weaponType);
  return {
    gun: attached.gun,
    weaponPivot: attached.pivot,
    handR: handR || anchor,
    gunPivot,
  };
}

function mountBlockbenchBody(body, cfg, opts) {
  const fit = {
    targetWidth: cfg.w,
    targetHeight: opts.portrait ? cfg.h * 0.95 : cfg.h,
  };

  const applyModel = (model) => {
    if (!model) return null;
    body.userData.blockbenchApplied = true;
    body.userData.blockbenchModel = model;
    decorateBlockbenchFace(model);
    body.add(model);
    return model;
  };

  let model = cloneBlockbenchModelSync(cfg.key, fit);
  if (model) {
    applyModel(model);
  } else {
    waitForBlockbenchModel(cfg.key).then((template) => {
      if (!template || body.userData.blockbenchApplied) return;
      const m = template.clone(true);
      fitBlockbenchModel(m, fit.targetWidth, fit.targetHeight);
      m.userData.blockbenchMesh = true;
      applyModel(m);
      const rig = attachWeaponRig(m, opts.weaponType, opts.shirt, opts.withRifle !== false);
      body.userData.pendingRig = rig;
      window.dispatchEvent(new CustomEvent("strikezone-player-ready", { detail: { key: cfg.key } }));
    });
  }

  return model;
}

function buildBlockbenchPlayer(skinId, opts) {
  const cfg = getPlayerBlockbenchSkin(skinId);
  const root = new THREE.Group();
  const body = new THREE.Group();
  body.name = "playerBody";
  root.add(body);

  const targetH = opts.portrait ? cfg.h * 0.95 : cfg.h;
  const weaponType = opts.weaponType || "ak47";
  const withRifle = opts.withRifle !== false;

  const model = mountBlockbenchBody(body, cfg, {
    portrait: opts.portrait,
    weaponType,
    shirt: opts.shirt || 0x2266aa,
    withRifle,
  });

  const headHit = new THREE.Mesh(
    new THREE.SphereGeometry(0.17 * (opts.scale || 1), 12, 12),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  headHit.userData.hitPart = "head";
  headHit.position.set(0, targetH * 0.84, 0.02);
  root.add(headHit);

  const rig = model
    ? attachWeaponRig(model, weaponType, opts.shirt || 0x2266aa, withRifle)
    : { gun: null, weaponPivot: null, handR: null, gunPivot: null };

  root.scale.setScalar(opts.scale || 1);
  root.userData.playerAvatar = true;
  root.userData.blockbenchHero = true;
  root.userData.blockbenchKey = cfg.key;

  return {
    group: root,
    body,
    hitMeshes: [headHit],
    head: headHit,
    gun: rig.gun,
    weaponPivot: rig.weaponPivot,
    handR: rig.handR,
    rig: rig.gunPivot ? { gunPivot: rig.gunPivot, handR: rig.handR } : null,
    mixer: null,
    playerModel: true,
  };
}

function equipRealWeapon(body, buildOpts, weaponType, withRifle) {
  if (!withRifle) return;
  const model = body.body?.userData?.blockbenchModel || body.group?.children?.[0]?.userData?.blockbenchModel;
  const rig = attachWeaponRig(model || body.body, weaponType, buildOpts.shirt, withRifle);
  body.gun = rig.gun;
  body.weaponPivot = rig.weaponPivot;
  body.handR = rig.handR;
  body.rig = rig.gunPivot ? { gunPivot: rig.gunPivot, handR: rig.handR } : null;
  body.weaponType = weaponType;
}

export function buildPlayerCharacter(options = {}) {
  const {
    loadout = null,
    characterSkin = "soldier",
    scale = 1,
    withRifle = true,
    weaponType = "ak47",
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
  });

  if (withRifle && weaponType !== body.weaponType) {
    equipRealWeapon(body, buildOpts, weaponType, withRifle);
  }

  return body;
}

export function isPlayerBlockbenchReady() {
  return isBlockbenchModelReady("player_hero");
}
