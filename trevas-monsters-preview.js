/** Preview 3D dos monstros do Fim das Trevas — menu Boneco + admin */

import * as THREE from "three";
import {
  LABYRINTH_MONSTER_DEFS,
  createTrevasMonsterMesh,
  getTrevasMonsterBounds,
} from "./horror-monsters.js";
import { configureCharacterRenderer } from "./human-model.js";

const viewers = new Map();

const DEFAULT_CANVAS_IDS = ["trevasMonster0", "trevasMonster1", "trevasMonster2"];

function fitCameraToGroup(camera, group, def) {
  const { size, center } = getTrevasMonsterBounds(group);
  const maxDim = Math.max(size.x, size.y, size.z, 0.5);
  const dist =
    def.type === "gosmento" ? maxDim * 2.8
    : def.type === "gigante" ? maxDim * 2.35
    : maxDim * 2.8;
  camera.position.set(center.x, center.y + size.y * 0.15, center.z + dist);
  camera.lookAt(center.x, center.y, center.z);
  camera.near = 0.05;
  camera.far = 80;
  camera.updateProjectionMatrix();
}

function mountMonsterCanvas(canvasId, index) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  destroyTrevasMonsterViewer(canvasId);

  const def = LABYRINTH_MONSTER_DEFS[index];
  if (!def) return;

  const w = Math.max(canvas.clientWidth || 0, canvas.width || 140);
  const h = Math.max(canvas.clientHeight || 0, canvas.height || 120);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h, false);
  renderer.setClearColor(0x0a0808, 1);
  configureCharacterRenderer(renderer, def.type === "gosmento" ? 1.1 : 1.25);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0808);
  scene.fog = new THREE.Fog(0x0a0808, 4, 28);

  const camera = new THREE.PerspectiveCamera(40, w / h, 0.05, 60);

  scene.add(new THREE.AmbientLight(0x554433, 0.55));
  const key = new THREE.DirectionalLight(0xffeed8, 1.1);
  key.position.set(3, 5, 4);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x6688aa, 0.35);
  fill.position.set(-3, 2, -2);
  scene.add(fill);
  const rim = new THREE.PointLight(
    def.type === "gosmento" ? 0xcc88ff : def.type === "gigante" ? 0xff4422 : 0xffaa66,
    2.2,
    16
  );
  rim.position.set(0, 2, 3);
  scene.add(rim);

  const group = createTrevasMonsterMesh(def.id, { preview: true });
  scene.add(group);
  fitCameraToGroup(camera, group, def);

  let t = index * 0.8;

  function tick() {
    t += 0.016;
    if (def.type === "gigante") {
      group.rotation.y = 0;
    } else {
      group.rotation.y = Math.sin(t * 0.45) * 0.25;
    }
    if (def.type === "pelucia") group.position.y = Math.sin(t * 4) * 0.04;
    renderer.render(scene, camera);
    const v = viewers.get(canvasId);
    if (v?.active) v.raf = requestAnimationFrame(tick);
  }

  viewers.set(canvasId, { renderer, scene, camera, group, active: true, raf: 0, index });
  tick();
}

export function mountTrevasMonsterPreviewsOn(canvasIds = DEFAULT_CANVAS_IDS) {
  requestAnimationFrame(() => {
    canvasIds.forEach((id, i) => mountMonsterCanvas(id, i));
    setTimeout(() => resizeTrevasMonsterPreviewsOn(canvasIds), 80);
  });
}

export function mountTrevasMonsterPreviews() {
  mountTrevasMonsterPreviewsOn(DEFAULT_CANVAS_IDS);
}

export function destroyTrevasMonsterViewer(canvasId) {
  const v = viewers.get(canvasId);
  if (!v) return;
  v.active = false;
  if (v.raf) cancelAnimationFrame(v.raf);
  v.renderer?.dispose?.();
  viewers.delete(canvasId);
}

export function destroyTrevasMonsterPreviewsOn(canvasIds) {
  for (const id of canvasIds) destroyTrevasMonsterViewer(id);
}

export function destroyAllTrevasMonsterPreviews() {
  destroyTrevasMonsterPreviewsOn([...viewers.keys()]);
}

export function resizeTrevasMonsterPreviewsOn(canvasIds) {
  for (const id of canvasIds) {
    const v = viewers.get(id);
    const canvas = document.getElementById(id);
    if (!v || !canvas || !v.renderer) continue;
    const w = Math.max(canvas.clientWidth || canvas.width || 140, 100);
    const h = Math.max(canvas.clientHeight || canvas.height || 120, 90);
    v.renderer.setSize(w, h, false);
    v.camera.aspect = w / h;
    v.camera.updateProjectionMatrix();
    const def = LABYRINTH_MONSTER_DEFS[v.index ?? 0];
    if (v.group && def) fitCameraToGroup(v.camera, v.group, def);
  }
}

export function resizeTrevasMonsterPreviews() {
  resizeTrevasMonsterPreviewsOn(DEFAULT_CANVAS_IDS);
}
