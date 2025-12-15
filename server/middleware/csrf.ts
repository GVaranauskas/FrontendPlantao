import csrf from 'csurf';
import { Request, Response, NextFunction } from 'express';
import { isProductionEnv } from '../config/env';

declare module 'express-serve-static-core' {
  interface Request {
    csrfToken?: () => string;
  }
}

// Configure CSRF protection with cookie storage
const csrfProtection = csrf({
  cookie: {
    key: '_csrf',
    httpOnly: true,
    secure: isProductionEnv,
    sameSite: 'lax', // lax allows GET requests from other sites
    maxAge: 3600000, // 1 hour
    signed: false, // Don't sign the cookie for simplicity
  },
  value: (req: Request) => {
    return req.headers['x-csrf-token'] as string || req.body?._csrf || req.query?._csrf;
  },
});

// All API routes are exempt from CSRF since we use Bearer token authentication
// CSRF is only needed for traditional session-based auth with form submissions
const csrfExemptPaths = [
  '/api/',
];

/**
 * CSRF protection middleware with exemptions for auth endpoints
 */
export function setupCSRF(app: any) {
  // Apply CSRF conditionally - skip for exempt paths
  app.use((req: Request, res: Response, next: NextFunction) => {
    const isApiRoute = req.path.startsWith('/api/');
    if (isApiRoute && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return next();
    }
    csrfProtection(req, res, next);
  });

  // Provide CSRF token endpoint for frontend
  app.get('/api/csrf-token', (req: Request, res: Response) => {
    res.json({ csrfToken: req.csrfToken?.() });
  });
}

/**
 * CSRF error handler
 */
export function csrfErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (err.code === 'EBADCSRFTOKEN') {
    res.status(403).json({
      error: {
        message: 'Invalid CSRF token',
        status: 403,
      },
    });
  } else {
    next(err);
  }
}

export default csrfProtection;
