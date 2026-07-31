/** Textura pintável estilo pixel art — pincel casa a casa no modelo 3D */

import * as THREE from "three";

const TEX_SIZE = 64;

export function createPaintableSkin(baseHex = 0xf2f2f2) {
  const canvas = document.createElement("canvas");
  canvas.width = TEX_SIZE;
  canvas.height = TEX_SIZE;
  const ctx = canvas.getContext("2d");
  const base = new THREE.Color(baseHex);
  ctx.fillStyle = `#${base.getHexString()}`;
  ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;

  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.78,
    metalness: 0.03,
  });

  function paintUV(u, v, colorHex, radius = 1) {
    const c = new THREE.Color(colorHex);
    ctx.fillStyle = `#${c.getHexString()}`;
    const px = Math.floor(u * TEX_SIZE);
    const py = Math.floor((1 - v) * TEX_SIZE);
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy > radius * radius + 0.3) continue;
        const x = px + dx;
        const y = py + dy;
        if (x < 0 || y < 0 || x >= TEX_SIZE || y >= TEX_SIZE) continue;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    texture.needsUpdate = true;
  }

  function averageColor() {
    const data = ctx.getImageData(0, 0, TEX_SIZE, TEX_SIZE).data;
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 8) continue;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      n++;
    }
    if (!n) return new THREE.Color(baseHex);
    return new THREE.Color(r / n / 255, g / n / 255, b / n / 255);
  }

  return { material, canvas, ctx, texture, paintUV, averageColor };
}

/**
 * Pincel 3D: arrastar no canvas pinta o bichinho pixel a pixel (cor = pincel, não preenche tudo).
 */
export function attachPixelPaintBrush(canvas, {
  camera,
  getTargets,
  getBrushColor,
  isActive,
  onPaint,
} = {}) {
  if (!canvas || canvas.__pixelPaintBound) return () => {};
  canvas.__pixelPaintBound = true;

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let painting = false;

  function paintAtEvent(e) {
    if (!isActive?.()) return;
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const targets = getTargets?.() || [];
    const hits = raycaster.intersectObjects(targets, true);
    if (!hits.length) return;
    const hit = hits[0];
    if (!hit.uv) return;
    const paintable = hit.object.userData?.paintable;
    if (!paintable) return;
    paintable.paintUV(hit.uv.x, hit.uv.y, getBrushColor?.() ?? 0xffffff, 1);
    onPaint?.(paintable.averageColor());
  }

  const onDown = (e) => {
    if (!isActive?.()) return;
    if (e.button !== 0) return;
    painting = true;
    canvas.setPointerCapture?.(e.pointerId);
    paintAtEvent(e);
    e.preventDefault();
  };
  const onMove = (e) => {
    if (!painting) return;
    paintAtEvent(e);
    e.preventDefault();
  };
  const stop = () => {
    painting = false;
  };

  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", stop);
  canvas.addEventListener("pointerleave", stop);
  canvas.addEventListener("pointercancel", stop);

  return () => {
    canvas.removeEventListener("pointerdown", onDown);
    canvas.removeEventListener("pointermove", onMove);
    canvas.removeEventListener("pointerup", stop);
    canvas.removeEventListener("pointerleave", stop);
    canvas.removeEventListener("pointercancel", stop);
    canvas.__pixelPaintBound = false;
  };
}
