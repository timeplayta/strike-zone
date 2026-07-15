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
import { buildNpcWeapon, attachStylizedWeapon, ensureBlockbenchGunPivot } from "./npc-weapon.js";

const FACE_COLORS = {
  eyeWhite: 0xf4f4f8,
  eyeDark: 0x181820,
  faceInk: 0x2a1810,
  skin: 0xc4956a,
};

const MESH_SLOT_PATTERNS = {
  shirt: [/torso/i, /chest/i, /upper_arm/i, /forearm/i, /sleeve/i, /jacket/i, /shirt/i, /body(?!_)/i],
  pants: [/pants/i, /thigh/i, /shin/i, /leg/i, /trouser/i, /jogger/i],
  gloves: [/glove/i, /hand_r/i, /hand_l/i, /handR/i, /handL/i],
  shoes: [/shoe/i, /boot/i, /sneaker/i, /foot/i],
  helmet: [/helmet/i, /cap(?!_hair)/i, /hood/i, /visor/i, /mask/i],
  hair: [/hair/i],
  skin: [/head(?!_hit)/i, /neck/i, /face/i, /ear/i],
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

/** Rosto legível — offsets LOCAIS na cabeça (não world 1.5) */
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

  const face = new THREE.Group();
  face.name = "runtimeFace";
  const y = head ? 0.04 : 1.52;
  const fz = head ? 0.11 : -0.17;

  addFacePart(face, new THREE.BoxGeometry(0.045, 0.036, 0.018), FACE_COLORS.eyeWhite, -0.055, y + 0.02, fz);
  addFacePart(face, new THREE.BoxGeometry(0.045, 0.036, 0.018), FACE_COLORS.eyeWhite, 0.055, y + 0.02, fz);
  addFacePart(face, new THREE.BoxGeometry(0.022, 0.022, 0.012), FACE_COLORS.eyeDark, -0.055, y + 0.016, fz + 0.01);
  addFacePart(face, new THREE.BoxGeometry(0.022, 0.022, 0.012), FACE_COLORS.eyeDark, 0.055, y + 0.016, fz + 0.01);
  addFacePart(face, new THREE.BoxGeometry(0.048, 0.01, 0.014), FACE_COLORS.faceInk, -0.055, y + 0.048, fz - 0.002);
  addFacePart(face, new THREE.BoxGeometry(0.048, 0.01, 0.014), FACE_COLORS.faceInk, 0.055, y + 0.048, fz - 0.002);
  addFacePart(face, new THREE.BoxGeometry(0.028, 0.03, 0.02), FACE_COLORS.skin, 0, y - 0.02, fz + 0.008);
  addFacePart(face, new THREE.BoxGeometry(0.07, 0.014, 0.02), FACE_COLORS.faceInk, 0, y - 0.065, fz + 0.006);

  if (head) head.add(face);
  else model.add(face);

  model.userData.faceDecorated = true;
}

function tintMeshMaterial(mesh, color, neon = false) {
  if (!mesh?.isMesh || !mesh.material) return;
  const wasArray = Array.isArray(mesh.material);
  const mats = wasArray ? mesh.material : [mesh.material];
  const nextMats = mats.map((mat) => {
    if (!mat) return mat;
    const next = mat.clone();
    if (next.color) next.color.setHex(color);
    if (neon) {
      if ("emissive" in next) {
        next.emissive = new THREE.Color(color);
        next.emissiveIntensity = 0.45;
      }
    } else if ("emissive" in next) {
      next.emissive = new THREE.Color(0x000000);
      next.emissiveIntensity = 0;
    }
    if ("roughness" in next) next.roughness = neon ? 0.35 : Math.min(0.92, (next.roughness ?? 0.7) + 0.05);
    return next;
  });
  mesh.material = wasArray ? nextMats : nextMats[0];
}

function nameMatches(name, patterns) {
  return patterns.some((re) => re.test(name));
}

function applyLoadoutColorsToModel(model, buildOpts) {
  if (!model || !buildOpts) return;
  model.traverse((obj) => {
    if (!obj.isMesh || !obj.name) return;
    const n = obj.name;
    if (nameMatches(n, MESH_SLOT_PATTERNS.hair)) return;
    if (nameMatches(n, MESH_SLOT_PATTERNS.shirt)) tintMeshMaterial(obj, buildOpts.shirt, !!buildOpts.shirtNeon);
    else if (nameMatches(n, MESH_SLOT_PATTERNS.pants)) tintMeshMaterial(obj, buildOpts.pants, !!buildOpts.pantsNeon);
    else if (nameMatches(n, MESH_SLOT_PATTERNS.gloves)) tintMeshMaterial(obj, buildOpts.gloves, !!buildOpts.glovesNeon);
    else if (nameMatches(n, MESH_SLOT_PATTERNS.shoes)) tintMeshMaterial(obj, buildOpts.shoes, !!buildOpts.shoesNeon);
    else if (nameMatches(n, MESH_SLOT_PATTERNS.helmet) && (buildOpts.helmet || buildOpts.accessory)) {
      tintMeshMaterial(obj, buildOpts.helmetColor || buildOpts.capColor || 0x2a4a7a, !!buildOpts.helmetNeon);
    } else if (nameMatches(n, MESH_SLOT_PATTERNS.skin) && buildOpts.skin) {
      tintMeshMaterial(obj, buildOpts.skin, false);
    }
  });
}

