/** Contas administradoras — MJuan / 123456 */

export const ADMIN_ACCOUNTS = {
  mjuan: "123456",
};

export function isAdminCredentials(name, password) {
  const id = (name || "").trim().toLowerCase().replace(/\s+/g, "_");
  return ADMIN_ACCOUNTS[id] === String(password);
}

export function isAdminAccount(account) {
  return !!account?.isAdmin;
}
