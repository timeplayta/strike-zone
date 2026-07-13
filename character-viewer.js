/** Visualizador 3D compartilhado — personagem Blockbench (player_hero.glb) */

import * as THREE from "three";
import { normalizeLoadout } from "./character-loadout.js";
import { buildPlayerCharacter, preloadPlayerCharacterModels, decorateBlockbenchFace } from "./player-character.js";
import { configureCharacterRenderer } from "./human-model.js";
import { applyWeaponSkinsToCharacter } from "./weapon-skin-apply.js";
import { getAccountWeaponSkins } from "./player-account.js";
import {
  cloneBlockbenchModelSync,
  waitForBlockbenchModel,
  fitBlockbenchModel,
} from "./blockbench-model-loader.js";
import { buildNpcWeapon, attachStylizedWeapon, ensureHandGunPivot } from "./npc-weapon.js";

const viewers = new Map();

function hexStr(c) {
  return "#" + (c >>> 0).toString(16).padStart(6, "0").slice(-6);
}

function disposeGroup(group) {
  group?.traverse((o) => {
    if (o.geometry) o.geometry.dispose?.();
    if (o.material) {
      if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose?.());
      else o.material.dispose?.();
    }
  });
}

function frameAccountFabPortrait(charGroup, camera) {
  charGroup.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(charGroup);
  if (box.isEmpty()) return;

  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);

  const height = Math.max(size.y, 0.5);
  const faceY = box.max.y - height * 0.14;
  const dist = height * 0.48;

  camera.position.set(center.x, faceY + height * 0.06, center.z + dist);
  camera.lookAt(center.x, faceY - height * 0.02, center.z);
  camera.fov = 20;
  camera.updateProjectionMatrix();
}

function applyPreviewWeaponSkins(charGroup) {
  const skins = getAccountWeaponSkins();
  if (Object.keys(skins).length) applyWeaponSkinsToCharacter(charGroup, skins);
}

function attachPreviewWeapon(model) {
  decorateBlockbenchFace(model);
  const handR = model.getObjectByName("hand_r") || model.getObjectByName("handR");
  const anchor = handR || model;
  const gunPivot = ensureHandGunPivot(anchor);
  attachStylizedWeapon({ gunPivot }, buildNpcWeapon("ak47", 0xd45a2a), "ak47");
}

export function buildPreviewCharacter(loadout, team = "ct", portrait = false, characterSkin, accountFab = false) {
  const body = buildPlayerCharacter({
    loadout,
    characterSkin: characterSkin || window.__characterSkin || "soldier",
    scale: portrait ? 0.92 : 1,
    withRifle: !accountFab,
    weaponType: "ak47",
    team,
    portrait,
  });
  applyPreviewWeaponSkins(body.group);
  return {
    group: body.group,
    mixer: body.mixer || null,
    human: false,
    player: true,
    among: !!body.among,
  };
}

export function buildEnemyPreview() {
  const root = new THREE.Group();
  root.userData.blockbenchHero = true;

  const model = cloneBlockbenchModelSync("operator", { targetWidth: 1.05, targetHeight: 1.82 });
  if (model) {
    root.add(model);
    attachPreviewWeapon(model);
  } else {
    waitForBlockbenchModel("operator").then((template) => {
      if (!template || root.userData.blockbenchApplied) return;
      const m = template.clone(true);
      fitBlockbenchModel(m, 1.05, 1.82);
      m.userData.blockbenchMesh = true;
      root.add(m);
      root.userData.blockbenchApplied = true;
      attachPreviewWeapon(m);
    });
  }

  return { group: root, mixer: null, human: false };
}

