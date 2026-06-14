/** Aplica cores e variantes visuais das skins da loja nas armas 3D */

import * as THREE from "three";
import { WEAPON_SKINS } from "./shop-catalog.js";

function shiftColor(hex, amount) {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  hsl.l = Math.max(0, Math.min(1, hsl.l + amount));
  c.setHSL(hsl.h, hsl.s, hsl.l);
  return c.getHex();
}

/** Presets visuais por item da loja */
const ITEM_STYLES = {
  ak_gold: { body: 0xc9a227, grip: 0x7a6010, metal: 0xffe066, metalness: 0.92, emissive: 0x443300, emissiveIntensity: 0.08 },
  ak_neon: { body: 0x0a1a18, grip: 0x061010, metal: 0x00ffcc, emissive: 0x00ffcc, emissiveIntensity: 0.55 },
  ak_shadow: { body: 0x1b1028, grip: 0x08040d, metal: 0x7a44ff, emissive: 0x6a22ff, emissiveIntensity: 0.65 },
  ak_galaxy: { body: 0x090818, grip: 0x05040d, metal: 0xffcc55, emissive: 0x9966ff, emissiveIntensity: 0.7, galaxy: true },
  awm_ice: { body: 0xc8eeff, grip: 0x8ab8d8, metal: 0xe8f8ff, emissive: 0xa8e8ff, emissiveIntensity: 0.35 },
  awm_black: { body: 0x1a1a22, grip: 0x0e0e14, metal: 0x333340, metalness: 0.85 },
  m4_carbon: { body: 0x2a2a32, grip: 0x18181e, metal: 0x4a4a55, metalness: 0.88 },
  m4_sakura: { body: 0xff88aa, grip: 0xd86688, metal: 0xffc0d8, emissive: 0xff88aa, emissiveIntensity: 0.12 },
  scar_purple: { body: 0x8844cc, grip: 0x5a2a90, metal: 0xaa66ee, emissive: 0x6622aa, emissiveIntensity: 0.15 },
  scar_galaxy: { body: 0x0b1028, grip: 0x050814, metal: 0x66ddff, emissive: 0x5577ff, emissiveIntensity: 0.7, galaxy: true },
  doze_toxic: { body: 0x2a6628, grip: 0x1a4018, metal: 0x44cc44, emissive: 0x44cc44, emissiveIntensity: 0.4 },
  m4_galaxy: { body: 0x0a1324, grip: 0x050810, metal: 0xbbaaff, emissive: 0x66ccff, emissiveIntensity: 0.72, galaxy: true },
  ump_galaxy: { body: 0x111024, grip: 0x070612, metal: 0xff88dd, emissive: 0xcc66ff, emissiveIntensity: 0.68, galaxy: true },
  awm_galaxy: { body: 0x08061a, grip: 0x04030c, metal: 0x88ccff, emissive: 0x8844ff, emissiveIntensity: 0.8, galaxy: true },
  doze_wood: { body: 0x6b4423, grip: 0x4a2e14, metal: 0x8a5a30 },
  doze_galaxy: { body: 0x12091e, grip: 0x07040d, metal: 0xffaa66, emissive: 0xff66cc, emissiveIntensity: 0.68, galaxy: true },
  glock_pink: { body: 0xcc4488, grip: 0x992266, metal: 0xff88bb, emissive: 0xcc4488, emissiveIntensity: 0.1 },
  glock_galaxy: { body: 0x0b0b20, grip: 0x050510, metal: 0xddddff, emissive: 0x66aaff, emissiveIntensity: 0.65, galaxy: true },
  ump_orange: { body: 0xff6622, grip: 0xcc4400, metal: 0xffaa44, emissive: 0xff6622, emissiveIntensity: 0.08 },
  bazooka_mythic: { body: 0x32204f, grip: 0x12091f, metal: 0x9d6bff, emissive: 0x8b45ff, emissiveIntensity: 0.75 },
  bazooka_galaxy: { body: 0x120727, grip: 0x06030f, metal: 0xffcc66, emissive: 0xaa66ff, emissiveIntensity: 0.85, galaxy: true },
};

const textureCache = new Map();

