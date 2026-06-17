/** Catálogo de peças — estilos neon e tático */

export const SLOT_ORDER = ["helmet", "shirt", "pants", "gloves", "shoes"];

export const SLOT_META = {
  helmet: { label: "Capacete", icon: "⛑", step: 1 },
  shirt: { label: "Camisa / Blusa", icon: "👕", step: 2 },
  pants: { label: "Calça", icon: "👖", step: 3 },
  gloves: { label: "Luvas", icon: "🧤", step: 4 },
  shoes: { label: "Tênis / Botas", icon: "👟", step: 5 },
};

export const OUTFIT_META = { label: "Conjuntos", icon: "🎽", step: 0 };

export const AVATAR_ICONS = [
  { id: "dog", label: "Cachorro", emoji: "🐕" },
  { id: "cat", label: "Gato", emoji: "🐈" },
  { id: "soldier", label: "Meu personagem", emoji: "🎖" },
  { id: "enemy", label: "Inimigo", emoji: "☠" },
];

const PRESET = (id, name, color, style, theme, neon = false) => ({
  id,
  name,
  color,
  style,
  theme,
  neon,
});

export const SLOT_PRESETS = {
  helmet: [
    PRESET("ff_helmet_blue", "Tático Azul", 0x2a4a7a, "helmet", "ff"),
    PRESET("ff_helmet_black", "Operador Preto", 0x1a1a22, "helmet", "ff"),
    PRESET("a8_helmet_neon", "Neon Cyan", 0x00eeff, "helmet", "a8", true),
    PRESET("a8_helmet_fire", "Neon Laranja", 0xff6600, "helmet", "a8", true),
    PRESET("ff_cap_olive", "Boné Oliva", 0x3a4a28, "cap", "ff"),
    PRESET("ff_cap_red", "Boné Vermelho", 0x992222, "cap", "ff"),
    PRESET("ff_mask_skull", "Máscara Caveira", 0x222222, "mask", "ff"),
    PRESET("a8_helmet_pink", "Neon Rosa", 0xff44aa, "helmet", "a8", true),
    PRESET("ff_cap_starter", "Boné Inicial", 0x2b3448, "cap", "starter"),
    PRESET("ff_bandana_red", "Bandana Vermelha", 0xcc2233, "bandana", "starter"),
    PRESET("ff_visor_gold", "Óculos Dourado", 0xffcc55, "glasses", "starter"),
    PRESET("ff_hood_black", "Capuz Preto", 0x171923, "helmet", "starter"),
    PRESET("ff_mask_future", "Máscara Futuro", 0x384b68, "mask", "starter"),
  ],
  shirt: [
    PRESET("ff_ct_blue", "CT Azul", 0x2266aa, "combat", "ff"),
    PRESET("ff_desert", "Deserto", 0xc9a227, "combat", "ff"),
    PRESET("a8_neon_blue", "Neon Azul", 0x0088ff, "racing", "a8", true),
    PRESET("a8_neon_red", "Neon Vermelho", 0xff2244, "racing", "a8", true),
    PRESET("ff_urban_gray", "Urbano", 0x4a4a52, "combat", "ff"),
    PRESET("a8_neon_green", "Neon Verde", 0x22ff88, "racing", "a8", true),
    PRESET("ff_camo", "Camuflado", 0x3a4a2a, "combat", "ff"),
    PRESET("a8_chrome", "Chrome", 0xccccdd, "racing", "a8", true),
    PRESET("ff_starter_jacket", "Jaqueta Inicial", 0x2f5f8f, "jacket", "starter"),
    PRESET("ff_striker_red", "Striker Vermelho", 0x9b2030, "combat", "starter"),
    PRESET("ff_street_orange", "Street Laranja", 0xd96a24, "jacket", "starter"),
    PRESET("ff_tech_white", "Tech Branco", 0xd8dde6, "racing", "starter", true),
    PRESET("ff_night_blue", "Noite Azul", 0x111d3d, "combat", "starter"),
  ],
  pants: [
    PRESET("ff_black_ops", "Black Ops", 0x1a1a22, "cargo", "ff"),
    PRESET("ff_navy", "Marinho", 0x1c2233, "cargo", "ff"),
    PRESET("a8_neon_purple", "Neon Roxo", 0xaa44ff, "racing", "a8", true),
    PRESET("ff_khaki", "Caqui", 0x3d2817, "cargo", "ff"),
    PRESET("a8_neon_yellow", "Neon Amarelo", 0xffdd00, "racing", "a8", true),
    PRESET("ff_urban", "Urbano Escuro", 0x252530, "cargo", "ff"),
    PRESET("ff_jogger_black", "Jogger Preto", 0x151820, "jogger", "starter"),
    PRESET("ff_jogger_blue", "Jogger Azul", 0x203a68, "jogger", "starter"),
    PRESET("ff_tactical_red", "Tática Vermelha", 0x5b1720, "cargo", "starter"),
    PRESET("ff_runner_white", "Runner Branco", 0xcfd6df, "racing", "starter", true),
    PRESET("ff_denim", "Jeans Escuro", 0x263a55, "jogger", "starter"),
  ],
  gloves: [
    PRESET("ff_black", "Táticas Pretas", 0x111111, "tactical", "ff"),
    PRESET("ff_tan", "Couro Tan", 0x6b5030, "tactical", "ff"),
    PRESET("a8_neon_white", "Neon Branco", 0xeeffff, "racing", "a8", true),
    PRESET("a8_neon_red", "Neon Vermelho", 0xff3355, "racing", "a8", true),
    PRESET("ff_green", "Oliva", 0x2a3a22, "tactical", "ff"),
    PRESET("a8_chrome", "Chrome", 0xb0b8c8, "racing", "a8", true),
    PRESET("ff_fingerless", "Sem Dedos", 0x1f2026, "fingerless", "starter"),
    PRESET("ff_wrap_red", "Faixas Vermelhas", 0xb32834, "wraps", "starter"),
    PRESET("ff_white_ops", "Operação Branca", 0xdfe6ee, "tactical", "starter"),
    PRESET("ff_cyber_cyan", "Cyber Cyan", 0x28d7ff, "racing", "starter", true),
    PRESET("ff_gold_knuckle", "Nó Dourado", 0xc89a2b, "tactical", "starter"),
  ],
  shoes: [
    PRESET("ff_boot_black", "Botas Pretas", 0x141418, "boot", "ff"),
    PRESET("ff_boot_brown", "Botas Marrom", 0x3d2810, "boot", "ff"),
    PRESET("a8_sneaker_red", "Tênis Neon", 0xff2244, "sneaker", "a8", true),
    PRESET("a8_sneaker_cyan", "Tênis Cyan", 0x00ccff, "sneaker", "a8", true),
    PRESET("ff_combat", "Combate", 0x222228, "boot", "ff"),
    PRESET("a8_sneaker_lime", "Tênis Lima", 0x88ff22, "sneaker", "a8", true),
    PRESET("ff_runner_black", "Runner Preto", 0x10131b, "sneaker", "starter"),
    PRESET("ff_runner_red", "Runner Vermelho", 0xc62235, "sneaker", "starter"),
    PRESET("ff_hightop_white", "Cano Alto Branco", 0xe5e9ef, "sneaker", "starter"),
    PRESET("ff_boot_tactical", "Bota Tática", 0x202633, "boot", "starter"),
    PRESET("ff_neon_gold", "Neon Dourado", 0xffc447, "sneaker", "starter", true),
  ],
};

