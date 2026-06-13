/** Contas administradoras — MJuan / 12345 */

export const ADMIN_ACCOUNTS = {
  mjuan: "12345",
};

export function isAdminCredentials(name, password) {
  const id = (name || "").trim().toLowerCase().replace(/\s+/g, "_");
  return ADMIN_ACCOUNTS[id] === String(password);
}

export function isAdminAccount(account) {
  return !!account?.isAdmin;
}