function hideBakedHairAndHelmet(model, opts) {
  if (!model) return;
  const fullHelmet = !!opts.helmet;
  model.traverse((obj) => {
    if (!obj.name) return;
    const n = obj.name.toLowerCase();
    if (n.includes("hair_cap") || n === "hair" || n.includes("hair_")) {
      obj.visible = false;
    }
    if (!fullHelmet && (n.includes("helmet_cap") || n.includes("helmet_shell"))) {
      if (opts.accessory !== "cap") obj.visible = false;
    }
  });
}

function buildHairMesh(style, color, neon = false) {
  const group = new THREE.Group();
  group.name = "runtimeHair";
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: neon ? 0.35 : 0.78,
    metalness: neon ? 0.25 : 0.04,
    emissive: neon ? new THREE.Color(color) : new THREE.Color(0x000000),
    emissiveIntensity: neon ? 0.4 : 0,
  });

  if (style === "spike") {
    for (let i = 0; i < 7; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 5), mat);
      const a = (i / 7) * Math.PI * 2;
      spike.position.set(Math.cos(a) * 0.07, 0.14 + (i % 2) * 0.02, Math.sin(a) * 0.05 - 0.02);
      spike.rotation.x = -0.35;
      group.add(spike);
    }
    const base = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), mat);
    base.position.set(0, 0.08, -0.01);
    group.add(base);
  } else if (style === "slick") {
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.115, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.52), mat);
    top.position.set(0, 0.09, -0.01);
    top.scale.set(1.05, 0.85, 1.1);
    group.add(top);
    const fringe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.06), mat);
    fringe.position.set(0, 0.06, 0.08);
    fringe.rotation.x = 0.4;
    group.add(fringe);
  } else if (style === "curly") {
    for (let i = 0; i < 9; i++) {
      const curl = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), mat);
      const a = (i / 9) * Math.PI * 2;
      curl.position.set(Math.cos(a) * 0.09, 0.1 + (i % 3) * 0.02, Math.sin(a) * 0.07 - 0.01);
      group.add(curl);
    }
  } else if (style === "fade") {
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), mat);
    top.position.set(0, 0.1, -0.01);
    group.add(top);
    const sides = new THREE.Mesh(
      new THREE.SphereGeometry(0.105, 10, 8, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.35),
      mat
    );
    sides.position.set(0, 0.02, 0);
    sides.scale.set(1.05, 0.7, 1);
    group.add(sides);
  } else {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.112, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), mat);
    cap.position.set(0, 0.085, -0.01);
    group.add(cap);
    const fringe = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.035, 0.05), mat);
    fringe.position.set(0, 0.055, 0.085);
    fringe.rotation.x = 0.25;
    group.add(fringe);
  }
  return group;
}

function attachHairToModel(model, buildOpts) {
  if (!model || !buildOpts) return;
  const old = model.getObjectByName("runtimeHair");
  if (old) old.parent?.remove(old);

  hideBakedHairAndHelmet(model, buildOpts);

  const style = buildOpts.helmet ? "fade" : buildOpts.hairStyle || "short";
  const hair = buildHairMesh(style, buildOpts.hairColor || 0x3a2414, !!buildOpts.hairNeon);
  if (buildOpts.helmet) hair.scale.setScalar(0.72);

  const head = model.getObjectByName("head");
  if (head) {
    hair.position.set(0, 0.1, -0.01);
    head.add(hair);
  } else {
    hair.position.set(0, 1.58, -0.02);
    model.add(hair);
  }
}

function applyAvatarLook(model, buildOpts) {
  if (!model || !buildOpts) return;
  applyLoadoutColorsToModel(model, buildOpts);
  attachHairToModel(model, buildOpts);
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
  const gunPivot = ensureBlockbenchGunPivot(model);
  const wp = buildNpcWeapon(weaponType, shirt);
  const attached = attachStylizedWeapon({ gunPivot }, wp, weaponType);
  return {
    gun: attached.gun,
    weaponPivot: attached.pivot,
    handR: handR || model,
    gunPivot,
    rig: { gunPivot, handR: handR || model },
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
    applyAvatarLook(model, opts.buildOpts);
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
    buildOpts: opts.buildOpts,
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
    rig: rig.rig || (rig.gunPivot ? { gunPivot: rig.gunPivot, handR: rig.handR } : null),
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
  body.rig = rig.rig || (rig.gunPivot ? { gunPivot: rig.gunPivot, handR: rig.handR } : null);
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
    buildOpts,
  });

  if (withRifle && weaponType !== body.weaponType) {
    equipRealWeapon(body, buildOpts, weaponType, withRifle);
  }

  return body;
}

export function isPlayerBlockbenchReady() {
  return isBlockbenchModelReady("player_hero");
}
