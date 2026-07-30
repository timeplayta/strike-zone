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
import { isSpecialCharacter, buildSpecialCharacter } from "./special-characters.js";
import { isTacticalSkin, buildTacticalCharacter } from "./tactical-character.js";

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
  polishBlockbenchCharacter(model, buildOpts);
  updateRuntimeHandColors(model, buildOpts);
}

function meshLocalCenter(mesh) {
  if (!mesh?.geometry) return new THREE.Vector3();
  if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
  const c = new THREE.Vector3();
  mesh.geometry.boundingBox.getCenter(c);
  return c;
}

function bodySurfaceMat(color, neon = false) {
  const c = new THREE.Color(color);
  return new THREE.MeshStandardMaterial({
    color: c,
    roughness: neon ? 0.38 : 0.7,
    metalness: neon ? 0.14 : 0.05,
    flatShading: false,
    emissive: c.clone().multiplyScalar(neon ? 0.4 : 0.1),
    emissiveIntensity: neon ? 0.72 : 0.38,
  });
}

function buildLobbyRoundHand(side, skinColor, gloveColor, gloveNeon) {
  const g = new THREE.Group();
  g.name = side === "r" ? "runtimeHandR" : "runtimeHandL";
  const gloveMat = bodySurfaceMat(gloveColor, gloveNeon);
  const skinMat = bodySurfaceMat(skinColor);

  const palm = new THREE.Mesh(new THREE.SphereGeometry(0.084, 18, 14), gloveMat);
  palm.scale.set(1.14, 0.64, 1.28);
  g.add(palm);

  const heel = new THREE.Mesh(new THREE.SphereGeometry(0.068, 16, 12), gloveMat);
  heel.scale.set(0.96, 0.54, 1.08);
  heel.position.set(0, -0.014, 0.02);
  g.add(heel);

  const wrist = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), skinMat);
  wrist.scale.set(1.06, 0.74, 1.1);
  wrist.position.set(0, 0.01, 0.044);
  g.add(wrist);

  const sx = side === "r" ? 1 : -1;
  for (let i = 0; i < 4; i++) {
    const knuckle = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 10), skinMat);
    knuckle.position.set(sx * (-0.034 + i * 0.023), 0.026, -0.06);
    g.add(knuckle);
    const finger = new THREE.Mesh(new THREE.SphereGeometry(0.021, 12, 10), gloveMat);
    finger.scale.set(0.88, 1.42, 0.92);
    finger.position.set(sx * (-0.034 + i * 0.023), 0.006, -0.092 - (i % 2) * 0.01);
    g.add(finger);
  }

  const thumb = new THREE.Mesh(new THREE.SphereGeometry(0.027, 12, 10), gloveMat);
  thumb.scale.set(1, 1.45, 0.96);
  thumb.position.set(sx * 0.06, -0.008, -0.03);
  g.add(thumb);

  return { group: g, gloveMat, skinMat };
}

function enhanceBlockbenchHands(model, buildOpts) {
  if (!model) return;
  const skin = buildOpts?.skin || 0xc4956a;
  const glove = buildOpts?.gloves || 0x3a4048;
  const gloveNeon = !!buildOpts?.glovesNeon;

  for (const side of ["r", "l"]) {
    const runtimeName = side === "r" ? "runtimeHandR" : "runtimeHandL";
    model.getObjectByName(runtimeName)?.parent?.remove(model.getObjectByName(runtimeName));

    const handMesh = model.getObjectByName(`hand_${side}`);
    if (!handMesh?.isMesh) continue;

    const center = meshLocalCenter(handMesh);
    const { group, gloveMat, skinMat } = buildLobbyRoundHand(side, skin, glove, gloveNeon);
    group.position.copy(center);
    group.rotation.copy(handMesh.rotation);
    if (side === "l") group.rotation.y += 0.14;

    model.add(group);
    handMesh.visible = false;

    if (!model.userData.runtimeHands) model.userData.runtimeHands = {};
    model.userData.runtimeHands[side] = { group, gloveMat, skinMat };
  }
  model.userData.handsEnhanced = true;
}

