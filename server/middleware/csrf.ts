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
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600000, // 1 hour
  },
});

/**
 * CSRF protection middleware
 */
export function setupCSRF(app: any) {
  app.use(csrfProtection);

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
