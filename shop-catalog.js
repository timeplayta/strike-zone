/** Catálogo da loja — skins de arma, personagem e peças do boneco */

import { OUTFIT_SETS, SLOT_META, SLOT_PRESETS, DEFAULT_LOADOUT_PRESET_IDS } from "./character-loadout.js";

export const WEAPON_SKINS = [
  { id: "ak_blue", type: "weapon", weapon: "ak47", color: 0x2266cc, price: 80, label: "AK-47 Azul", tier: "comum" },
  { id: "ak_red", type: "weapon", weapon: "ak47", color: 0xcc3322, price: 95, label: "AK-47 Vermelha", tier: "comum" },
  { id: "ak_gold", type: "weapon", weapon: "ak47", color: 0xc9a227, price: 720, label: "AK-47 Dourada", tier: "lendária" },
  { id: "ak_neon", type: "weapon", weapon: "ak47", color: 0x00ffcc, price: 320, label: "AK-47 Neon", tier: "épica" },
  { id: "ak_shadow", type: "weapon", weapon: "ak47", color: 0x1b1028, price: 1200, label: "AK-47 Sombria", tier: "mítica" },
  { id: "ak_galaxy", type: "weapon", weapon: "ak47", color: 0x090818, price: 1450, label: "AK-47 Galáxia", tier: "mítica", cosmic: "sun" },
  { id: "scar_blue", type: "weapon", weapon: "scar", color: 0x3355aa, price: 90, label: "SCAR Azul", tier: "comum" },
  { id: "scar_green", type: "weapon", weapon: "scar", color: 0x2a6644, price: 140, label: "SCAR Verde", tier: "rara" },
  { id: "scar_purple", type: "weapon", weapon: "scar", color: 0x8844cc, price: 310, label: "SCAR Roxa", tier: "épica" },
  { id: "scar_galaxy", type: "weapon", weapon: "scar", color: 0x0b1028, price: 1350, label: "SCAR Galáxia", tier: "mítica", cosmic: "planet" },
  { id: "m4_carbon", type: "weapon", weapon: "m4", color: 0x2a2a32, price: 160, label: "M4 Carbono", tier: "rara" },
  { id: "m4_sakura", type: "weapon", weapon: "m4", color: 0xff88aa, price: 340, label: "M4 Sakura", tier: "épica" },
  { id: "m4_galaxy", type: "weapon", weapon: "m4", color: 0x0a1324, price: 1400, label: "M4 Galáxia", tier: "mítica", cosmic: "satellite" },
  { id: "ump_orange", type: "weapon", weapon: "ump45", color: 0xff6622, price: 70, label: "UMP Laranja", tier: "comum" },
  { id: "ump_galaxy", type: "weapon", weapon: "ump45", color: 0x111024, price: 1150, label: "UMP Galáxia", tier: "mítica", cosmic: "comet" },
  { id: "awm_black", type: "weapon", weapon: "awm", color: 0x1a1a22, price: 180, label: "AWM Preta", tier: "rara" },
  { id: "awm_ice", type: "weapon", weapon: "awm", color: 0xa8e8ff, price: 850, label: "AWM Gelo", tier: "lendária" },
  { id: "awm_galaxy", type: "weapon", weapon: "awm", color: 0x08061a, price: 1800, label: "AWM Galáxia", tier: "mítica", cosmic: "galaxy" },
  { id: "doze_wood", type: "weapon", weapon: "doze", color: 0x6b4423, price: 65, label: "Doze Madeira", tier: "comum" },
  { id: "doze_toxic", type: "weapon", weapon: "doze", color: 0x44cc44, price: 280, label: "Doze Tóxica", tier: "épica" },
  { id: "doze_galaxy", type: "weapon", weapon: "doze", color: 0x12091e, price: 1250, label: "Doze Galáxia", tier: "mítica", cosmic: "asteroid" },
  { id: "glock_pink", type: "weapon", weapon: "glock", color: 0xcc4488, price: 55, label: "Glock Rosa", tier: "comum" },
  { id: "glock_galaxy", type: "weapon", weapon: "glock", color: 0x0b0b20, price: 1050, label: "Glock Galáxia", tier: "mítica", cosmic: "moon" },
  { id: "revolver_gold", type: "weapon", weapon: "revolver", color: 0xd6a44e, price: 180, label: "Revólver Dourado", tier: "rara" },
  { id: "revolver_outlaw", type: "weapon", weapon: "revolver", color: 0x6b2a1d, price: 260, label: "Revólver Fora-da-lei", tier: "épica" },
  { id: "bazooka_mythic", type: "weapon", weapon: "bazooka", color: 0x8b45ff, price: 1000, label: "Bazuca Mítica", tier: "mítica" },
  { id: "bazooka_galaxy", type: "weapon", weapon: "bazooka", color: 0x120727, price: 2200, label: "Bazuca Galáxia", tier: "mítica", cosmic: "blackhole" },
];

const COSMIC_SKIN_NAMES = {
  ak47: "AK-47",
  scar: "SCAR-H",
  m4: "M4A1",
  ump45: "UMP-45",
  awm: "AWM",
  doze: "Doze",
  bazooka: "Bazuca",
  glock: "Glock",
  revolver: "Revólver",
};

for (const [weapon, label] of Object.entries(COSMIC_SKIN_NAMES)) {
  WEAPON_SKINS.push(
    {
      id: `${weapon}_universo`,
      type: "weapon",
      weapon,
      color: 0x090a2f,
      price: weapon === "bazooka" || weapon === "awm" ? 2400 : 1500,
      label: `${label} Universo Vivo`,
      tier: "mítica",
      cosmic: "galaxy",
    },
    {
      id: `${weapon}_sistema_solar`,
      type: "weapon",
      weapon,
      color: 0xff8a22,
      price: weapon === "bazooka" || weapon === "awm" ? 2200 : 1350,
      label: `${label} Sistema Solar`,
      tier: "lendária",
      cosmic: "sun",
    }
  );
}

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
  { id: "char_trevas_horror", type: "character", skinId: "trevas_horror", color: 0x14091f, price: 1200, label: "Caçador das Trevas", tier: "mítica" },
  { id: "char_cowboy_sheriff", type: "character", skinId: "cowboy_sheriff", color: 0xb87834, price: 240, label: "Sheriff Frontier", tier: "épica" },
  { id: "char_cowboy_outlaw", type: "character", skinId: "cowboy_outlaw", color: 0x6b2a1d, price: 260, label: "Fora-da-lei", tier: "épica" },
  { id: "char_cowboy_vaqueiro", type: "character", skinId: "cowboy_vaqueiro", color: 0x2c5f78, price: 220, label: "Vaqueiro Nômade", tier: "rara" },
  { id: "char_birthday", type: "character", skinId: "birthday_hero", color: 0xffcc44, price: 0, label: "Aniversariante", tier: "presente" },
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

export const WEAPON_IDS = ["ak47", "scar", "m4", "ump45", "awm", "doze", "bazooka", "glock", "revolver"];

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
    bazooka: "Bazuca",
    glock: "Glock",
    revolver: "Revólver",
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
