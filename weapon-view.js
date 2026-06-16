import * as THREE from "three";

import { buildNpcWeapon } from "./npc-weapon.js";
import { applyWeaponSkin, findWeaponSkinItem } from "./weapon-skin-apply.js";

import { buildMeleeFpsModel } from "./melee-weapons.js";



function makeFpsWeapon(type, scale, tint) {

  const g = buildNpcWeapon(type, tint);

  g.scale.setScalar(scale);

  g.rotation.set(0, Math.PI, 0);
  g.userData.basePos = { x: 0, y: 0, z: 0 };
  g.userData.baseRot = { x: 0, y: Math.PI, z: 0 };

  g.position.set(0, 0, 0);

  return g;

}

function matHand(color, roughness = 0.72) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.02 });
}

/** Cria um dedo articulado com 3 falanges + esferas de juntas */
function makeFinger(baseX, baseY, baseZ, baseCurl, lenMult, mat) {
  const root = new THREE.Group();
  root.position.set(baseX, baseY, baseZ);
  root.rotation.x = baseCurl;

  const lm = lenMult;

  // Falange proximal
  const prox = new THREE.Mesh(new THREE.CylinderGeometry(0.0082, 0.0095, 0.036 * lm, 10), mat);
  prox.position.y = -0.018 * lm;
  root.add(prox);

  // Junta 1
  const j1 = new THREE.Mesh(new THREE.SphereGeometry(0.0095, 8, 6), mat);
  j1.position.y = -0.036 * lm;
  root.add(j1);

  // Pivot da falange média
  const midPivot = new THREE.Group();
  midPivot.position.y = -0.036 * lm;
  midPivot.rotation.x = 0.38;
  root.add(midPivot);

  const mid = new THREE.Mesh(new THREE.CylinderGeometry(0.0072, 0.0082, 0.03 * lm, 10), mat);
  mid.position.y = -0.015 * lm;
  midPivot.add(mid);

  // Junta 2
  const j2 = new THREE.Mesh(new THREE.SphereGeometry(0.0078, 8, 6), mat);
  j2.position.y = -0.03 * lm;
  midPivot.add(j2);

  // Pivot da falange distal
  const distPivot = new THREE.Group();
  distPivot.position.y = -0.03 * lm;
  distPivot.rotation.x = 0.32;
  midPivot.add(distPivot);

  const dist = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.0072, 0.024 * lm, 8), mat);
  dist.position.y = -0.012 * lm;
  distPivot.add(dist);

  // Ponta do dedo
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.0065, 8, 6), mat);
  tip.position.y = -0.024 * lm;
  distPivot.add(tip);

  return root;
}

/** Cria o polegar com 2 falanges + metacarpo */
function makeThumb(posX, posY, posZ, s, mat) {
  const root = new THREE.Group();
  root.position.set(posX, posY, posZ);
  root.rotation.set(0.82, 0, s * -0.88);

  // Metacarpo
  const meta = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.038, 10), mat);
  meta.position.y = -0.019;
  root.add(meta);

  // Junta base
  const jb = new THREE.Mesh(new THREE.SphereGeometry(0.013, 8, 6), mat);
  jb.position.y = -0.038;
  root.add(jb);

  // Falange proximal
  const p1 = new THREE.Group();
  p1.position.y = -0.038;
  p1.rotation.x = 0.28;
  root.add(p1);

  const p1m = new THREE.Mesh(new THREE.CylinderGeometry(0.0095, 0.012, 0.038, 10), mat);
  p1m.position.y = -0.019;
  p1.add(p1m);

  const tj = new THREE.Mesh(new THREE.SphereGeometry(0.0105, 8, 6), mat);
  tj.position.y = -0.038;
  p1.add(tj);

  // Falange distal
  const p2 = new THREE.Group();
  p2.position.y = -0.038;
  p2.rotation.x = 0.25;
  p1.add(p2);

  const p2m = new THREE.Mesh(new THREE.CylinderGeometry(0.0078, 0.0095, 0.032, 8), mat);
  p2m.position.y = -0.016;
  p2.add(p2m);

  const ttip = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 8, 6), mat);
  ttip.position.y = -0.032;
  p2.add(ttip);

  return root;
}

