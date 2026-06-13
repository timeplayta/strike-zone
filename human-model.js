/** Personagem humano real — mesh skinned único (Mixamo Soldier) */

import * as THREE from "three";
import { GLTFLoader } from "./vendor/GLTFLoader.js";
import { clone as cloneSkeleton } from "./vendor/SkeletonUtils.js";
import { buildNpcWeapon, attachNpcWeapon } from "./npc-weapon.js";

import { MAX_PIXEL_RATIO, MAX_TEXTURE_ANISO } from "./perf-config.js";

const BASE_SCALE = 1.2;
const MAX_ANISO = MAX_TEXTURE_ANISO;

const MODEL_URLS = [
  "./vendor/Soldier.glb",
  "./assets/models/Soldier.glb",
  "https://threejs.org/examples/models/gltf/Soldier.glb",
];

let template = null;
const clips = { idle: null, walk: null, run: null };
let loadPromise = null;
let loadError = null;

async function tryLoadModel(url) {
  const gltf = await new GLTFLoader().loadAsync(url);
  if (!gltf?.scene) throw new Error("GLTF sem scene: " + url);
  return gltf;
}

export function preloadHumanModels() {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    loadError = null;
    for (const url of MODEL_URLS) {
      try {
        const gltf = await tryLoadModel(url);
        template = gltf;
        clips.idle = clips.walk = clips.run = null;
        for (const clip of gltf.animations) {
          const n = clip.name.toLowerCase();
          if (n.includes("idle")) clips.idle = clip;
          else if (n.includes("walk")) clips.walk = clip;
          else if (n.includes("run")) clips.run = clip;
        }
        if (!clips.idle && gltf.animations.length) clips.idle = gltf.animations[0];
        if (!clips.walk && gltf.animations.length > 1) clips.walk = gltf.animations[1];
        if (!clips.run && gltf.animations.length > 2) clips.run = gltf.animations[2];
        console.info("Strike Zone: personagem humano carregado de", url);
        return gltf;
      } catch (err) {
        console.warn("Strike Zone: falha ao carregar", url, err);
        loadError = err;
      }
    }
    template = null;
    throw new Error("Não foi possível carregar o modelo humano 3D.");
  })();
  return loadPromise;
}

export function isHumanModelReady() {
  return !!template;
}

export function getHumanModelError() {
  return loadError?.message || null;
}

export function configureCharacterRenderer(renderer, exposure = 1.05) {
  if (!renderer) return;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = exposure;
  renderer.shadowMap.enabled = false;
}

function findBone(model, names) {
  for (const n of names) {
    const b = model.getObjectByName(n);
    if (b) return b;
  }
  return null;
}

function boostTexture(tex, renderer) {
  if (!tex) return;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(MAX_ANISO, renderer?.capabilities?.getMaxAnisotropy?.() ?? MAX_ANISO);
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
}

function applyTeamTint(material, shirt, team, variant = 0) {
  const tint = new THREE.Color(shirt);
  const hsl = { h: 0, s: 0, l: 0 };
  tint.getHSL(hsl);

  if (team === "ct") {
    tint.setHSL(0.58 + variant * 0.012, Math.min(0.5, hsl.s + 0.15), hsl.l * 0.78);
    material.color.lerp(tint, 0.22);
  } else {
    tint.setHSL(0.05 + variant * 0.018, Math.min(0.55, hsl.s + 0.1), hsl.l * 0.92);
    material.color.lerp(tint, 0.16);
  }

  material.emissive = new THREE.Color(0x000000);
  material.envMapIntensity = 0.4;
}

function upgradeMaterials(model, opts, renderer) {
  const { shirt, team, variant = 0, horror = false } = opts;
  model.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const src = Array.isArray(o.material) ? o.material[0] : o.material;
    const mat = src.clone();

    ["map", "normalMap", "roughnessMap", "metalnessMap", "aoMap"].forEach((key) => {
      boostTexture(mat[key], renderer);
    });

    if (mat.normalMap) mat.normalScale = new THREE.Vector2(1.5, 1.5);
    mat.roughness = mat.roughness ?? 0.58;
    mat.metalness = mat.metalness ?? 0.06;

    applyTeamTint(mat, shirt, team, variant);
    if (horror) {
      mat.color.multiplyScalar(0.42);
      mat.color.lerp(new THREE.Color(0x1a1510), 0.35);
      mat.emissive = new THREE.Color(0x0a0806);
      mat.emissiveIntensity = 0.08;
    }
    o.material = mat;
    o.castShadow = false;
    o.receiveShadow = false;
    o.frustumCulled = true;
  });
}

