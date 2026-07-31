/** Bichinhos jogáveis do modo Esconde-Bicho — corpo recolorível / pintável pixel a pixel */

import * as THREE from "three";
import { createPaintableSkin } from "./chameleon-paint.js";

function box(w, h, d, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  return m;
}

function cyl(rt, rb, h, seg, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  return m;
}

function ball(r, mat, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 12), mat);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  return m;
}

export const ANIMAL_TYPES = ["elefante", "girafa", "leao"];
export const ANIMAL_META = {
  elefante: { label: "Elefante", emoji: "🐘", speed: 0.82, hp: "Grandão e forte — anda mais devagar" },
  girafa: { label: "Girafa", emoji: "🦒", speed: 1.05, hp: "Alta e rápida — mas difícil se abaixar" },
  leao: { label: "Leão", emoji: "🦁", speed: 1.22, hp: "Ágil e veloz — o mais discreto correndo" },
};

function makeSkin(color) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.78, metalness: 0.03 });
}

function buildLeg(skin, dark, x, hipY, z, len, thick) {
  const pivot = new THREE.Group();
  pivot.position.set(x, hipY, z);
  pivot.add(box(thick, len, thick, skin, 0, -len / 2, 0));
  pivot.add(box(thick * 1.22, thick * 0.46, thick * 1.32, dark, 0, -len + thick * 0.22, 0));
  return pivot;
}

function tagPaintable(mesh, paintable) {
  mesh.userData.paintable = paintable;
}

/** Constrói um dos 3 bichinhos jogáveis. Retorna hooks pra pintar e animar. */
export function buildChameleonAnimal(type = "elefante", colorHex = 0xff6a3d) {
  const paintable = createPaintableSkin(colorHex);
  const skin = paintable.material;
  const dark = new THREE.MeshStandardMaterial({ color: 0x211712, roughness: 0.7, metalness: 0.05 });
  const ivory = new THREE.MeshStandardMaterial({ color: 0xf2ead8, roughness: 0.4, metalness: 0.05 });

  const g = new THREE.Group();
  const legs = [];
  const headGroup = new THREE.Group();
  let eyeHeight = 0.5;
  let bodyLen = 0.5;

  const addLeg = (x, hipY, z, len, thick) => {
    const leg = buildLeg(skin, dark, x, hipY, z, len, thick);
    g.add(leg);
    legs.push(leg);
  };

  if (type === "girafa") {
    const hip = 0.62;
    bodyLen = 0.34;
    g.add(ball(0.19, skin, 0, hip + 0.1, 0, 1.35, 0.82, 1));
    addLeg(0.1, hip, 0.14, hip - 0.03, 0.045);
    addLeg(-0.1, hip, 0.14, hip - 0.03, 0.045);
    addLeg(0.1, hip, -0.15, hip - 0.03, 0.045);
    addLeg(-0.1, hip, -0.15, hip - 0.03, 0.045);
    headGroup.position.set(0, hip + 0.14, 0.12);
    g.add(headGroup);
    headGroup.add(cyl(0.05, 0.075, 0.62, 8, skin, 0, 0.31, -0.02, 0, 0, -0.06));
    headGroup.add(ball(0.09, skin, 0.005, 0.66, -0.05, 1, 0.92, 1.1));
    headGroup.add(box(0.03, 0.05, 0.02, dark, -0.05, 0.72, -0.08));
    headGroup.add(box(0.03, 0.05, 0.02, dark, 0.05, 0.72, -0.08));
    headGroup.add(ball(0.018, dark, -0.05, 0.755, -0.08));
    headGroup.add(ball(0.018, dark, 0.05, 0.755, -0.08));
    headGroup.add(box(0.11, 0.05, 0.09, skin, -0.11, 0.66, -0.09, 0, 0, 0.5));
    headGroup.add(box(0.11, 0.05, 0.09, skin, 0.11, 0.66, -0.09, 0, 0, -0.5));
    headGroup.add(ball(0.018, dark, -0.045, 0.68, -0.115));
    headGroup.add(ball(0.018, dark, 0.045, 0.68, -0.115));
    g.add(cyl(0.012, 0.02, 0.28, 6, skin, 0, hip - 0.05, -0.19, 0.25));
    g.add(ball(0.028, dark, 0, hip - 0.18, -0.28));
    eyeHeight = hip + 0.62;
  } else if (type === "leao") {
    const hip = 0.26;
    bodyLen = 0.42;
    g.add(ball(0.2, skin, 0, hip + 0.06, 0, 1.55, 1.05, 1.05));
    addLeg(0.13, hip, 0.19, hip - 0.02, 0.062);
    addLeg(-0.13, hip, 0.19, hip - 0.02, 0.062);
    addLeg(0.13, hip, -0.21, hip - 0.02, 0.066);
    addLeg(-0.13, hip, -0.21, hip - 0.02, 0.066);
    headGroup.position.set(0, hip + 0.15, 0.34);
    g.add(headGroup);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      headGroup.add(
        ball(0.052, skin, Math.cos(a) * 0.13, Math.sin(a) * 0.11, -0.02 + Math.sin(a * 2) * 0.01)
      );
    }
    headGroup.add(ball(0.11, skin, 0, 0, 0, 1.05, 0.95, 1));
    headGroup.add(ball(0.045, skin, 0, -0.03, 0.11, 0.9, 0.75, 1.1));
    headGroup.add(ball(0.016, dark, 0, -0.02, 0.17));
    headGroup.add(ball(0.016, dark, -0.055, 0.04, 0.09));
    headGroup.add(ball(0.016, dark, 0.055, 0.04, 0.09));
    headGroup.add(box(0.03, 0.03, 0.02, skin, -0.08, 0.12, -0.02, 0, 0, 0.4));
    headGroup.add(box(0.03, 0.03, 0.02, skin, 0.08, 0.12, -0.02, 0, 0, -0.4));
    g.add(cyl(0.02, 0.014, 0.34, 6, skin, 0, hip + 0.02, -0.32, -0.5));
    g.add(ball(0.035, skin, 0, hip - 0.16, -0.46));
    eyeHeight = hip + 0.16 + 0.15;
  } else {
    const hip = 0.3;
    bodyLen = 0.5;
    g.add(ball(0.27, skin, 0, hip + 0.1, 0, 1.35, 1.08, 1.18));
    addLeg(0.15, hip, 0.22, hip - 0.02, 0.09);
    addLeg(-0.15, hip, 0.22, hip - 0.02, 0.09);
    addLeg(0.15, hip, -0.22, hip - 0.02, 0.09);
    addLeg(-0.15, hip, -0.22, hip - 0.02, 0.09);
    headGroup.position.set(0, hip + 0.22, 0.32);
    g.add(headGroup);
    headGroup.add(ball(0.16, skin, 0, 0, 0, 1, 0.95, 0.92));
    headGroup.add(ball(0.15, skin, -0.2, 0.03, -0.02, 0.16, 1, 0.85));
    headGroup.add(ball(0.15, skin, 0.2, 0.03, -0.02, 0.16, 1, 0.85));
    headGroup.add(ball(0.016, dark, -0.07, 0.03, 0.14));
    headGroup.add(ball(0.016, dark, 0.07, 0.03, 0.14));
    headGroup.add(ball(0.022, ivory, -0.035, -0.09, 0.17, 0.5, 1, 0.5));
    headGroup.add(ball(0.022, ivory, 0.035, -0.09, 0.17, 0.5, 1, 0.5));
    const trunk = new THREE.Group();
    trunk.position.set(0, -0.02, 0.15);
    headGroup.add(trunk);
    let ty = 0;
    let tz = 0;
    for (let i = 0; i < 4; i++) {
      const seg = cyl(0.05 - i * 0.008, 0.05 - i * 0.006, 0.11, 8, skin, 0, ty, tz, 0.35 + i * 0.22);
      trunk.add(seg);
      ty -= 0.1;
      tz += 0.02;
    }
    trunk.userData.isTrunk = true;
    g.userData.trunk = trunk;
    g.add(cyl(0.03, 0.05, 0.16, 6, skin, 0, hip - 0.02, -0.3, -0.4));
    g.add(ball(0.04, dark, 0, hip - 0.14, -0.38));
    eyeHeight = hip + 0.22 + 0.16;
  }

  g.userData.isChameleonAnimal = true;
  g.userData.animalType = type;
  g.userData.bodyLen = bodyLen;
  g.traverse((o) => {
    o.castShadow = false;
    o.receiveShadow = false;
    if (o.isMesh && o.material === skin) tagPaintable(o, paintable);
  });

  return {
    group: g,
    legs,
    headGroup,
    trunk: g.userData.trunk || null,
    skinMat: skin,
    paintable,
    setColor(hex) {
      paintable.paintUV(0.5, 0.5, hex, 28);
    },
    paintUV(u, v, hex, r = 1) {
      paintable.paintUV(u, v, hex, r);
    },
    getAverageColor() {
      return paintable.averageColor();
    },
    eyeHeight,
    bodyLen,
    animalType: type,
  };
}