function makeFpsHand(side, skinMat, gloveMat) {
  const s = side === "left" ? -1 : 1;
  const isRight = side === "right";
  const g = new THREE.Group();

  const sleeveMat = new THREE.MeshStandardMaterial({ color: 0x1b2534, roughness: 0.9, metalness: 0.05 });

  // Braço superior
  const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.037, 0.035, 0.33, 14), sleeveMat);
  upper.position.set(s * 0.21, -0.23, 0.05);
  upper.rotation.set(Math.PI / 2, 0, s * 0.1);
  upper.scale.x = 0.86;
  g.add(upper);

  // Antebraço
  const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.031, 0.35, 14), sleeveMat);
  forearm.position.set(s * 0.15, -0.19, -0.15);
  forearm.rotation.set(Math.PI / 2, 0, s * 0.17);
  forearm.scale.x = 0.82;
  g.add(forearm);

  // Pulso
  const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.029, 0.032, 0.065, 14), gloveMat);
  wrist.position.set(s * 0.09, -0.118, -0.304);
  wrist.rotation.set(Math.PI / 2, 0, 0);
  g.add(wrist);

  // Palma
  const palmPivot = new THREE.Group();
  palmPivot.position.set(s * 0.075, -0.108, -0.356);
  palmPivot.rotation.set(0.14, 0, s * 0.1);
  g.add(palmPivot);

  palmPivot.add(new THREE.Mesh(new THREE.BoxGeometry(0.078, 0.044, 0.09), gloveMat));

  // Nós dos dedos (detalhe visual da palma)
  for (let i = 0; i < 4; i++) {
    const km = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), gloveMat);
    km.position.set(s * (-0.026 + i * 0.018), 0.022, -0.044);
    palmPivot.add(km);
  }

  // 4 dedos: indicador, médio, anelar, mínimo
  // Mão direita: indicador menos curvado (posição de gatilho)
  // Mão esquerda: todos moderadamente curvados (suporte)
  const fingerDefs = isRight
    ? [
        { dx: s * -0.024, curl: 0.72, len: 1.0  },
        { dx: s * -0.007, curl: 1.26, len: 1.08 },
        { dx: s *  0.009, curl: 1.24, len: 1.0  },
        { dx: s *  0.024, curl: 1.28, len: 0.82 },
      ]
    : [
        { dx: s * -0.024, curl: 1.22, len: 1.0  },
        { dx: s * -0.007, curl: 1.25, len: 1.08 },
        { dx: s *  0.009, curl: 1.23, len: 1.0  },
        { dx: s *  0.024, curl: 1.27, len: 0.82 },
      ];

  for (const fd of fingerDefs) {
    g.add(makeFinger(s * 0.075 + fd.dx, -0.094, -0.402, fd.curl, fd.len, gloveMat));
  }

  // Polegar
  g.add(makeThumb(s * 0.109, -0.097, -0.346, s, gloveMat));

  return g;
}

function createFpsHands() {
  const group = new THREE.Group();
  group.name = "fpsCharacterHands";
  group.userData.skinColor = 0xc4956a;
  group.userData.gloveColor = 0x111111;
  const skinMat = matHand(group.userData.skinColor, 0.66);
  const gloveMat = matHand(group.userData.gloveColor, 0.78);
  group.userData.skinMat = skinMat;
  group.userData.gloveMat = gloveMat;

  const rightHand = makeFpsHand("right", skinMat, gloveMat);
  const leftHand = makeFpsHand("left", skinMat, gloveMat);
  // Mão esquerda mais avançada (apoio no guardamão)
  leftHand.position.z = -0.07;
  group.add(leftHand, rightHand);
  group.position.set(0, 0.02, 0.02);
  return group;
}

