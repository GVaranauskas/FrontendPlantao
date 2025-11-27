import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { parseToon, isToonFormat } from "./toon";
import { importScheduler } from "./services/import-scheduler";
import { setupHelmet, setupRateLimit } from "./security";
import { registerErrorHandler, AppError } from "./middleware/error-handler";
import { setupCSRF, csrfErrorHandler } from "./middleware/csrf";
import { optionalAuthMiddleware } from "./middleware/auth";
import { logger } from "./lib/logger";

const app = express();

// Trust proxy for accurate IP detection (required for rate limiting)
app.set('trust proxy', 1);

// Apply security middleware first
setupHelmet(app);
setupRateLimit(app);

// Cookie parser middleware
app.use(cookieParser());

// CSRF protection setup
setupCSRF(app);

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

// Custom TOON body parser middleware
app.use((req, res, next) => {
  if (isToonFormat(req.get("content-type"))) {
    let data = "";
    req.on("data", chunk => {
      data += chunk;
    });
    req.on("end", () => {
      try {
        req.body = parseToon(data);
        req.rawBody = data;
        next();
      } catch (error) {
        logger.warn("Invalid TOON format", { path: req.path });
        res.status(400).json({ error: { message: "Invalid TOON format", status: 400 } });
      }
    });
  } else {
    next();
  }
});

app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

// Optional authentication middleware (doesn't fail if token missing)
app.use(optionalAuthMiddleware);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      logger.http(req.method, path, res.statusCode, duration);
    }
  });

  next();
});

(async () => {
  try {
    const server = await registerRoutes(app);

    // CSRF error handler (before global error handler)
    app.use(csrfErrorHandler);

    // Register global error handler (MUST be after all other middleware/routes)
    registerErrorHandler(app);

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Auto-sync is now handled by frontend via useAutoSync hook
    // Backend scheduler disabled to avoid conflicts
    // await importScheduler.startDefaultSchedule();

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || '5000', 10);
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      logger.info(`Server is listening on port ${port}`);
    });
  } catch (error) {
    logger.error('Failed to start server', error as Error);
    process.exit(1);
  }
})();
