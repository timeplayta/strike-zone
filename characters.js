import * as THREE from "three";
import { buildHumanCharacter } from "./human-model.js";
import { pickNpcWeaponType } from "./npc-weapon.js";

const OUTFITS = {
  dust: [
    { shirt: 0xd45a2a, pants: 0x3d2817, cap: 0x1e3a5f },
    { shirt: 0x2a6b9e, pants: 0x1c2233, cap: 0x8b2020 },
    { shirt: 0xc9a227, pants: 0x2e2418, cap: 0x1a1a1a },
    { shirt: 0x6b3a8c, pants: 0x222233, cap: 0x2d5a27 },
  ],
  warehouse: [
    { shirt: 0x4a5a6a, pants: 0x2a2a32, cap: 0x333344 },
    { shirt: 0x3d4f3d, pants: 0x1e1e22, cap: 0x1a1a1a },
    { shirt: 0x5a4a3a, pants: 0x252018, cap: 0x445566 },
    { shirt: 0x2a3a4a, pants: 0x181c22, cap: 0x222222 },
  ],
  horror: [
    { shirt: 0x1a0808, pants: 0x0a0606, cap: 0x111111 },
    { shirt: 0x0f1208, pants: 0x080a06, cap: 0x0a0a0a },
    { shirt: 0x180a10, pants: 0x0c0608, cap: 0x151515 },
    { shirt: 0x101008, pants: 0x080806, cap: 0x0d0d0d },
  ],
};

/** Perfis únicos — rosto, máscara ou boné diferente por índice */
const BANDIT_FACES = [
  { headStyle: "cap", hairColor: 0x1a1008, eyeColor: 0x88aacc, beard: false },
  { headStyle: "mask", maskPattern: "skull", maskColor: 0x222222, maskAccent: 0xdddddd },
  { headStyle: "face", hairColor: 0x553311, eyeColor: 0x66aa66, beard: true, scar: true },
  { headStyle: "mask", maskPattern: "stripe", maskColor: 0x1a1a1a, maskAccent: 0xcc4400 },
  { headStyle: "glasses", hairColor: 0x2a1810, eyeColor: 0x224488 },
  { headStyle: "bandana", maskColor: 0x992222 },
  { headStyle: "mask", maskPattern: "camo", maskColor: 0x3a4a2a, maskAccent: 0x5a6a4a },
  { headStyle: "face", hairColor: 0x0a0a0a, eyeColor: 0xccaa88, beard: true },
  { headStyle: "cap", hairColor: 0x443322, eyeColor: 0x4488cc },
  { headStyle: "mask", maskPattern: "skull", maskColor: 0x333333, maskAccent: 0xff4444 },
];

const HELPER_FACES = [
  { headStyle: "face", helmetFace: true, hairColor: 0x1a1008, eyeColor: 0x88bbff, kneePads: true },
  { headStyle: "face", helmetFace: true, hairColor: 0x332211, eyeColor: 0xaaccff, scar: true, kneePads: true },
];

const SKIN_TONES = [0xc4956a, 0xb07850, 0xd4a574, 0x8d5524, 0xa67c52];

export function createBandit(index, mapKey = "dust", opts = {}) {
  const outfits = OUTFITS[mapKey] || OUTFITS.dust;
  const outfit = outfits[index % outfits.length];
  const faceIdx = index % BANDIT_FACES.length;
  const faceProfile = {
    ...BANDIT_FACES[faceIdx],
    skinTone: SKIN_TONES[index % SKIN_TONES.length],
  };

  const accessory = faceProfile.headStyle === "cap" ? "cap"
    : faceProfile.headStyle === "glasses" ? "glasses"
    : faceProfile.headStyle === "mask" || faceProfile.headStyle === "bandana" ? "mask"
    : null;

  const weaponType = opts.weaponType || pickNpcWeaponType(index, opts.squadSize ?? 4);

  const body = buildHumanCharacter({
    shirt: outfit.shirt,
    pants: outfit.pants,
    skin: faceProfile.skinTone,
    faceProfile,
    withRifle: true,
    weaponType,
    scale: opts.solo ? 1.08 : 1,
    team: "t",
    variant: index,
    horror: mapKey === "horror",
  });

  const names = mapKey === "horror"
    ? ["Espectro", "Sombra", "Vazio", "Eco", "Pesadelo", "Sussurro", "Entidade", "Fantasma", "Presença", "Aparição"]
    : ["Raptor", "Víbora", "Sombra", "Caveira", "Fantasma", "Lobo", "Cobra", "Titan", "Falcão", "Reaper"];

  return {
    ...body,
    accessory,
    faceProfile,
    name: opts.solo ? "Super Bandido" : `${names[faceIdx]} ${index + 1}`,
    weaponType,
  };
}

