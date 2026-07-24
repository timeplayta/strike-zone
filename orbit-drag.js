/** Arrastar com o mouse/dedo sobre um canvas para girar um pivot 3D (visualização de armas/personagem) */

export function attachOrbitDrag(canvas, getPivot, onDragStart) {
  if (!canvas || canvas.__orbitDragBound) return;
  canvas.__orbitDragBound = true;

  let dragging = false;
  let lastX = 0;

  canvas.style.cursor = "grab";
  canvas.style.touchAction = "none";

  canvas.addEventListener("pointerdown", (e) => {
    dragging = true;
    lastX = e.clientX;
    canvas.style.cursor = "grabbing";
    canvas.setPointerCapture?.(e.pointerId);
    onDragStart?.();
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const pivot = getPivot();
    if (pivot) {
      const dx = e.clientX - lastX;
      pivot.rotation.y += dx * 0.012;
    }
    lastX = e.clientX;
  });

  const stop = () => {
    dragging = false;
    canvas.style.cursor = "grab";
  };
  canvas.addEventListener("pointerup", stop);
  canvas.addEventListener("pointerleave", stop);
  canvas.addEventListener("pointercancel", stop);
}
