import * as THREE from "three";

function noise(ctx, w, h, amount = 8) {
  const img = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * amount;
    img.data[i] = Math.min(255, Math.max(0, img.data[i] + n));
    img.data[i + 1] = Math.min(255, Math.max(0, img.data[i + 1] + n));
    img.data[i + 2] = Math.min(255, Math.max(0, img.data[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);
}

function hexToRgb(hex) {
  return { r: (hex >> 16) & 255, g: (hex >> 8) & 255, b: hex & 255 };
}

/** Piso desértico (dust) / concreto (warehouse) / terra rachada (horror) */
function floorTexture(mapKey, baseColor) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d");
  const { r, g, b } = hexToRgb(baseColor);

  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, 256, 256);

  if (mapKey === "horror" || mapKey === "labyrinth") {
    for (let i = 0; i < 40; i++) {
      ctx.strokeStyle = `rgba(0,0,0,${0.15 + Math.random() * 0.2})`;
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.beginPath();
      let x = Math.random() * 256;
      let y = Math.random() * 256;
      ctx.moveTo(x, y);
      for (let s = 0; s < 4; s++) {
        x += (Math.random() - 0.5) * 60;
        y += (Math.random() - 0.5) * 60;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    for (let i = 0; i < 18; i++) {
      ctx.fillStyle = `rgba(60,10,10,${0.08 + Math.random() * 0.12})`;
      ctx.beginPath();
      ctx.ellipse(Math.random() * 256, Math.random() * 256, 8 + Math.random() * 20, 4 + Math.random() * 10, Math.random(), 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (mapKey === "dust") {
    const tile = 48;
    for (let y = 0; y < 256; y += tile) {
      for (let x = 0; x < 256; x += tile) {
        const shade = ((x + y) / tile) % 2 === 0 ? 6 : -4;
        ctx.fillStyle = `rgb(${Math.min(255, r + shade)},${Math.min(255, g + shade)},${Math.min(255, b + shade)})`;
        ctx.fillRect(x + 1, y + 1, tile - 2, tile - 2);
      }
    }
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = `rgba(180,140,80,${0.04 + Math.random() * 0.06})`;
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 6 + Math.random() * 14, 3 + Math.random() * 6);
    }
  } else {
    const tile = 36;
    for (let y = 0; y < 256; y += tile) {
      for (let x = 0; x < 256; x += tile) {
        const shade = ((x + y) / tile) % 2 === 0 ? 8 : -6;
        ctx.fillStyle = `rgb(${Math.min(255, r + shade)},${Math.min(255, g + shade)},${Math.min(255, b + shade)})`;
        ctx.fillRect(x + 2, y + 2, tile - 4, tile - 4);
        ctx.strokeStyle = "rgba(15,20,28,0.45)";
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 0.5, y + 0.5, tile - 1, tile - 1);
      }
    }
  }

  noise(ctx, 256, 256, mapKey === "horror" ? 10 : 5);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(mapKey === "horror" ? 8 : 10, mapKey === "horror" ? 7 : 8);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Paredes — adobe (deserto) / metal (armazém) / concreto manchado (terror) */
function wallTexture(mapKey, baseColor) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d");
  const { r, g, b } = hexToRgb(baseColor);

  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, 256, 256);

  if (mapKey === "horror" || mapKey === "labyrinth") {
    for (let y = 0; y < 256; y += 28) {
      const shade = y % 56 === 0 ? 6 : -8;
      ctx.fillStyle = `rgb(${Math.max(0, r + shade)},${Math.max(0, g + shade)},${Math.max(0, b + shade)})`;
      ctx.fillRect(0, y, 256, 26);
    }
    for (let i = 0; i < 35; i++) {
      ctx.fillStyle = `rgba(80,8,8,${0.06 + Math.random() * 0.14})`;
      ctx.beginPath();
      ctx.ellipse(Math.random() * 256, Math.random() * 256, 4 + Math.random() * 18, 6 + Math.random() * 22, Math.random(), 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 20; i++) {
      ctx.fillStyle = `rgba(0,0,0,${0.05 + Math.random() * 0.1})`;
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 10 + Math.random() * 30, 4 + Math.random() * 12);
    }
  } else if (mapKey === "dust") {
    const bw = 64;
    const bh = 28;
    for (let row = 0; row < 10; row++) {
      const off = (row % 2) * (bw / 2);
      for (let col = -1; col < 5; col++) {
        const x = col * bw + off;
        const y = row * bh;
        const shade = (row + col) % 2 === 0 ? 12 : -8;
        ctx.fillStyle = `rgb(${Math.min(255, r + shade)},${Math.min(255, g + shade - 4)},${Math.min(255, b + shade - 8)})`;
        ctx.fillRect(x + 2, y + 2, bw - 4, bh - 4);
        ctx.strokeStyle = "rgba(90,60,30,0.5)";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, bw, bh);
      }
    }
  } else {
    for (let y = 0; y < 256; y += 24) {
      const shade = y % 48 === 0 ? 12 : -10;
      ctx.fillStyle = `rgb(${Math.min(255, r + shade)},${Math.min(255, g + shade)},${Math.min(255, b + shade)})`;
      ctx.fillRect(0, y, 256, 22);
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fillRect(0, y + 2, 256, 2);
      ctx.fillStyle = "rgba(0,0,0,0.1)";
      ctx.fillRect(0, y + 20, 256, 2);
    }
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    for (let x = 0; x < 256; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 256);
      ctx.stroke();
    }
  }

  noise(ctx, 256, 256, mapKey === "horror" ? 12 : 7);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function accentTexture(baseColor, mapKey) {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext("2d");
  const { r, g, b } = hexToRgb(baseColor);
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, 64, 64);
  ctx.strokeStyle = mapKey === "horror" ? "rgba(80,20,20,0.35)" : "rgba(0,0,0,0.3)";
  for (let i = 0; i < 64; i += 8) {
    ctx.strokeRect(i, 0, 8, 64);
    ctx.strokeRect(0, i, 64, 8);
  }
  noise(ctx, 64, 64, 4);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1.5, 1.5);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createMapMaterials(mapData, mapKey) {
  const floorMap = floorTexture(mapKey, mapData.floorColor);
  const wallMap = wallTexture(mapKey, mapData.wallColor);
  const accentMap = accentTexture(mapData.accentColor, mapKey);

  const floorMat = new THREE.MeshStandardMaterial({
    map: floorMap,
    roughness: mapKey === "horror" ? 0.95 : 0.85,
    metalness: 0.02,
  });

  const wallMat = new THREE.MeshStandardMaterial({
    map: wallMap,
    roughness: mapKey === "horror" ? 0.92 : 0.8,
    metalness: mapKey === "warehouse" ? 0.12 : 0.03,
  });

  const accentMat = new THREE.MeshStandardMaterial({
    map: accentMap,
    roughness: 0.85,
    metalness: 0.05,
  });

  return { floorMat, wallMat, accentMat, floorMap, wallMap };
}

export function addWallBaseboard(scene, x, z, w, d, h, mapKey) {
  const color = mapKey === "horror" ? 0x0a0808 : mapKey === "labyrinth" ? 0x060504 : mapKey === "dust" ? 0x5a4530 : 0x3a4248;
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
  const board = new THREE.Mesh(new THREE.BoxGeometry(w + 0.06, 0.14, d + 0.06), mat);
  board.position.set(x, 0.07, z);
  scene.add(board);
}
