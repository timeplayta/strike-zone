import * as THREE from "three";

/** Mesa real: tampo + 4 pernas cilíndricas com furo + cadeiras encaixadas ao redor */
export function createTableSet(x, z, rotY, woodColor = 0x7a4f2a) {
  const g = new THREE.Group();
  const wood = new THREE.MeshLambertMaterial({ color: woodColor });
  const metal = new THREE.MeshLambertMaterial({ color: 0x555555 });

  const topH = 0.08;
  const legH = 0.74;
  const tableH = legH + topH;

  const top = new THREE.Mesh(new THREE.BoxGeometry(2.2, topH, 1.3), wood);
  top.position.y = tableH - topH / 2;

  const legPositions = [[-0.95, -0.5], [0.95, -0.5], [-0.95, 0.5], [0.95, 0.5]];
  for (const [lx, lz] of legPositions) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, legH, 6), wood);
    leg.position.set(lx, legH / 2, lz);
    const hole = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 4, 8), metal);
    hole.rotation.x = Math.PI / 2;
    hole.position.set(lx, 0.04, lz);
    g.add(leg, hole);
  }
  g.add(top);

  const chairDist = 1.55;
  const chairs = [
    [0, chairDist, Math.PI],
    [0, -chairDist, 0],
    [-chairDist, 0, Math.PI / 2],
    [chairDist, 0, -Math.PI / 2],
  ];
  for (const [cx, cz, cr] of chairs) {
    g.add(createChair(cx, cz, cr, wood));
  }

  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  return g;
}

function createChair(x, z, rotY, woodMat) {
  const chair = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.4), woodMat);
  seat.position.y = 0.46;
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.38, 0.05), woodMat);
  back.position.set(0, 0.68, -0.17);
  const legGeo = new THREE.CylinderGeometry(0.022, 0.025, 0.46, 5);
  [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(legGeo, woodMat);
    leg.position.set(lx, 0.23, lz);
    chair.add(leg);
  });
  chair.add(seat, back);
  chair.position.set(x, 0, z);
  chair.rotation.y = rotY;
  return chair;
}

/** Teto ligado às paredes — em labirintos grandes só usa laje principal (FPS) */
export function buildConnectedCeiling(scene, mapW, mapD, ceilingH, color, wallMeshes) {
  const ceilMat = new THREE.MeshLambertMaterial({ color, side: THREE.FrontSide });
  const slab = new THREE.Mesh(new THREE.BoxGeometry(mapW, 0.22, mapD), ceilMat);
  slab.position.set(0, ceilingH + 0.11, 0);
  scene.add(slab);

  if (!wallMeshes || wallMeshes.length > 280) return;

  for (const w of wallMeshes) {
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(w.userData.capW || 2, 0.15, w.userData.capD || 2),
      ceilMat
    );
    cap.position.set(w.position.x, ceilingH + 0.075, w.position.z);
    scene.add(cap);
  }
}

function addWallSegment(scene, innerWalls, x, z, ww, h, dd, mat, meta = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(ww, h, dd), mat);
  m.position.set(x, h / 2, z);
  if (meta.isInnerWest) m.userData.isInnerWest = true;
  scene.add(m);
  innerWalls.push(m);
  return m;
}

/** Sala interna com abertura na parede oeste (porta) */
export function buildInnerRoom(scene, room, materials) {
  const { minX, maxX, minZ, maxZ, wallH, doorGap } = room;
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  const w = maxX - minX;
  const d = maxZ - minZ;
  const innerWalls = [];

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), materials.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(cx, 0.01, cz);
  scene.add(floor);

  addWallSegment(scene, innerWalls, cx, minZ, w, wallH, 0.2, materials.wall);
  addWallSegment(scene, innerWalls, cx, maxZ, w, wallH, 0.2, materials.wall);
  addWallSegment(scene, innerWalls, maxX, cz, 0.2, wallH, d, materials.wall);

  const gapHalf = (doorGap?.width ?? 2.2) / 2;
  const gapCenter = doorGap?.centerZ ?? cz;
  const zLowEnd = gapCenter - gapHalf;
  const zHighStart = gapCenter + gapHalf;

  if (zLowEnd - minZ > 0.15) {
    const segD = zLowEnd - minZ;
    addWallSegment(scene, innerWalls, minX, minZ + segD / 2, 0.2, wallH, segD, materials.wall, { isInnerWest: true });
  }
  if (maxZ - zHighStart > 0.15) {
    const segD = maxZ - zHighStart;
    addWallSegment(scene, innerWalls, minX, zHighStart + segD / 2, 0.2, wallH, segD, materials.wall, { isInnerWest: true });
  }

  const ceil = new THREE.Mesh(new THREE.BoxGeometry(w, 0.18, d), materials.ceil);
  ceil.position.set(cx, wallH + 0.09, cz);
  scene.add(ceil);

  return innerWalls;
}

