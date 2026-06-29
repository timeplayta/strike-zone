/** Armas premium — só equipáveis após compra na loja */

import { getSavedSession } from "./player-account.js";

export const PREMIUM_WEAPONS = {
  bazooka: { unlockId: "unlock_bazooka", price: 1200, label: "Bazuca" },
  revolver: { unlockId: "unlock_revolver", price: 1200, label: "Revólver Frontier" },
};

export function getAccountForUnlocks() {
  const saved = getSavedSession()?.account;
  if (typeof window !== "undefined" && window.__cachedAccount) return window.__cachedAccount;
  return saved || { purchases: [] };
}

export function isPremiumWeapon(weaponId) {
  return weaponId in PREMIUM_WEAPONS;
}

export function ownsWeapon(accOrWeaponId, weaponIdMaybe) {
  let acc;
  let weaponId;
  if (typeof accOrWeaponId === "string") {
    weaponId = accOrWeaponId;
    acc = getAccountForUnlocks();
  } else {
    acc = accOrWeaponId || getAccountForUnlocks();
    weaponId = weaponIdMaybe;
  }
  if (!isPremiumWeapon(weaponId)) return true;
  const unlockId = PREMIUM_WEAPONS[weaponId].unlockId;
  return (acc?.purchases || []).includes(unlockId);
}

export function getSecondaryWeaponId(acc = getAccountForUnlocks()) {
  return ownsWeapon(acc, "revolver") ? "revolver" : "glock";
}
