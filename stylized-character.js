import * as THREE from "three";

const SKIN = 0xc4956a;
const SHOE = 0x1a1a1a;
const SEG = 12;

function mat(color, rough = 0.82, emissive = null) {
  const m = new THREE.MeshStandardMaterial({
    color,
    roughness: rough,
    metalness: emissive ? 0.38 : 0.04,
  });
  if (emissive) {
    m.emissive = new THREE.Color(emissive);
    m.emissiveIntensity = 0.55;
  }
  return m;
}

function part(geo, material, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  return m;
}

/** Pose de rifle estilo CS — braços para FRENTE, nunca para cima */
export const RIFLE_HOLD = {
  shoulderR: { x: -1.42, y: 0.12, z: -0.06 },
  elbowR: { x: -0.38, y: 0, z: 0.02 },
  shoulderL: { x: -1.18, y: -0.1, z: 0.08 },
  elbowL: { x: -0.72, y: 0, z: -0.02 },
};

function applyHold(armL, armR, hold = RIFLE_HOLD) {
  armR.shoulder.rotation.set(hold.shoulderR.x, hold.shoulderR.y, hold.shoulderR.z);
  armR.elbow.rotation.set(hold.elbowR.x, hold.elbowR.y, hold.elbowR.z);
  armL.shoulder.rotation.set(hold.shoulderL.x, hold.shoulderL.y, hold.shoulderL.z);
  armL.elbow.rotation.set(hold.elbowL.x, hold.elbowL.y, hold.elbowL.z);
}

function addFace(parent, headY, profile) {
  const skin = mat(profile.skinTone ?? SKIN, 0.88);
  parent.add(
    part(new THREE.SphereGeometry(0.018, 8, 8), mat(profile.eyeColor ?? 0xeeeeee), -0.038, headY + 0.018, 0.1),
    part(new THREE.SphereGeometry(0.018, 8, 8), mat(profile.eyeColor ?? 0xeeeeee), 0.038, headY + 0.018, 0.1),
    part(new THREE.SphereGeometry(0.009, 6, 6), mat(0x111111), -0.038, headY + 0.016, 0.112),
    part(new THREE.SphereGeometry(0.009, 6, 6), mat(0x111111), 0.038, headY + 0.016, 0.112)
  );
  parent.add(part(new THREE.BoxGeometry(0.044, 0.008, 0.01), mat(0x884444), 0, headY - 0.034, 0.106));
  if (profile.beard) {
    parent.add(part(new THREE.SphereGeometry(0.06, 8, 8, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.42), mat(0x3a2818), 0, headY - 0.042, 0.05));
  }
  if (!profile.headStyle || profile.headStyle === "face" || profile.headStyle === "cap" || profile.headStyle === "glasses") {
    parent.add(part(new THREE.SphereGeometry(0.1, SEG, SEG, 0, Math.PI * 2, 0, Math.PI * 0.48), mat(profile.hairColor ?? 0x2a1810), 0, headY + 0.024, -0.01));
  }
}

function addMask(parent, headY, profile) {
  const base = mat(profile.maskColor ?? 0x1a1a1a);
  parent.add(part(new THREE.SphereGeometry(0.105, SEG, SEG, 0, Math.PI * 2, Math.PI * 0.32, Math.PI * 0.52), base, 0, headY - 0.01, 0.03));
  const accent = mat(profile.maskAccent ?? 0xcc2222);
  if (profile.maskPattern === "skull") {
    parent.add(
      part(new THREE.SphereGeometry(0.02, 6, 6), mat(0xeeeeee), -0.03, headY + 0.024, 0.106),
      part(new THREE.SphereGeometry(0.02, 6, 6), mat(0xeeeeee), 0.03, headY + 0.024, 0.106)
    );
  } else if (profile.maskPattern === "stripe") {
    parent.add(part(new THREE.BoxGeometry(0.1, 0.02, 0.01), accent, 0, headY + 0.032, 0.106));
  }
  parent.add(part(new THREE.BoxGeometry(0.09, 0.014, 0.008), mat(0x080808), 0, headY + 0.024, 0.11));
}

function addHelmet(parent, headY, colorOrMat, showFace) {
  const h = colorOrMat?.isMaterial ? colorOrMat : mat(colorOrMat);
  parent.add(
    part(new THREE.SphereGeometry(0.118, SEG, SEG, 0, Math.PI * 2, 0, Math.PI * 0.55), h, 0, headY + 0.034, 0),
    part(new THREE.CylinderGeometry(0.122, 0.122, 0.032, SEG), h, 0, headY - 0.014, 0)
  );
  parent.add(part(new THREE.BoxGeometry(0.18, 0.055, 0.05), mat(0x223344), 0, headY + 0.006, 0.094));
  if (showFace) addFace(parent, headY, { headStyle: "face", eyeColor: 0xaaccff });
}

