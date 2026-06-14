/**
 * Gigante — janitor velho + braços ~5,8 m + mãos gigantes (2,35 m)
 * GLB opcional: assets/models/roger-janitor.glb (https://skfb.ly/oEHoM)
 */

import * as THREE from "three";
import { GLTFLoader } from "./vendor/GLTFLoader.js";
import { clone as cloneSkeleton } from "./vendor/SkeletonUtils.js";
import { MAX_TEXTURE_ANISO } from "./perf-config.js";
import { makeRogerMaterials, setRogerThumbReference } from "./ln-roger-textures.js";
import { buildGiantJanitorHand } from "./giant-hand-janitor.js";
import {
  buildGiantHandFromGltf,
  isGrimyHandGltfReady,
  GIANT_HAND_HEIGHT,
} from "./grimy-hand-loader.js";

export const ROGER_BODY_HEIGHT = 1.42;
/** Comprimento do braço (ombro → punho) em metros */
export const GIGANTE_ARM_LENGTH = 5.8;

const ROGER_URLS = [
  "./assets/models/roger-janitor.glb",
  "./assets/models/RogerJanitor.glb",
  "./assets/models/roger_the_janitor.glb",
];

const ROGER_THUMB = "./assets/models/roger-janitor-thumb.jpg";

let rogerGltf = null;
let rogerLoadPromise = null;

function hideRogerAccessories(root) {
  root.traverse((obj) => {
    const n = (obj.name || "").toLowerCase();
    if (
      n.includes("hat") ||
      n.includes("cap") ||
      n.includes("helmet") ||
      n.includes("mask") ||
      n.includes("balaclava") ||
      n.includes("visor") ||
      n.includes("white_face") ||
      n.includes("faceplate")
    ) {
      obj.visible = false;
    }
  });
}

function upgradeRogerMaterials(root) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.castShadow = true;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of mats) {
      if (!m) continue;
      if (m.map) {
        m.map.colorSpace = THREE.SRGBColorSpace;
        m.map.anisotropy = MAX_TEXTURE_ANISO;
      }
    }
  });
}

function fitHeight(group, targetH) {
  group.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(group);
  const h = box.max.y - box.min.y;
  if (h > 0.01) {
    group.scale.setScalar(targetH / h);
    group.updateMatrixWorld(true);
    const box2 = new THREE.Box3().setFromObject(group);
    group.position.y = -box2.min.y;
  }
}

/** Braço longo afunilando — cadeia de ~5,8 m até a mão */
function buildLongTaperedArm(mats, side) {
  const arm = new THREE.Group();
  const sx = side;

  const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 12), mats.suit);
  shoulder.scale.set(1.15, 0.9, 1.05);
  arm.add(shoulder);

  const chain = new THREE.Group();
  chain.rotation.set(0.58, sx * 0.14, sx * 0.1);
  arm.add(chain);

  const segmentSpecs = [
    { len: 0.72, r: 0.09, mat: mats.suit },
    { len: 0.68, r: 0.082, mat: mats.suit },
    { len: 0.65, r: 0.074, mat: mats.suit },
    { len: 0.62, r: 0.066, mat: mats.suitDark },
    { len: 0.6, r: 0.058, mat: mats.suitDark },
    { len: 0.58, r: 0.05, mat: mats.suitDark },
    { len: 0.55, r: 0.044, mat: mats.suitDark },
    { len: 0.52, r: 0.038, mat: mats.suitDark },
    { len: 0.5, r: 0.032, mat: mats.suitDark },
    { len: 0.48, r: 0.028, mat: mats.skinDark },
    { len: 0.45, r: 0.024, mat: mats.skinDark },
    { len: 0.42, r: 0.02, mat: mats.skinDark },
  ];

  const segments = [shoulder];
  const joints = [];
  let parent = chain;

  for (const spec of segmentSpecs) {
    const joint = new THREE.Group();
    const mesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(spec.r, spec.len, 8, 12),
      spec.mat
    );
    mesh.rotation.x = Math.PI / 2;
    mesh.position.z = spec.len * 0.48;
    joint.add(mesh);
    joint.rotation.x = 0.04;
    parent.add(joint);
    parent = joint;
    joints.push(joint);
    segments.push(mesh);
  }

  const handPivot = new THREE.Group();
  handPivot.position.set(0, 0, 0.12);
  handPivot.rotation.set(0.35, sx * 0.08, 0);
  parent.add(handPivot);

  arm.position.set(sx * 0.22, 1.12, 0.02);

  return { arm, handPivot, segments, joints, chain };
}

