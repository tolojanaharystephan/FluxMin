/** Page d'accueil selon le rôle — évite les boucles RBAC (ex. auditeur dashboard ↔ inbox). */
export function getDefaultHomePath(role?: string | null): string {
  switch (role) {
    case "auditeur":
      return "/audit/search";
    case "super_admin":
    case "admin_ministere":
    case "responsable":
    case "responsable_direction":
    case "agent_courrier":
      return "/dashboard";
    default:
      return "/inbox";
  }
}