/** Caçador — figura grande (10x o bichinho) que patrulha a arena */
export function buildHunter() {
  const cloth = new THREE.MeshStandardMaterial({ color: 0x241a22, roughness: 0.85, metalness: 0.08 });
  const skin = new THREE.MeshStandardMaterial({ color: 0x3a2a24, roughness: 0.8, metalness: 0.04 });
  const glow = new THREE.MeshStandardMaterial({
    color: 0xff3d2e,
    emissive: 0xff3d2e,
    emissiveIntensity: 1.4,
    roughness: 0.4,
  });

  const g = new THREE.Group();
  const legs = [];

  g.add(box(0.34, 0.5, 0.22, cloth, 0, 1.05, 0));
  g.add(box(0.38, 0.14, 0.26, cloth, 0, 1.34, 0));
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.5, 0.02);
  g.add(headGroup);
  headGroup.add(box(0.22, 0.24, 0.22, skin, 0, 0, 0));
  headGroup.add(ball(0.028, glow, -0.06, 0.02, 0.11));
  headGroup.add(ball(0.028, glow, 0.06, 0.02, 0.11));
  headGroup.add(box(0.24, 0.1, 0.24, cloth, 0, 0.16, -0.02));

  const armL = new THREE.Group();
  armL.position.set(0.22, 1.32, 0);
  armL.add(box(0.11, 0.46, 0.13, cloth, 0, -0.23, 0));
  g.add(armL);
  const armR = new THREE.Group();
  armR.position.set(-0.22, 1.32, 0);
  armR.add(box(0.11, 0.46, 0.13, cloth, 0, -0.23, 0));
  g.add(armR);

  for (const side of [1, -1]) {
    const leg = new THREE.Group();
    leg.position.set(side * 0.12, 0.82, 0);
    leg.add(box(0.15, 0.82, 0.17, cloth, 0, -0.41, 0));
    leg.add(box(0.17, 0.09, 0.24, skin, 0, -0.84, 0.03));
    g.add(leg);
    legs.push(leg);
  }

  g.userData.isHunter = true;
  g.traverse((o) => {
    o.castShadow = false;
    o.receiveShadow = false;
  });

  return { group: g, legs, headGroup, armL, armR, eyeHeight: 1.5 };
}
