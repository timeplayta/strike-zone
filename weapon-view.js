import * as THREE from "three";

import { buildNpcWeapon } from "./npc-weapon.js";
import { applyWeaponSkin, findWeaponSkinItem } from "./weapon-skin-apply.js";

import { buildMeleeFpsModel } from "./melee-weapons.js";



function makeFpsWeapon(type, scale, tint) {

  const g = buildNpcWeapon(type, tint);

  g.scale.setScalar(scale);

  g.rotation.set(0, Math.PI, 0);

  g.position.set(0, 0, 0);

  return g;

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



  const glockGroup = makeFpsWeapon("glock", 1.85, 0x2a2a30);

  glockGroup.visible = false;



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

    akGroup, scarGroup, m4Group, umpGroup, awmGroup, shotgunGroup, glockGroup,

    knifeGroup, meleeModels.facao, meleeModels.porrete, meleeModels.katana

  );



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

    },

    meleeModels,

    models: { 1: akGroup, 2: glockGroup, 3: knifeGroup },

    muzzleFlash,

    flashLight,

    recoil: 0,
    reloadAnim: 0,

    currentPrimary: "ak47",

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

};



export function setWeaponView(view, slot, weaponId = "ak47") {

  if (slot === 1) {

    view.currentPrimary = weaponId;

    Object.entries(view.primaryModels).forEach(([k, g]) => {

      g.visible = k === weaponId;

    });

    view.models[2].visible = false;

    Object.values(view.meleeModels || {}).forEach((g) => { g.visible = false; });

    view.models[3].visible = false;

    const z = MUZZLE_Z[weaponId] ?? -0.55;

    view.muzzleFlash.position.set(0, 0.02, z);

  } else if (slot === 2) {

    Object.values(view.primaryModels).forEach((g) => { g.visible = false; });

    Object.values(view.meleeModels || {}).forEach((g) => { g.visible = false; });

    view.models[2].visible = true;

    view.models[3].visible = false;

    view.muzzleFlash.position.set(0, 0.04, -0.22);

  } else if (slot === 3) {

    Object.values(view.primaryModels).forEach((g) => { g.visible = false; });

    view.models[2].visible = false;

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

    view.models[2].visible = false;

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
}



export function updateWeaponView(view, dt, moving = false) {

  const t = performance.now() * 0.001;

  const targetAds = view.adsWeapon ? 1 : 0;

  view.adsBlend += (targetAds - view.adsBlend) * Math.min(1, dt * 14);

  const b = view.adsBlend;
  view.reloadAnim = Math.max(0, (view.reloadAnim || 0) - dt * 2.8);
  const reload = view.reloadAnim || 0;



  const hip = view.basePos;

  const adsOffsets = {

    ak47: { x: 0, y: -0.06, z: -0.12 },

    scar: { x: 0.02, y: -0.07, z: -0.14 },

    m4: { x: 0.01, y: -0.065, z: -0.13 },

    ump45: { x: 0.02, y: -0.05, z: -0.1 },

    awm: { x: 0, y: -0.1, z: -0.22 },

    doze: { x: 0, y: -0.055, z: -0.1 },

  };

  const off = adsOffsets[view.adsWeapon] || { x: 0, y: 0, z: 0 };



  view.root.position.x = hip.x + off.x * b;

  view.root.position.y = hip.y + off.y * b;

  view.root.position.z = hip.z + off.z * b;

  if (reload > 0) {
    const pull = Math.sin(reload * Math.PI);
    view.root.position.x += 0.1 * pull;
    view.root.position.y -= 0.11 * pull;
    view.root.position.z += 0.08 * pull;
    view.root.rotation.x = -0.28 * pull;
    view.root.rotation.y = 0.22 * pull;
    view.root.rotation.z = -0.18 * pull;
    return;
  }



  if (view.recoil > 0) {

    view.recoil = Math.max(0, view.recoil - dt * 5.5);

    view.root.position.z += view.recoil * 0.55 * (1 - b * 0.5);

    view.root.rotation.x = view.recoil * 2.2;

  } else if (moving && b < 0.3) {

    view.root.position.z = hip.z + off.z * b + Math.sin(t * 14) * 0.014;

    view.root.position.y = hip.y + off.y * b + Math.abs(Math.cos(t * 14)) * 0.009;

    view.root.rotation.x = Math.sin(t * 7) * 0.018;

    view.root.rotation.z = Math.sin(t * 5) * 0.008;

  } else {

    view.root.position.z = hip.z + off.z * b + Math.sin(t * 2) * 0.004 * (1 - b);

    view.root.rotation.x = 0;

    view.root.rotation.z = 0;

  }

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
  const glockColor = skins.glock;
  if (glockColor && view.models?.[2]) {
    const item = findWeaponSkinItem("glock", glockColor);
    applyWeaponSkin(view.models[2], "glock", glockColor, item?.id);
  }
}

export function hideAllWeapons(view) {
  if (!view) return;

  Object.values(view.primaryModels).forEach((g) => { g.visible = false; });

  Object.values(view.meleeModels || {}).forEach((g) => { g.visible = false; });

  view.models[2].visible = false;

  view.models[3].visible = false;

}


