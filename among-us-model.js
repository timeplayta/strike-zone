/** Personagem estilo Among Us — corpo simples para preview e jogo */

import * as THREE from "three";

const SKIN_COLORS = {
  among_red: 0xff3355,
  among_blue: 0x2266ee,
  among_green: 0x33aa44,
  among_pink: 0xff66aa,
  among_yellow: 0xffcc22,
  among_black: 0x222228,
  among_white: 0xf0f0f5,
  among_cyan: 0x22dddd,
  neon_runner: 0x00ffaa,
  shadow: 0x1a1028,
  soldier: 0x8899aa,
};

export function getAmongUsColor(skinId) {
  return SKIN_COLORS[skinId] || SKIN_COLORS.soldier;
}

export function buildAmongUsCharacter(skinId = "among_red", scale = 1) {
  const color = getAmongUsColor(skinId);
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.05 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 0.72, 6, 10), bodyMat);
  body.position.y = 0.88;
  body.castShadow = true;

  const pack = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.5, 0.22),
    bodyMat
  );
  pack.position.set(0, 0.75, -0.28);

  const visorMat = new THREE.MeshStandardMaterial({
    color: 0x7ee8f8,
    roughness: 0.15,
    metalness: 0.35,
    emissive: 0x114455,
    emissiveIntensity: 0.25,
  });
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), visorMat);
  visor.position.set(0, 1.18, 0.24);
  visor.scale.set(1.15, 0.78, 0.75);

  const legL = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.2, 4, 6), bodyMat);
  legL.position.set(-0.18, 0.22, 0);
  const legR = legL.clone();
  legR.position.x = 0.18;

  group.add(body, pack, visor, legL, legR);
  group.scale.setScalar(scale);

  if (skinId === "neon_runner") {
    bodyMat.emissive = new THREE.Color(0x00ffaa);
    bodyMat.emissiveIntensity = 0.35;
  }
  if (skinId === "shadow") {
    bodyMat.emissive = new THREE.Color(0x4422aa);
    bodyMat.emissiveIntensity = 0.2;
  }

  return { group, hitMeshes: [body, visor], head: visor };
}