export const DEFAULT_LOADOUT = {
  skin: 0xc4956a,
  helmet: { presetId: "ff_helmet_blue", color: 0x2a4a7a, style: "helmet", neon: false },
  shirt: { presetId: "ff_ct_blue", color: 0x2266aa, style: "combat", neon: false },
  pants: { presetId: "ff_black_ops", color: 0x1a1a22, style: "cargo", neon: false },
  gloves: { presetId: "ff_black", color: 0x111111, style: "tactical", neon: false },
  shoes: { presetId: "ff_boot_black", color: 0x141418, style: "boot", neon: false },
};

export const DEFAULT_LOADOUT_PRESET_IDS = SLOT_ORDER.map((slot) => DEFAULT_LOADOUT[slot].presetId);

export const OUTFIT_SETS = [
  {
    id: "outfit_ct_elite",
    name: "Conjunto CT Elite",
    price: 85,
    tier: "rara",
    color: 0x2266aa,
    loadout: {
      helmet: "ff_helmet_blue",
      shirt: "ff_ct_blue",
      pants: "ff_navy",
      gloves: "ff_black",
      shoes: "ff_combat",
    },
  },
  {
    id: "outfit_black_ops",
    name: "Conjunto Black Ops",
    price: 120,
    tier: "épica",
    color: 0x1a1a22,
    loadout: {
      helmet: "ff_helmet_black",
      shirt: "ff_urban_gray",
      pants: "ff_black_ops",
      gloves: "ff_black",
      shoes: "ff_boot_black",
    },
  },
  {
    id: "outfit_desert_raider",
    name: "Conjunto Deserto",
    price: 95,
    tier: "rara",
    color: 0xc9a227,
    loadout: {
      helmet: "ff_cap_olive",
      shirt: "ff_desert",
      pants: "ff_khaki",
      gloves: "ff_tan",
      shoes: "ff_boot_brown",
    },
  },
  {
    id: "outfit_neon_cyan",
    name: "Conjunto Neon Cyan",
    price: 150,
    tier: "lendária",
    color: 0x00eeff,
    loadout: {
      helmet: "a8_helmet_neon",
      shirt: "a8_neon_blue",
      pants: "a8_neon_purple",
      gloves: "a8_neon_white",
      shoes: "a8_sneaker_cyan",
    },
  },
];