function buildProceduralRogerBody(mats) {
  const body = new THREE.Group();

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.42, 12, 14), mats.suit);
  torso.position.set(0, 0.78, 0);
  torso.scale.set(1.05, 1, 0.85);
  body.add(torso);

  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), mats.suitDark);
  belly.scale.set(0.95, 0.75, 0.8);
  belly.position.set(0, 0.68, 0.06);
  body.add(belly);

  const pelvis = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.12, 10, 10), mats.suit);
  pelvis.position.set(0, 0.48, 0);
  body.add(pelvis);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 12), mats.skin);
  head.scale.set(1.05, 1.08, 1);
  head.position.set(0, 1.18, 0.04);
  body.add(head);

  const brow = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.06), mats.skinDark);
  brow.position.set(0, 1.22, 0.1);
  body.add(brow);

  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 0.6 });
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), eyeMat);
  eyeL.position.set(-0.05, 1.16, 0.12);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.05;
  body.add(eyeL, eyeR);

  const earL = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), mats.skin);
  earL.position.set(-0.14, 1.16, 0);
  const earR = earL.clone();
  earR.position.x = 0.14;
  body.add(earL, earR);

  for (let i = 0; i < 5; i++) {
    const hair = new THREE.Mesh(new THREE.CapsuleGeometry(0.008, 0.04, 4, 4), mats.skinDark);
    hair.position.set((i - 2) * 0.035, 1.28, -0.02);
    hair.rotation.x = -0.4;
    body.add(hair);
  }

  fitHeight(body, ROGER_BODY_HEIGHT);

  return { group: body, parts: { torso, head } };
}

function attachHandToPivot(pivot, side, cutIndex) {
  let handGroup;
  if (isGrimyHandGltfReady()) {
    handGroup = buildGiantHandFromGltf(GIANT_HAND_HEIGHT);
    if (side < 0) handGroup.scale.x *= -1;
  } else {
    const built = buildGiantJanitorHand(side, cutIndex);
    handGroup = built.group;
  }
  handGroup.rotation.set(0, side * 0.15, 0);
  pivot.add(handGroup);
  return handGroup;
}

export async function preloadRogerJanitor() {
  if (rogerLoadPromise) return rogerLoadPromise;
  rogerLoadPromise = (async () => {
    try {
      const thumb = await new THREE.TextureLoader().loadAsync(ROGER_THUMB);
      thumb.colorSpace = THREE.SRGBColorSpace;
      setRogerThumbReference(thumb);
    } catch {
      /* opcional */
    }

    for (const url of ROGER_URLS) {
      try {
        const gltf = await new GLTFLoader().loadAsync(url);
        if (!gltf?.scene) continue;
        hideRogerAccessories(gltf.scene);
        upgradeRogerMaterials(gltf.scene);
        rogerGltf = gltf;
        console.info("[Strike Zone] Roger janitor GLB:", url);
        return gltf;
      } catch {
        /* próximo */
      }
    }
    return null;
  })();
  return rogerLoadPromise;
}