function makeGalaxyTexture(itemId = "galaxy") {
  if (textureCache.has(itemId)) return textureCache.get(itemId);
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d");
  const grad = ctx.createRadialGradient(40, 40, 8, 64, 64, 90);
  grad.addColorStop(0, "#35206b");
  grad.addColorStop(0.45, "#09091c");
  grad.addColorStop(1, "#020208");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const nebula = [
    ["rgba(120,80,255,0.35)", 28, 60, 42],
    ["rgba(0,220,255,0.22)", 84, 38, 32],
    ["rgba(255,90,190,0.2)", 76, 88, 36],
  ];
  for (const [color, x, y, r] of nebula) {
    const g = ctx.createRadialGradient(x, y, 2, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }

  let seed = 17;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
  for (let i = 0; i < 52; i++) {
    const x = rand() * 128;
    const y = rand() * 128;
    const r = rand() > 0.86 ? 1.5 : 0.8;
    ctx.fillStyle = rand() > 0.7 ? "#ffe9aa" : "#ffffff";
    ctx.globalAlpha = 0.45 + rand() * 0.55;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#ffcc55";
  ctx.beginPath();
  ctx.arc(18, 22, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(120,200,255,0.65)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(92, 92, 15, 5, -0.4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#6fb6ff";
  ctx.beginPath();
  ctx.arc(92, 92, 7, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1.4, 1.1);
  textureCache.set(itemId, tex);
  return tex;
}

function clearSkinFx(group) {
  const old = [];
  group.traverse((o) => {
    if (o.userData?.skinFx) old.push(o);
  });
  for (const o of old) {
    o.parent?.remove(o);
    o.geometry?.dispose?.();
    if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose?.());
    else o.material?.dispose?.();
  }
}

function fxMat(color, opacity = 0.65) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

function addSkinFx(group, item, style) {
  clearSkinFx(group);
  if (!item || item.tier === "comum") return;
  const color = style.emissive || style.metal || style.body;
  const tier = item.tier;

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.006, 6, 28), fxMat(color, tier === "rara" ? 0.28 : 0.45));
  ring.position.set(0, 0.07, -0.08);
  ring.rotation.x = Math.PI / 2;
  ring.userData.skinFx = tier;
  ring.userData.spin = tier === "rara" ? 0.8 : 1.8;
  group.add(ring);

  if (tier === "épica" || tier === "lendária" || tier === "mítica") {
    for (let i = 0; i < 2; i++) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.36), fxMat(color, 0.5));
      strip.position.set(i ? 0.04 : -0.04, 0.075, -0.13);
      strip.userData.skinFx = tier;
      strip.userData.pulse = 1 + i * 0.35;
      group.add(strip);
    }
  }

  if (tier === "lendária" || tier === "mítica") {
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), fxMat(color, 0.75));
    orb.position.set(0, 0.12, -0.28);
    orb.userData.skinFx = tier;
    orb.userData.float = 1;
    group.add(orb);
  }

  if (tier === "mítica") {
    for (let i = 0; i < 3; i++) {
      const ghost = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 8), fxMat(0xbbaaff, 0.45));
      ghost.position.set((i - 1) * 0.06, 0.1 + i * 0.015, -0.2 - i * 0.06);
      ghost.scale.set(1, 1.35, 0.75);
      ghost.userData.skinFx = "mítica";
      ghost.userData.ghost = i;
      group.add(ghost);
    }
  }
  group.userData.skinTier = tier;
  group.userData.skinItemId = item.id;
  group.userData.galaxySkin = !!style.galaxy;
}

export function findWeaponSkinItem(weaponId, color) {
  if (!color) return null;
  return WEAPON_SKINS.find((i) => i.weapon === weaponId && i.color === color) || null;
}

export function getWeaponSkinStyle(weaponId, color, itemId) {
  const item = itemId ? WEAPON_SKINS.find((i) => i.id === itemId) : findWeaponSkinItem(weaponId, color);
  const preset = item ? ITEM_STYLES[item.id] : null;
  const baseColor = color || 0x5c3a1e;

  if (preset) {
    return {
      body: preset.body ?? baseColor,
      grip: preset.grip ?? shiftColor(preset.body ?? baseColor, -0.18),
      metal: preset.metal ?? shiftColor(preset.body ?? baseColor, 0.12),
      dark: preset.dark ?? 0x1a1a20,
      metalness: preset.metalness ?? 0.9,
      emissive: preset.emissive ?? null,
      emissiveIntensity: preset.emissiveIntensity ?? 0,
      galaxy: !!preset.galaxy,
    };
  }

  return {
    body: baseColor,
    grip: shiftColor(baseColor, -0.18),
    metal: shiftColor(baseColor, 0.1),
    dark: 0x1a1a20,
    metalness: 0.9,
    emissive: null,
    emissiveIntensity: 0,
    galaxy: false,
  };
}

export function applyWeaponSkin(group, weaponId, color, itemId) {
  if (!group || !color) return;
  const item = itemId ? WEAPON_SKINS.find((i) => i.id === itemId) : findWeaponSkinItem(weaponId, color);
  const style = getWeaponSkinStyle(weaponId, color, itemId);

  group.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      const part = m.userData?.weaponPart || "body";
      let hex = style.body;
      let metalness = m.metalness ?? 0.5;
      let emissive = null;
      let emissiveIntensity = 0;

      if (part === "metal") {
        hex = style.metal;
        metalness = style.metalness;
        emissive = style.emissive;
        emissiveIntensity = style.emissiveIntensity;
      } else if (part === "grip") {
        hex = style.grip;
        metalness = 0.1;
      } else if (part === "dark") {
        hex = style.dark;
        metalness = 0.5;
      } else {
        hex = style.body;
        metalness = part === "body" ? 0.05 : metalness;
        if (style.emissive && part === "body") {
          emissive = style.emissive;
          emissiveIntensity = style.emissiveIntensity * 0.35;
        }
      }

      if (m.color) m.color.setHex(hex);
      m.metalness = metalness;
      if (style.galaxy && (part === "body" || part === "dark")) {
        m.map = makeGalaxyTexture(item?.id);
        m.roughness = 0.35;
        m.needsUpdate = true;
      } else if (m.map?.isCanvasTexture) {
        m.map = null;
        m.needsUpdate = true;
      }
      if (emissive) {
        m.emissive = new THREE.Color(emissive);
        m.emissiveIntensity = emissiveIntensity;
      } else if (m.emissive) {
        m.emissive.setHex(0x000000);
        m.emissiveIntensity = 0;
      }
    }
  });
  addSkinFx(group, item, style);
}

export function isMythicWeaponSkin(weaponId, color) {
  const item = findWeaponSkinItem(weaponId, color);
  return item?.tier === "mítica";
}

export function applyWeaponSkinsToCharacter(group, skins = {}) {
  if (!group || !skins) return;
  group.traverse((o) => {
    const type = o.userData?.weaponType;
    if (!type) return;
    const color = skins[type];
    if (color) {
      const item = findWeaponSkinItem(type, color);
      applyWeaponSkin(o, type, color, item?.id);
    }
  });
}
