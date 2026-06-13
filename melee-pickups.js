/** Pickups de armas corpo a corpo no labirinto */

import * as THREE from "three";
import { buildMeleeWorldModel, MELEE_COLORS } from "./melee-weapons.js";
import { WEAPONS } from "./weapons-data.js";

function glowLight(color) {
  const l = new THREE.PointLight(color, 0.55, 5);
  l.position.set(0, 0.8, 0);
  return l;
}

export function createMeleePickup(id) {
  const def = WEAPONS[id];
  const root = new THREE.Group();
  const model = buildMeleeWorldModel(id);
  model.position.y = 0.85;
  root.add(model);

  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.42, 0.12, 10),
    new THREE.MeshStandardMaterial({ color: 0x1a1510, roughness: 0.92, metalness: 0.08 })
  );
  pedestal.position.y = 0.06;
  root.add(pedestal);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.38, 0.48, 16),
    new THREE.MeshBasicMaterial({ color: MELEE_COLORS[id] || 0x888888, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  root.add(ring);

  const light = glowLight(MELEE_COLORS[id] || 0x888888);
  root.add(light);

  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 1.4, 1.1),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hit.position.y = 0.7;
  hit.userData.meleePickup = id;
  root.add(hit);

  root.userData.meleePickup = id;
  root.userData.pickupName = def?.name || id;
  root.userData.spinModel = model;

  return { group: root, hitMesh: hit, id, collected: false };
}

export function spawnMeleePickups(scene, pickupList) {
  const items = [];
  for (const p of pickupList) {
    const item = createMeleePickup(p.id);
    item.group.position.set(p.x, 0, p.z);
    scene.add(item.group);
    items.push({ ...item, x: p.x, z: p.z });
  }
  return {
    items,
    hitMeshes: items.filter((i) => !i.collected).map((i) => i.hitMesh),
  };
}

export function updateMeleePickups(pickups, dt) {
  if (!pickups?.items) return;
  const t = performance.now() * 0.001;
  for (const item of pickups.items) {
    if (item.collected) continue;
    const m = item.group.userData.spinModel;
    if (m) {
      m.rotation.y = t * 1.4;
      m.position.y = 0.85 + Math.sin(t * 2.2 + item.x) * 0.06;
    }
    const ring = item.group.children.find((c) => c.geometry?.type === "RingGeometry");
    if (ring?.material) ring.material.opacity = 0.28 + Math.sin(t * 3) * 0.15;
  }
}

export function tryPickupMelee(camera, pickups, dist = 2.4) {
  if (!pickups?.items) return null;
  for (const item of pickups.items) {
    if (item.collected) continue;
    const d = Math.hypot(camera.position.x - item.x, camera.position.z - item.z);
    if (d < dist) return item;
  }
  return null;
}

export function collectMeleePickup(scene, item) {
  item.collected = true;
  scene.remove(item.group);
  return item.id;
}
