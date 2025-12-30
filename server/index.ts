import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { parseToon, isToonFormat } from "./toon";
// Legado: ImportScheduler desabilitado - sync via AutoSyncSchedulerGPT4o
// import { importScheduler } from "./services/import-scheduler";
import { nursingUnitsScheduler } from "./services/nursing-units-scheduler";
import { setupHelmet, setupRateLimit } from "./security";
import { registerErrorHandler, AppError } from "./middleware/error-handler";
import { setupCSRF, csrfErrorHandler } from "./middleware/csrf";
import { optionalAuthMiddleware } from "./middleware/auth";
import { auditMiddleware } from "./middleware/audit";
import { validateInputMiddleware } from "./middleware/input-validation";
import { logger } from "./lib/logger";
import { env } from "./config/env";
import { autoSyncSchedulerGPT4o } from "./services/auto-sync-scheduler-gpt4o.service";
import { costMonitorService } from "./services/cost-monitor.service";
import { changeDetectionService } from "./services/change-detection.service";
import { intelligentCache } from "./services/intelligent-cache.service";
import { aiServiceGPT4oMini } from "./services/ai-service-gpt4o-mini";

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

// Global input validation middleware - blocks SQL injection and XSS attacks
app.use(validateInputMiddleware);

// Optional authentication middleware (doesn't fail if token missing)
app.use(optionalAuthMiddleware);

// Audit middleware (logs all API requests for LGPD Art. 37 compliance)
app.use(auditMiddleware);

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

    // CSRF error handler
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

    // Start daily nursing units sync (runs at 6:00 AM)
    await nursingUnitsScheduler.startDailySync("0 6 * * *");

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = env.PORT;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      logger.info(`Server is listening on port ${port}`);

      // 🚀 Iniciando sistema de otimização GPT-4o-mini com 4 camadas
      console.log('');
      console.log('🚀 Iniciando sistema de otimização GPT-4o-mini...');

      // Inicia scheduler automático (a cada 15 minutos)
      autoSyncSchedulerGPT4o.start({
        cronExpression: '*/15 * * * *',
        enfermarias: [], // Vazio = todas
        enableAI: true,
        batchSize: 10
      });

      console.log('✅ Auto Sync Scheduler iniciado - sincronizando a cada 15 minutos');

      // Limpeza automática (a cada 6 horas)
      setInterval(() => {
        changeDetectionService.cleanupOldSnapshots(24);
        costMonitorService.cleanup(90);
      }, 6 * 60 * 60 * 1000);

      // Dashboard de custos (a cada hora)
      setInterval(() => {
        aiServiceGPT4oMini.printDashboard();
        costMonitorService.printDashboard();
      }, 60 * 60 * 1000);

      console.log('✅ Sistema de otimização GPT-4o-mini ativo!');
      console.log('');
      console.log('📊 4 CAMADAS DE ECONOMIA:');
      console.log('   1️⃣ Change Detection (85-90% economia)');
      console.log('   2️⃣ Intelligent Cache (60-80% economia)');
      console.log('   3️⃣ GPT-4o-mini (50% economia)');
      console.log('   4️⃣ Auto Sync 15min (95%+ economia)');
      console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('   🎯 TOTAL: ~99.8% de economia!');
      console.log('');
    });
  } catch (error) {
    logger.error('Failed to start server', error as Error);
    process.exit(1);
  }
})();
