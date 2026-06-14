/** 3 monstros do Fim das Trevas — gosmento, gigante de mãos, pelúcia */

import * as THREE from "three";
import { showJumpscareOverlay } from "./horror-jumpscare.js";
import { buildGiganteJanitorMesh, animateGiganteJanitor, poseGiganteArmsOpen, ROGER_BODY_HEIGHT } from "./gigante-monster-builder.js";
import {
  buildGosmentoMukMesh,
  animateGosmentoMuk,
  initGosmentoMonsterState,
  GOSMENTO_TARGET_HEIGHT,
} from "./gosmento-muk-builder.js";
import { makePeluciaMaterials } from "./pelucia-materials.js";
import {
  playMonsterStalk,
  startMonsterDrone,
  updateMonsterDrone,
  stopMonsterDrone,
  stopAllMonsterDrones,
  speakPlushLine,
} from "./horror-monster-sounds.js";

export const LABYRINTH_MONSTER_DEFS = [
  {
    id: "gosmento",
    name: "O Gosmento",
    style: "gosmento",
    type: "gosmento",
    color: 0x6a4a88,
    eye: 0xccb8e8,
    scale: 1,
    targetHeight: GOSMENTO_TARGET_HEIGHT,
    chaseSpeed: 1.75,
    aggroDist: 11,
    triggerDist: 4.8,
    jumpscareType: "slime",
  },
  {
    id: "gigante",
    name: "O que mora nas paredes",
    style: "gigante",
    type: "gigante",
    color: 0x1a0a0a,
    eye: 0x330000,
    scale: 1,
    bodyHeight: ROGER_BODY_HEIGHT,
    chaseSpeed: 1.2,
    catchUpMul: 2.1,
    aggroDist: 20,
    triggerDist: 5.5,
    maxChaseMeters: 38,
    jumpscareType: "giant",
  },
  {
    id: "pelucia",
    name: "Bam-Bam",
    style: "pelucia",
    type: "pelucia",
    color: 0x8a5a32,
    eye: 0x111111,
    scale: 0.58,
    chaseSpeed: 2.4,
    aggroDist: 16,
    triggerDist: 3.2,
    voiceLine: "Vem brincar comigo",
    voiceInterval: 5,
    jumpscareType: "plush",
  },
];

let monsters = [];
let jumpscareLock = false;
let animClock = 0;

function buildGosmentoMesh(def) {
  return buildGosmentoMukMesh(def.targetHeight ?? GOSMENTO_TARGET_HEIGHT);
}

function attachMonsterGlow(group, def) {
  const color =
    def.type === "gosmento" ? 0xaa66cc
    : def.type === "gigante" ? 0xff3311
    : def.type === "pelucia" ? 0xffaa66
    : 0xff2200;
  const y =
    def.type === "gigante" ? 2.55
    : def.type === "pelucia" ? 0.55
    : def.type === "gosmento" ? 1.5
    : 0.75;
  const light = new THREE.PointLight(color, def.type === "gosmento" ? 2.2 : 1.8, 20, 1.6);
  light.position.set(0, y, 0.5);
  group.add(light);
  group.userData.monsterLight = light;
}

function buildGiganteMesh(def) {
  const built = buildGiganteJanitorMesh();
  if (def.scale && def.scale !== 1) {
    built.group.scale.setScalar(def.scale);
  }
  return built;
}

function buildPeluciaMesh(def) {
  const group = new THREE.Group();
  const { fur, belly, eyeW, eyeB } = makePeluciaMaterials();

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 20), fur);
  body.scale.set(1, 0.9, 0.95);
  body.position.y = 0.42;
  const bellyMesh = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 16), belly);
  bellyMesh.position.set(0, 0.38, 0.12);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 24, 20), fur);
  head.position.set(0, 0.82, 0.05);
  const earL = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 12), fur);
  earL.position.set(-0.28, 1.02, 0);
  const earR = earL.clone();
  earR.position.x = 0.28;

  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 12), eyeW);
  eyeL.position.set(-0.1, 0.86, 0.28);
  const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 12), eyeB);
  eyeR.position.set(0.12, 0.84, 0.3);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), belly);
  nose.position.set(0, 0.78, 0.35);

  group.add(body, bellyMesh, head, earL, earR, eyeL, eyeR, nose);
  group.scale.setScalar(def.scale);
  return { group, parts: { body, head } };
}

function buildMonsterMesh(def) {
  if (def.type === "gosmento") return buildGosmentoMesh(def);
  if (def.type === "gigante") return buildGiganteMesh(def);
  if (def.type === "pelucia") return buildPeluciaMesh(def);
  return buildGosmentoMesh(def);
}

function animateMonster(m, t) {
  const { group, parts, def } = m;
  if (!group) return;

  if (def.type === "gosmento") {
    animateGosmentoMuk(m, t);
    return;
  }

  if (def.type === "gigante") {
    animateGiganteJanitor(m, t);
    return;
  }

  if (def.type === "pelucia" && parts?.body) {
    const bob = Math.sin(t * 5 + m.animSeed) * 0.04;
    parts.body.position.y = 0.42 + bob;
    if (parts.head) parts.head.position.y = 0.82 + bob;
  }
}