function applyMatColorDirect(mat, hex, neon = false) {
  if (!mat) return;
  const c = new THREE.Color(hex);
  mat.color.copy(c);
  if (mat.emissive) mat.emissive.copy(c).multiplyScalar(neon ? 0.4 : 0.1);
  if ("emissiveIntensity" in mat) mat.emissiveIntensity = neon ? 0.72 : 0.38;
}

function updateRuntimeHandColors(model, buildOpts) {
  if (!model || !buildOpts) return;
  if (!model.userData.handsEnhanced) {
    enhanceBlockbenchHands(model, buildOpts);
    return;
  }
  const skin = buildOpts.skin || 0xc4956a;
  const glove = buildOpts.gloves || 0x3a4048;
  const gloveNeon = !!buildOpts.glovesNeon;
  for (const side of ["r", "l"]) {
    const h = model.userData.runtimeHands?.[side];
    if (!h) continue;
    applyMatColorDirect(h.gloveMat, glove, gloveNeon);
    applyMatColorDirect(h.skinMat, skin, false);
  }
}

function polishBlockbenchCharacter(model, buildOpts) {
  if (!model) return;
  model.traverse((obj) => {
    if (!obj.isMesh || !obj.material || obj.userData.replacedByRuntimeHand) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of mats) {
      if (!m?.isMeshStandardMaterial) continue;
      m.flatShading = false;
      const n = obj.name || "";
      if (nameMatches(n, MESH_SLOT_PATTERNS.skin) || nameMatches(n, MESH_SLOT_PATTERNS.gloves)) {
        m.roughness = Math.min(m.roughness ?? 0.85, 0.74);
      }
      if (nameMatches(n, MESH_SLOT_PATTERNS.skin) && m.emissive) {
        m.emissive.setHex(buildOpts?.skin || 0xc4956a);
        m.emissiveIntensity = 0.07;
      }
    }
  });
  if (!model.userData.handsEnhanced) enhanceBlockbenchHands(model, buildOpts);
  model.userData.polished = true;
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
    if (opts.withRifle !== false) {
      const rig = attachWeaponRig(model, opts.weaponType, opts.shirt, true);
      body.userData.pendingRig = rig;
    }
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
      window.dispatchEvent(new CustomEvent("strikezone-player-ready", { detail: { key: cfg.key } }));
    });
  }

  return model;
}

function mergePendingRig(body, rig) {
  if (!body || !rig) return body;
  body.gun = rig.gun;
  body.weaponPivot = rig.weaponPivot;
  body.handR = rig.handR;
  body.rig = rig.rig || (rig.gunPivot ? { gunPivot: rig.gunPivot, handR: rig.handR } : null);
  return body;
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
    ? body.userData.pendingRig || attachWeaponRig(model, weaponType, opts.shirt || 0x2266aa, withRifle)
    : { gun: null, weaponPivot: null, handR: null, gunPivot: null };

  root.scale.setScalar(opts.scale || 1);
  root.userData.playerAvatar = true;
  root.userData.blockbenchHero = true;
  root.userData.blockbenchKey = cfg.key;

  const result = {
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

  if (!model && body.userData.pendingRigPromise !== true) {
    body.userData.pendingRigPromise = true;
    waitForBlockbenchModel(cfg.key).then(() => {
      mergePendingRig(result, body.userData.pendingRig);
      window.dispatchEvent(new CustomEvent("strikezone-player-ready", { detail: { key: cfg.key } }));
    });
  }

  return result;
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
    characterSkin = "ct_tactical",
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

  if (isSpecialCharacter(skinId)) {
    const special = buildSpecialCharacter(skinId, {
      scale: scale * (portrait ? 0.95 : 1),
      withRifle,
      weaponType,
      shirt: buildOpts.shirt,
    });
    if (special) return special;
  }

  if (isTacticalSkin(skinId)) {
    const team = skinId === "terrorist" ? "t" : "ct";
    return buildTacticalCharacter({
      team,
      loadout: normalized,
      scale: scale * (portrait ? 0.95 : 1),
      weaponType,
      withRifle,
    });
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
