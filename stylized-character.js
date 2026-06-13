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

  hand.add(part(new THREE.BoxGeometry(0.05, 0.038, 0.055), mGlove, 0, 0, 0.018));

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

  const bodyBob = new THREE.Group();
  root.add(bodyBob);

  const torso = new THREE.Group();
  bodyBob.add(torso);

  // Tronco único — sem buracos entre peças
  torso.add(part(new THREE.CapsuleGeometry(0.13 * sm, 0.52, 6, SEG), mShirt, 0, 1.18, 0));
  torso.add(part(new THREE.CapsuleGeometry(0.115 * sm, 0.2, 4, SEG), mPants, 0, 0.82, 0));

  addTacticalGear(torso, sm, muscular ? 0x2a2a2a : 0x3a4530, 0x1a1a1a, profile);

  const legL = buildLeg("L", sm, mPants, mBoot);
  const legR = buildLeg("R", sm, mPants, mBoot);
  torso.add(legL.hip, legR.hip);

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
      neckPivot,
      gun,
      gunPivot,
      hold: { ...RIFLE_HOLD },
    },
  };
}
