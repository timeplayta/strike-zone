import * as THREE from "three";

import { buildNpcWeapon } from "./npc-weapon.js";
import { WEAPON_FPS_SCALE } from "./weapon-gltf-loader.js";
import { applyWeaponSkin, findWeaponSkinItem } from "./weapon-skin-apply.js";

import { buildMeleeFpsModel } from "./melee-weapons.js";
import { getActiveCharacterAbility } from "./character-abilities.js";



function makeFpsWeapon(type, scale, tint) {

  const g = buildNpcWeapon(type, tint);

  g.scale.setScalar(scale);

  g.rotation.set(0, Math.PI, 0);
  g.userData.basePos = { x: 0, y: 0, z: 0 };
  g.userData.baseRot = { x: 0, y: Math.PI, z: 0 };

  g.position.set(0, 0, 0);

  return g;

}

/** Materiais FPS — lambert + leve emissive pra cor não sumir na câmera */
function matHand(color, roughness = 0.72) {
  const c = new THREE.Color(color);
  return new THREE.MeshStandardMaterial({
    color: c,
    roughness,
    metalness: 0.04,
    flatShading: false,
    emissive: c.clone().multiplyScalar(0.22),
    emissiveIntensity: 0.55,
  });
}

function makeNailMat(skinColor) {
  const c = new THREE.Color(skinColor).lerp(new THREE.Color(0xffe8d8), 0.55);
  return new THREE.MeshStandardMaterial({
    color: c,
    roughness: 0.28,
    metalness: 0.05,
    flatShading: false,
    emissive: c.clone().multiplyScalar(0.18),
    emissiveIntensity: 0.4,
  });
}

/** Preto puro some na mira — clareia um pouco pra luva continuar legível */
function readableGloveColor(hex) {
  const c = new THREE.Color(hex ?? 0x3a4048);
  const lum = c.r * 0.3 + c.g * 0.59 + c.b * 0.11;
  if (lum < 0.12) c.lerp(new THREE.Color(0x4a5560), 0.55);
  return c.getHex();
}

/**
 * Dedo articulado anatômico — 3 juntas reais (MCP no nó, PIP e DIP nos pivots
 * internos), 3 falanges (proximal/média/distal) e unha na ponta.
 * setExtra(0..1+) soma curvatura extra sobre a pose de repouso (fechar a mão,
 * apertar o gatilho) sem perder a pose base de descanso no cabo da arma.
 */
function makeFinger(baseX, baseY, baseZ, restCurl, lenMult, mat, nailMat) {
  const root = new THREE.Group();
  root.position.set(baseX, baseY, baseZ);

  const lm = lenMult;
  const r0 = 0.013;
  const r1 = 0.0115;
  const r2 = 0.01;

  const prox = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, 0.052 * lm, 12), mat);
  prox.position.y = -0.026 * lm;
  root.add(prox);

  const j1 = new THREE.Mesh(new THREE.SphereGeometry(r0, 10, 8), mat);
  j1.position.y = -0.052 * lm;
  root.add(j1);

  const midPivot = new THREE.Group();
  midPivot.position.y = -0.052 * lm;
  root.add(midPivot);

  const mid = new THREE.Mesh(new THREE.CylinderGeometry(r2, r1, 0.042 * lm, 12), mat);
  mid.position.y = -0.021 * lm;
  midPivot.add(mid);

  const j2 = new THREE.Mesh(new THREE.SphereGeometry(r1, 10, 8), mat);
  j2.position.y = -0.042 * lm;
  midPivot.add(j2);

  const distPivot = new THREE.Group();
  distPivot.position.y = -0.042 * lm;
  midPivot.add(distPivot);

  const dist = new THREE.Mesh(new THREE.CylinderGeometry(0.0085, r2, 0.034 * lm, 10), mat);
  dist.position.y = -0.017 * lm;
  distPivot.add(dist);

  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.0095, 10, 8), mat);
  tip.position.y = -0.034 * lm;
  distPivot.add(tip);

  const nail = new THREE.Mesh(new THREE.BoxGeometry(0.011 * lm, 0.013 * lm, 0.003), nailMat);
  nail.position.set(0, -0.03 * lm, 0.008);
  distPivot.add(nail);

  function setExtra(extra) {
    const e = extra;
    root.rotation.x = restCurl + e * 1.05;
    midPivot.rotation.x = 0.38 + e * 1.2;
    distPivot.rotation.x = 0.32 + e * 0.9;
  }
  setExtra(0);

  return { group: root, setExtra, restCurl };
}