function updateFpsHandsFromLoadout(view) {
  const hands = view?.hands;
  if (!hands) return;
  const loadout = window.__playerLoadout || {};
  const skin = loadout.skin || 0xc4956a;
  const glove = loadout.gloves?.color || 0x111111;
  if (skin !== hands.userData.skinColor) {
    hands.userData.skinColor = skin;
    hands.userData.skinMat.color.setHex(skin);
  }
  if (glove !== hands.userData.gloveColor) {
    hands.userData.gloveColor = glove;
    hands.userData.gloveMat.color.setHex(glove);
  }
}



export function createWeaponView(camera) {

  const root = new THREE.Group();

  root.position.set(0.22, -0.18, -0.42);

  camera.add(root);



  const akGroup = makeFpsWeapon("ak47", 2.35, 0x5c3a1e);

  const scarGroup = makeFpsWeapon("scar", 2.2, 0x3a4a55);

  scarGroup.visible = false;

  const m4Group = makeFpsWeapon("m4", 2.15, 0x3d4a38);

  m4Group.visible = false;

  const umpGroup = makeFpsWeapon("ump45", 2.05, 0x2a2a32);

  umpGroup.visible = false;

  const awmGroup = makeFpsWeapon("awm", 2.5, 0x4a3a28);

  awmGroup.visible = false;

  const shotgunGroup = makeFpsWeapon("doze", 2.3, 0x6b4423);

  shotgunGroup.visible = false;

  const bazookaGroup = makeFpsWeapon("bazooka", 2.65, 0x45305f);

  bazookaGroup.visible = false;



  const glockGroup = makeFpsWeapon("glock", 1.85, 0x2a2a30);

  glockGroup.visible = false;

  const revolverGroup = makeFpsWeapon("revolver", 1.95, 0x6b3f1f);

  revolverGroup.visible = false;



  const knifeBlade = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.04, 0.22),
    new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.35, metalness: 0.75 })
  );
  const knifeHandle = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.06, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.85 })
  );
  knifeHandle.position.z = 0.12;
  const knifeGroup = new THREE.Group();
  knifeGroup.add(knifeBlade, knifeHandle);
  knifeGroup.visible = false;



  const meleeModels = {

    faca: knifeGroup,

    facao: buildMeleeFpsModel("facao"),

    porrete: buildMeleeFpsModel("porrete"),

    katana: buildMeleeFpsModel("katana"),

  };

  meleeModels.facao.visible = false;

  meleeModels.porrete.visible = false;

  meleeModels.katana.visible = false;



  root.add(

    akGroup, scarGroup, m4Group, umpGroup, awmGroup, shotgunGroup, bazookaGroup, glockGroup, revolverGroup,

    knifeGroup, meleeModels.facao, meleeModels.porrete, meleeModels.katana

  );

  const hands = createFpsHands();
  root.add(hands);



  const muzzleFlash = new THREE.Mesh(

    new THREE.SphereGeometry(0.06, 6, 6),

    new THREE.MeshBasicMaterial({ color: 0xffaa33, transparent: true, opacity: 0.95 })

  );

  muzzleFlash.position.set(0, 0.02, -0.55);

  muzzleFlash.visible = false;

  root.add(muzzleFlash);



  const flashLight = new THREE.PointLight(0xff8844, 0, 3);

  flashLight.position.copy(muzzleFlash.position);

  root.add(flashLight);



  return {

    root,

    primaryModels: {

      ak47: akGroup,

      scar: scarGroup,

      m4: m4Group,

      ump45: umpGroup,

      awm: awmGroup,

      doze: shotgunGroup,

      bazooka: bazookaGroup,

    },

    meleeModels,

    secondaryModels: { glock: glockGroup, revolver: revolverGroup },

    models: { 1: akGroup, 2: glockGroup, 3: knifeGroup },

    muzzleFlash,

    flashLight,
    hands,

    recoil: 0,
    reloadAnim: 0,

    currentPrimary: "ak47",

    currentSecondary: "glock",

    currentMelee: "faca",

    adsBlend: 0,

    basePos: { x: 0.22, y: -0.18, z: -0.42 },

  };

}



