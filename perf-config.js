/** Configuração de performance / qualidade gráfica Three.js */

function detectIsMobile() {
  if (typeof window === "undefined") return false;
  return (
    "ontouchstart" in window &&
    (window.matchMedia("(max-width: 900px)").matches ||
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || ""))
  );
}

/**
 * low     — mobile / PC fraco (estável)
 * balanced — desktop padrão (AA + IBL + pixel ratio 1.35)
 * high    — desktop forte (AA + IBL + sombras suaves + pixel 1.5)
 *
 * Override: ?gfx=low|balanced|high  ou  localStorage strikeGfx
 */
function resolveQuality() {
  let forced = null;
  try {
    const q = new URLSearchParams(location.search).get("gfx");
    if (q === "low" || q === "balanced" || q === "high") forced = q;
    else {
      const saved = localStorage.getItem("strikeGfx");
      if (saved === "low" || saved === "balanced" || saved === "high") forced = saved;
    }
  } catch { /* ignore */ }

  if (forced) return forced;
  if (detectIsMobile()) return "low";
  // Desktop: balanced por padrão (muito melhor que o LOW_GRAPHICS fixo antigo)
  return "balanced";
}

export const GRAPHICS_QUALITY = resolveQuality();

export const LOW_GRAPHICS = GRAPHICS_QUALITY === "low";

export const MAX_PIXEL_RATIO =
  GRAPHICS_QUALITY === "high" ? 1.5 : GRAPHICS_QUALITY === "balanced" ? 1.35 : 1;

export const ENABLE_ANTIALIAS = GRAPHICS_QUALITY !== "low";

export const ENABLE_SHADOWS = GRAPHICS_QUALITY !== "low";

export const ENV_MAP_INTENSITY =
  GRAPHICS_QUALITY === "high" ? 0.62 : GRAPHICS_QUALITY === "balanced" ? 0.48 : 0;

export const ENEMY_LABEL_FRAME_SKIP = LOW_GRAPHICS ? 6 : 3;

export const MAX_TEXTURE_ANISO = LOW_GRAPHICS ? 4 : GRAPHICS_QUALITY === "high" ? 12 : 8;

export const BLOOD_SPRAY_MUL = LOW_GRAPHICS ? 0.45 : GRAPHICS_QUALITY === "high" ? 1.15 : 0.85;

/** Cap de bots no celular (Dust/Cold Storage travam com IA pesada) */
export const MOBILE_MAX_BOTS = 5;

/** Frame-skip de line-of-sight no mobile */
export const MOBILE_LOS_FRAME_SKIP = 4;

/** Preferência GPU */
export function getRendererPowerPreference(isMobile) {
  if (isMobile || GRAPHICS_QUALITY === "low") return "default";
  return GRAPHICS_QUALITY === "high" ? "high-performance" : "default";
}

export function shouldUseHeavyMapTextures(isMobile, mapKey) {
  if (GRAPHICS_QUALITY === "low" && (mapKey === "dust" || mapKey === "warehouse")) return false;
  if (isMobile && (mapKey === "dust" || mapKey === "warehouse")) return false;
  return true;
}

if (typeof console !== "undefined") {
  console.info(`[Strike Zone] Gráficos: ${GRAPHICS_QUALITY} (AA=${ENABLE_ANTIALIAS}, shadows=${ENABLE_SHADOWS})`);
}
