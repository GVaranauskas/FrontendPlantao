import { Request, Response, NextFunction } from 'express';
import { AppError } from './error-handler';
import type { JWTPayload } from '../security/jwt';

export type UserRole = 'admin' | 'enfermeiro' | 'visualizador';

/**
 * RBAC Middleware - checks if user has required role
 * Usage: requireRole('admin', 'enfermeiro')
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const userRole = req.user.role as UserRole;
    if (!allowedRoles.includes(userRole)) {
      throw new AppError(403, `Access denied. Required roles: ${allowedRoles.join(', ')}`);
    }

    next();
  };
}

/**
 * Role hierarchy for permission inheritance
 * admin > enfermeiro > visualizador
 */
export const roleHierarchy: Record<UserRole, number> = {
  admin: 3,
  enfermeiro: 2,
  visualizador: 1,
};

/**
 * Check if user role has at least the required role level
 */
export function hasRoleAccess(userRole: UserRole, requiredRole: UserRole): boolean {
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Get permissions for a role
 */
export const rolePermissions: Record<UserRole, string[]> = {
  admin: [
    'patients:read',
    'patients:write',
    'patients:delete',
    'templates:read',
    'templates:write',
    'templates:delete',
    'import:trigger',
    'import:view',
    'users:manage',
    'alerts:manage',
  ],
  enfermeiro: [
    'patients:read',
    'patients:write',
    'templates:read',
    'import:trigger',
    'import:view',
    'alerts:read',
  ],
  visualizador: [
    'patients:read',
    'templates:read',
    'import:view',
    'alerts:read',
  ],
};

/**
 * Check if user has specific permission
 */
export function hasPermission(userRole: UserRole, permission: string): boolean {
  return rolePermissions[userRole]?.includes(permission) || false;
}
