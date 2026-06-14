/** Catálogo da loja — skins de arma, personagem e peças do boneco */

import { OUTFIT_SETS, SLOT_META, SLOT_PRESETS, DEFAULT_LOADOUT_PRESET_IDS } from "./character-loadout.js";

export const WEAPON_SKINS = [
  { id: "ak_blue", type: "weapon", weapon: "ak47", color: 0x2266cc, price: 45, label: "AK-47 Azul", tier: "comum" },
  { id: "ak_red", type: "weapon", weapon: "ak47", color: 0xcc3322, price: 45, label: "AK-47 Vermelha", tier: "comum" },
  { id: "ak_gold", type: "weapon", weapon: "ak47", color: 0xc9a227, price: 120, label: "AK-47 Dourada", tier: "lendária" },
  { id: "ak_neon", type: "weapon", weapon: "ak47", color: 0x00ffcc, price: 95, label: "AK-47 Neon", tier: "épica" },
  { id: "scar_blue", type: "weapon", weapon: "scar", color: 0x3355aa, price: 55, label: "SCAR Azul", tier: "comum" },
  { id: "scar_green", type: "weapon", weapon: "scar", color: 0x2a6644, price: 55, label: "SCAR Verde", tier: "comum" },
  { id: "scar_purple", type: "weapon", weapon: "scar", color: 0x8844cc, price: 75, label: "SCAR Roxa", tier: "épica" },
  { id: "m4_carbon", type: "weapon", weapon: "m4", color: 0x2a2a32, price: 50, label: "M4 Carbono", tier: "comum" },
  { id: "m4_sakura", type: "weapon", weapon: "m4", color: 0xff88aa, price: 70, label: "M4 Sakura", tier: "épica" },
  { id: "ump_orange", type: "weapon", weapon: "ump45", color: 0xff6622, price: 40, label: "UMP Laranja", tier: "comum" },
  { id: "awm_black", type: "weapon", weapon: "awm", color: 0x1a1a22, price: 90, label: "AWM Preta", tier: "rara" },
  { id: "awm_ice", type: "weapon", weapon: "awm", color: 0xa8e8ff, price: 110, label: "AWM Gelo", tier: "lendária" },
  { id: "doze_wood", type: "weapon", weapon: "doze", color: 0x6b4423, price: 35, label: "Doze Madeira", tier: "comum" },
  { id: "doze_toxic", type: "weapon", weapon: "doze", color: 0x44cc44, price: 55, label: "Doze Tóxica", tier: "épica" },
  { id: "glock_pink", type: "weapon", weapon: "glock", color: 0xcc4488, price: 30, label: "Glock Rosa", tier: "comum" },
];

export const CHARACTER_SKINS = [
  { id: "char_among_red", type: "character", skinId: "among_red", color: 0xff3355, price: 150, label: "Among Us Vermelho", tier: "lendária" },
  { id: "char_among_blue", type: "character", skinId: "among_blue", color: 0x2266ee, price: 150, label: "Among Us Azul", tier: "lendária" },
  { id: "char_among_green", type: "character", skinId: "among_green", color: 0x33aa44, price: 120, label: "Among Us Verde", tier: "épica" },
  { id: "char_among_pink", type: "character", skinId: "among_pink", color: 0xff66aa, price: 120, label: "Among Us Rosa", tier: "épica" },
  { id: "char_among_yellow", type: "character", skinId: "among_yellow", color: 0xffcc22, price: 100, label: "Among Us Amarelo", tier: "rara" },
  { id: "char_among_black", type: "character", skinId: "among_black", color: 0x222228, price: 130, label: "Among Us Preto", tier: "épica" },
  { id: "char_among_white", type: "character", skinId: "among_white", color: 0xf0f0f5, price: 100, label: "Among Us Branco", tier: "rara" },
  { id: "char_among_cyan", type: "character", skinId: "among_cyan", color: 0x22dddd, price: 110, label: "Among Us Ciano", tier: "rara" },
  { id: "char_neon_runner", type: "character", skinId: "neon_runner", color: 0x00ffaa, price: 180, label: "Neon Runner", tier: "lendária" },
  { id: "char_shadow", type: "character", skinId: "shadow", color: 0x1a1028, price: 140, label: "Sombra", tier: "épica" },
  { id: "char_soldier_pro", type: "character", skinId: "soldier", color: 0x8899aa, price: 0, label: "Soldado (padrão)", tier: "grátis" },
];

export const SHOP_OUTFITS = OUTFIT_SETS.map((o) => ({
  id: o.id,
  type: "outfit",
  color: o.color,
  price: o.price,
  label: o.name,
  tier: o.tier,
  loadout: o.loadout,
}));

const LOADOUT_SLOT_PRICE = {
  helmet: 35,
  shirt: 40,
  pants: 38,
  gloves: 25,
  shoes: 30,
};

export const LOADOUT_ITEMS = Object.entries(SLOT_PRESETS).flatMap(([slot, presets]) =>
  presets.map((p) => ({
    id: `loadout_${slot}_${p.id}`,
    type: "loadout",
    slot,
    presetId: p.id,
    color: p.color,
    price: DEFAULT_LOADOUT_PRESET_IDS.includes(p.id) ? 0 : LOADOUT_SLOT_PRICE[slot],
    label: `${SLOT_META[slot].label}: ${p.name}`,
    tier: p.neon ? "épica" : "comum",
    category: SLOT_META[slot].label,
    theme: p.theme,
  }))
);

export const ALL_SHOP_ITEMS = [
  ...WEAPON_SKINS,
  ...CHARACTER_SKINS.filter((i) => i.price > 0),
  ...SHOP_OUTFITS,
  ...LOADOUT_ITEMS,
];

export const WEAPON_IDS = ["ak47", "scar", "m4", "ump45", "awm", "doze", "glock"];

export function getShopItem(id) {
  return WEAPON_SKINS.find((i) => i.id === id) ||
    CHARACTER_SKINS.find((i) => i.id === id) ||
    SHOP_OUTFITS.find((i) => i.id === id) ||
    LOADOUT_ITEMS.find((i) => i.id === id);
}

export function getWeaponLabel(id) {
  const map = {
    ak47: "AK-47",
    scar: "SCAR-H",
    m4: "M4A1",
    ump45: "UMP-45",
    awm: "AWM",
    doze: "Doze",
    glock: "Glock",
  };
  return map[id] || id;
}

/** Node-friendly export for account-db */
export const SHOP_SERVER = Object.fromEntries(
  ALL_SHOP_ITEMS.map((i) => [
    i.id,
    {
      price: i.price,
      weapon: i.weapon,
      color: i.color,
      skinId: i.skinId,
      loadout: i.loadout,
      slot: i.slot,
      presetId: i.presetId,
      type: i.type,
    },
  ])
);