export function createHostage(variant = 0) {
  const colors = [0x4466aa, 0xaa6644, 0x44aa66];
  return buildHumanCharacter({
    shirt: colors[variant % 3],
    pants: 0x333355,
    faceProfile: { headStyle: "face", hairColor: 0x332211, eyeColor: 0x4488aa },
    withRifle: false,
    team: "t",
  }).group;
}

export function createHelper(index, mapKey = "dust") {
  const horror = mapKey === "horror";
  const faceProfile = HELPER_FACES[index] || HELPER_FACES[0];
  const body = buildHumanCharacter({
    shirt: horror ? 0x0a1018 : index === 0 ? 0x1e3a5c : 0x152d48,
    pants: horror ? 0x060808 : 0x0c1218,
    skin: horror ? 0x6a5a4a : 0xc4956a,
    faceProfile: { ...faceProfile, kneePads: true },
    withRifle: true,
    weaponType: index === 0 ? "m4" : "scar",
    team: "ct",
    variant: index + 3,
    scale: 1.04,
    horror,
  });
  return {
    ...body,
    name: horror ? (index === 0 ? "Eco Alpha" : "Eco Bravo") : index === 0 ? "Operador Alpha" : "Operador Bravo",
    isHelper: true,
    weaponType: index === 0 ? "m4" : "scar",
  };
}

export function createBoss() {
  const body = buildHumanCharacter({
    shirt: 0x1a1a1a,
    pants: 0x111111,
    skin: 0xb07850,
    scale: 1.12,
    faceProfile: {
      headStyle: "mask",
      maskPattern: "skull",
      maskColor: 0x111111,
      maskAccent: 0xff2200,
    },
    withRifle: false,
    team: "t",
    variant: 9,
  });

  const minigun = new THREE.Group();
  const gunBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.08, 0.28, 8),
    new THREE.MeshLambertMaterial({ color: 0x333333 })
  );
  gunBody.rotation.x = Math.PI / 2;
  gunBody.position.set(0, 0, -0.14);
  minigun.add(gunBody);

  const rotor = new THREE.Group();
  const barrelMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
  for (let i = 0; i < 6; i++) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.38, 6), barrelMat);
    const a = (i / 6) * Math.PI * 2;
    b.position.set(Math.cos(a) * 0.09, 0, Math.sin(a) * 0.09);
    b.rotation.x = Math.PI / 2;
    rotor.add(b);
  }
  rotor.position.set(0, 0, -0.3);
  minigun.add(rotor);
  minigun.position.set(0.02, 0.02, 0.06);
  minigun.rotation.set(-0.15, 0, 0);
  if (body.handR) body.handR.add(minigun);
  else if (body.foreR) body.foreR.add(minigun);
  else body.group.add(minigun);

  return {
    ...body,
    name: "Guardião da Bomba",
    isBoss: true,
    minigunRotor: rotor,
  };
}

export function spawnTeleportFx(scene, x, z) {
  const parts = [];
  for (let i = 0; i < 10; i++) {
    const p = new THREE.Mesh(
      new THREE.SphereGeometry(0.08 + Math.random() * 0.1, 4, 4),
      new THREE.MeshBasicMaterial({ color: 0x8844ff, transparent: true, opacity: 0.7 })
    );
    p.position.set(x + (Math.random() - 0.5), 0.5 + Math.random(), z + (Math.random() - 0.5));
    scene.add(p);
    parts.push(p);
    setTimeout(() => scene.remove(p), 400 + Math.random() * 200);
  }
  return parts;
}

export function spawnBloodPool(scene, position, size = 1) {
  const poolMat = new THREE.MeshStandardMaterial({
    map: getBloodPoolTexture(),
    transparent: true,
    opacity: 0.96,
    depthWrite: false,
    color: 0xff4455,
    emissive: 0xcc2233,
    emissiveIntensity: 0.52,
    roughness: 0.55,
    metalness: 0.04,
  });
  const pool = new THREE.Mesh(new THREE.CircleGeometry(0.55 * size, 24), poolMat);
  pool.rotation.x = -Math.PI / 2;
  pool.rotation.z = Math.random() * Math.PI * 2;
  pool.position.set(position.x, 0.018, position.z);
  scene.add(pool);

  const splats = [];
  for (let i = 0; i < 8; i++) {
    const sMat = new THREE.MeshStandardMaterial({
      map: getBloodSplatterTexture(),
      transparent: true,
      opacity: 0.82 + Math.random() * 0.16,
      depthWrite: false,
      color: 0xff5566,
      emissive: 0xaa1122,
      emissiveIntensity: 0.38,
      roughness: 0.62,
    });
    const s = new THREE.Mesh(new THREE.CircleGeometry(0.06 + Math.random() * 0.14, 8), sMat);
    s.rotation.x = -Math.PI / 2;
    s.rotation.z = Math.random() * Math.PI * 2;
    s.position.set(
      position.x + (Math.random() - 0.5) * 1.1 * size,
      0.02 + Math.random() * 0.008,
      position.z + (Math.random() - 0.5) * 1.1 * size
    );
    scene.add(s);
    splats.push(s);
  }

  const glow = new THREE.PointLight(0xff4455, 0.42, 3.8 * size, 1.6);
  glow.position.set(position.x, 0.35, position.z);
  scene.add(glow);

  return { pool, splats, glow };
}