/** Polegar — junta metacarpal + 2 falanges + unha */
function makeThumb(posX, posY, posZ, s, mat, nailMat) {
  const root = new THREE.Group();
  root.position.set(posX, posY, posZ);
  root.rotation.set(0.7, 0, s * -0.95);

  const meta = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.019, 0.05, 12), mat);
  meta.position.y = -0.025;
  root.add(meta);

  const jb = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), mat);
  jb.position.y = -0.05;
  root.add(jb);

  const p1 = new THREE.Group();
  p1.position.y = -0.05;
  root.add(p1);

  const p1m = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.016, 0.048, 12), mat);
  p1m.position.y = -0.024;
  p1.add(p1m);

  const tj = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), mat);
  tj.position.y = -0.048;
  p1.add(tj);

  const p2 = new THREE.Group();
  p2.position.y = -0.048;
  p1.add(p2);

  const p2m = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.013, 0.04, 10), mat);
  p2m.position.y = -0.02;
  p2.add(p2m);

  const ttip = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), mat);
  ttip.position.y = -0.04;
  p2.add(ttip);

  const nail = new THREE.Mesh(new THREE.BoxGeometry(0.013, 0.015, 0.0035), nailMat);
  nail.position.set(0, -0.035, 0.009);
  p2.add(nail);

  function setExtra(extra) {
    const e = extra;
    p1.rotation.x = 0.28 + e * 0.9;
    p2.rotation.x = 0.25 + e * 0.8;
  }
  setExtra(0);

  return { group: root, setExtra };
}

/**
 * Mão FPS maior e legível: manga com cor da camisa, luva com cor real,
 * pezinho de pele no pulso, grip que fecha em volta da arma.
 */
function makeFpsHand(side, skinMat, gloveMat, nailMat, sleeveMat) {
  const s = side === "left" ? -1 : 1;
  const isRight = side === "right";
  const g = new THREE.Group();

  // Braço / antebraço mais grossos (proporção FPS clássica)
  const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.36, 14), sleeveMat);
  upper.position.set(s * 0.24, -0.22, 0.06);
  upper.rotation.set(Math.PI / 2, 0, s * 0.12);
  upper.scale.x = 0.88;
  g.add(upper);

  const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.044, 0.38, 14), sleeveMat);
  forearm.position.set(s * 0.17, -0.17, -0.16);
  forearm.rotation.set(Math.PI / 2, 0, s * 0.18);
  forearm.scale.x = 0.86;
  g.add(forearm);

  const wristPos = { x: s * 0.1, y: -0.1, z: -0.34 };
  const wristPivot = new THREE.Group();
  wristPivot.position.set(wristPos.x, wristPos.y, wristPos.z);
  // Mão direita: grip no cabo; esquerda: apoio no cano (ligeiramente inclinada)
  wristPivot.rotation.set(isRight ? 0.18 : 0.08, isRight ? -0.08 : 0.12, s * (isRight ? -0.2 : 0.15));
  g.add(wristPivot);

  // Faixa de pele entre manga e luva (dá cor humana)
  const skinBand = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.044, 0.028, 14), skinMat);
  skinBand.rotation.x = Math.PI / 2;
  skinBand.position.z = 0.02;
  wristPivot.add(skinBand);

  const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.048, 0.08, 14), gloveMat);
  wrist.rotation.x = Math.PI / 2;
  wrist.position.z = -0.02;
  wristPivot.add(wrist);

  const palmPivot = new THREE.Group();
  palmPivot.position.set(0, 0.012, -0.07);
  palmPivot.rotation.set(0.2, 0, s * 0.08);
  wristPivot.add(palmPivot);

  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.055, 0.12), gloveMat);
  palmPivot.add(palm);
  // Dorso com padding (contraste de cor)
  const pad = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.018, 0.08), matHand(0x1a2230, 0.85));
  pad.position.set(0, 0.028, -0.01);
  palmPivot.add(pad);

  for (let i = 0; i < 4; i++) {
    const km = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), gloveMat);
    km.position.set(s * (-0.036 + i * 0.024), 0.028, -0.058);
    palmPivot.add(km);
  }

  // Grip: direita com indicador no gatilho; esquerda fechada no guarda-mão
  const fingerDefs = isRight
    ? [
        { dx: s * -0.036, curl: 0.55, len: 1.05, isIndex: true },
        { dx: s * -0.01, curl: 1.15, len: 1.12 },
        { dx: s * 0.014, curl: 1.18, len: 1.05 },
        { dx: s * 0.036, curl: 1.22, len: 0.88 },
      ]
    : [
        { dx: s * -0.036, curl: 1.15, len: 1.05, isIndex: true },
        { dx: s * -0.01, curl: 1.18, len: 1.12 },
        { dx: s * 0.014, curl: 1.16, len: 1.05 },
        { dx: s * 0.036, curl: 1.2, len: 0.88 },
      ];

  const fingerRoots = [];
  let indexFinger = null;
  for (const fd of fingerDefs) {
    const finger = makeFinger(fd.dx, 0.02, -0.12, fd.curl, fd.len, gloveMat, nailMat);
    palmPivot.add(finger.group);
    fingerRoots.push(finger);
    if (fd.isIndex) indexFinger = finger;
  }

  const thumb = makeThumb(s * 0.055, -0.01, -0.02, s, gloveMat, nailMat);
  palmPivot.add(thumb.group);

  return { group: g, wristPivot, fingers: fingerRoots, indexFinger, thumb, side };
}

