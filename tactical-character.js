import * as THREE from "three";
import { buildStylizedHuman } from "./stylized-character.js";
import { buildNpcWeapon, attachStylizedWeapon } from "./npc-weapon.js";
import { loadoutToBuildOpts } from "./character-loadout.js";

function attachWeapon(body, weaponType, tint) {
  if (!body.rig?.gunPivot) return;
  const gun = buildNpcWeapon(weaponType, tint);
  const attached = attachStylizedWeapon({ gunPivot: body.rig.gunPivot }, gun, weaponType);
  body.gun = attached.gun;
  body.weaponPivot = attached.pivot;
}

function mapLoadoutToStylized(loadout, team) {
  const opts = loadout ? loadoutToBuildOpts(loadout) : {};
  const isT = team === "t";

  const shirt = opts.shirt ?? (isT ? 0xc42b1e : 0x2266aa);
  const pants = opts.pants ?? (isT ? 0x1a1a22 : 0x1c2233);
  const gloves = opts.gloves ?? (isT ? 0xb32834 : 0x111111);
  const shoes = opts.shoes ?? 0x141418;
  const skin = opts.skin ?? 0xc4956a;

  const helmet = isT ? false : true;
  const helmetColor = isT ? 0x1a1a1a : (opts.helmetColor ?? 0x334466);
  const accessory = isT ? "mask" : null;
  const capColor = opts.capColor ?? 0x3a4a28;

  const faceProfile = isT
    ? {
        headStyle: "mask",
        maskPattern: "skull",
        maskColor: 0x222222,
        maskAccent: 0xdddddd,
        eyeColor: 0x88aacc,
        hairColor: opts.hairColor ?? 0x1a1008,
        kneePads: true,
      }
    : {
        headStyle: "face",
        helmetFace: true,
        eyeColor: 0x88bbff,
        hairColor: opts.hairColor ?? 0x1a1008,
        kneePads: true,
      };

  return {
    shirt,
    pants,
    gloves,
    shoes,
    skin,
    muscular: false,
    helmet,
    helmetColor,
    accessory,
    capColor,
    shirtNeon: opts.shirtNeon ?? null,
    pantsNeon: opts.pantsNeon ?? null,
    glovesNeon: opts.glovesNeon ?? null,
    shoesNeon: opts.shoesNeon ?? null,
    helmetNeon: opts.helmetNeon ?? null,
    backpack: isT,
    backpackColor: 0x3a2818,
    vest: !isT,
    faceProfile,
    withRifle: false,
  };
}

export function buildTacticalCharacter(opts = {}) {
  const {
    team = "ct",
    loadout = null,
    scale = 1,
    weaponType = "ak47",
    withRifle = true,
  } = opts;

  const stylizedOpts = mapLoadoutToStylized(loadout, team);
  const body = buildStylizedHuman(stylizedOpts);

  if (withRifle) {
    attachWeapon(body, weaponType, stylizedOpts.shirt);
  }

  body.group.scale.multiplyScalar(scale);
  body.group.userData.playerAvatar = true;
  body.group.userData.tacticalCharacter = team;
  body.playerModel = true;
  body.weaponType = weaponType;
  return body;
}

export function isTacticalSkin(skinId) {
  return skinId === "ct_tactical" || skinId === "terrorist";
}