/** Porta clicável — só o jogador interage. Dobradiça em (hingeX, hingeZ); baseRot orienta a folha. */
export function createDoorMesh(doorSpec, mat) {
  const door = new THREE.Group();
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(doorSpec.width, doorSpec.height, doorSpec.depth),
    mat
  );
  panel.position.set(doorSpec.width / 2, doorSpec.height / 2, 0);
  panel.userData.isDoor = true;
  door.add(panel);

  const handle = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.12, 0.06),
    new THREE.MeshLambertMaterial({ color: 0xccaa44 })
  );
  handle.position.set(doorSpec.width * 0.72, doorSpec.height * 0.45, doorSpec.depth * 0.6);
  handle.userData.isDoor = true;
  door.add(handle);

  const hitZone = new THREE.Mesh(
    new THREE.BoxGeometry(doorSpec.width + 0.5, doorSpec.height + 0.2, doorSpec.depth + 0.8),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hitZone.position.set(doorSpec.width / 2, doorSpec.height / 2, 0);
  hitZone.userData.isDoor = true;
  door.add(hitZone);

  const hingeX = doorSpec.hingeX ?? (doorSpec.x - doorSpec.width / 2);
  const hingeZ = doorSpec.hingeZ ?? doorSpec.z;
  door.position.set(hingeX, 0, hingeZ);
  door.rotation.y = doorSpec.baseRot || 0;
  door.userData.baseRot = doorSpec.baseRot || 0;
  door.userData.isDoor = true;
  return door;
}

export function getDoorHitMeshes(doorGroup) {
  const meshes = [];
  doorGroup?.traverse((o) => {
    if (o.isMesh && o.userData.isDoor) meshes.push(o);
  });
  return meshes;
}

function moneyBill(x, z, rot) {
  const bill = new THREE.Mesh(
    new THREE.PlaneGeometry(0.18, 0.09),
    new THREE.MeshLambertMaterial({ color: 0x4a7a3a, side: THREE.DoubleSide })
  );
  bill.rotation.set(-Math.PI / 2, 0, rot);
  bill.position.set(x, 0.015, z);
  return bill;
}

function paperSheet(x, z, rot) {
  const paper = new THREE.Mesh(
    new THREE.PlaneGeometry(0.22, 0.3),
    new THREE.MeshLambertMaterial({ color: 0xd8d4c8, side: THREE.DoubleSide })
  );
  paper.rotation.set(-Math.PI / 2, 0, rot);
  paper.position.set(x, 0.012, z);
  return paper;
}

/** Cofre arrombado: porta arrancada pendendo, interior vazio, marcas de pé de cabra */
function createLootedSafe(x, z, rotY) {
  const g = new THREE.Group();
  const metal = new THREE.MeshLambertMaterial({ color: 0x3a4248 });
  const metalDark = new THREE.MeshLambertMaterial({ color: 0x22282c });
  const inner = new THREE.MeshLambertMaterial({ color: 0x0c0e10 });

  const w = 0.95, h = 1.15, d = 0.8, t = 0.07;
  const back = new THREE.Mesh(new THREE.BoxGeometry(w, h, t), metal);
  back.position.set(0, h / 2, -d / 2 + t / 2);
  const left = new THREE.Mesh(new THREE.BoxGeometry(t, h, d), metal);
  left.position.set(-w / 2 + t / 2, h / 2, 0);
  const right = left.clone();
  right.position.x = w / 2 - t / 2;
  const top = new THREE.Mesh(new THREE.BoxGeometry(w, t, d), metal);
  top.position.set(0, h - t / 2, 0);
  const bottom = new THREE.Mesh(new THREE.BoxGeometry(w, t, d), metal);
  bottom.position.set(0, t / 2, 0);
  g.add(back, left, right, top, bottom);

  const cavity = new THREE.Mesh(new THREE.PlaneGeometry(w - t * 2, h - t * 2), inner);
  cavity.position.set(0, h / 2, -d / 2 + t + 0.01);
  g.add(cavity);
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(w - t * 2, 0.04, d - t * 2), metalDark);
  shelf.position.set(0, h * 0.55, 0);
  g.add(shelf);

  // porta arrombada — torta, semiaberta
  const doorPanel = new THREE.Group();
  const slab = new THREE.Mesh(new THREE.BoxGeometry(w - 0.06, h - 0.06, 0.07), metal);
  slab.position.set((w - 0.06) / 2, 0, 0);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.025, 6, 10), metalDark);
  wheel.position.set((w - 0.06) * 0.62, 0.08, 0.06);
  const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.025, 0.025), metalDark);
  spoke.position.copy(wheel.position);
  doorPanel.add(slab, wheel, spoke);
  doorPanel.position.set(-w / 2 + 0.03, h / 2, d / 2);
  doorPanel.rotation.y = -2.2;
  doorPanel.rotation.z = -0.12;
  g.add(doorPanel);

  for (let i = 0; i < 3; i++) {
    const dent = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.03), inner);
    dent.position.set(w / 2 - 0.03, 0.35 + i * 0.25, d / 2 - 0.01);
    dent.rotation.z = (i - 1) * 0.35;
    g.add(dent);
  }

  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  return g;
}