function createFpsHands() {
  const group = new THREE.Group();
  group.name = "fpsCharacterHands";
  group.userData.skinColor = 0xc4956a;
  group.userData.gloveColor = 0x3a4048;
  group.userData.sleeveColor = 0x2266aa;

  const skinMat = matHand(group.userData.skinColor, 0.66);
  const gloveMat = matHand(readableGloveColor(group.userData.gloveColor), 0.78);
  const nailMat = makeNailMat(group.userData.skinColor);
  const sleeveMat = matHand(group.userData.sleeveColor, 0.9);
  group.userData.skinMat = skinMat;
  group.userData.gloveMat = gloveMat;
  group.userData.nailMat = nailMat;
  group.userData.sleeveMat = sleeveMat;

  const rightHand = makeFpsHand("right", skinMat, gloveMat, nailMat, sleeveMat);
  const leftHand = makeFpsHand("left", skinMat, gloveMat, nailMat, sleeveMat);

  // Direita no cabo; esquerda mais à frente no cano/guarda-mão
  rightHand.group.position.set(0.02, 0.01, 0.04);
  leftHand.group.position.set(-0.04, 0.02, -0.12);
  leftHand.group.rotation.y = 0.08;

  group.add(leftHand.group, rightHand.group);
  group.position.set(0, 0.01, 0.01);
  group.scale.setScalar(1.45); // mão grande o bastante pra ler na mira
  group.userData.rightHand = rightHand;
  group.userData.leftHand = leftHand;
  return group;
}

function applyMatColor(mat, hex) {
  if (!mat) return;
  const c = new THREE.Color(hex);
  mat.color.copy(c);
  if (mat.emissive) mat.emissive.copy(c).multiplyScalar(0.22);
}

function updateFpsHandsFromLoadout(view) {
  const hands = view?.hands;
  if (!hands) return;
  const loadout = window.__playerLoadout || {};
  const skin = loadout.skin || 0xc4956a;
  const gloveRaw = loadout.gloves?.color ?? 0x3a4048;
  const glove = readableGloveColor(gloveRaw);
  const sleeve = loadout.shirt?.color || loadout.shirt || 0x2266aa;

  if (skin !== hands.userData.skinColor) {
    hands.userData.skinColor = skin;
    applyMatColor(hands.userData.skinMat, skin);
    const nail = new THREE.Color(skin).lerp(new THREE.Color(0xffe8d8), 0.55);
    hands.userData.nailMat.color.copy(nail);
    if (hands.userData.nailMat.emissive) hands.userData.nailMat.emissive.copy(nail).multiplyScalar(0.18);
  }
  if (glove !== hands.userData.gloveColor) {
    hands.userData.gloveColor = glove;
    applyMatColor(hands.userData.gloveMat, glove);
  }
  if (sleeve !== hands.userData.sleeveColor) {
    hands.userData.sleeveColor = sleeve;
    applyMatColor(hands.userData.sleeveMat, sleeve);
  }
}

/**
 * Fecha/abre a mão de forma natural (grab-in ao trocar de arma) e faz o
 * indicador da mão direita apertar o gatilho ao atirar — a outra mão fica
 * fechada no cano/guarda-mão o tempo todo.
 */
function updateHandsPose(view, dt) {
  const hands = view?.hands;
  if (!hands?.userData?.rightHand) return;
  const right = hands.userData.rightHand;
  const left = hands.userData.leftHand;

  view.handGrab = Math.max(0, (view.handGrab ?? 1) - dt * 6.5);
  view.triggerPull = Math.max(0, (view.triggerPull ?? 0) - dt * 10);

  const grabOpen = -view.handGrab * 0.62; // negativo = abre a mão na animação de "pegar" a arma
  const triggerExtra = view.triggerPull * 0.85;

  for (const finger of right.fingers) {
    finger.setExtra(finger === right.indexFinger ? grabOpen + triggerExtra : grabOpen);
  }
  right.thumb.setExtra(grabOpen);

  for (const finger of left.fingers) {
    finger.setExtra(grabOpen * 0.85);
  }
  left.thumb.setExtra(grabOpen * 0.85);

  // Pequeno "flick" de pulso na mão do gatilho ao disparar
  const kick = view.triggerPull * 0.05;
  right.wristPivot.rotation.x = 0.04 + kick;
}