const MUZZLE_Z = {

  ak47: -0.55,

  scar: -0.52,

  m4: -0.5,

  ump45: -0.42,

  awm: -0.68,

  doze: -0.58,

  bazooka: -0.72,

  revolver: -0.36,

};



export function setWeaponView(view, slot, weaponId = "ak47") {

  if (slot === 1) {

    view.currentPrimary = weaponId;

    Object.entries(view.primaryModels).forEach(([k, g]) => {

      g.visible = k === weaponId;

    });

    Object.values(view.secondaryModels || {}).forEach((g) => { g.visible = false; });

    Object.values(view.meleeModels || {}).forEach((g) => { g.visible = false; });

    if (meleeId !== "faca") view.models[3].visible = false;

    const z = MUZZLE_Z[weaponId] ?? -0.55;

    view.muzzleFlash.position.set(0, 0.02, z);

  } else if (slot === 2) {

    Object.values(view.primaryModels).forEach((g) => { g.visible = false; });

    Object.values(view.meleeModels || {}).forEach((g) => { g.visible = false; });

    const secondaryId = view.secondaryModels?.[weaponId] ? weaponId : view.currentSecondary || "glock";

    view.currentSecondary = secondaryId;

    Object.entries(view.secondaryModels || {}).forEach(([k, g]) => { g.visible = k === secondaryId; });

    view.models[2] = view.secondaryModels?.[secondaryId] || view.models[2];

    view.models[3].visible = false;

    view.muzzleFlash.position.set(0, 0.04, MUZZLE_Z[secondaryId] ?? -0.22);

  } else if (slot === 3) {

    Object.values(view.primaryModels).forEach((g) => { g.visible = false; });

    Object.values(view.secondaryModels || {}).forEach((g) => { g.visible = false; });

    const meleeId = weaponId && view.meleeModels?.[weaponId] ? weaponId : view.currentMelee || "faca";

    view.currentMelee = meleeId;

    Object.entries(view.meleeModels || {}).forEach(([k, g]) => {

      g.visible = k === meleeId;

    });

    view.models[3].visible = false;

    view.muzzleFlash.position.set(0, 0, -0.2);

  } else {

    Object.values(view.primaryModels).forEach((g) => { g.visible = false; });

    Object.values(view.meleeModels || {}).forEach((g) => { g.visible = false; });

    Object.values(view.secondaryModels || {}).forEach((g) => { g.visible = false; });

    view.models[3].visible = false;

  }

}



export function setWeaponADS(view, active, weaponId) {

  view.adsWeapon = active ? weaponId : null;

}



export function triggerMuzzleFlash(view) {

  view.muzzleFlash.visible = true;

  view.flashLight.intensity = 2.5;

  view.recoil = 0.045;

  setTimeout(() => {

    view.muzzleFlash.visible = false;

    view.flashLight.intensity = 0;

  }, 55);

}



export function triggerMeleeSwing(view) {

  view.recoil = 0.08;

}

export function triggerReloadAnimation(view) {
  if (!view) return;
  view.reloadAnim = 1;
  view.reloadWeapon = view.models?.[2]?.visible ? (view.currentSecondary || "glock") : view.currentPrimary || "ak47";
}



