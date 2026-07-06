import * as THREE from "three";

/** Diâmetro do lobby em metros */
export const LOBBY_DIAMETER = 500;
export const LOBBY_RADIUS = LOBBY_DIAMETER / 2;
/** Canto sudoeste da Ilha Frontier — lobby dentro do mapa, ilha visível ao redor */
export const LOBBY_WORLD = { x: -720, z: 720 };

const GRASS = 0x4a9a48;
const GRASS_LIGHT = 0x58b957;
const DIRT = 0x7a6a4a;
const DIRT_DARK = 0x5c4f38;
const BARK = 0x5b3318;
const PINE = 0x24441f;
const BUSH = 0x3a6b32;

function mesh(geo, mat, pos = [0, 0, 0]) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(pos[0], pos[1], pos[2]);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function isNearTrail(x, z) {
  if (Math.abs(x) < 5.5) return true;
  if (Math.abs(z) < 5.5) return true;
  if (Math.abs(x + z) < 6) return true;
  if (Math.abs(x - z) < 6) return true;
  const ring = Math.hypot(x, z);
  if (Math.abs(ring - 95) < 5.5) return true;
  if (Math.abs(ring - 165) < 5) return true;
  const wave = Math.sin(x * 0.045) * 28 + Math.cos(z * 0.038) * 22;
  if (Math.abs(z - wave) < 4.5 && ring > 40 && ring < 210) return true;
  return false;
}

function makePineTree(scale = 1) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.16 * scale, 0.22 * scale, 1.6 * scale, 8), new THREE.MeshLambertMaterial({ color: BARK }), [0, 0.8 * scale, 0]));
  const leaf = new THREE.MeshLambertMaterial({ color: PINE });
  for (let i = 0; i < 3; i++) {
    g.add(mesh(new THREE.ConeGeometry((1.05 - i * 0.18) * scale, 1.35 * scale, 8), leaf, [0, (1.55 + i * 0.7) * scale, 0]));
  }
  return g;
}

function makeOakTree(scale = 1) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.2 * scale, 0.28 * scale, 2.2 * scale, 8), new THREE.MeshLambertMaterial({ color: BARK }), [0, 1.1 * scale, 0]));
  const leaf = new THREE.MeshLambertMaterial({ color: 0x356832 });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    g.add(mesh(new THREE.SphereGeometry(0.85 * scale, 8, 6), leaf, [Math.cos(a) * 0.55 * scale, 2.8 * scale, Math.sin(a) * 0.55 * scale]));
  }
  g.add(mesh(new THREE.SphereGeometry(1.05 * scale, 8, 6), leaf, [0, 3.35 * scale, 0]));
  return g;
}

function makeBush(scale = 1) {
  const g = new THREE.Group();
  const m = new THREE.MeshLambertMaterial({ color: BUSH });
  for (let i = 0; i < 4; i++) {
    const s = mesh(new THREE.SphereGeometry(0.48 * scale, 8, 6), m, [
      Math.cos(i * 1.55) * 0.32 * scale,
      0.32 * scale,
      Math.sin(i * 1.55) * 0.32 * scale,
    ]);
    s.scale.y = 0.65;
    g.add(s);
  }
  return g;
}

function addTrailSegment(g, x, z, w, d, rot = 0) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshLambertMaterial({ color: DIRT, polygonOffset: true, polygonOffsetFactor: -1 })
  );
  m.rotation.x = -Math.PI / 2;
  m.rotation.z = rot;
  m.position.set(x, 0.04, z);
  m.receiveShadow = true;
  g.add(m);
  const edge = new THREE.Mesh(
    new THREE.PlaneGeometry(w * 1.02, d * 1.02),
    new THREE.MeshLambertMaterial({ color: DIRT_DARK, transparent: true, opacity: 0.35 })
  );
  edge.rotation.x = -Math.PI / 2;
  edge.rotation.z = rot;
  edge.position.set(x, 0.035, z);
  g.add(edge);
}

function buildTrails(g) {
  addTrailSegment(g, 0, 0, LOBBY_DIAMETER * 0.92, 9);
  addTrailSegment(g, 0, 0, 9, LOBBY_DIAMETER * 0.92);
  addTrailSegment(g, 0, 0, LOBBY_DIAMETER * 0.72, 7, Math.PI / 4);
  addTrailSegment(g, 0, 0, LOBBY_DIAMETER * 0.72, 7, -Math.PI / 4);
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const cx = Math.cos(a) * 95;
    const cz = Math.sin(a) * 95;
    addTrailSegment(g, cx, cz, 14, 7, a + Math.PI / 2);
  }
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    const cx = Math.cos(a) * 165;
    const cz = Math.sin(a) * 165;
    addTrailSegment(g, cx, cz, 12, 6, a);
  }
  for (let i = -220; i <= 220; i += 18) {
    const wave = Math.sin(i * 0.045) * 28 + Math.cos(i * 0.038) * 22;
    addTrailSegment(g, i, wave, 16, 6, Math.atan2(Math.cos(i * 0.045) * 28, 1) * 0.35);
  }
}