function buildLeg(side, sm, mPants, mBoot) {
  const sx = side === "L" ? -0.1 : 0.1;
  const hip = new THREE.Group();
  hip.position.set(sx, 0.84, 0);

  const thigh = part(new THREE.CapsuleGeometry(0.078 * sm, 0.34, 4, SEG), mPants, 0, -0.17, 0);
  hip.add(thigh);

  const knee = new THREE.Group();
  knee.position.y = -0.34;
  hip.add(knee);

  const shin = part(new THREE.CapsuleGeometry(0.062 * sm, 0.32, 4, SEG), mPants, 0, -0.16, 0);
  knee.add(shin);

  const foot = part(new THREE.BoxGeometry(0.09, 0.07, 0.22), mBoot, 0, -0.34, 0.04);
  knee.add(foot);
  // Solado
  knee.add(part(new THREE.BoxGeometry(0.094, 0.014, 0.225), mat(0x111111, 0.95), 0, -0.378, 0.04));
  // Cadarços (linhas horizontais)
  for (let c = 0; c < 3; c++) {
    knee.add(part(new THREE.BoxGeometry(0.086, 0.006, 0.007), mat(0xddddcc, 0.9), 0, -0.308 + c * 0.012, 0.125));
  }

  return { hip, knee, thigh, shin, foot };
}

function buildArm(side, sm, mSleeve, mSkin, mGlove) {
  const sx = side === "L" ? -0.22 : 0.22;
  const shoulder = new THREE.Group();
  shoulder.position.set(sx, 1.38, 0.02);

  const upper = part(new THREE.CapsuleGeometry(0.048 * sm, 0.24, 4, SEG), mSleeve, 0, -0.12, 0);
  shoulder.add(upper);

  const elbow = new THREE.Group();
  elbow.position.y = -0.24;
  shoulder.add(elbow);

  const fore = part(new THREE.CapsuleGeometry(0.04 * sm, 0.22, 4, SEG), mSkin, 0, -0.11, 0);
  elbow.add(fore);

  const hand = new THREE.Group();
  hand.position.y = -0.22;
  elbow.add(hand);

  // Punho/luva com mais volume
  const wrist = part(new THREE.CylinderGeometry(0.032 * sm, 0.034 * sm, 0.05, 8), mGlove, 0, -0.022, 0);
  wrist.rotation.x = Math.PI / 2;
  elbow.add(wrist);
  // Barra de ajuste da luva
  const wristStrap = part(new THREE.BoxGeometry(0.052 * sm, 0.008, 0.03), mat(0x0a0a0a, 0.9), 0, -0.022, 0.03);
  wristStrap.rotation.x = Math.PI / 2;
  elbow.add(wristStrap);

  // Relógio tático no pulso esquerdo
  if (side === "L") {
    const watchBand = part(new THREE.CylinderGeometry(0.036 * sm, 0.036 * sm, 0.024, 16), mat(0x151515, 0.7), 0, -0.008, 0);
    watchBand.rotation.x = Math.PI / 2;
    elbow.add(watchBand);
    const watchFace = part(new THREE.BoxGeometry(0.028 * sm, 0.02, 0.01), mat(0x1a2a3a, 0.55, 0x0044aa), 0, -0.008, 0.042);
    watchFace.rotation.x = 0.08;
    elbow.add(watchFace);
  }

  // Palma da luva — formato mais anatômico, não bloco
  const palm = part(new THREE.CapsuleGeometry(0.022 * sm, 0.04, 4, 8), mGlove, 0, 0, 0.022);
  palm.scale.set(1.35, 0.55, 1.45);
  hand.add(palm);
  // Dorso da mão com padding tático
  const backhand = part(new THREE.BoxGeometry(0.05 * sm, 0.012, 0.044), mat(0x111111, 0.82), 0, 0.018, 0.022);
  hand.add(backhand);
  for (let i = 0; i < 3; i++) {
    hand.add(part(new THREE.SphereGeometry(0.005 * sm, 5, 4), mat(0x151515, 0.8), -0.015 + i * 0.015, 0.018, 0.038));
  }

  // 4 dedos com 3 falanges (mais natural)
  const fingerBaseZ = 0.05;
  const curlAngles = [1.05, 1.02, 1.04, 1.08];
  const fingerLens = [1.0, 1.08, 0.98, 0.85];
  const fingerWidths = [1.0, 0.95, 0.9, 0.82];
  for (let i = 0; i < 4; i++) {
    const fx = -0.018 + i * 0.012;
    const fc = curlAngles[i];
    const fl = fingerLens[i] * sm;
    const fw = fingerWidths[i] * sm;
    // Falange proximal
    const fp = new THREE.Group();
    fp.position.set(fx, 0, fingerBaseZ);
    fp.rotation.x = fc;
    hand.add(fp);
    fp.add(part(new THREE.CapsuleGeometry(0.0075 * fw, 0.024, 2, 6), mGlove, 0, -0.012, 0));
    // Falange média
    const fm = new THREE.Group();
    fm.position.set(0, -0.024, 0);
    fm.rotation.x = 0.35;
    fp.add(fm);
    fm.add(part(new THREE.CapsuleGeometry(0.0068 * fw, 0.02, 2, 6), mGlove, 0, -0.01, 0));
    // Falange distal
    const fd = new THREE.Group();
    fd.position.set(0, -0.02, 0);
    fd.rotation.x = 0.28;
    fm.add(fd);
    fd.add(part(new THREE.CapsuleGeometry(0.006 * fw, 0.016, 2, 6), mGlove, 0, -0.008, 0));
    // Ponta do dedo com unhagem/luva reforçada
    fd.add(part(new THREE.SphereGeometry(0.0065 * fw, 5, 4), mat(0x0a0a0a, 0.88), 0, -0.015, 0));
  }

  // Polegar com 2 falanges
  const thumbPivot = new THREE.Group();
  thumbPivot.position.set(side === "L" ? -0.032 : 0.032, 0, 0.032);
  thumbPivot.rotation.set(0.35, 0, side === "L" ? -0.72 : 0.72);
  hand.add(thumbPivot);
  thumbPivot.add(part(new THREE.CapsuleGeometry(0.0085 * sm, 0.024, 2, 6), mGlove, 0, -0.012, 0));
  const thumbDist = new THREE.Group();
  thumbDist.position.y = -0.024;
  thumbDist.rotation.x = 0.18;
  thumbPivot.add(thumbDist);
  thumbDist.add(part(new THREE.CapsuleGeometry(0.0075 * sm, 0.018, 2, 6), mGlove, 0, -0.009, 0));
  thumbDist.add(part(new THREE.SphereGeometry(0.0075 * sm, 5, 4), mat(0x0a0a0a, 0.88), 0, -0.018, 0));

  return { shoulder, elbow, hand, upper, fore };
}

