/** Visualizador 3D compartilhado — conta e customização (modelo humano estilo CS) */

import * as THREE from "three";
import { buildStylizedHuman } from "./stylized-character.js";
import { loadoutToBuildOpts, normalizeLoadout } from "./character-loadout.js";
import { buildHumanCharacter, configureCharacterRenderer, isHumanModelReady } from "./human-model.js";
import { buildAmongUsCharacter } from "./among-us-model.js";

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

export function buildPreviewCharacter(loadout, team = "ct", portrait = false, characterSkin) {
  const skinId = characterSkin || window.__characterSkin || "soldier";
  if (
    skinId &&
    skinId !== "soldier" &&
    (skinId.startsWith("among") || skinId === "neon_runner" || skinId === "shadow")
  ) {
    const body = buildAmongUsCharacter(skinId, portrait ? 0.95 : 1.1);
    return { group: body.group, mixer: null, human: false, among: true };
  }

  const opts = loadoutToBuildOpts(loadout);
  opts.team = team;
  opts.scale = portrait ? 0.92 : 1;
  opts.withRifle = true;
  opts.weaponType = "ak47";

  if (isHumanModelReady()) {
    try {
      const body = buildHumanCharacter(opts);
      return { group: body.group, mixer: body.mixer, human: true };
    } catch (err) {
      console.warn("Preview humano:", err);
    }
  }

  const body = buildStylizedHuman(opts);
  return { group: body.group, mixer: null, human: false };
}

export function buildEnemyPreview() {
  if (isHumanModelReady()) {
    try {
      const body = buildHumanCharacter({
        shirt: 0xd45a2a,
        pants: 0x3d2817,
        team: "t",
        withRifle: true,
        weaponType: "ak47",
        scale: 1,
      });
      return { group: body.group, mixer: body.mixer, human: true };
    } catch {
      /* fallback */
    }
  }
  const body = buildStylizedHuman({
    shirt: 0xd45a2a,
    pants: 0x3d2817,
    gloves: 0x1a1a1a,
    shoes: 0x141010,
    accessory: "mask",
    faceProfile: { headStyle: "mask", maskPattern: "skull", maskColor: 0x222222 },
    withRifle: true,
  });
  return { group: body.group, mixer: null, human: false };
}

export function mountCharacterViewer(canvasId, opts = {}) {
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
  const built = opts.enemy
    ? buildEnemyPreview()
    : buildPreviewCharacter(loadout, opts.team || "ct", !!opts.portrait, opts.characterSkin);
  const charGroup = built.group;
  pivot.add(charGroup);

  const portrait = !!opts.portrait;
  if (portrait) {
    scene.background = null;
    renderer.setClearColor(0x000000, 0);
    scene.remove(floor);
    camera.position.set(0, 1.52, 1.35);
    camera.lookAt(0, 1.42, 0);
    camera.fov = 32;
    camera.updateProjectionMatrix();
    pivot.rotation.y = 0.12;
    charGroup.position.y = 0;
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
    orbit: portrait ? 0.12 : 0,
    autoSpin: portrait ? false : opts.autoSpin !== false,
    portrait,
    raf: 0,
    loadout,
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

export function updateViewerLoadout(canvasId, loadout) {
  const v = viewers.get(canvasId);
  if (!v || v.enemy) return;
  v.pivot.remove(v.charGroup);
  disposeGroup(v.charGroup);
  v.loadout = normalizeLoadout(loadout);
  const built = buildPreviewCharacter(v.loadout, "ct", v.portrait);
  v.charGroup = built.group;
  v.mixer = built.mixer;
  v.human = built.human;
  v.pivot.add(v.charGroup);
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

export { hexStr };
