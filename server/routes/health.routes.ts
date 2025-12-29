import { Router } from 'express';
import { storage } from '../storage';
import { intelligentCache } from '../services/intelligent-cache.service';
import { env } from '../config/env';
import { logger } from '../lib/logger';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: CheckResult;
    redis: CheckResult;
    openai: CheckResult;
    filesystem: CheckResult;
  };
}

interface CheckResult {
  status: 'pass' | 'warn' | 'fail';
  message: string;
  responseTime?: number;
  details?: any;
}

router.get('/', async (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

router.get('/ready', async (req, res) => {
  const startTime = Date.now();
  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    version: process.env.npm_package_version || '1.0.0',
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      openai: await checkOpenAI(),
      filesystem: checkFilesystem()
    }
  };

  const checks = Object.values(health.checks);
  const hasFail = checks.some(c => c.status === 'fail');
  const hasWarn = checks.some(c => c.status === 'warn');

  if (hasFail) {
    health.status = 'unhealthy';
  } else if (hasWarn) {
    health.status = 'degraded';
  }

  const responseTime = Date.now() - startTime;
  logger.info(`[Health] Check completed in ${responseTime}ms - Status: ${health.status}`);

  const statusCode = health.status === 'healthy' ? 200 : 
                     health.status === 'degraded' ? 200 : 503;

  res.status(statusCode).json({
    ...health,
    responseTime
  });
});

router.get('/metrics', async (req, res) => {
  const memUsage = process.memoryUsage();
  const cacheStats = intelligentCache.getStats();

  res.json({
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
    },
    cache: {
      entries: cacheStats.totalEntries,
      hitRate: `${cacheStats.hitRate.toFixed(1)}%`,
      totalHits: cacheStats.totalHits,
      totalMisses: cacheStats.totalMisses,
      evictions: cacheStats.evictions
    },
    process: {
      pid: process.pid,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    }
  });
});

async function checkDatabase(): Promise<CheckResult> {
  const start = Date.now();
  try {
    await storage.getAllUsers();
    const responseTime = Date.now() - start;

    if (responseTime > 5000) {
      return {
        status: 'warn',
        message: 'Database responding slowly',
        responseTime,
        details: { threshold: '5s', actual: `${responseTime}ms` }
      };
    }

    return {
      status: 'pass',
      message: 'Database connection healthy',
      responseTime
    };
  } catch (error) {
    return {
      status: 'fail',
      message: 'Database connection failed',
      responseTime: Date.now() - start,
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

async function checkRedis(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const isUsingRedis = intelligentCache.isUsingRedis();
    const responseTime = Date.now() - start;

    if (!isUsingRedis) {
      return {
        status: 'warn',
        message: 'Redis not configured, using memory cache',
        responseTime,
        details: { fallback: 'memory' }
      };
    }

    await intelligentCache.set('health:check', { test: true }, {
      ttlMinutes: 1,
      criticality: 'low'
    });
    const retrieved = await intelligentCache.get('health:check');

    if (!retrieved) {
      return {
        status: 'warn',
        message: 'Redis write/read test failed',
        responseTime
      };
    }

    return {
      status: 'pass',
      message: 'Redis connection healthy',
      responseTime
    };
  } catch (error) {
    return {
      status: 'warn',
      message: 'Redis check failed, using fallback',
      responseTime: Date.now() - start,
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

async function checkOpenAI(): Promise<CheckResult> {
  const start = Date.now();
  try {
    if (!env.OPENAI_API_KEY) {
      return {
        status: 'warn',
        message: 'OpenAI API key not configured',
        responseTime: Date.now() - start,
        details: { configured: false }
      };
    }

    return {
      status: 'pass',
      message: 'OpenAI API key configured',
      responseTime: Date.now() - start,
      details: { configured: true, model: env.OPENAI_MODEL }
    };
  } catch (error) {
    return {
      status: 'fail',
      message: 'OpenAI check failed',
      responseTime: Date.now() - start,
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

function checkFilesystem(): CheckResult {
  const start = Date.now();
  try {
    const testFile = path.join('/tmp', `health-check-${Date.now()}.txt`);
    fs.writeFileSync(testFile, 'health check', 'utf8');
    fs.readFileSync(testFile, 'utf8');
    fs.unlinkSync(testFile);

    return {
      status: 'pass',
      message: 'Filesystem read/write healthy',
      responseTime: Date.now() - start
    };
  } catch (error) {
    return {
      status: 'fail',
      message: 'Filesystem check failed',
      responseTime: Date.now() - start,
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

export default router;