function buildRifleGroup(shirtColor) {
  const gun = new THREE.Group();
  const metal = mat(0x2a2a2a, 0.45);
  const wood = mat(0x3d2817, 0.9);
  gun.add(
    part(new THREE.BoxGeometry(0.035, 0.05, 0.18), wood, 0, 0.008, -0.08),
    part(new THREE.BoxGeometry(0.03, 0.045, 0.34), metal, 0, 0.012, -0.34),
    part(new THREE.CylinderGeometry(0.014, 0.014, 0.28, 8), metal, 0, 0.012, -0.56, Math.PI / 2, 0, 0),
    part(new THREE.BoxGeometry(0.042, 0.065, 0.03), mat(shirtColor), 0, -0.028, -0.05),
    part(new THREE.CylinderGeometry(0.012, 0.012, 0.14, 6), metal, 0, 0.015, -0.14, Math.PI / 2, 0, 0)
  );
  return gun;
}

function addTacticalGear(torso, sm, vestColor, darkColor, profile) {
  const vest = mat(vestColor, 0.88);
  const dark = mat(darkColor, 0.9);
  torso.add(
    part(new THREE.BoxGeometry(0.34 * sm, 0.38, 0.12), vest, 0, 1.22, 0.02),
    part(new THREE.BoxGeometry(0.06, 0.36, 0.04), dark, -0.17 * sm, 1.2, 0),
    part(new THREE.BoxGeometry(0.06, 0.36, 0.04), dark, 0.17 * sm, 1.2, 0),
    part(new THREE.BoxGeometry(0.07, 0.09, 0.05), dark, -0.12 * sm, 1.08, 0.07),
    part(new THREE.BoxGeometry(0.07, 0.09, 0.05), dark, 0.12 * sm, 1.08, 0.07),
    part(new THREE.BoxGeometry(0.24, 0.04, 0.09), dark, 0, 1.02, 0.04),
    part(new THREE.BoxGeometry(0.035, 0.05, 0.03), mat(0x334455), -0.14 * sm, 1.26, 0.08)
  );
  if (profile.kneePads) {
    torso.add(
      part(new THREE.BoxGeometry(0.07, 0.05, 0.06), dark, -0.1, 0.46, 0.04),
      part(new THREE.BoxGeometry(0.07, 0.05, 0.06), dark, 0.1, 0.46, 0.04)
    );
  }
}

