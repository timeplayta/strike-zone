/** Configuração de performance — PC fraco / desenvolvimento */

export const LOW_GRAPHICS = true;

export const MAX_PIXEL_RATIO = LOW_GRAPHICS ? 1 : 1.25;

export const ENABLE_ANTIALIAS = !LOW_GRAPHICS;

export const ENEMY_LABEL_FRAME_SKIP = LOW_GRAPHICS ? 6 : 3;

export const MAX_TEXTURE_ANISO = LOW_GRAPHICS ? 4 : 8;

export const BLOOD_SPRAY_MUL = LOW_GRAPHICS ? 0.45 : 1;