/** Carro estacionado com rodas redondas (cilindro) */
export function makeLobbyCar(bodyColor = 0xc41e1e, trimColor = 0xdddddd) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.45, metalness: 0.12 });
  const trimMat = new THREE.MeshStandardMaterial({ color: trimColor, roughness: 0.35, metalness: 0.25 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x88c7ff, roughness: 0.15, transparent: true, opacity: 0.55 });
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.88, metalness: 0.08 });
  const hubMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.4, metalness: 0.55 });

  g.add(mesh(new THREE.BoxGeometry(4.2, 1.05, 1.85), bodyMat, [0, 1.05, 0]));
  g.add(mesh(new THREE.BoxGeometry(2.4, 0.72, 1.62), bodyMat, [-0.35, 1.62, 0]));
  g.add(mesh(new THREE.BoxGeometry(2.15, 0.55, 1.55), glassMat, [-0.35, 1.72, 0]));
  g.add(mesh(new THREE.BoxGeometry(4.35, 0.18, 1.95), trimMat, [0, 0.62, 0]));
  g.add(mesh(new THREE.BoxGeometry(0.35, 0.45, 1.9), trimMat, [2.05, 0.95, 0]));

  const wheelGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.36, 18);
  const hubGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.38, 12);
  for (const [wx, wz] of [[-1.35, 0.92], [1.35, 0.92], [-1.35, -0.92], [1.35, -0.92]]) {
    const wheel = mesh(wheelGeo, wheelMat, [wx, 0.52, wz]);
    wheel.rotation.x = Math.PI / 2;
    g.add(wheel);
    const hub = mesh(hubGeo, hubMat, [wx, 0.52, wz]);
    hub.rotation.x = Math.PI / 2;
    g.add(hub);
  }
  g.userData.lobbyProp = true;
  return g;
}

/** Roda de pula-pula — ao pisar, lança o jogador pra cima */
export function makeJumpPadWheel() {
  const g = new THREE.Group();
  const tire = mesh(
    new THREE.TorusGeometry(1.15, 0.38, 14, 28),
    new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.9 }),
    [0, 0.38, 0]
  );
  tire.rotation.x = Math.PI / 2;
  g.add(tire);
  const hub = mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 0.22, 16),
    new THREE.MeshStandardMaterial({ color: 0xffbb44, emissive: 0x664400, emissiveIntensity: 0.45, roughness: 0.35 }),
    [0, 0.38, 0]
  );
  g.add(hub);
  g.userData.lobbyProp = true;
  g.userData.jumpPad = { radius: 1.4, power: 16.5 };
  return g;
}