export function updateWeaponView(view, dt, moving = false) {

  const t = performance.now() * 0.001;
  animateSkinFx(view, t);
  updateFpsHandsFromLoadout(view);

  const targetAds = view.adsWeapon ? 1 : 0;

  view.adsBlend += (targetAds - view.adsBlend) * Math.min(1, dt * 14);

  const b = view.adsBlend;
  view.reloadAnim = Math.max(0, (view.reloadAnim || 0) - dt * 2.8);
  const reload = view.reloadAnim || 0;
  resetWeaponModelPose(view);



  const hip = view.basePos;

  const adsOffsets = {

    ak47: { x: 0, y: -0.06, z: -0.12 },

    scar: { x: 0.02, y: -0.07, z: -0.14 },

    m4: { x: 0.01, y: -0.065, z: -0.13 },

    ump45: { x: 0.02, y: -0.05, z: -0.1 },

    awm: { x: 0, y: -0.1, z: -0.22 },

    doze: { x: 0, y: -0.055, z: -0.1 },

    bazooka: { x: 0, y: -0.075, z: -0.15 },

  };

  const off = adsOffsets[view.adsWeapon] || { x: 0, y: 0, z: 0 };



  view.root.position.x = hip.x + off.x * b;

  view.root.position.y = hip.y + off.y * b;

  view.root.position.z = hip.z + off.z * b;

  if (reload > 0) {
    applyReloadPose(view, reload);
    return;
  }



  if (view.recoil > 0) {

    view.recoil = Math.max(0, view.recoil - dt * 5.5);

    view.root.position.z += view.recoil * 0.55 * (1 - b * 0.5);

    view.root.rotation.x = view.recoil * 2.2;
    view.root.rotation.y = 0;
    view.root.rotation.z = 0;

  } else if (moving && b < 0.3) {

    view.root.position.z = hip.z + off.z * b + Math.sin(t * 14) * 0.014;

    view.root.position.y = hip.y + off.y * b + Math.abs(Math.cos(t * 14)) * 0.009;

    view.root.rotation.x = Math.sin(t * 7) * 0.018;
    view.root.rotation.y = 0;

    view.root.rotation.z = Math.sin(t * 5) * 0.008;

  } else {

    view.root.position.z = hip.z + off.z * b + Math.sin(t * 2) * 0.004 * (1 - b);

    view.root.rotation.x = 0;
    view.root.rotation.y = 0;

    view.root.rotation.z = 0;

  }

}

function animateSkinFx(view, t) {
  const groups = [
    ...Object.values(view.primaryModels || {}),
    ...Object.values(view.secondaryModels || {}),
  ].filter((g) => g?.visible);
  for (const g of groups) {
    if (g.userData.galaxySkin) {
      g.traverse((o) => {
        if (o.material?.map?.isCanvasTexture) {
          o.material.map.offset.x = (t * 0.025) % 1;
          o.material.map.offset.y = (t * 0.012) % 1;
        }
      });
    }
    g.traverse((o) => {
      if (!o.userData?.skinFx) return;
      if (o.userData.spin) o.rotation.z += 0.02 * o.userData.spin;
      if (o.userData.pulse) {
        const s = 1 + Math.sin(t * 4 + o.userData.pulse) * 0.18;
        o.scale.setScalar(s);
      }
      if (o.userData.float) {
        o.position.y = 0.12 + Math.sin(t * 2.6) * 0.025;
      }
      if (o.userData.ghost != null) {
        const phase = t * 2.1 + o.userData.ghost * 2.2;
        o.position.y = 0.1 + o.userData.ghost * 0.015 + Math.sin(phase) * 0.035;
        o.position.x = (o.userData.ghost - 1) * 0.06 + Math.cos(phase) * 0.025;
        if (o.material) o.material.opacity = 0.25 + (Math.sin(phase) + 1) * 0.18;
      }
    });
  }
}

function getReloadModel(view, weaponId) {
  if (view.secondaryModels?.[weaponId]) return view.secondaryModels[weaponId];
  return view.primaryModels?.[weaponId] || null;
}

