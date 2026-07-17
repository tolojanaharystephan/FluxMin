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
  ADMIN_MINISTERE = 'admin_ministere',
}

// Permissions prédéfinies
export enum Permission {
  // Courriers
  CREATE_COURRIER = 'create_courrier',
  READ_COURRIER = 'read_courrier',
  UPDATE_COURRIER = 'update_courrier',
  DELETE_COURRIER = 'delete_courrier',
  FORWARD_COURRIER = 'forward_courrier',
  ARCHIVE_COURRIER = 'archive_courrier',

  // Administration
  MANAGE_MINISTERES = 'manage_ministeres',
  MANAGE_DIRECTIONS = 'manage_directions',
  MANAGE_UTILISATEURS = 'manage_utilisateurs',

  // Pilotage
  VIEW_DASHBOARD = 'view_dashboard',
  VIEW_ANALYTICS = 'view_analytics',

  // Audit
  VIEW_AUDIT_LOGS = 'view_audit_logs',

  // IA
  USE_AI_FEATURES = 'use_ai_features',
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
];

// Matrice rôles → permissions
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  [UserRole.SUPER_ADMIN]: Object.values(Permission),
  [UserRole.ADMIN_MINISTERE]: [
    ...OPERATIONAL_PERMISSIONS,
    Permission.MANAGE_DIRECTIONS,
    Permission.MANAGE_UTILISATEURS,
  ],
  [UserRole.AGENT_COURRIER]: [
    Permission.CREATE_COURRIER,
    Permission.READ_COURRIER,
    Permission.UPDATE_COURRIER,
    Permission.FORWARD_COURRIER,
    Permission.ARCHIVE_COURRIER,
    Permission.USE_AI_FEATURES,
    Permission.VIEW_DASHBOARD,
  ],
  [UserRole.RESPONSABLE]: OPERATIONAL_PERMISSIONS,
  [UserRole.RESPONSABLE_DIRECTION]: OPERATIONAL_PERMISSIONS,
  [UserRole.AUDITEUR]: [
    Permission.READ_COURRIER,
    Permission.VIEW_AUDIT_LOGS,
    Permission.VIEW_ANALYTICS,
  ],
};
