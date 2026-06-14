/** UI admin é liberada pelo backend e conferida no cliente pelo usuário atual. */

const ADMIN_EMAIL = "sistemasparasaude@gmail.com";

export function isAdminAccount(account) {
  const name = String(account?.name || "").trim().toLowerCase();
  const email = String(account?.email || "").trim().toLowerCase();
  return !!account?.isAdmin && name === "mjuan" && email === ADMIN_EMAIL;
}
