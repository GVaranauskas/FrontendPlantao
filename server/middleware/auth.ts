import { Request, Response, NextFunction, RequestHandler } from 'express';
import { verifyAccessToken, JWTPayload } from '../security/jwt';
import { AppError } from './error-handler';

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * Middleware to verify JWT token from Authorization header or cookies
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);

    if (!token) {
      throw new AppError(401, 'Missing authentication token');
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      throw new AppError(401, 'Invalid or expired token');
    }

    req.user = payload;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(401, 'Authentication failed');
  }
}

/**
 * Optional auth middleware - doesn't fail if token is missing/invalid
 */
export function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);
    if (token) {
      const payload = verifyAccessToken(token);
      if (payload) {
        req.user = payload;
      }
    }
  } catch {
    // Silently fail for optional auth
  }
  next();
}

function extractToken(req: Request): string | null {
  // Try Authorization header first (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Try cookies (for browser-based clients)
  if (req.cookies?.accessToken) {
    return req.cookies.accessToken;
  }

  return null;
}

// Rotas permitidas para usuários com firstAccess=true
const FIRST_ACCESS_ALLOWED_ROUTES = [
  '/api/auth/first-access-password',
  '/api/auth/me',
  '/api/auth/logout',
  '/api/auth/refresh',
];

/**
 * Middleware to block routes for users with firstAccess=true
 * Must be used after authMiddleware
 */
export async function requireFirstAccessComplete(req: Request, res: Response, next: NextFunction) {
  // Skip check for allowed routes
  if (FIRST_ACCESS_ALLOWED_ROUTES.some(route => req.path === route)) {
    return next();
  }

  // Skip if no user (auth middleware will handle this)
  if (!req.user) {
    return next();
  }

  // Check if user has completed first access
  try {
    const { storage } = await import('../storage');
    const user = await storage.getUser(req.user.userId);
    
    if (user?.firstAccess) {
      throw new AppError(403, 'First access password change required', {
        code: 'FIRST_ACCESS_REQUIRED',
        redirect: '/first-access'
      });
    }
    
    next();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    next();
  }
}

/**
 * Combined middleware: authMiddleware + requireFirstAccessComplete
 * Use this for routes that require both authentication AND completed first access
 */
export const authWithFirstAccessCheck: RequestHandler[] = [
  authMiddleware,
  requireFirstAccessComplete as RequestHandler,
];
