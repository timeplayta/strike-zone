/** Configuração de performance — PC fraco / mobile */

export const LOW_GRAPHICS = true;

export const MAX_PIXEL_RATIO = LOW_GRAPHICS ? 1 : 1.25;

export const ENABLE_ANTIALIAS = !LOW_GRAPHICS;

export const ENEMY_LABEL_FRAME_SKIP = LOW_GRAPHICS ? 6 : 3;

export const MAX_TEXTURE_ANISO = LOW_GRAPHICS ? 4 : 8;

export const BLOOD_SPRAY_MUL = LOW_GRAPHICS ? 0.45 : 1;

/** Cap de bots no celular (Dust/Cold Storage travam com IA pesada) */
export const MOBILE_MAX_BOTS = 5;

/** Frame-skip de line-of-sight no mobile */
export const MOBILE_LOS_FRAME_SKIP = 4;

/** Preferência GPU: low-power no mobile causa thermal throttle / freeze */
export function getRendererPowerPreference(isMobile) {
  if (isMobile) return "default";
  return LOW_GRAPHICS ? "low-power" : "high-performance";
}

export function shouldUseHeavyMapTextures(isMobile, mapKey) {
  if (isMobile && (mapKey === "dust" || mapKey === "warehouse")) return false;
  return true;
}