export function buildHumanCharacter(opts = {}) {
  if (!template) {
    throw new Error("Modelo humano não carregado. Recarregue a página (Ctrl+Shift+R).");
  }

  const {
    shirt = 0x888888,
    scale = 1,
    withRifle = true,
    weaponType = "ak47",
    team = "t",
    variant = 0,
    horror = false,
  } = opts;

  const root = new THREE.Group();
  const model = cloneSkeleton(template.scene);
  model.rotation.y = Math.PI;
  model.scale.setScalar(BASE_SCALE * scale);

  const renderer = typeof window !== "undefined" ? window.__strikeRenderer : null;
  upgradeMaterials(model, { shirt, team, variant, horror }, renderer);

  const headBone = findBone(model, ["mixamorigHead", "Head"]);
  const headHit = new THREE.Mesh(
    new THREE.SphereGeometry(0.11 * scale, 12, 12),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  headHit.userData.hitPart = "head";
  if (headBone) headBone.add(headHit);
  else {
    headHit.position.set(0, 1.65 * BASE_SCALE * scale, 0);
    root.add(headHit);
  }

  const hitMeshes = [headHit];
  model.traverse((o) => {
    if (o.isSkinnedMesh) {
      o.userData.hitPart = "body";
      hitMeshes.push(o);
    }
  });

  const bones = {
    hips: findBone(model, ["mixamorigHips", "Hips"]),
    handR: findBone(model, ["mixamorigRightHand", "RightHand"]),
    handL: findBone(model, ["mixamorigLeftHand", "LeftHand"]),
    armR: findBone(model, ["mixamorigRightArm", "RightArm"]),
    armL: findBone(model, ["mixamorigLeftArm", "LeftArm"]),
    foreR: findBone(model, ["mixamorigRightForeArm", "RightForeArm"]),
    foreL: findBone(model, ["mixamorigLeftForeArm", "LeftForeArm"]),
    shoulderR: findBone(model, ["mixamorigRightShoulder", "RightShoulder"]),
    shoulderL: findBone(model, ["mixamorigLeftShoulder", "LeftShoulder"]),
    spine: findBone(model, ["mixamorigSpine2", "Spine2", "mixamorigSpine1"]),
    spine1: findBone(model, ["mixamorigSpine1", "Spine1"]),
    upLegL: findBone(model, ["mixamorigLeftUpLeg", "LeftUpLeg"]),
    upLegR: findBone(model, ["mixamorigRightUpLeg", "RightUpLeg"]),
    legL: findBone(model, ["mixamorigLeftLeg", "LeftLeg"]),
    legR: findBone(model, ["mixamorigRightLeg", "RightLeg"]),
    neck: findBone(model, ["mixamorigNeck", "Neck"]),
  };

  let gun = null;
  let weaponPivot = null;
  if (withRifle) {
    gun = buildNpcWeapon(weaponType, shirt);
    const attached = attachNpcWeapon(bones, gun, weaponType);
    gun = attached.gun;
    weaponPivot = attached.pivot;
  }

  root.add(model);

  const mixer = new THREE.AnimationMixer(model);
  const animActions = {};
  if (clips.idle) {
    animActions.idle = mixer.clipAction(clips.idle);
    animActions.idle.play();
  }
  if (clips.walk) animActions.walk = mixer.clipAction(clips.walk);
  if (clips.run) animActions.run = mixer.clipAction(clips.run);

  return {
    group: root,
    hitMeshes,
    head: headHit,
    handR: bones.handR,
    handL: bones.handL,
    foreR: bones.foreR,
    foreL: bones.foreL,
    gun,
    weaponPivot,
    weaponType,
    mixer,
    animActions,
    animModel: model,
    bones,
    rig: null,
  };
}
