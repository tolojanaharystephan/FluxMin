import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

// Rôles prédéfinis
export enum UserRole {
  RESPONSABLE = 'responsable',
  RESPONSABLE_DIRECTION = 'responsable_direction',
  AGENT_COURRIER = 'agent_courrier',
  AUDITEUR = 'auditeur',
  SUPER_ADMIN = 'super_admin',
  /** Ex-admin_ministere — un par ministère ; seul à AR/répondre aux posts gouv ciblés */
  DIRECTEUR_MINISTERE = 'directeur_ministere',
  /** Canal officiel État — publie actualités */
  GOUVERNEMENT = 'gouvernement',
}

/** Alias legacy pour migration douce */
export const LEGACY_ADMIN_MINISTERE = 'admin_ministere';

export function normalizeRole(role: string | null | undefined): string {
  if (!role) return '';
  if (role === LEGACY_ADMIN_MINISTERE) return UserRole.DIRECTEUR_MINISTERE;
  return role;
}

// Permissions prédéfinies
export enum Permission {
  CREATE_COURRIER = 'create_courrier',
  READ_COURRIER = 'read_courrier',
  UPDATE_COURRIER = 'update_courrier',
  DELETE_COURRIER = 'delete_courrier',
  FORWARD_COURRIER = 'forward_courrier',
  ARCHIVE_COURRIER = 'archive_courrier',

  MANAGE_MINISTERES = 'manage_ministeres',
  MANAGE_DIRECTIONS = 'manage_directions',
  MANAGE_UTILISATEURS = 'manage_utilisateurs',

  VIEW_DASHBOARD = 'view_dashboard',
  VIEW_ANALYTICS = 'view_analytics',

  VIEW_AUDIT_LOGS = 'view_audit_logs',
  VIEW_SECURITY_LOGS = 'view_security_logs',

  USE_AI_FEATURES = 'use_ai_features',

  MANAGE_PUBLICATIONS_GOUV = 'manage_publications_gouv',
  READ_PUBLICATIONS_GOUV = 'read_publications_gouv',
  REPLY_PUBLICATIONS_GOUV = 'reply_publications_gouv',
}

const OPERATIONAL_PERMISSIONS = [
  Permission.CREATE_COURRIER,
  Permission.READ_COURRIER,
  Permission.UPDATE_COURRIER,
  Permission.FORWARD_COURRIER,
  Permission.ARCHIVE_COURRIER,
  Permission.USE_AI_FEATURES,
  Permission.VIEW_DASHBOARD,
  Permission.VIEW_ANALYTICS,
  Permission.READ_PUBLICATIONS_GOUV,
];

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  [UserRole.SUPER_ADMIN]: Object.values(Permission).filter(
    (p) => p !== Permission.MANAGE_PUBLICATIONS_GOUV && p !== Permission.REPLY_PUBLICATIONS_GOUV,
  ),
  [UserRole.DIRECTEUR_MINISTERE]: [
    ...OPERATIONAL_PERMISSIONS,
    Permission.MANAGE_DIRECTIONS,
    Permission.MANAGE_UTILISATEURS,
    Permission.REPLY_PUBLICATIONS_GOUV,
  ],
  [UserRole.GOUVERNEMENT]: [
    Permission.MANAGE_PUBLICATIONS_GOUV,
    Permission.READ_PUBLICATIONS_GOUV,
    Permission.VIEW_DASHBOARD,
  ],
  [UserRole.AGENT_COURRIER]: [
    Permission.CREATE_COURRIER,
    Permission.READ_COURRIER,
    Permission.UPDATE_COURRIER,
    Permission.FORWARD_COURRIER,
    Permission.ARCHIVE_COURRIER,
    Permission.USE_AI_FEATURES,
    Permission.VIEW_DASHBOARD,
    Permission.READ_PUBLICATIONS_GOUV,
  ],
  [UserRole.RESPONSABLE]: OPERATIONAL_PERMISSIONS,
  [UserRole.RESPONSABLE_DIRECTION]: OPERATIONAL_PERMISSIONS,
  [UserRole.AUDITEUR]: [
    Permission.READ_COURRIER,
    Permission.VIEW_AUDIT_LOGS,
    Permission.VIEW_ANALYTICS,
    Permission.READ_PUBLICATIONS_GOUV,
  ],
  // Compat lecture seed/DB non migrée
  [LEGACY_ADMIN_MINISTERE]: [
    ...OPERATIONAL_PERMISSIONS,
    Permission.MANAGE_DIRECTIONS,
    Permission.MANAGE_UTILISATEURS,
    Permission.REPLY_PUBLICATIONS_GOUV,
  ],
};
