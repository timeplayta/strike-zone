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
  trevas_horror: 0x14091f,
  birthday_hero: 0xffcc44,
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
  if (skinId === "trevas_horror") {
    bodyMat.emissive = new THREE.Color(0x5a22aa);
    bodyMat.emissiveIntensity = 0.22;
    visorMat.color.setHex(0xff3355);
    visorMat.emissive = new THREE.Color(0xaa0018);
    visorMat.emissiveIntensity = 0.55;
    const hornMat = new THREE.MeshStandardMaterial({ color: 0x0a0610, roughness: 0.62, metalness: 0.18 });
    const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.28, 10), hornMat);
    const hornR = hornL.clone();
    hornL.position.set(-0.14, 1.5, 0.02);
    hornR.position.set(0.14, 1.5, 0.02);
    hornL.rotation.z = 0.35;
    hornR.rotation.z = -0.35;
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0x7a44ff,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const aura = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.014, 8, 42), auraMat);
    aura.position.set(0, 0.86, 0.02);
    aura.rotation.x = Math.PI / 2;
    group.add(hornL, hornR, aura);
  }
  if (skinId === "birthday_hero") {
    const hatMat = new THREE.MeshStandardMaterial({ color: 0xff44aa, roughness: 0.42, metalness: 0.08 });
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.42, 18), hatMat);
    hat.position.set(0, 1.62, 0.02);
    const pom = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })
    );
    pom.position.set(0, 1.86, 0.02);
    const stripe = new THREE.Mesh(
      new THREE.TorusGeometry(0.15, 0.014, 6, 18),
      new THREE.MeshStandardMaterial({ color: 0x66ccff, roughness: 0.35 })
    );
    stripe.position.set(0, 1.52, 0.02);
    stripe.rotation.x = Math.PI / 2;
    group.add(hat, pom, stripe);
  }

  return { group, hitMeshes: [body, visor], head: visor };
}
