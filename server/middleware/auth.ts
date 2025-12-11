import { Request, Response, NextFunction } from 'express';
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