function buildBackpack(color, sm) {
  const group = new THREE.Group();
  const bagMat = mat(color, 0.92);
  const dark = mat(0x151515, 0.9);
  const zipper = mat(0x888888, 0.6, 0xaaaaaa);
  zipper.metalness = 0.7;

  // Corpo principal da mochila
  const body = part(new THREE.BoxGeometry(0.32 * sm, 0.42, 0.16), bagMat, 0, 0, 0);
  group.add(body);
  // Bolso frontal
  group.add(part(new THREE.BoxGeometry(0.22 * sm, 0.18, 0.04), bagMat, 0, -0.05, 0.08));
  // Bolso frontal com profundidade
  group.add(part(new THREE.BoxGeometry(0.22 * sm, 0.18, 0.02), dark, 0, -0.05, 0.095));
  // Zíperes
  group.add(part(new THREE.BoxGeometry(0.02 * sm, 0.34, 0.01), zipper, 0, 0.02, 0.083)); // zíper principal
  group.add(part(new THREE.BoxGeometry(0.02 * sm, 0.14, 0.01), zipper, 0, -0.05, 0.103)); // zíper do bolso
  // Alças laterais
  group.add(part(new THREE.BoxGeometry(0.02 * sm, 0.34, 0.01), dark, -0.14 * sm, 0.02, -0.02));
  group.add(part(new THREE.BoxGeometry(0.02 * sm, 0.34, 0.01), dark, 0.14 * sm, 0.02, -0.02));
  // Alça de cima
  group.add(part(new THREE.TorusGeometry(0.04 * sm, 0.006, 4, 8, Math.PI), dark, 0, 0.22, 0));
  return group;
}

