/**
 * Boost gráfico Three.js — céu gradiente, IBL (PMREM), sombras, sparks de
 * impacto, camera shake e punch de FOV. Pensado pra web/mobile: efeitos
 * pesados respeitam GRAPHICS_QUALITY de perf-config.js.
 */
import * as THREE from "three";
import {
  GRAPHICS_QUALITY,
  LOW_GRAPHICS,
  ENABLE_SHADOWS,
  ENV_MAP_INTENSITY,
  MAX_TEXTURE_ANISO,
} from "./perf-config.js";

let skyDome = null;
let envMapTex = null;
let pmrem = null;
let sparkPool = [];
let shakeAmp = 0;
let fovPunch = 0;
const baseFov = { value: 75 };

export function setGraphicsBaseFov(fov) {
  baseFov.value = fov;
}

/** Sombras + tomografia já vêm de configureCharacterRenderer; aqui completa. */
export function applyShadowSettings(renderer, sunLight) {
  if (!renderer) return;
  const on = ENABLE_SHADOWS && !LOW_GRAPHICS;
  renderer.shadowMap.enabled = on;
  renderer.shadowMap.type =
    GRAPHICS_QUALITY === "high" ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;

  if (!sunLight) return;
  sunLight.castShadow = on;
  if (!on) return;

  const mapSize = GRAPHICS_QUALITY === "high" ? 2048 : 1024;
  sunLight.shadow.mapSize.set(mapSize, mapSize);
  sunLight.shadow.bias = -0.00035;
  sunLight.shadow.normalBias = 0.035;
  sunLight.shadow.radius = GRAPHICS_QUALITY === "high" ? 2.2 : 1.4;
  const cam = sunLight.shadow.camera;
  cam.near = 1;
  cam.far = 120;
  cam.left = -45;
  cam.right = 45;
  cam.top = 45;
  cam.bottom = -45;
  cam.updateProjectionMatrix();
}

/** Liga cast/receive em meshes grandes da cena (chão, paredes, NPCs). */
export function enableSceneShadows(root, { cast = true, receive = true } = {}) {
  if (!ENABLE_SHADOWS || !root) return;
  root.traverse((o) => {
    if (!o.isMesh) return;
    // Skip HUD/invisíveis / partículas transparentes pesadas
    if (o.material?.transparent && (o.material.opacity ?? 1) < 0.35) return;
    if (o.userData?.noShadow) return;
    o.castShadow = cast;
    o.receiveShadow = receive;
  });
}

/**
 * Céu em esfera invertida com gradiente (céu → horizonte → chão).
 * Muito mais "jogo AAA indie" que Color flat de background.
 */
export function ensureSkyDome(scene, skyHex, fogHex, groundHex = 0x2a2418) {
  if (!scene) return null;
  if (!skyDome) {
    const geo = new THREE.SphereGeometry(400, LOW_GRAPHICS ? 16 : 32, LOW_GRAPHICS ? 10 : 16);
    // Gradiente via vertex colors
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const cTop = new THREE.Color(skyHex);
    const cMid = new THREE.Color(fogHex);
    const cBot = new THREE.Color(groundHex);
    const tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const t = THREE.MathUtils.clamp((y / 400) * 0.5 + 0.5, 0, 1);
      if (t > 0.55) tmp.copy(cMid).lerp(cTop, (t - 0.55) / 0.45);
      else tmp.copy(cBot).lerp(cMid, t / 0.55);
      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    skyDome = new THREE.Mesh(geo, mat);
    skyDome.name = "strikeSkyDome";
    skyDome.renderOrder = -10;
    skyDome.frustumCulled = false;
    skyDome.userData.noShadow = true;
  } else {
    // Recolor rápido
    const geo = skyDome.geometry;
    const pos = geo.attributes.position;
    const colAttr = geo.attributes.color;
    const cTop = new THREE.Color(skyHex);
    const cMid = new THREE.Color(fogHex);
    const cBot = new THREE.Color(groundHex);
    const tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const t = THREE.MathUtils.clamp((y / 400) * 0.5 + 0.5, 0, 1);
      if (t > 0.55) tmp.copy(cMid).lerp(cTop, (t - 0.55) / 0.45);
      else tmp.copy(cBot).lerp(cMid, t / 0.55);
      colAttr.setXYZ(i, tmp.r, tmp.g, tmp.b);
    }
    colAttr.needsUpdate = true;
  }

  if (!skyDome.parent) scene.add(skyDome);
  scene.background = new THREE.Color(skyHex).multiplyScalar(0.35);
  return skyDome;
}