/** Mesa derrubada de lado, com pernas para fora */
function createFallenTable(x, z, rotY, woodMat) {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 2.0), woodMat);
  top.position.set(0, 0.6, 0);
  g.add(top);
  const legGeo = new THREE.CylinderGeometry(0.045, 0.05, 0.72, 6);
  [[0.28, -0.78], [0.28, 0.78], [0.95, -0.78], [0.95, 0.78]].forEach(([ly, lz]) => {
    const leg = new THREE.Mesh(legGeo, woodMat);
    leg.rotation.z = Math.PI / 2 - 0.06;
    leg.position.set(0.4, ly, lz);
    g.add(leg);
  });
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  return g;
}

/** Cadeira caída de costas no chão */
function createFallenChair(x, z, rotY, woodMat) {
  const chair = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.4), woodMat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.38, 0.05), woodMat);
  back.position.set(0, 0.21, -0.17);
  const legGeo = new THREE.CylinderGeometry(0.022, 0.025, 0.46, 5);
  [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(legGeo, woodMat);
    leg.position.set(lx, -0.23, lz);
    chair.add(leg);
  });
  chair.add(seat, back);
  chair.rotation.set(-Math.PI / 2 + 0.08, rotY, 0);
  chair.position.set(x, 0.24, z);
  return chair;
}

/** Interior da sala do chefão: tapete, mesa e cadeiras derrubadas, cofre arrombado, luz quente */
export function buildBossRoomDecor(scene, room, woodColor = 0x6a452a) {
  const g = new THREE.Group();
  const cx = (room.minX + room.maxX) / 2;
  const cz = (room.minZ + room.maxZ) / 2;
  const wood = new THREE.MeshLambertMaterial({ color: woodColor });

  // tapete vermelho escuro com borda dourada
  const rug = new THREE.Mesh(
    new THREE.PlaneGeometry(room.maxX - room.minX - 1.6, room.maxZ - room.minZ - 1.6),
    new THREE.MeshLambertMaterial({ color: 0x4a1414 })
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(cx, 0.022, cz);
  const rugBorder = new THREE.Mesh(
    new THREE.PlaneGeometry(room.maxX - room.minX - 1.2, room.maxZ - room.minZ - 1.2),
    new THREE.MeshLambertMaterial({ color: 0x6a5420 })
  );
  rugBorder.rotation.x = -Math.PI / 2;
  rugBorder.position.set(cx, 0.018, cz);
  g.add(rugBorder, rug);

  // cofre arrombado encostado (mas separado) da parede leste
  g.add(createLootedSafe(room.maxX - 0.75, cz - 0.6, -Math.PI / 2));

  // dinheiro e papéis espalhados — assalto recente
  g.add(moneyBill(room.maxX - 1.5, cz - 0.4, 0.4));
  g.add(moneyBill(room.maxX - 1.9, cz + 0.2, 1.8));
  g.add(moneyBill(room.maxX - 1.2, cz + 0.7, 2.6));
  g.add(moneyBill(cx + 0.5, cz - 1.0, 0.9));
  g.add(paperSheet(room.maxX - 1.7, cz - 1.1, 0.5));
  g.add(paperSheet(cx + 0.8, cz + 0.9, 2.2));

  // mesa derrubada + duas cadeiras jogadas
  g.add(createFallenTable(cx - 0.6, cz + 0.9, 0.5, wood));
  g.add(createFallenChair(cx - 1.3, cz - 1.0, 0.7, wood));
  g.add(createFallenChair(cx + 0.7, cz - 1.6, -1.2, wood));

  // luminária pendurada + luz quente
  const cord = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 0.5, 4),
    new THREE.MeshLambertMaterial({ color: 0x222222 })
  );
  cord.position.set(cx, room.wallH - 0.25, cz);
  const shade = new THREE.Mesh(
    new THREE.ConeGeometry(0.3, 0.25, 8, 1, true),
    new THREE.MeshLambertMaterial({ color: 0x2a4a2a, side: THREE.DoubleSide })
  );
  shade.position.set(cx, room.wallH - 0.55, cz);
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 6, 6),
    new THREE.MeshBasicMaterial({ color: 0xffd9a0 })
  );
  bulb.position.set(cx, room.wallH - 0.62, cz);
  g.add(cord, shade, bulb);

  const lamp = new THREE.PointLight(0xffbb77, 1.3, 11, 1.6);
  lamp.position.set(cx, room.wallH - 0.8, cz);
  g.add(lamp);

  // quadro torto na parede — clima de lugar revirado
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.65, 0.05),
    new THREE.MeshLambertMaterial({ color: 0x7a6a40 })
  );
  frame.position.set(cx + 1, 1.7, room.minZ + 0.18);
  frame.rotation.z = -0.18;
  g.add(frame);

  scene.add(g);
  return g;
}
