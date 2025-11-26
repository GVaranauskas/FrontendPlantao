import { type Express, type Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export function registerErrorHandler(app: Express) {
  // Async error wrapper for route handlers
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    const statusCode = err.statusCode || err.status || 500;
    const message = err.message || 'Internal Server Error';
    const isDevelopment = process.env.NODE_ENV === 'development';

    // Log the error with structured data
    const logContext = {
      method: req.method,
      path: req.path,
      statusCode,
      userAgent: req.get('user-agent'),
      ...err.context,
    };

    if (statusCode >= 500) {
      logger.error(message, err, logContext);
    } else if (statusCode >= 400) {
      logger.warn(message, logContext);
    }

    // Respond to client (IMPORTANT: do NOT throw after responding)
    res.status(statusCode).json({
      error: {
        message,
        status: statusCode,
        ...(isDevelopment && { stack: err.stack }),
      },
    });

    // DO NOT THROW - this would crash the server
    // The response has been sent, so we just log and continue
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: any) => {
    logger.error('Unhandled Promise Rejection', new Error(String(reason)), {
      reason: reason instanceof Error ? {
        name: reason.name,
        message: reason.message,
      } : String(reason),
    });
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception', error, {
      fatal: true,
    });
    // Graceful shutdown after logging
    process.exit(1);
  });
}

// Wrapper to catch async errors in route handlers
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
