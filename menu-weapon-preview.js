/** Mini preview 3D das armas no menu */

import * as THREE from "three";
import { buildNpcWeapon } from "./npc-weapon.js";

const TINTS = {
  ak47: 0x5c3a1e,
  scar: 0x3a4a55,
  m4: 0x3d4a38,
  ump45: 0x2a2a32,
  awm: 0x4a3a28,
  doze: 0x6b4423,
  bazooka: 0x45305f,
  glock: 0x2a2a30,
  revolver: 0x6b3f1f,
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
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(w, h, false);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, w / h, 0.05, 8);

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xffeed8, 1.1);
  key.position.set(1.2, 2, 1.5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x88aacc, 0.45);
  rim.position.set(-1, 0.5, -1);
  scene.add(rim);

  const gun = buildNpcWeapon(weaponId, TINTS[weaponId] || 0x5c3a1e);
  gun.rotation.set(-0.15, Math.PI / 2, 0);
  gun.scale.setScalar(weaponId === "bazooka" ? 1.55 : (weaponId === "glock" || weaponId === "revolver") ? 3.0 : 1.9);
  scene.add(gun);
  frameWeapon(camera, gun, (weaponId === "glock" || weaponId === "revolver") ? 1.4 : 1.12);

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

function frameWeapon(camera, gun, zoom = 1.12) {
  gun.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(gun);
  if (box.isEmpty()) {
    camera.position.set(0.05, 0.12, 1.05);
    camera.lookAt(0, 0.02, 0);
    return;
  }
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y * 2.2, size.z, 0.22);
  const dist = (maxDim / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2))) / zoom;
  camera.position.set(center.x + 0.03, center.y + 0.05, center.z + Math.max(0.55, dist));
  camera.lookAt(center);
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
