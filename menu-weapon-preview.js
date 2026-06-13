/** Mini preview 3D das armas no menu (estilo CS / Free Fire) */

import * as THREE from "three";
import { buildNpcWeapon } from "./npc-weapon.js";

const TINTS = {
  ak47: 0x5c3a1e,
  scar: 0x3a4a55,
  m4: 0x3d4a38,
  ump45: 0x2a2a32,
  awm: 0x4a3a28,
  doze: 0x6b4423,
};

const viewers = [];
const mounted = new WeakSet();

export function initMenuWeaponPreviews() {
  const canvases = document.querySelectorAll(".weapon-preview-canvas");
  if (!canvases.length) return;

  for (const canvas of canvases) {
    if (mounted.has(canvas)) continue;
    const weaponId = canvas.dataset.weaponPreview;
    if (!weaponId) continue;
    mountWeaponPreview(canvas, weaponId);
    mounted.add(canvas);
  }
}

function mountWeaponPreview(canvas, weaponId) {
  const wrap = canvas.parentElement;
  const w = Math.max(64, wrap?.clientWidth || canvas.clientWidth || 96);
  const h = Math.max(48, wrap?.clientHeight || canvas.clientHeight || 72);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(w, h, false);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, w / h, 0.05, 8);
  camera.position.set(0.05, 0.12, 1.05);
  camera.lookAt(0, 0.02, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xffeed8, 1.1);
  key.position.set(1.2, 2, 1.5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x88aacc, 0.45);
  rim.position.set(-1, 0.5, -1);
  scene.add(rim);

  const gun = buildNpcWeapon(weaponId, TINTS[weaponId] || 0x5c3a1e);
  gun.rotation.set(-0.15, Math.PI / 2, 0);
  gun.scale.setScalar(1.75);
  scene.add(gun);

  renderer.render(scene, camera);
  viewers.push({ renderer, scene, camera, gun, canvas, weaponId });

  const ro = new ResizeObserver(() => {
    const nw = Math.max(64, wrap?.clientWidth || 96);
    const nh = Math.max(48, wrap?.clientHeight || 72);
    renderer.setSize(nw, nh, false);
    camera.aspect = nw / nh;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  });
  if (wrap) ro.observe(wrap);
}

export function disposeMenuWeaponPreviews() {
  for (const v of viewers) {
    v.renderer.dispose();
    v.gun.traverse((o) => {
      if (o.geometry) o.geometry.dispose?.();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose?.());
        else o.material.dispose?.();
      }
    });
  }
  viewers.length = 0;
}
