import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AppError } from './error-handler';
import type { JWTPayload } from '../security/jwt';
import { authMiddleware, requireFirstAccessComplete } from './auth';

// Match schema definition in shared/schema.ts
export type UserRole = 'admin' | 'enfermagem';

/**
 * RBAC Middleware - checks if user has required role
 * IMPORTANT: This only checks role, does NOT handle auth or firstAccess
 * Use requireRoleWithAuth for complete protection
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
 * Combined middleware: authMiddleware + requireFirstAccessComplete + requireRole
 * Use this for routes that need auth, firstAccess check, AND role verification
 */
export function requireRoleWithAuth(...allowedRoles: UserRole[]): RequestHandler[] {
  return [
    authMiddleware,
    requireFirstAccessComplete as RequestHandler,
    requireRole(...allowedRoles) as RequestHandler,
  ];
}

/**
 * Role hierarchy for permission inheritance
 * admin > enfermagem
 */
export const roleHierarchy: Record<UserRole, number> = {
  admin: 2,
  enfermagem: 1,
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
  enfermagem: [
    'patients:read',
    'patients:write',
    'templates:read',
    'import:trigger',
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
