/** 3 monstros do Labirinto (Fim das Trevas) — cada um com jumpscare único */

import * as THREE from "three";
import { showJumpscareOverlay } from "./horror-jumpscare.js";

export const LABYRINTH_MONSTER_DEFS = [
  {
    id: "devorador",
    name: "O Devorador das Trevas",
    style: "devorador",
    emoji: "🩸",
    color: 0x8a1010,
    eye: 0xff4422,
    scale: 1.35,
    height: 2.6,
  },
  {
    id: "observador",
    name: "O Observador",
    style: "observador",
    emoji: "👁",
    color: 0x1a2238,
    eye: 0x66ccff,
    scale: 1.2,
    height: 2.4,
  },
  {
    id: "vazio",
    name: "O Vazio Eterno",
    style: "vazio",
    emoji: "🕳",
    color: 0x0a0a12,
    eye: 0xcccccc,
    scale: 1.5,
    height: 2.8,
  },
];

let monsters = [];
let jumpscareLock = false;

function buildMonsterMesh(def) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: def.color,
    roughness: 0.85,
    emissive: new THREE.Color(def.color).multiplyScalar(0.15),
  });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 1.4, 6, 10), bodyMat);
  body.position.y = def.height * 0.42;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 10), bodyMat);
  head.position.y = def.height * 0.82;
  head.scale.set(1.1, 1, 1);

  const eyeMat = new THREE.MeshStandardMaterial({
    color: def.eye,
    emissive: def.eye,
    emissiveIntensity: 0.9,
  });
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), eyeMat);
  eyeL.position.set(-0.14, def.height * 0.86, 0.28);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.14;

  const mouth = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.06, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x330000, emissiveIntensity: 0.5 })
  );
  mouth.position.set(0, def.height * 0.72, 0.32);

  group.add(body, head, eyeL, eyeR, mouth);
  group.scale.setScalar(def.scale);
  return group;
}

export function spawnLabyrinthMonsters(scene, mapData) {
  clearLabyrinthMonsters(scene);
  if (!scene || !mapData?.patrolPoints?.length) return;

  const pts = mapData.patrolPoints;
  const picks = [
    pts[Math.floor(pts.length * 0.28)] || pts[0],
    pts[Math.floor(pts.length * 0.52)] || pts[Math.floor(pts.length / 2)],
    pts[Math.floor(pts.length * 0.78)] || pts[pts.length - 1],
  ];

  monsters = LABYRINTH_MONSTER_DEFS.map((def, i) => {
    const pt = picks[i];
    const group = buildMonsterMesh(def);
    group.position.set(pt.x, 0, pt.z);
    scene.add(group);
    return {
      def,
      group,
      triggered: false,
      alive: true,
      speed: 1.8 + i * 0.3,
    };
  });
}

export function clearLabyrinthMonsters(scene) {
  for (const m of monsters) {
    if (m.group && scene) scene.remove(m.group);
  }
  monsters = [];
  jumpscareLock = false;
}

export function updateLabyrinthMonsters(dt, camera, onDamage) {
  if (!camera || jumpscareLock || !monsters.length) return;

  const px = camera.position.x;
  const pz = camera.position.z;

  for (const m of monsters) {
    if (!m.alive || !m.group) continue;

    const dx = px - m.group.position.x;
    const dz = pz - m.group.position.z;
    const dist = Math.hypot(dx, dz);

    if (dist < 14) {
      const step = m.speed * dt;
      if (dist > 1.2) {
        m.group.position.x += (dx / dist) * step;
        m.group.position.z += (dz / dist) * step;
        m.group.lookAt(px, m.group.position.y, pz);
      }
    }

    if (!m.triggered && dist < 5.5) {
      m.triggered = true;
      jumpscareLock = true;
      showJumpscareOverlay({
        style: m.def.style,
        name: m.def.name,
        emoji: m.def.emoji,
        duration: 1100,
        sound: "monster",
      }).then(() => {
        jumpscareLock = false;
        onDamage?.(m.def.name, 28);
      });
      break;
    }
  }
}

export function getLabyrinthMonsters() {
  return monsters;
}