export function findPreset(slot, presetId) {
  return SLOT_PRESETS[slot]?.find((p) => p.id === presetId) || null;
}

export function normalizeLoadout(raw) {
  const out = JSON.parse(JSON.stringify(DEFAULT_LOADOUT));
  if (!raw || typeof raw !== "object") return out;
  if (raw.skin) out.skin = raw.skin;
  for (const slot of SLOT_ORDER) {
    if (!raw[slot]) continue;
    out[slot] = { ...out[slot], ...raw[slot] };
    const preset = findPreset(slot, out[slot].presetId);
    if (preset) {
      out[slot].color = out[slot].color ?? preset.color;
      out[slot].style = out[slot].style ?? preset.style;
      out[slot].neon = out[slot].neon ?? preset.neon;
    }
  }
  return out;
}

export function loadoutToBuildOpts(loadout) {
  const L = normalizeLoadout(loadout);
  const h = L.helmet;
  const useHelmet = h.style === "helmet" || h.style === "tactical";
  const useCap = h.style === "cap";
  const useMask = h.style === "mask";
  const useBandana = h.style === "bandana";
  const useGlasses = h.style === "glasses";

  return {
    shirt: L.shirt.color,
    pants: L.pants.color,
    gloves: L.gloves.color,
    shoes: L.shoes.color,
    skin: L.skin,
    helmet: useHelmet,
    helmetColor: h.color,
    capColor: h.color,
    accessory: useCap ? "cap" : useMask ? "mask" : useBandana ? "bandana" : useGlasses ? "glasses" : null,
    faceProfile: {
      headStyle: useMask ? "mask" : useBandana ? "bandana" : useGlasses ? "glasses" : useCap ? "cap" : "face",
      maskPattern: useMask ? "skull" : useBandana ? "stripe" : undefined,
      maskColor: h.color,
      maskAccent: h.neon ? h.color : 0xcc2233,
      helmetFace: useHelmet,
      eyeColor: 0xaaccff,
    },
    shirtNeon: L.shirt.neon ? L.shirt.color : null,
    pantsNeon: L.pants.neon ? L.pants.color : null,
    glovesNeon: L.gloves.neon ? L.gloves.color : null,
    shoesNeon: L.shoes.neon ? L.shoes.color : null,
    helmetNeon: h.neon ? h.color : null,
    withRifle: true,
    team: "ct",
  };
}

export function applyPresetToLoadout(loadout, slot, presetId) {
  const preset = findPreset(slot, presetId);
  if (!preset) return loadout;
  const next = normalizeLoadout(loadout);
  next[slot] = {
    presetId: preset.id,
    color: preset.color,
    style: preset.style,
    neon: !!preset.neon,
  };
  return next;
}

export function applyOutfitToLoadout(loadout, outfitId) {
  const outfit = OUTFIT_SETS.find((o) => o.id === outfitId);
  if (!outfit) return normalizeLoadout(loadout);
  let next = normalizeLoadout(loadout);
  for (const [slot, presetId] of Object.entries(outfit.loadout || {})) {
    next = applyPresetToLoadout(next, slot, presetId);
  }
  next.outfitId = outfit.id;
  return next;
}
