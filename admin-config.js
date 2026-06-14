/** UI admin é liberada pelo backend via account.isAdmin. */

export function isAdminAccount(account) {
  return !!account?.isAdmin;
}
