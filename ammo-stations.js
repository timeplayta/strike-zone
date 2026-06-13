/** Baús de munição — CT (jogador) e T (inimigos) */

import * as THREE from "three";

export const ENEMY_MAG_SIZE = 30;
export const ENEMY_RELOAD_MS = 2400;

export function createAmmoChest(team = "ct") {
  const root = new THREE.Group();
  const isCt = team === "ct";
  const wood = new THREE.MeshStandardMaterial({
    color: isCt ? 0x4a3520 : 0x3a2818,
    roughness: 0.88,
  });
  const metal = new THREE.MeshStandardMaterial({ color: 0x555560, roughness: 0.4, metalness: 0.7 });
  const accent = new THREE.MeshStandardMaterial({
    color: isCt ? 0x2266aa : 0xcc4422,
    roughness: 0.5,
    metalness: 0.3,
  });

  const base = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.75, 0.85), wood);
  base.position.y = 0.375;
  base.castShadow = false;
  root.add(base);

  const lid = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.12, 0.87), wood);
  lid.position.y = 0.82;
  root.add(lid);

  const lock = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.06), metal);
  lock.position.set(0, 0.72, 0.46);
  root.add(lock);

  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.04), accent);
  plate.position.set(0, 0.55, 0.44);
  root.add(plate);

  for (let i = 0; i < 3; i++) {
    const bullet = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.12, 6), metal);
    bullet.rotation.z = Math.PI / 2;
    bullet.position.set(-0.2 + i * 0.2, 0.58, 0.48);
    root.add(bullet);
  }

  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 1.0, 1.0),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hit.position.y = 0.5;
  hit.userData.isAmmoChest = true;
  hit.userData.chestTeam = team;
  root.add(hit);

  root.userData.isAmmoChest = true;
  root.userData.chestTeam = team;

  return { group: root, hitMesh: hit, team };
}

export function getChestPositions(mapData) {
  const s = mapData.scale || 1;
  return {
    ct: {
      x: mapData.spawnCT.x + 4 * s,
      z: mapData.spawnCT.z - 3 * s,
    },
    t: {
      x: mapData.spawnT.x - 4 * s,
      z: mapData.spawnT.z + 3 * s,
    },
  };
}

export function spawnAmmoChests(scene, mapData) {
  const pos = getChestPositions(mapData);
  const ct = createAmmoChest("ct");
  ct.group.position.set(pos.ct.x, 0, pos.ct.z);
  scene.add(ct.group);

  const t = createAmmoChest("t");
  t.group.position.set(pos.t.x, 0, pos.t.z);
  scene.add(t.group);

  return {
    chests: [ct, t],
    ctPos: pos.ct,
    tPos: pos.t,
    hitMeshes: [ct.hitMesh, t.hitMesh],
  };
}