function mountCharacterViewerImpl(canvasId, opts = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  let v = viewers.get(canvasId);
  if (v) {
    disposeViewer(v);
    viewers.delete(canvasId);
  }

  const w = canvas.clientWidth || 280;
  const h = canvas.clientHeight || 320;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(w, h, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  configureCharacterRenderer(renderer, 1.12);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e1218);

  const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 50);
  camera.position.set(0, 1.35, 3.4);
  camera.lookAt(0, 1.05, 0);

  const hemi = new THREE.HemisphereLight(0xd8e4ff, 0x2a2018, 0.62);
  const key = new THREE.DirectionalLight(0xfff4e8, 1.05);
  key.position.set(2.2, 4.5, 3.5);
  const fill = new THREE.DirectionalLight(0x6688cc, 0.38);
  fill.position.set(-2.5, 2.2, -2);
  const rim = new THREE.DirectionalLight(0xffcc88, 0.35);
  rim.position.set(0, 2.5, -4);
  scene.add(hemi, key, fill, rim);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(2.2, 32),
    new THREE.MeshStandardMaterial({ color: 0x1a2030, roughness: 0.9 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  scene.add(floor);

  const pivot = new THREE.Group();
  scene.add(pivot);

  const loadout = normalizeLoadout(opts.loadout);
  const isAccountFab = canvasId === "accountFabCanvas";
  const built = opts.enemy
    ? buildEnemyPreview()
    : buildPreviewCharacter(loadout, opts.team || "ct", !!opts.portrait, opts.characterSkin, isAccountFab);
  const charGroup = built.group;
  pivot.add(charGroup);

  const portrait = !!opts.portrait;
  if (portrait) {
    scene.background = null;
    renderer.setClearColor(0x000000, 0);
    scene.remove(floor);
    if (isAccountFab) {
      pivot.rotation.y = 0;
      charGroup.position.set(0, 0, 0);
      frameAccountFabPortrait(charGroup, camera);
    } else {
      camera.position.set(0, 1.52, 1.35);
      camera.lookAt(0, 1.42, 0);
      camera.fov = 32;
      camera.updateProjectionMatrix();
      pivot.rotation.y = 0.12;
      charGroup.position.y = 0;
    }
    key.intensity = 1.15;
    rim.intensity = 0.5;
  }

  v = {
    canvasId,
    renderer,
    scene,
    camera,
    pivot,
    charGroup,
    mixer: built.mixer,
    orbit: portrait && isAccountFab ? 0 : portrait ? 0.12 : 0,
    autoSpin: portrait ? false : opts.autoSpin !== false,
    portrait,
    raf: 0,
    loadout,
    characterSkin: opts.characterSkin || window.__characterSkin || "soldier",
    enemy: !!opts.enemy,
    human: built.human,
    clock: new THREE.Clock(),
  };
  viewers.set(canvasId, v);

  const tick = () => {
    v.raf = requestAnimationFrame(tick);
    const dt = v.clock.getDelta();
    if (v.mixer) v.mixer.update(dt);
    if (v.autoSpin) v.orbit += 0.008;
    pivot.rotation.y = v.orbit;
    if (!v.portrait) {
      charGroup.position.y = Math.sin(performance.now() * 0.002) * 0.02;
    }
    renderer.render(scene, camera);
  };
  tick();

  return v;
}

export async function mountCharacterViewer(canvasId, opts = {}) {
  if (opts.enemy) {
    await waitForBlockbenchModel("operator");
  } else {
    await preloadPlayerCharacterModels();
  }
  return mountCharacterViewerImpl(canvasId, opts);
}

export function updateViewerLoadout(canvasId, loadout) {
  const v = viewers.get(canvasId);
  if (!v || v.enemy) return;
  v.pivot.remove(v.charGroup);
  disposeGroup(v.charGroup);
  v.loadout = normalizeLoadout(loadout);
  const isAccountFab = canvasId === "accountFabCanvas";
  const built = buildPreviewCharacter(v.loadout, "ct", v.portrait, v.characterSkin, isAccountFab);
  v.charGroup = built.group;
  v.mixer = built.mixer;
  v.human = built.human;
  v.pivot.add(v.charGroup);
  if (v.portrait && isAccountFab) {
    frameAccountFabPortrait(v.charGroup, v.camera);
  }
}

export function updateViewerCharacterSkin(canvasId, characterSkin) {
  const v = viewers.get(canvasId);
  if (!v || v.enemy) return;
  v.characterSkin = characterSkin || "soldier";
  v.pivot.remove(v.charGroup);
  disposeGroup(v.charGroup);
  const isAccountFab = canvasId === "accountFabCanvas";
  const built = buildPreviewCharacter(v.loadout, "ct", v.portrait, v.characterSkin, isAccountFab);
  v.charGroup = built.group;
  v.mixer = built.mixer;
  v.human = built.human;
  v.pivot.add(v.charGroup);
  if (v.portrait && isAccountFab) {
    frameAccountFabPortrait(v.charGroup, v.camera);
  }
}

function disposeViewer(v) {
  cancelAnimationFrame(v.raf);
  disposeGroup(v.charGroup);
  v.renderer.dispose();
}

export function resizeViewer(canvasId) {
  const v = viewers.get(canvasId);
  const canvas = document.getElementById(canvasId);
  if (!v || !canvas) return;
  const w = canvas.clientWidth || 280;
  const h = canvas.clientHeight || 320;
  v.renderer.setSize(w, h, false);
  v.camera.aspect = w / h;
  v.camera.updateProjectionMatrix();
}

export function destroyViewer(canvasId) {
  const v = viewers.get(canvasId);
  if (!v) return;
  disposeViewer(v);
  viewers.delete(canvasId);
}

function refreshPlayerViewers() {
  for (const [canvasId, v] of viewers) {
    if (v.enemy) continue;
    updateViewerLoadout(canvasId, v.loadout);
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("strikezone-blockbench-ready", refreshPlayerViewers);
  window.addEventListener("strikezone-player-ready", refreshPlayerViewers);
}

export { hexStr };
