import csrf from 'csurf';
import { Request, Response, NextFunction } from 'express';

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
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // lax allows GET requests from other sites
    maxAge: 3600000, // 1 hour
    signed: false, // Don't sign the cookie for simplicity
  },
  value: (req: Request) => {
    return req.headers['x-csrf-token'] as string || req.body?._csrf || req.query?._csrf;
  },
});

// Paths that don't require CSRF protection
const csrfExemptPaths = [
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/import/evolucoes',
  '/api/sync/evolucoes',
  '/api/nursing-units/sync',
  '/api/nursing-unit-changes',
];

/**
 * CSRF protection middleware with exemptions for auth endpoints
 */
export function setupCSRF(app: any) {
  // Apply CSRF conditionally - skip for exempt paths
  app.use((req: Request, res: Response, next: NextFunction) => {
    const isExempt = csrfExemptPaths.some(path => 
      req.path === path || req.path.startsWith(path + '/')
    );
    if (isExempt && req.method === 'POST') {
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