export function buildGiganteJanitorMesh() {
  const root = new THREE.Group();
  const mats = makeRogerMaterials();

  let torso;
  let head;

  if (rogerGltf) {
    const body = cloneSkeleton(rogerGltf.scene);
    hideRogerAccessories(body);
    upgradeRogerMaterials(body);
    fitHeight(body, ROGER_BODY_HEIGHT);
    root.add(body);
    torso = body;
    head = body;
  } else {
    const built = buildProceduralRogerBody(mats);
    root.add(built.group);
    torso = built.parts.torso;
    head = built.parts.head;
  }

  const armL = buildLongTaperedArm(mats, -1);
  const armR = buildLongTaperedArm(mats, 1);
  root.add(armL.arm, armR.arm);

  const handL = attachHandToPivot(armL.handPivot, -1, -1);
  const handR = attachHandToPivot(armR.handPivot, 1, 1);

  return {
    group: root,
    parts: {
      torso,
      head,
      armL: armL.arm,
      armR: armR.arm,
      handL,
      handR,
      handPivotL: armL.handPivot,
      handPivotR: armR.handPivot,
      armSegL: armL.segments,
      armSegR: armR.segments,
      armJointL: armL.joints,
      armJointR: armR.joints,
      chainL: armL.chain,
      chainR: armR.chain,
    },
  };
}

/** Pose T — braços abertos (preview admin / menu) */
export function poseGiganteArmsOpen(parts) {
  if (!parts?.armL || !parts?.armR) return;

  const spread = 1.48;

  parts.armL.rotation.set(0.06, 0.02, spread);
  parts.armR.rotation.set(0.06, -0.02, -spread);

  if (parts.chainL) parts.chainL.rotation.set(0.14, -0.1, -0.06);
  if (parts.chainR) parts.chainR.rotation.set(0.14, 0.1, 0.06);

  for (const j of parts.armJointL ?? []) {
    if (j) j.rotation.x = 0.02;
  }
  for (const j of parts.armJointR ?? []) {
    if (j) j.rotation.x = 0.02;
  }

  if (parts.handPivotL) parts.handPivotL.rotation.set(0.28, -0.12, 0.42);
  if (parts.handPivotR) parts.handPivotR.rotation.set(0.28, 0.12, -0.42);

  if (parts.handL) {
    parts.handL.position.set(0, 0, 0);
    parts.handL.rotation.set(0, 0.2, 0);
  }
  if (parts.handR) {
    parts.handR.position.set(0, 0, 0);
    parts.handR.rotation.set(0, -0.2, 0);
  }
}

export function animateGiganteJanitor(m, t) {
  const { group, parts, def } = m;
  if (!group || def?.type !== "gigante") return;

  const crawl = Math.sin(t * 2.2 + m.animSeed);
  const crawl2 = Math.sin(t * 2.2 + m.animSeed + Math.PI);

  if (parts.handL) {
    parts.handL.position.z = crawl * 0.5;
    parts.handL.rotation.x = crawl * 0.22;
  }
  if (parts.handR) {
    parts.handR.position.z = crawl2 * 0.5;
    parts.handR.rotation.x = crawl2 * 0.22;
  }

  for (let i = 0; i < (parts.armJointL?.length ?? 0); i++) {
    const j = parts.armJointL[i];
    if (j) j.rotation.x = 0.04 + crawl * 0.04 * (i + 1);
  }
  for (let i = 0; i < (parts.armJointR?.length ?? 0); i++) {
    const j = parts.armJointR[i];
    if (j) j.rotation.x = 0.04 + crawl2 * 0.04 * (i + 1);
  }

  if (parts.armL) parts.armL.rotation.x = crawl * 0.06;
  if (parts.armR) parts.armR.rotation.x = crawl2 * 0.06;

  if (parts.torso?.rotation) parts.torso.rotation.x = 0.12 + Math.abs(crawl) * 0.05;
  if (parts.head?.rotation) parts.head.rotation.x = -0.06 + crawl * 0.04;

  group.position.y = 0.04 + Math.abs(crawl) * 0.05;
}