/** IBL barato: gera env map a partir de um céu/chão coloridos. */
export function applyEnvLighting(renderer, scene, skyHex = 0x87aacc, groundHex = 0x3a2a18) {
  if (!renderer || !scene || ENV_MAP_INTENSITY <= 0 || LOW_GRAPHICS) {
    if (scene) scene.environment = null;
    return;
  }
  try {
    if (!pmrem) pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    envScene.add(new THREE.HemisphereLight(skyHex, groundHex, 1.2));
    const sun = new THREE.DirectionalLight(0xffe6c0, 1.4);
    sun.position.set(4, 8, 2);
    envScene.add(sun);
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(8, 16, 12),
      new THREE.MeshBasicMaterial({ color: skyHex, side: THREE.BackSide })
    );
    envScene.add(dome);
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(10, 16),
      new THREE.MeshBasicMaterial({ color: groundHex })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.5;
    envScene.add(ground);

    if (envMapTex) envMapTex.dispose();
    envMapTex = pmrem.fromScene(envScene, 0.04).texture;
    scene.environment = envMapTex;
    scene.environmentIntensity = ENV_MAP_INTENSITY;
  } catch (err) {
    console.warn("[Strike Zone] IBL falhou:", err?.message || err);
  }
}

/** Sparks de impacto em paredes (não sangue). */
export function spawnHitSparks(scene, pos, count = 8) {
  if (!scene || !pos) return;
  const n = LOW_GRAPHICS ? Math.min(4, count) : count;
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.018 + Math.random() * 0.02, 4, 4),
      new THREE.MeshBasicMaterial({
        color: Math.random() > 0.45 ? 0xffcc66 : 0xff8844,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
      })
    );
    m.position.copy(pos);
    m.userData.vel = new THREE.Vector3(
      (Math.random() - 0.5) * 3.2,
      Math.random() * 2.4 + 0.4,
      (Math.random() - 0.5) * 3.2
    );
    m.userData.life = 0.28 + Math.random() * 0.22;
    m.userData.noShadow = true;
    scene.add(m);
    sparkPool.push(m);
  }
}

export function updateHitSparks(dt, scene) {
  for (let i = sparkPool.length - 1; i >= 0; i--) {
    const m = sparkPool[i];
    m.userData.life -= dt;
    if (m.userData.life <= 0) {
      scene?.remove(m);
      m.geometry?.dispose?.();
      m.material?.dispose?.();
      sparkPool.splice(i, 1);
      continue;
    }
    m.userData.vel.y -= 9 * dt;
    m.position.addScaledVector(m.userData.vel, dt);
    m.material.opacity = Math.max(0, m.userData.life * 3);
    const s = 0.5 + m.userData.life * 2;
    m.scale.setScalar(s);
  }
}

export function addCameraShake(amount) {
  shakeAmp = Math.min(0.14, shakeAmp + amount);
}

export function addFovPunch(amount = 2.5) {
  fovPunch = Math.min(8, fovPunch + amount);
}

/** Aplica shake (só visual na rotação) + FOV punch; chamar no loop após applyCameraRotation. */
export function updateCameraJuice(camera, dt) {
  if (!camera) return;
  if (shakeAmp > 0.0005) {
    camera.rotation.x += (Math.random() - 0.5) * shakeAmp * 0.55;
    camera.rotation.y += (Math.random() - 0.5) * shakeAmp * 0.35;
    camera.rotation.z = (Math.random() - 0.5) * shakeAmp * 0.9;
    shakeAmp = Math.max(0, shakeAmp - dt * 2.8);
  } else {
    shakeAmp = 0;
    if (Math.abs(camera.rotation.z) > 0.0001) {
      camera.rotation.z *= Math.max(0, 1 - dt * 14);
    } else {
      camera.rotation.z = 0;
    }
  }
  if (fovPunch > 0.05) {
    camera.fov = baseFov.value + fovPunch;
    camera.updateProjectionMatrix();
    fovPunch = Math.max(0, fovPunch - dt * 18);
  } else if (fovPunch !== 0) {
    fovPunch = 0;
    if (Math.abs(camera.fov - baseFov.value) > 0.05) {
      camera.fov = baseFov.value;
      camera.updateProjectionMatrix();
    }
  }
}

/** Flash rápido no crosshair (acerto). */
export function flashHitmarker(headshot = false) {
  const el = document.getElementById("hitmarker");
  if (!el) return;
  el.classList.remove("show", "headshot");
  // force reflow
  void el.offsetWidth;
  if (headshot) el.classList.add("headshot");
  el.classList.add("show");
}

export function bumpTextureAnisotropy(root, renderer) {
  if (!root) return;
  const max = Math.min(MAX_TEXTURE_ANISO, renderer?.capabilities?.getMaxAnisotropy?.() ?? MAX_TEXTURE_ANISO);
  root.traverse((o) => {
    const mats = o.isMesh ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of mats) {
      if (!m) continue;
      for (const key of ["map", "normalMap", "roughnessMap", "metalnessMap", "emissiveMap"]) {
        if (m[key]) {
          m[key].anisotropy = max;
          m[key].needsUpdate = true;
        }
      }
    }
  });
}

export function disposeGraphicsBoost() {
  if (skyDome?.parent) skyDome.parent.remove(skyDome);
  skyDome = null;
  if (envMapTex) {
    envMapTex.dispose();
    envMapTex = null;
  }
  if (pmrem) {
    pmrem.dispose();
    pmrem = null;
  }
  sparkPool.length = 0;
  shakeAmp = 0;
  fovPunch = 0;
}
