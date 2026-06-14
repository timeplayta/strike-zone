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
  awm_ice: { body: 0xc8eeff, grip: 0x8ab8d8, metal: 0xe8f8ff, emissive: 0xa8e8ff, emissiveIntensity: 0.35 },
  awm_black: { body: 0x1a1a22, grip: 0x0e0e14, metal: 0x333340, metalness: 0.85 },
  m4_carbon: { body: 0x2a2a32, grip: 0x18181e, metal: 0x4a4a55, metalness: 0.88 },
  m4_sakura: { body: 0xff88aa, grip: 0xd86688, metal: 0xffc0d8, emissive: 0xff88aa, emissiveIntensity: 0.12 },
  scar_purple: { body: 0x8844cc, grip: 0x5a2a90, metal: 0xaa66ee, emissive: 0x6622aa, emissiveIntensity: 0.15 },
  doze_toxic: { body: 0x2a6628, grip: 0x1a4018, metal: 0x44cc44, emissive: 0x44cc44, emissiveIntensity: 0.4 },
  doze_wood: { body: 0x6b4423, grip: 0x4a2e14, metal: 0x8a5a30 },
  glock_pink: { body: 0xcc4488, grip: 0x992266, metal: 0xff88bb, emissive: 0xcc4488, emissiveIntensity: 0.1 },
  ump_orange: { body: 0xff6622, grip: 0xcc4400, metal: 0xffaa44, emissive: 0xff6622, emissiveIntensity: 0.08 },
};

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
  };
}

export function applyWeaponSkin(group, weaponId, color, itemId) {
  if (!group || !color) return;
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
      if (emissive) {
        m.emissive = new THREE.Color(emissive);
        m.emissiveIntensity = emissiveIntensity;
      } else if (m.emissive) {
        m.emissive.setHex(0x000000);
        m.emissiveIntensity = 0;
      }
    }
  });
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