export function spawnBloodSpray(scene, position, count = 12, opts = {}) {
  const { headshot = false, death = false } = opts;
  const particles = [];
  const n = death ? count : headshot ? count + 2 : count;

  for (let i = 0; i < n; i++) {
    const isMist = Math.random() < (headshot ? 0.35 : 0.2);
    const radius = isMist ? 0.018 + Math.random() * 0.025 : 0.035 + Math.random() * 0.045;
    const hue = 0.02 + Math.random() * 0.04;
    const light = 0.22 + Math.random() * 0.18;
    const color = new THREE.Color().setHSL(hue, 0.88, light);

    const p = new THREE.Mesh(
      new THREE.SphereGeometry(radius, isMist ? 3 : 5, isMist ? 3 : 5),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.85 + Math.random() * 0.15,
      })
    );
    p.position.copy(position);
    p.position.x += (Math.random() - 0.5) * 0.15;
    p.position.y += (Math.random() - 0.5) * 0.1;
    p.position.z += (Math.random() - 0.5) * 0.15;

    const spread = death ? 5.5 : headshot ? 4.5 : 3.2;
    p.userData.vel = new THREE.Vector3(
      (Math.random() - 0.5) * spread,
      Math.random() * (headshot ? 4.5 : 3) + 0.8,
      (Math.random() - 0.5) * spread
    );
    p.userData.life = (death ? 0.9 : 0.55) + Math.random() * 0.45;
    p.userData.maxLife = p.userData.life;
    p.userData.isMist = isMist;
    scene.add(p);
    particles.push(p);
  }
  return particles;
}

/** Mancha de impacto — parede ou corpo */
export function spawnBloodImpact(scene, position, scale = 1) {
  const parts = [];
  const main = new THREE.Mesh(
    new THREE.CircleGeometry(0.12 * scale, 10),
    new THREE.MeshBasicMaterial({
      map: getBloodSplatterTexture(),
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
    })
  );
  main.position.copy(position);
  main.lookAt(position.clone().add(new THREE.Vector3(0, 1, 0)));
  scene.add(main);
  parts.push(main);

  for (let i = 0; i < 3; i++) {
    const drip = new THREE.Mesh(
      new THREE.CircleGeometry(0.03 + Math.random() * 0.05, 6),
      new THREE.MeshBasicMaterial({
        map: getBloodPoolTexture(),
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      })
    );
    drip.position.copy(position);
    drip.position.x += (Math.random() - 0.5) * 0.2 * scale;
    drip.position.y -= 0.05 + Math.random() * 0.15;
    drip.position.z += (Math.random() - 0.5) * 0.2 * scale;
    drip.lookAt(drip.position.clone().add(new THREE.Vector3(0, 1, 0)));
    scene.add(drip);
    parts.push(drip);
    drip.userData.life = 1.2 + Math.random() * 0.6;
    drip.userData.vel = new THREE.Vector3(0, -0.35 - Math.random() * 0.25, 0);
    drip.userData.isDrip = true;
  }

  main.userData.life = 0.55;
  main.userData.fade = true;
  return parts;
}

/** Leve mancha vermelha no corpo ao ser atingido */
export function applyBloodHitFlash(enemy, intensity = 0.12) {
  if (!enemy?.group) return;
  enemy.group.traverse((o) => {
    if (!o.isMesh || !o.material?.color) return;
    if (o.userData._bloodBase == null) {
      o.userData._bloodBase = o.material.color.getHex();
    }
    o.material.color.lerp(new THREE.Color(0x6a2828), intensity);
  });
  clearTimeout(enemy._bloodFadeT);
  enemy._bloodFadeT = setTimeout(() => {
    if (!enemy.alive) return;
    enemy.group?.traverse((o) => {
      if (o.isMesh && o.material?.color && o.userData._bloodBase != null) {
        o.material.color.lerp(new THREE.Color(o.userData._bloodBase), 0.65);
      }
    });
  }, 650);
}