export function spawnLabyrinthMonsters(scene, mapData) {
  clearLabyrinthMonsters(scene);
  if (!scene) return;

  const points = mapData?.monsterSpawns?.length
    ? mapData.monsterSpawns
    : mapData?.patrolPoints;
  if (!points?.length) {
    console.warn("[Strike Zone] Sem pontos de spawn para monstros do labirinto.");
    return;
  }

  const picks = [
    points[0],
    points[1] ?? points[0],
    points[2] ?? points[Math.min(points.length - 1, 2)],
  ];

  monsters = LABYRINTH_MONSTER_DEFS.map((def, i) => {
    const pt = picks[i];
    if (typeof pt?.x !== "number" || typeof pt?.z !== "number") return null;
    const built = buildMonsterMesh(def);
    built.group.position.set(pt.x, 0, pt.z);
    attachMonsterGlow(built.group, def);
    scene.add(built.group);
    const entry = {
      def,
      group: built.group,
      parts: built.parts,
      triggered: false,
      alive: true,
      state: "idle",
      chaseMeters: 0,
      chaseOrigin: null,
      lastStalkAt: 0,
      lastVoiceAt: 0,
      animSeed: i * 2.1 + 0.5,
      droneOn: false,
      moveVelX: 0,
      moveVelZ: 0,
      baseScale: built.group.scale.x,
    };
    if (def.type === "gosmento") initGosmentoMonsterState(entry, built);
    return entry;
  }).filter(Boolean);

  console.info(`[Strike Zone] ${monsters.length} monstros spawnados no mapa.`);
}

export function getTrevasMonsterBounds(group) {
  const box = new THREE.Box3().setFromObject(group);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  return { box, size, center };
}

/** Preview no menu Boneco + admin */
export function createTrevasMonsterMesh(monsterId, options = {}) {
  const def = LABYRINTH_MONSTER_DEFS.find((d) => d.id === monsterId) || LABYRINTH_MONSTER_DEFS[0];
  const built = buildMonsterMesh(def);
  if (options.preview && def.type === "gigante") {
    poseGiganteArmsOpen(built.parts);
  }
  attachMonsterGlow(built.group, def);
  return built.group;
}

export function clearLabyrinthMonsters(scene) {
  stopAllMonsterDrones();
  for (const m of monsters) {
    if (m.group && scene) scene.remove(m.group);
  }
  monsters = [];
  jumpscareLock = false;
}

function triggerJumpscare(m, camera, scene, renderer, onDamage) {
  jumpscareLock = true;
  m.triggered = true;
  m.state = "triggered";
  stopMonsterDrone(m.def.type);
  document.exitPointerLock?.();

  showJumpscareOverlay({
    camera,
    scene,
    renderer: renderer || window.__strikeRenderer,
    sourceGroup: m.group,
    def: m.def,
    style: m.def.style,
    name: m.def.name,
    duration: m.def.jumpscareType === "plush" ? 1600 : 1500,
    sound: m.def.type,
    jumpscareType: m.def.jumpscareType,
  }).then(() => {
    jumpscareLock = false;
    const dmg = m.def.type === "gigante" ? 38 : m.def.type === "pelucia" ? 30 : 26;
    onDamage?.(m.def.name, dmg);
  });
}

export function updateLabyrinthMonsters(dt, camera, scene, renderer, onDamage) {
  if (!camera || jumpscareLock || !monsters.length) return;

  animClock += dt;
  const px = camera.position.x;
  const pz = camera.position.z;

  for (const m of monsters) {
    if (!m.alive || !m.group || m.triggered) continue;

    animateMonster(m, animClock);

    const dx = px - m.group.position.x;
    const dz = pz - m.group.position.z;
    const dist = Math.hypot(dx, dz);
    const def = m.def;

    const inAggro = dist < def.aggroDist;
    if (inAggro && m.state === "idle") {
      m.state = "chasing";
      m.chaseOrigin = { x: px, z: pz };
      m.chaseMeters = 0;
    }

    if (m.state === "chasing") {
      const intensity = Math.max(0, 1 - dist / def.aggroDist);

      if (!m.droneOn) {
        startMonsterDrone(def.type, intensity);
        m.droneOn = true;
      } else {
        updateMonsterDrone(def.type, intensity);
      }

      const now = performance.now();
      if (now - m.lastStalkAt > 900 - intensity * 400) {
        m.lastStalkAt = now;
        playMonsterStalk(def.type, intensity);
      }

      if (def.type === "pelucia") {
        if (now - m.lastVoiceAt > (def.voiceInterval ?? 5) * 1000) {
          m.lastVoiceAt = now;
          speakPlushLine(def.voiceLine);
        }
      }

      let speed = def.chaseSpeed;
      if (def.type === "gigante") {
        if (dist > 7) speed *= def.catchUpMul ?? 2;
        if (m.chaseMeters >= def.maxChaseMeters) {
          m.state = "idle";
          stopMonsterDrone(def.type);
          m.droneOn = false;
          continue;
        }
      }

      if (dist > 1.1 && dist < def.aggroDist + 4) {
        const step = speed * dt;
        const moved = Math.min(step, dist - 0.9);
        const nx = dx / dist;
        const nz = dz / dist;
        m.group.position.x += nx * moved;
        m.group.position.z += nz * moved;
        m.chaseMeters += moved;

        if (def.type === "gosmento") {
          const invDt = dt > 0 ? 1 / dt : 0;
          m.moveVelX = nx * moved * invDt;
          m.moveVelZ = nz * moved * invDt;
        }

        if (def.type !== "gigante") {
          m.group.lookAt(px, m.group.position.y, pz);
        } else {
          m.group.lookAt(px, m.group.position.y + 1.2, pz);
        }
      } else if (def.type === "gosmento") {
        m.moveVelX *= 0.82;
        m.moveVelZ *= 0.82;
      }

      if (dist < def.triggerDist) {
        triggerJumpscare(m, camera, scene, renderer, onDamage);
        break;
      }

      if (!inAggro && dist > def.aggroDist + 6) {
        m.state = "idle";
        stopMonsterDrone(def.type);
        m.droneOn = false;
      }
    }
  }
}

export function getLabyrinthMonsters() {
  return monsters;
}

export function isLabyrinthJumpscareLocked() {
  return jumpscareLock;
}
