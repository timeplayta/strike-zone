import * as THREE from "three";

import { buildNpcWeapon } from "./npc-weapon.js";
import { buildMeleeWorldModel, MELEE_COLORS } from "./melee-weapons.js";
import { WEAPONS } from "./weapons-data.js";
import { upgradeWithBlockbenchModel } from "./blockbench-model-loader.js";

const AMMO_COLORS = {
  ar: 0xffcc55,
  doze: 0xdd5533,
};

function makeRing(color) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.7, 0.86, 20),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.035;
  return ring;
}

function makeAmmoModel(type) {
  const g = new THREE.Group();
  const brass = new THREE.MeshStandardMaterial({ color: 0xd6a44e, roughness: 0.34, metalness: 0.78 });
  const red = new THREE.MeshStandardMaterial({ color: 0x8f1f1f, roughness: 0.5, metalness: 0.15 });
  const boxMat = new THREE.MeshStandardMaterial({ color: type === "doze" ? 0x5c2720 : 0x33412b, roughness: 0.85 });

  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.24, 0.5), boxMat));
  g.children[0].position.y = 0.22;
  const count = type === "doze" ? 6 : 9;
  for (let i = 0; i < count; i++) {
    const shell = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(type === "doze" ? 0.055 : 0.032, type === "doze" ? 0.055 : 0.032, type === "doze" ? 0.34 : 0.26, 8),
      type === "doze" ? red : brass
    );
    body.rotation.z = Math.PI / 2;
    shell.add(body);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(type === "doze" ? 0.058 : 0.034, type === "doze" ? 0.058 : 0.034, 0.045, 8), brass);
    cap.rotation.z = Math.PI / 2;
    cap.position.x = 0.15;
    shell.add(cap);
    shell.position.set(-0.28 + (i % 3) * 0.28, 0.45, -0.16 + Math.floor(i / 3) * 0.15);
    shell.rotation.y = (i % 2 ? 0.25 : -0.2);
    g.add(shell);
  }
  return g;
}

function createLootItem(def) {
  const root = new THREE.Group();
  const itemDef = WEAPONS[def.id];
  const color = def.kind === "ammo" ? AMMO_COLORS[def.ammo] : itemDef?.melee ? (MELEE_COLORS[def.id] || 0xaaccff) : 0x66aaff;

  let model;
  if (def.kind === "ammo") {
    model = makeAmmoModel(def.ammo || "ar");
    model.position.y = 0.22;
    upgradeWithBlockbenchModel(model, def.ammo === "doze" ? "loot_ammo_doze" : "loot_ammo_ar", {
      targetWidth: 1.2,
      targetHeight: 0.9,
    });
  } else if (itemDef?.melee) {
    model = buildMeleeWorldModel(def.id);
    model.position.y = 0.7;
    model.scale.multiplyScalar(def.id === "katana" ? 1.45 : 1.25);
  } else {
    model = buildNpcWeapon(def.id || "ak47", 0x5c3a1e);
    model.scale.setScalar(def.id === "glock" || def.id === "revolver" ? 2.0 : 2.45);
    model.rotation.set(-0.35, Math.PI * 0.25, 0.1);
    model.position.y = 0.78;
  }

  root.add(model);
  root.add(makeRing(color));
  const light = new THREE.PointLight(color, 0.35, 5);
  light.position.y = 1.2;
  root.add(light);

  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 1.6, 1.8),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hit.position.y = 0.8;
  hit.userData.brLootId = def.uid;
  root.add(hit);

  root.userData.spinModel = model;
  root.userData.brLoot = def;
  return { ...def, group: root, hitMesh: hit, collected: false };
}

export function spawnBattleRoyaleLoot(scene, lootList = []) {
  const items = [];
  for (let i = 0; i < lootList.length; i++) {
    const item = createLootItem({ uid: `br-loot-${i}`, ...lootList[i] });
    item.group.position.set(item.x, 0, item.z);
    scene.add(item.group);
    items.push(item);
  }
  return {
    items,
    hitMeshes: items.map((i) => i.hitMesh),
  };
}

export function updateBattleRoyaleLoot(loot) {
  if (!loot?.items) return;
  const t = performance.now() * 0.001;
  for (const item of loot.items) {
    if (item.collected) continue;
    const model = item.group.userData.spinModel;
    if (model) {
      model.rotation.y += 0.018;
      model.position.y += (0.76 + Math.sin(t * 2.4 + item.x) * 0.08 - model.position.y) * 0.12;
    }
    const ring = item.group.children.find((c) => c.geometry?.type === "RingGeometry");
    if (ring?.material) ring.material.opacity = 0.32 + Math.sin(t * 3 + item.z) * 0.14;
  }
}

export function tryPickupBattleRoyaleLoot(camera, loot, dist = 3.2) {
  if (!loot?.items) return null;
  for (const item of loot.items) {
    if (item.collected) continue;
    const d = Math.hypot(camera.position.x - item.x, camera.position.z - item.z);
    if (d < dist) return item;
  }
  return null;
}

export function collectBattleRoyaleLoot(scene, loot, item) {
  item.collected = true;
  scene.remove(item.group);
  if (loot) loot.hitMeshes = loot.items.filter((i) => !i.collected).map((i) => i.hitMesh);
  return item;
}