let _bloodPoolTex = null;
let _bloodSplatTex = null;

function getBloodPoolTexture() {
  if (_bloodPoolTex) return _bloodPoolTex;
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  g.addColorStop(0, "rgba(220,28,38,0.98)");
  g.addColorStop(0.28, "rgba(180,18,28,0.92)");
  g.addColorStop(0.55, "rgba(120,8,18,0.72)");
  g.addColorStop(0.78, "rgba(70,4,10,0.38)");
  g.addColorStop(1, "rgba(20,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 35; i++) {
    ctx.fillStyle = `rgba(${60 + Math.random() * 50},${Math.random() * 8},0,${0.08 + Math.random() * 0.18})`;
    ctx.beginPath();
    ctx.ellipse(
      64 + (Math.random() - 0.5) * 90,
      64 + (Math.random() - 0.5) * 90,
      2 + Math.random() * 8,
      1 + Math.random() * 5,
      Math.random() * Math.PI,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
  _bloodPoolTex = new THREE.CanvasTexture(c);
  _bloodPoolTex.colorSpace = THREE.SRGBColorSpace;
  return _bloodPoolTex;
}

function getBloodSplatterTexture() {
  if (_bloodSplatTex) return _bloodSplatTex;
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, 64, 64);
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = `rgba(${80 + Math.random() * 60},${Math.random() * 12},0,${0.5 + Math.random() * 0.45})`;
    ctx.beginPath();
    const cx = 32 + (Math.random() - 0.5) * 20;
    const cy = 32 + (Math.random() - 0.5) * 20;
    ctx.ellipse(cx, cy, 4 + Math.random() * 14, 2 + Math.random() * 8, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(120,12,8,0.85)";
  ctx.beginPath();
  ctx.ellipse(32, 32, 10, 6, 0.2, 0, Math.PI * 2);
  ctx.fill();
  _bloodSplatTex = new THREE.CanvasTexture(c);
  _bloodSplatTex.colorSpace = THREE.SRGBColorSpace;
  return _bloodSplatTex;
}

export function clearEnemyFlash(enemy) {
  enemy.hitMeshes?.forEach((m) => {
    if (m.material?.emissive) {
      m.material.emissive.setHex(0x000000);
      if (m.material.emissiveIntensity != null) m.material.emissiveIntensity = 0;
    }
  });
  enemy.group?.traverse((o) => {
    if (o.isMesh && o.material?.emissive) {
      o.material.emissive.setHex(0x000000);
      if (o.material.emissiveIntensity != null) o.material.emissiveIntensity = 0;
    }
  });
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

/** Inicia queda realista — pernas dobram, tronco cai, corpo deita no chão */
export function initRagdoll(enemy, opts = {}) {
  enemy.ragdoll = true;
  enemy.ragdollTime = 0;
  enemy.ragdollDur = opts.headshot ? 0.85 : 1.05;
  enemy.deathHeadshot = !!opts.headshot;
  enemy.deathFallSide = opts.fallSide ?? (Math.random() > 0.5 ? 1 : -1);
  enemy.deathStartY = enemy.group?.position?.y ?? 0;
  enemy.deathYaw = enemy.group?.rotation?.y ?? 0;
  enemy.ragdollDone = false;
  enemy.deathKick = opts.headshot ? 0.22 : 0.08;

  if (enemy.mixer) enemy.mixer.stopAllAction();
  clearEnemyFlash(enemy);

  if (enemy.group) {
    enemy.group.rotation.x = 0;
    enemy.group.rotation.z = 0;
  }

  if (enemy.gun) {
    enemy.gun.traverse((o) => {
      if (o.isMesh && o.material?.emissiveIntensity != null) o.material.emissiveIntensity = 0;
    });
  }
}

export function applyRagdoll(enemy, dt) {
  if (!enemy.ragdoll) return;
  enemy.ragdollTime = (enemy.ragdollTime || 0) + dt;
  const dur = enemy.ragdollDur || 1.05;
  const raw = Math.min(1, enemy.ragdollTime / dur);
  const t = smoothstep(raw);
  const b = enemy.bones;
  const side = enemy.deathFallSide || 1;
  const hs = enemy.deathHeadshot;

  if (b) {
    const kneeT = smoothstep(Math.min(1, raw * 2.4));
    const legFold = kneeT * 0.92;
    if (b.upLegL) b.upLegL.rotation.x = legFold;
    if (b.upLegR) b.upLegR.rotation.x = legFold;
    if (b.legL) b.legL.rotation.x = -legFold * 1.12;
    if (b.legR) b.legR.rotation.x = -legFold * 1.12;

    const torsoT = smoothstep(Math.max(0, (raw - 0.14) * 1.9));
    const spineFall = hs ? -0.95 : -0.72;
    if (b.spine) b.spine.rotation.x = spineFall * torsoT;
    if (b.spine1) b.spine1.rotation.x = spineFall * 0.38 * torsoT;
    if (b.hips) b.hips.rotation.x = -0.18 * torsoT;

    const armT = smoothstep(Math.max(0, (raw - 0.1) * 1.7));
    if (b.shoulderR) {
      b.shoulderR.rotation.x = 0.22 * armT;
      b.shoulderR.rotation.z = 0.42 * side * armT;
    }
    if (b.shoulderL) {
      b.shoulderL.rotation.x = 0.16 * armT;
      b.shoulderL.rotation.z = -0.28 * side * armT;
    }
    if (b.armR) b.armR.rotation.x = 0.38 * armT;
    if (b.armL) b.armL.rotation.x = 0.28 * armT;
    if (b.foreR) b.foreR.rotation.x = -0.22 * armT;
    if (b.foreL) b.foreL.rotation.x = -0.3 * armT;
    if (b.neck && hs) b.neck.rotation.x = -0.42 * torsoT;
  }

  const fallT = smoothstep(Math.max(0, (raw - 0.32) * 1.55));
  enemy.group.rotation.y = enemy.deathYaw;
  enemy.group.rotation.x = fallT * (hs ? 0.98 : 0.82);
  enemy.group.rotation.z = fallT * side * 0.24;

  const kick = (enemy.deathKick || 0) * Math.sin(Math.min(1, raw * 4) * Math.PI) * (1 - t);
  enemy.group.position.y = Math.max(0.1, (enemy.deathStartY ?? 0) + kick - t * 0.12);

  if (raw >= 1) {
    enemy.group.position.y = 0.1;
    enemy.ragdollDone = true;
  }
}

export function createPhysicsParticles(scene, origin, count, color, speed = 8) {
  const parts = [];
  for (let i = 0; i < count; i++) {
    const size = 0.1 + Math.random() * 0.25;
    const p = new THREE.Mesh(
      new THREE.BoxGeometry(size, size, size),
      new THREE.MeshLambertMaterial({ color })
    );
    p.position.copy(origin);
    p.userData.vel = new THREE.Vector3(
      (Math.random() - 0.5) * speed,
      Math.random() * speed * 0.8 + 2,
      (Math.random() - 0.5) * speed
    );
    p.userData.life = 1.5 + Math.random();
    scene.add(p);
    parts.push(p);
  }
  return parts;
}

export function updatePhysicsParticles(particles, dt, scene) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.userData.life -= dt;
    p.userData.vel.y -= 18 * dt;
    p.position.addScaledVector(p.userData.vel, dt);
    if (p.position.y < 0.05) {
      p.position.y = 0.05;
      p.userData.vel.y *= -0.35;
      p.userData.vel.x *= 0.7;
      p.userData.vel.z *= 0.7;
    }
    if (p.userData.life <= 0) {
      scene.remove(p);
      particles.splice(i, 1);
    }
  }
}

export function updateBloodSpray(particles, dt, scene) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.userData.life -= dt;

    if (p.userData.vel) {
      p.userData.vel.y -= (p.userData.isMist ? 8 : 12) * dt;
      p.position.addScaledVector(p.userData.vel, dt);
    }

    if (p.userData.isDrip && p.userData.vel) {
      p.position.addScaledVector(p.userData.vel, dt);
      if (p.position.y < 0.02) {
        p.position.y = 0.02;
        p.userData.vel.set(0, 0, 0);
      }
    }

    if (p.position.y < 0.025 && !p.userData.isDrip) p.position.y = 0.025;

    if (p.material?.opacity != null && p.userData.maxLife) {
      const t = Math.max(0, p.userData.life / p.userData.maxLife);
      p.material.opacity = t * (p.userData.isMist ? 0.55 : 0.9);
      if (p.userData.isMist) p.scale.setScalar(0.6 + t * 0.5);
    }

    if (p.userData.fade && p.material?.opacity != null) {
      p.material.opacity = Math.max(0, p.userData.life / 0.55) * 0.88;
    }

    if (p.userData.life <= 0) {
      scene.remove(p);
      particles.splice(i, 1);
    }
  }
}
