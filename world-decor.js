import * as THREE from "three";
import { createTableSet, buildConnectedCeiling, buildInnerRoom, createDoorMesh, buildBossRoomDecor } from "./furniture.js";
import { buildMapProps } from "./map-props.js";

/** Madeira limpa — porta da sala do chefão */
function oldDoorTexture() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 128;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#6b4423";
  ctx.fillRect(0, 0, 64, 128);
  for (let i = 0; i < 4; i++) {
    const x = i * 16;
    ctx.fillStyle = i % 2 === 0 ? "#7a5030" : "#5c3818";
    ctx.fillRect(x + 1, 0, 14, 128);
    ctx.strokeStyle = "rgba(30,18,8,0.5)";
    ctx.strokeRect(x, 0, 16, 128);
  }
  ctx.fillStyle = "#333338";
  ctx.fillRect(0, 20, 64, 6);
  ctx.fillRect(0, 100, 64, 6);
  ctx.fillStyle = "#c9a227";
  ctx.beginPath();
  ctx.arc(52, 64, 4, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function paintingTexture(hue) {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 48;
  const ctx = c.getContext("2d");
  ctx.fillStyle = `hsl(${hue}, 45%, 75%)`;
  ctx.fillRect(0, 0, 64, 48);
  ctx.strokeStyle = `hsl(${hue}, 60%, 35%)`;
  ctx.strokeRect(4, 4, 56, 40);
  ctx.fillStyle = `hsl(${(hue + 80) % 360}, 55%, 50%)`;
  ctx.beginPath();
  ctx.arc(32, 24, 12, 0, Math.PI * 2);
  ctx.fill();
  return new THREE.CanvasTexture(c);
}

/** Decoração leve — mesmo layout nos 2 mapas */
export function buildWorldDecor(scene, mapData, wallMeshes = []) {
  buildConnectedCeiling(
    scene,
    50 * mapData.scale,
    44 * mapData.scale,
    mapData.ceilingH,
    mapData.ceilColor,
    wallMeshes
  );

  for (const t of mapData.tables) {
    scene.add(createTableSet(t.x, t.z, t.rot, mapData.woodColor));
  }

  const mobile = typeof document !== "undefined" && document.body.classList.contains("mode-mobile");
  const props = (mapData.props || [])
    .filter((p) => !(mobile && p.type === "cold_building"))
    .map((p) => (mobile && p.type === "cold_building" ? { ...p, floors: 2 } : p));
  buildMapProps(scene, props, mapData.propTint);

  // quadros coloridos nas paredes
  const paintings = [
    [-23.92 * mapData.scale, 1.6, -8 * mapData.scale, Math.PI / 2],
    [23.92 * mapData.scale, 1.6, 6 * mapData.scale, -Math.PI / 2],
    [-10 * mapData.scale, 1.5, -20.92 * mapData.scale, 0],
    [10 * mapData.scale, 1.5, 20.92 * mapData.scale, Math.PI],
  ];
  paintings.forEach(([x, y, z, rot], i) => {
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.85, 0.05),
      new THREE.MeshLambertMaterial({ map: paintingTexture(30 + i * 50) })
    );
    frame.position.set(x, y, z);
    frame.rotation.y = rot;
    frame.rotation.z = 0;
    scene.add(frame);
  });

  // entulho espalhado — visual envelhecido
  const rubbleMat = new THREE.MeshLambertMaterial({ color: 0x55504a });
  const rubbleSpots = [[-12, -8], [8, 14], [-15, 10], [18, -12]];
  for (const [rx, rz] of rubbleSpots) {
    for (let i = 0; i < 3; i++) {
      const rock = new THREE.Mesh(
        new THREE.BoxGeometry(0.12 + Math.random() * 0.15, 0.08, 0.1 + Math.random() * 0.12),
        rubbleMat
      );
      rock.position.set(
        rx * mapData.scale + (Math.random() - 0.5) * 0.8,
        0.04,
        rz * mapData.scale + (Math.random() - 0.5) * 0.8
      );
      rock.rotation.y = Math.random() * Math.PI;
      scene.add(rock);
    }
  }
}

export function buildDoorAndInnerRoom(scene, mapData, wallsOut, surfaceMats = null) {
  const wallMat = surfaceMats?.wall || new THREE.MeshStandardMaterial({ color: mapData.accentColor, roughness: 0.85 });
  const floorMat = surfaceMats?.floor || new THREE.MeshStandardMaterial({ color: mapData.floorColor, roughness: 0.9 });
  const ceilMat = surfaceMats?.ceil || new THREE.MeshStandardMaterial({ color: mapData.ceilColor, roughness: 0.92 });

  const room = mapData.innerRoom;
  const innerWalls = buildInnerRoom(scene, room, {
    wall: wallMat,
    floor: floorMat,
    ceil: ceilMat,
  });
  for (const m of innerWalls) {
    wallsOut.push({
      mesh: m,
      box: new THREE.Box3(),
      isInnerWest: !!m.userData.isInnerWest,
    });
  }

  // porta alinhada ao vão da parede oeste da sala (gira junto da parede)
  const gap = room.doorGap || { width: mapData.door.width, centerZ: 0 };
  const gapCenter = gap.centerZ ?? 0;
  const doorMat = new THREE.MeshLambertMaterial({ map: oldDoorTexture() });
  const door = createDoorMesh(
    {
      width: gap.width,
      height: mapData.door.height,
      depth: mapData.door.depth,
      hingeX: room.minX,
      hingeZ: gapCenter - gap.width / 2,
      baseRot: -Math.PI / 2,
    },
    doorMat
  );
  scene.add(door);

  // tapete velho na entrada
  const mat = new THREE.Mesh(
    new THREE.PlaneGeometry(1.8, 1.1),
    new THREE.MeshLambertMaterial({ color: 0x3a2e22 })
  );
  mat.rotation.x = -Math.PI / 2;
  mat.position.set(room.minX - 0.8, 0.015, gapCenter);
  scene.add(mat);

  // interior bonito: tapete, mesa/cadeiras derrubadas, cofre arrombado, luz quente
  buildBossRoomDecor(scene, room, mapData.woodColor);

  return { door, innerWalls };
}