export function buildStylizedHuman(opts = {}) {
  const {
    shirt = 0x4a4a4a,
    pants = 0x2a2a2a,
    skin = SKIN,
    gloves = 0x1a1a1a,
    shoes = SHOE,
    scale = 1,
    muscular = false,
    accessory = "cap",
    capColor = 0x1a1a1a,
    helmet = false,
    helmetColor = 0x334466,
    shirtNeon = null,
    pantsNeon = null,
    glovesNeon = null,
    shoesNeon = null,
    helmetNeon = null,
    withRifle = true,
    backpack = false,
    backpackColor = 0x3a2818,
    vest = true,
    faceProfile = {},
  } = opts;

  const profile = { skinTone: skin, kneePads: true, ...faceProfile };
  const root = new THREE.Group();
  const hitMeshes = [];
  const sm = muscular ? 1.1 : 1;

  const mSkin = mat(skin, 0.86);
  const mShirt = mat(shirt, 0.85, shirtNeon);
  const mPants = mat(pants, 0.88, pantsNeon);
  const mBoot = mat(shoes, 0.7, shoesNeon);
  const mGlove = mat(gloves, 0.75, glovesNeon);
  const mDark = mat(0x111722, 0.72);
  const mAccent = mat(shirtNeon || 0xffb04a, 0.45, shirtNeon);

  const bodyBob = new THREE.Group();
  root.add(bodyBob);

  const torso = new THREE.Group();
  bodyBob.add(torso);

  // Base mais "personagem inicial de shooter": corpo legível, roupa separada e acessórios visíveis.
  torso.add(part(new THREE.CapsuleGeometry(0.13 * sm, 0.52, 6, SEG), mShirt, 0, 1.18, 0));
  torso.add(part(new THREE.CapsuleGeometry(0.115 * sm, 0.2, 4, SEG), mPants, 0, 0.82, 0));
  torso.add(
    part(new THREE.BoxGeometry(0.31 * sm, 0.035, 0.13), mDark, 0, 1.45, 0.018),
    part(new THREE.BoxGeometry(0.13, 0.038, 0.145), mDark, -0.155 * sm, 1.38, 0.02, 0, 0, 0.18),
    part(new THREE.BoxGeometry(0.13, 0.038, 0.145), mDark, 0.155 * sm, 1.38, 0.02, 0, 0, -0.18),
    part(new THREE.BoxGeometry(0.32 * sm, 0.045, 0.135), mDark, 0, 0.94, 0.025),
    part(new THREE.BoxGeometry(0.09, 0.055, 0.035), mAccent, -0.075, 1.25, 0.092),
    part(new THREE.BoxGeometry(0.09, 0.055, 0.035), mAccent, 0.075, 1.25, 0.092)
  );

  if (vest) {
    addTacticalGear(torso, sm, muscular ? 0x2a2a2a : 0x3a4530, 0x1a1a1a, profile);
  }

  if (backpack) {
    const bp = buildBackpack(backpackColor, sm);
    bp.position.set(0, 1.38, -0.12);
    torso.add(bp);
  }

  const legL = buildLeg("L", sm, mPants, mBoot);
  const legR = buildLeg("R", sm, mPants, mBoot);
  torso.add(legL.hip, legR.hip);
  legL.knee.add(part(new THREE.BoxGeometry(0.088, 0.038, 0.045), mDark, 0, -0.185, 0.055));
  legR.knee.add(part(new THREE.BoxGeometry(0.088, 0.038, 0.045), mDark, 0, -0.185, 0.055));
  legL.foot.add(part(new THREE.BoxGeometry(0.076, 0.018, 0.105), mAccent, 0, 0.028, 0.03));
  legR.foot.add(part(new THREE.BoxGeometry(0.076, 0.018, 0.105), mAccent, 0, 0.028, 0.03));

  const armL = buildArm("L", sm, mShirt, mSkin, mGlove);
  const armR = buildArm("R", sm, mShirt, mSkin, mGlove);
  torso.add(armL.shoulder, armR.shoulder);

  const neckPivot = new THREE.Group();
  neckPivot.position.set(0, 1.48, 0.01);
  torso.add(neckPivot);

  neckPivot.add(part(new THREE.CapsuleGeometry(0.038, 0.07, 4, 8), mSkin, 0, 0.035, 0));

  const head = part(new THREE.SphereGeometry(0.098 * sm, SEG, SEG), mSkin, 0, 0.12, 0.01);
  head.scale.set(1, 1.05, 0.93);
  head.userData.hitPart = "head";
  neckPivot.add(head);

  const headY = 0.12;
  const headStyle = profile.headStyle ?? accessory ?? "face";
  if (helmet) {
    const hMat = mat(helmetColor, 0.72, helmetNeon);
    addHelmet(neckPivot, headY, hMat, profile.helmetFace);
  } else if (headStyle === "mask" || headStyle === "bandana") {
    addMask(neckPivot, headY, profile);
  } else {
    addFace(neckPivot, headY, profile);
    if (headStyle === "cap") {
      neckPivot.add(
        part(new THREE.SphereGeometry(0.105, SEG, SEG, 0, Math.PI * 2, 0, Math.PI * 0.5), mat(capColor), 0, headY + 0.048, -0.01),
        part(new THREE.BoxGeometry(0.2, 0.018, 0.1), mat(capColor), 0, headY + 0.004, 0.055)
      );
    }
    if (headStyle === "glasses") {
      const lens = mat(0x334455, 0.3);
      lens.transparent = true;
      lens.opacity = 0.75;
      neckPivot.add(
        part(new THREE.BoxGeometry(0.08, 0.04, 0.02), lens, -0.048, headY + 0.016, 0.104),
        part(new THREE.BoxGeometry(0.08, 0.04, 0.02), lens, 0.048, headY + 0.016, 0.104)
      );
    }
  }

  applyHold(armL, armR);

  const gunPivot = new THREE.Group();
  gunPivot.position.set(0.04, -0.02, 0.06);
  armR.hand.add(gunPivot);
  let gun = null;
  if (withRifle) {
    gun = buildRifleGroup(shirt);
    gunPivot.add(gun);
    armL.hand.position.z = 0.04;
  }

  const torsoHit = part(new THREE.CapsuleGeometry(0.12 * sm, 0.5, 4, 8), mShirt, 0, 1.18, 0);
  torsoHit.visible = false;
  torso.add(torsoHit);

  hitMeshes.push(head, torsoHit, legL.thigh, legR.thigh);

  root.scale.setScalar(scale);
  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = false;
      o.receiveShadow = false;
    }
  });

  return {
    group: root,
    hitMeshes,
    head,
    torso: torsoHit,
    foreL: armL.fore,
    foreR: armR.fore,
    handR: armR.hand,
    rig: {
      bodyBob,
      torsoPivot: torso,
      hipL: legL.hip,
      hipR: legR.hip,
      kneeL: legL.knee,
      kneeR: legR.knee,
      shoulderL: armL.shoulder,
      shoulderR: armR.shoulder,
      elbowL: armL.elbow,
      elbowR: armR.elbow,
      handL: armL.hand,
      neckPivot,
      gun,
      gunPivot,
      hold: { ...RIFLE_HOLD },
    },
  };
}
