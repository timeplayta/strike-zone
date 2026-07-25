/** Lobby estilo Free Fire/Fortnite — seu personagem + 3 ajudantes CT em pads no menu principal */

import * as THREE from "three";
import { buildPlayerCharacter } from "./player-character.js";
import { createHelper } from "./characters.js";
import { initCharacterAnim, updateHumanAnimation } from "./character-animation.js";
import { normalizeLoadout, DEFAULT_LOADOUT } from "./character-loadout.js";

let renderer = null;
let scene = null;
let camera = null;
let raf = null;
let clock = null;
let canvasEl = null;
let entities = [];
let mounted = false;
let myEntityIndex = -1;

function disposeGroup(group) {
  group?.traverse((o) => {
    if (o.geometry) o.geometry.dispose?.();
    if (o.material) {
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose?.());
    }
  });
}

function ensureCanvas() {
  const host = document.querySelector(".ff-menu-canvas");
  if (!host) return null;
  let c = document.getElementById("lobbySceneCanvas");
  if (!c) {
    c = document.createElement("canvas");
    c.id = "lobbySceneCanvas";
    c.className = "lobby-scene-canvas";
    host.appendChild(c);
  }
  return c;
}

function buildPad(x, z, color, radius = 0.72) {
  const group = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(radius, radius * 1.31, 40),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(x, 0.02, z);
  group.add(ring);
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 40),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.14, side: THREE.DoubleSide })
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.set(x, 0.015, z);
  group.add(disc);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.92, radius * 0.92, 2.6, 24, 1, true),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.045, side: THREE.DoubleSide, depthWrite: false })
  );
  beam.position.set(x, 1.3, z);
  group.add(beam);
  group.userData.ring = ring.material;
  return group;
}

const SLOTS = [
  { x: 0, z: 0.8, color: 0xf0a030, mine: true, scale: 1.55, padRadius: 0.85 },
  { x: -1.5, z: 0.0, color: 0x2266aa, scale: 1.35, padRadius: 0.72 },
  { x: 1.5, z: 0.0, color: 0xc9a227, scale: 1.35, padRadius: 0.72 },
  { x: 0, z: -0.5, color: 0x888899, scale: 1.35, padRadius: 0.72 },
];

function facePivotToCamera(group, x, z) {
  group.rotation.y = Math.atan2(camera.position.x - x, camera.position.z - z);
}

function buildScene() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(42, 1, 0.1, 40);
  camera.position.set(0, 1.45, 5.0);
  camera.lookAt(0, 0.85, 0.5);

  scene.add(new THREE.AmbientLight(0xffffff, 0.78));
  const key = new THREE.DirectionalLight(0xfff4e0, 1.15);
  key.position.set(2.2, 5, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x6688ff, 0.6);
  rim.position.set(-3, 3, -3);
  scene.add(rim);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(4.2, 48),
    new THREE.MeshStandardMaterial({ color: 0x0b0e16, roughness: 0.9, metalness: 0.08 })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  entities = [];
  myEntityIndex = -1;
  SLOTS.forEach((s, i) => {
    scene.add(buildPad(s.x, s.z, s.color, s.padRadius));
    let body;
    if (s.mine) {
      const loadout = normalizeLoadout(window.__playerLoadout || DEFAULT_LOADOUT);
      body = buildPlayerCharacter({
        loadout,
        characterSkin: window.__characterSkin || "soldier",
        scale: 1,
        withRifle: true,
        weaponType: "ak47",
        team: "ct",
      });
    } else {
      body = createHelper(i - 1, "dust");
    }
    body.group.position.set(s.x, 0, s.z);
    body.group.scale.setScalar(s.scale || 1);
    facePivotToCamera(body.group, s.x, s.z);
    scene.add(body.group);
    const entity = {
      group: body.group,
      gun: body.gun || null,
      weaponPivot: body.weaponPivot || null,
      rig: body.rig || null,
      alive: true,
      ragdoll: false,
      horrorMode: false,
    };
    initCharacterAnim(entity);
    if (s.mine) myEntityIndex = entities.length;
    entities.push(entity);
  });
}

function rebuildMyCharacter() {
  if (myEntityIndex < 0) return;
  const s = SLOTS.find((sl) => sl.mine);
  const old = entities[myEntityIndex];
  scene.remove(old.group);
  disposeGroup(old.group);
  const loadout = normalizeLoadout(window.__playerLoadout || DEFAULT_LOADOUT);
  const body = buildPlayerCharacter({
    loadout,
    characterSkin: window.__characterSkin || "soldier",
    scale: 1,
    withRifle: true,
    weaponType: "ak47",
    team: "ct",
  });
  body.group.position.set(s.x, 0, s.z);
  body.group.scale.setScalar(s.scale || 1);
  facePivotToCamera(body.group, s.x, s.z);
  scene.add(body.group);
  const entity = {
    group: body.group,
    gun: body.gun || null,
    weaponPivot: body.weaponPivot || null,
    rig: body.rig || null,
    alive: true,
    ragdoll: false,
    horrorMode: false,
  };
  initCharacterAnim(entity);
  entities[myEntityIndex] = entity;
}

function resize() {
  if (!renderer || !canvasEl) return;
  const w = canvasEl.clientWidth || 400;
  const h = canvasEl.clientHeight || 400;
  if (w < 2 || h < 2) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function shouldPause() {
  return (
    document.body.classList.contains("game-active") ||
    document.getElementById("menu")?.classList.contains("hidden")
  );
}

function tick() {
  raf = requestAnimationFrame(tick);
  if (shouldPause()) return;
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.getElapsedTime();
  entities.forEach((e) => {
    e.group.position.y = 0;
    updateHumanAnimation(e, dt, { aiming: false, moving: false, speed: 0 });
  });
  scene.traverse((o) => {
    if (o.userData?.ring) {
      o.userData.ring.opacity = 0.65 + Math.sin(t * 2.2) * 0.2;
    }
  });
  renderer.render(scene, camera);
}

export function mountLobbyScene() {
  canvasEl = ensureCanvas();
  if (!canvasEl) return;
  if (mounted) {
    rebuildMyCharacter();
    return;
  }
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    buildScene();
    clock = new THREE.Clock();
    mounted = true;
    resize();
    window.addEventListener("resize", resize);
    if (raf) cancelAnimationFrame(raf);
    tick();
  } catch {
    /* WebGL indisponível — menu segue funcionando sem o lobby 3D */
  }
}

export function refreshLobbyScene() {
  if (!mounted) return;
  rebuildMyCharacter();
}