export function createWeaponView(camera) {

  const root = new THREE.Group();

  root.position.set(0.2, -0.16, -0.38);

  camera.add(root);



  const akGroup = makeFpsWeapon("ak47", WEAPON_FPS_SCALE.ak47, 0x5c3a1e);

  const scarGroup = makeFpsWeapon("scar", WEAPON_FPS_SCALE.scar, 0x3a4a55);

  scarGroup.visible = false;

  const m4Group = makeFpsWeapon("m4", WEAPON_FPS_SCALE.m4, 0x3d4a38);

  m4Group.visible = false;

  const umpGroup = makeFpsWeapon("ump45", WEAPON_FPS_SCALE.ump45, 0x2a2a32);

  umpGroup.visible = false;

  const awmGroup = makeFpsWeapon("awm", WEAPON_FPS_SCALE.awm, 0x4a3a28);

  awmGroup.visible = false;

  const shotgunGroup = makeFpsWeapon("doze", WEAPON_FPS_SCALE.doze, 0x6b4423);

  shotgunGroup.visible = false;

  const bazookaGroup = makeFpsWeapon("bazooka", WEAPON_FPS_SCALE.bazooka, 0x45305f);

  bazookaGroup.visible = false;



  const glockGroup = makeFpsWeapon("glock", WEAPON_FPS_SCALE.glock, 0x2a2a30);

  glockGroup.visible = false;

  const revolverGroup = makeFpsWeapon("revolver", WEAPON_FPS_SCALE.revolver, 0x6b3f1f);

  revolverGroup.visible = false;



  const pensGroup = makeFpsWeapon("pens", WEAPON_FPS_SCALE.pens, 0x2255aa);

  pensGroup.visible = false;



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

    akGroup, scarGroup, m4Group, umpGroup, awmGroup, shotgunGroup, bazookaGroup, glockGroup, revolverGroup, pensGroup,

    knifeGroup, meleeModels.facao, meleeModels.porrete, meleeModels.katana

  );

  const hands = createFpsHands();
  root.add(hands);

  // Luz local pra mão/arma não ficarem pretas (câmera não pega bem a luz da cena)
  const handFill = new THREE.PointLight(0xfff0e0, 0.85, 1.6, 1.5);
  handFill.position.set(0.05, 0.08, 0.15);
  root.add(handFill);

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

      pens: pensGroup,

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

    basePos: { x: 0.2, y: -0.15, z: -0.34 },

    handGrab: 1,
    triggerPull: 0,

  };

}



const MUZZLE_Z = {

  ak47: -0.22,

  scar: -0.21,

  m4: -0.2,

  ump45: -0.17,

  awm: -0.27,

  doze: -0.23,

  bazooka: -0.29,

  revolver: -0.15,

  glock: -0.12,

  pens: -0.16,

};



export function setWeaponView(view, slot, weaponId = "ak47") {

  const prevId = slot === 1 ? view.currentPrimary : slot === 2 ? view.currentSecondary : view.currentMelee;
  if (weaponId && weaponId !== prevId) view.handGrab = 1; // troca de arma → mão fecha de novo no cabo

  if (slot === 1) {

    view.currentPrimary = weaponId;

    Object.entries(view.primaryModels).forEach(([k, g]) => {

      g.visible = k === weaponId;

    });

    Object.values(view.secondaryModels || {}).forEach((g) => { g.visible = false; });

    Object.values(view.meleeModels || {}).forEach((g) => { g.visible = false; });

    view.models[3].visible = false;

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

    if (meleeId !== "faca") view.models[3].visible = false;

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

  view.triggerPull = 1; // dedo indicador aperta o gatilho

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
  updateHandsPose(view, dt);

  const targetAds = view.adsWeapon ? 1 : 0;

  view.adsBlend += (targetAds - view.adsBlend) * Math.min(1, dt * 14);

  const b = view.adsBlend;
  const reloadAnimMult = getActiveCharacterAbility()?.reloadAnimMult ?? 1;
  view.reloadAnim = Math.max(0, (view.reloadAnim || 0) - dt * (2.8 / reloadAnimMult));
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


