import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  ROLES_KEY,
  PERMISSIONS_KEY,
  ROLE_PERMISSIONS,
  normalizeRole,
} from '../types/roles';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Si la route est marquée @Public(), ne rien vérifier
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }

    const userRole = normalizeRole(user.role);

    // Vérification des rôles
    if (requiredRoles && requiredRoles.length > 0) {
      const hasRole = requiredRoles.some(
        (role) => userRole === normalizeRole(role) || user.role === role,
      );
      if (!hasRole) {
        throw new ForbiddenException(
          `Accès refusé. Rôle requis: ${requiredRoles.join(', ')}`,
        );
      }
    }

    // Vérification des permissions
    if (requiredPermissions && requiredPermissions.length > 0) {
      const userPermissions = ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS[user.role] || [];
      const customPermissions = user.permissions
        ? Object.keys(user.permissions).filter((k) => user.permissions[k] === true)
        : [];
      const allPermissions = [...new Set([...userPermissions, ...customPermissions])];

      const hasPermission = requiredPermissions.every((perm) =>
        allPermissions.includes(perm),
      );
      if (!hasPermission) {
        throw new ForbiddenException(
          `Accès refusé. Permissions requises: ${requiredPermissions.join(', ')}`,
        );
      }
    }

    return true;
  }
}