export function makeBattleRoyaleLobbyForest() {
  const g = new THREE.Group();
  g.userData.lobbyProps = true;

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(LOBBY_RADIUS, 64),
    new THREE.MeshStandardMaterial({ color: GRASS, roughness: 0.88, metalness: 0.02 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  g.add(ground);

  const clearing = new THREE.Mesh(
    new THREE.CircleGeometry(28, 32),
    new THREE.MeshLambertMaterial({ color: GRASS_LIGHT })
  );
  clearing.rotation.x = -Math.PI / 2;
  clearing.position.y = 0.02;
  g.add(clearing);

  buildTrails(g);

  const rand = seededRandom(77102);
  for (let i = 0; i < 320; i++) {
    const a = rand() * Math.PI * 2;
    const r = 32 + rand() * (LOBBY_RADIUS - 38);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (isNearTrail(x, z)) continue;
    const sc = 0.75 + rand() * 0.85;
    const prop = rand() > 0.72 ? makeBush(sc) : rand() > 0.45 ? makePineTree(sc) : makeOakTree(sc);
    prop.position.set(x, 0, z);
    prop.rotation.y = rand() * Math.PI * 2;
    prop.userData.lobbyProp = true;
    g.add(prop);
  }

  for (let i = 0; i < 55; i++) {
    const a = rand() * Math.PI * 2;
    const r = LOBBY_RADIUS - 8 - rand() * 18;
    const tree = makePineTree(1.1 + rand() * 0.6);
    tree.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    tree.rotation.y = rand() * Math.PI * 2;
    tree.userData.lobbyProp = true;
    g.add(tree);
  }

  const car1 = makeLobbyCar(0xc62828, 0xe0e0e0);
  car1.position.set(-62, 0, 48);
  car1.rotation.y = 0.85;
  g.add(car1);

  const car2 = makeLobbyCar(0x1565c0, 0xf5f5f5);
  car2.position.set(78, 0, -55);
  car2.rotation.y = -2.1;
  g.add(car2);

  const jumpPads = [];
  const padSpots = [
    [-28, -18], [22, 32], [55, 12], [-45, -72], [88, 38], [-95, 55],
    [12, -95], [-70, 95], [130, -40], [-120, -30], [40, 120], [-15, 145],
    [165, 80], [-155, -90], [0, -55], [95, -110],
  ];
  for (const [lx, lz] of padSpots) {
    const pad = makeJumpPadWheel();
    pad.position.set(lx, 0, lz);
    pad.userData.jumpPad.localX = lx;
    pad.userData.jumpPad.localZ = lz;
    g.add(pad);
    jumpPads.push(pad.userData.jumpPad);
  }

  g.position.set(LOBBY_WORLD.x, 0, LOBBY_WORLD.z);
  g.userData.jumpPads = jumpPads;
  g.userData.spawnLocal = { x: 0, z: 24 };

  return g;
}

/** Esconde o mapa principal enquanto o jogador está no lobby */
export function hideWorldForLobby(scene, lobbyGroup, extraKeep = []) {
  const keep = new Set(extraKeep);
  if (lobbyGroup) lobbyGroup.traverse((o) => keep.add(o));
  const hidden = [];
  for (const child of scene.children) {
    if (keep.has(child)) continue;
    if (child.isLight || child.isCamera) continue;
    if (child.visible) {
      child.visible = false;
      hidden.push(child);
    }
  }
  return hidden;
}

export function restoreWorldAfterLobby(hidden) {
  for (const obj of hidden || []) {
    if (obj) obj.visible = true;
  }
}

/** Avatares de outros jogadores reais (sem bots) */
export function syncLobbyOtherPlayers(lobbyState, scene, makeAvatar, players = []) {
  if (!lobbyState) return;
  if (!lobbyState.otherAvatars) lobbyState.otherAvatars = new Map();

  const seen = new Set();
  for (const p of players) {
    if (!p?.id || p.local) continue;
    seen.add(p.id);
    let av = lobbyState.otherAvatars.get(p.id);
    if (!av) {
      av = makeAvatar();
      av.userData.lobbyAvatar = true;
      scene.add(av);
      lobbyState.otherAvatars.set(p.id, av);
    }
    const wx = LOBBY_WORLD.x + (p.x ?? 0);
    const wz = LOBBY_WORLD.z + (p.z ?? 0);
    const wy = 0;
    av.position.set(wx, wy + (p.jumpY ?? 0), wz);
    av.rotation.y = p.yaw ?? 0;
    av.visible = true;
  }

  for (const [id, av] of lobbyState.otherAvatars) {
    if (!seen.has(id)) {
      scene.remove(av);
      lobbyState.otherAvatars.delete(id);
    }
  }
}

export function clearLobbyOtherPlayers(lobbyState, scene) {
  if (!lobbyState?.otherAvatars) return;
  for (const av of lobbyState.otherAvatars.values()) scene.remove(av);
  lobbyState.otherAvatars.clear();
}

const LOBBY_GRAVITY = 26;
const LOBBY_JUMP = 7.5;

export function updateLobbyPlayerPhysics(state, dt, jumpPads, keys) {
  if (!state) return;
  state.velY = state.velY ?? 0;
  state.jumpY = state.jumpY ?? 0;
  state.grounded = state.grounded !== false;

  if (keys?.["Space"] && state.grounded) {
    state.velY = LOBBY_JUMP;
    state.grounded = false;
  }

  if (!state.grounded) {
    state.jumpY += state.velY * dt;
    state.velY -= LOBBY_GRAVITY * dt;
    if (state.jumpY <= 0) {
      state.jumpY = 0;
      state.velY = 0;
      state.grounded = true;
    }
  }

  if (state.grounded && jumpPads?.length) {
    for (const pad of jumpPads) {
      const wx = LOBBY_WORLD.x + pad.localX;
      const wz = LOBBY_WORLD.z + pad.localZ;
      const dist = Math.hypot(state.pos.x - wx, state.pos.z - wz);
      if (dist <= pad.radius) {
        state.velY = pad.power;
        state.grounded = false;
        state.padCooldown = 0.12;
        break;
      }
    }
  }

  if (state.padCooldown > 0) state.padCooldown = Math.max(0, state.padCooldown - dt);
}

export function animateLobbyJumpPads(lobby, t) {
  if (!lobby) return;
  lobby.traverse((obj) => {
    if (!obj.userData?.jumpPad) return;
    const s = 1 + Math.sin(t * 0.006 + obj.position.x * 0.05) * 0.04;
    obj.scale.set(s, 1, s);
  });
}