function resetWeaponModelPose(view) {
  const groups = [...Object.values(view.primaryModels || {}), ...Object.values(view.secondaryModels || {})].filter(Boolean);
  for (const g of groups) {
    const p = g.userData.basePos || { x: 0, y: 0, z: 0 };
    const r = g.userData.baseRot || { x: 0, y: Math.PI, z: 0 };
    g.position.set(p.x, p.y, p.z);
    g.rotation.set(r.x, r.y, r.z);
  }
}

function applyReloadPose(view, reload) {
  const weaponId = view.reloadWeapon || view.currentPrimary || "ak47";
  const progress = 1 - reload;
  const pull = Math.sin(progress * Math.PI);
  const snap = Math.sin(progress * Math.PI * 2);
  const model = getReloadModel(view, weaponId);

  const profile = {
    ak47: { x: 0.12, y: -0.12, z: 0.08, rx: -0.34, ry: 0.28, rz: -0.2, mag: 0.045 },
    m4: { x: 0.1, y: -0.1, z: 0.06, rx: -0.28, ry: 0.2, rz: -0.16, mag: 0.035 },
    scar: { x: 0.11, y: -0.11, z: 0.07, rx: -0.3, ry: 0.24, rz: -0.18, mag: 0.038 },
    ump45: { x: 0.08, y: -0.09, z: 0.05, rx: -0.24, ry: 0.18, rz: -0.12, mag: 0.03 },
    awm: { x: 0.06, y: -0.08, z: 0.1, rx: -0.18, ry: -0.22, rz: 0.08, bolt: 0.075 },
    doze: { x: 0.05, y: -0.08, z: 0.1, rx: -0.2, ry: 0.08, rz: -0.08, pump: 0.12 },
    bazooka: { x: 0.08, y: -0.12, z: 0.14, rx: -0.24, ry: 0.1, rz: -0.12, bolt: 0.12 },
    glock: { x: 0.07, y: -0.08, z: 0.05, rx: -0.26, ry: 0.12, rz: -0.1, slide: 0.07 },
    revolver: { x: 0.06, y: -0.07, z: 0.05, rx: -0.22, ry: 0.14, rz: -0.12, slide: 0.04 },
  }[weaponId] || { x: 0.09, y: -0.1, z: 0.06, rx: -0.25, ry: 0.18, rz: -0.14, mag: 0.03 };

  view.root.position.x += profile.x * pull;
  view.root.position.y += profile.y * pull;
  view.root.position.z += profile.z * pull;
  view.root.rotation.x = profile.rx * pull;
  view.root.rotation.y = profile.ry * pull;
  view.root.rotation.z = profile.rz * pull;

  if (!model) return;
  if (profile.mag) model.position.y -= profile.mag * Math.max(0, snap);
  if (profile.bolt) model.position.z += profile.bolt * Math.max(0, snap);
  if (profile.pump) model.position.z += profile.pump * pull;
  if (profile.slide) model.position.z += profile.slide * Math.max(0, snap);
}



export function applyWeaponSkinToView(view, skins = {}) {
  if (!view) return;
  for (const [id, group] of Object.entries(view.primaryModels || {})) {
    const color = skins[id];
    if (color && group) {
      const item = findWeaponSkinItem(id, color);
      applyWeaponSkin(group, id, color, item?.id);
    }
  }
  for (const [id, group] of Object.entries(view.secondaryModels || {})) {
    const color = skins[id];
    if (color && group) {
      const item = findWeaponSkinItem(id, color);
      applyWeaponSkin(group, id, color, item?.id);
    }
  }
}

export function hideAllWeapons(view) {
  if (!view) return;

  Object.values(view.primaryModels).forEach((g) => { g.visible = false; });

  Object.values(view.meleeModels || {}).forEach((g) => { g.visible = false; });

  Object.values(view.secondaryModels || {}).forEach((g) => { g.visible = false; });

  view.models[3].visible = false;

}


