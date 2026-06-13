/** Zona de saída — vitória ao alcançar o fim do labirinto */

import * as THREE from "three";

export function createExitZone(exit) {
  const root = new THREE.Group();
  root.position.set(exit.x, 0, exit.z);

  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x224433,
    emissive: 0x113322,
    emissiveIntensity: 0.35,
    roughness: 0.7,
    metalness: 0.2,
  });

  const pillarL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.2, 0.35), frameMat);
  pillarL.position.set(-1.1, 1.6, 0);
  const pillarR = pillarL.clone();
  pillarR.position.x = 1.1;

  const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.28, 0.4), frameMat);
  lintel.position.y = 3.1;

  const portal = new THREE.Mesh(
    new THREE.PlaneGeometry(2.0, 2.8),
    new THREE.MeshBasicMaterial({
      color: 0x88ffcc,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
    })
  );
  portal.position.set(0, 1.5, 0);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.0, 1.35, 24),
    new THREE.MeshBasicMaterial({ color: 0x44ffaa, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.04;

  const light = new THREE.PointLight(0x66ffaa, 0.9, 12);
  light.position.set(0, 2.2, 0);

  root.add(pillarL, pillarR, lintel, portal, ring, light);

  return { group: root, x: exit.x, z: exit.z, radius: exit.radius || 2.5 };
}

export function updateExitZone(exitZone, dt) {
  if (!exitZone?.group) return;
  const t = performance.now() * 0.001;
  const portal = exitZone.group.children.find((c) => c.geometry?.type === "PlaneGeometry");
  if (portal?.material) portal.material.opacity = 0.15 + Math.sin(t * 2) * 0.1;
  const ring = exitZone.group.children.find((c) => c.geometry?.type === "RingGeometry");
  if (ring) ring.rotation.z = t * 0.5;
}

export function checkExitReached(px, pz, exitZone) {
  if (!exitZone) return false;
  return Math.hypot(px - exitZone.x, pz - exitZone.z) <= exitZone.radius;
}
