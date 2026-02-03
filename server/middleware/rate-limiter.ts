import rateLimit from 'express-rate-limit';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../lib/logger';
import { env } from '../config/env';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    username: string;
    role: string;
  };
  rateLimitUser?: {
    userId: string;
  };
}

interface JWTPayload {
  userId: string;
  username: string;
  role: string;
}

/**
 * Lightweight middleware to extract userId from JWT for rate limiting purposes
 * This runs BEFORE rate limiters to enable user-based rate limiting
 * Does NOT validate token fully - just extracts userId for rate limit key generation
 */
export function extractUserForRateLimit(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  try {
    // First check if user is already set by auth middleware
    if (req.user?.userId) {
      req.rateLimitUser = { userId: req.user.userId };
      return next();
    }

    // Try to extract from access token cookie
    const accessToken = req.cookies?.accessToken;
    if (accessToken) {
      try {
        const decoded = jwt.verify(accessToken, env.SESSION_SECRET) as JWTPayload;
        if (decoded?.userId) {
          req.rateLimitUser = { userId: decoded.userId };
        }
      } catch {
        // Token invalid/expired - fall back to IP-based limiting
      }
    }
  } catch {
    // Silently fail - will fall back to IP-based limiting
  }
  next();
}

/**
 * Normalize IP address for consistent rate limiting
 * Handles both IPv4 and IPv6 addresses
 * Implements IPv6 /64 subnet grouping to prevent bypass via address rotation
 */
function normalizeIp(ip: string | undefined): string {
  if (!ip) return 'unknown';
  
  // Handle IPv6-mapped IPv4 addresses (::ffff:192.168.1.1)
  if (ip.startsWith('::ffff:')) {
    return ip.slice(7);
  }
  
  // For IPv6, use only the /64 prefix (first 4 groups) for rate limiting
  // This prevents bypass via IPv6 address rotation within the same subnet
  if (ip.includes(':') && !ip.includes('.')) {
    const parts = ip.split(':');
    // Take first 4 parts of IPv6 address (64-bit prefix)
    if (parts.length >= 4) {
      return parts.slice(0, 4).join(':') + '::';
    }
  }
  
  return ip;
}

/**
 * Hybrid key generator for rate limiting
 * Uses userId (from rateLimitUser or user) for authenticated requests
 * Falls back to normalized IP for unauthenticated requests
 * This prevents rate limit issues for users on the same corporate network (NAT)
 */
export function createHybridKeyGenerator(prefix: string = '') {
  return (req: AuthenticatedRequest): string => {
    // Check rateLimitUser first (set by extractUserForRateLimit middleware)
    const userId = req.rateLimitUser?.userId || req.user?.userId;
    if (userId) {
      return `${prefix}user:${userId}`;
    }
    // Use normalized IP for unauthenticated requests
    const ip = req.ip || req.socket?.remoteAddress;
    return `${prefix}ip:${normalizeIp(ip)}`;
  };
}

/**
 * IP-only key generator for public endpoints like login
 * Used to prevent brute force attacks before authentication
 * Uses normalized IP to handle IPv6 consistently
 */
export function createIpKeyGenerator(prefix: string = '') {
  return (req: Request): string => {
    const ip = req.ip || req.socket?.remoteAddress;
    return `${prefix}ip:${normalizeIp(ip)}`;
  };
}

// Disable keyGeneratorIpFallback validation since we implement our own IPv6 normalization
// via normalizeIp() which handles /64 subnet grouping
const validateConfig = { 
  xForwardedForHeader: false,
  keyGeneratorIpFallback: false
};

/**
 * Login rate limiter - IP based (pre-authentication)
 * Limit: 10 attempts per 15 minutes per IP
 * More generous than before but still protects against brute force
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // 10 tentativas por IP (dobrado de 5)
  keyGenerator: createIpKeyGenerator('login:'),
  message: { 
    error: { 
      message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
      status: 429
    } 
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  validate: validateConfig,
  handler: (req, res, next, options) => {
    logger.warn(`Login rate limit exceeded for IP: ${normalizeIp(req.ip)} on ${req.path}`);
    res.status(429).json(options.message);
  },
  skip: (req) => {
    return process.env.NODE_ENV === 'test';
  }
});

/**
 * Refresh token rate limiter - User based (extracts userId from refresh token)
 * Limit: 30 requests per minute per user
 */
export const refreshRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 30, // 30 requisições por minuto por usuário (aumentado de 10)
  keyGenerator: (req: Request): string => {
    // Try to extract userId from refresh token for user-based limiting
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, env.SESSION_SECRET) as JWTPayload;
        if (decoded?.userId) {
          return `refresh:user:${decoded.userId}`;
        }
      } catch {
        // Token invalid - fall back to IP
      }
    }
    const ip = req.ip || req.socket?.remoteAddress;
    return `refresh:ip:${normalizeIp(ip)}`;
  },
  message: { 
    error: { 
      message: 'Muitas requisições de renovação. Aguarde um momento.',
      status: 429
    } 
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: validateConfig,
  handler: (req, res, next, options) => {
    logger.warn(`Refresh rate limit exceeded on ${req.path}`);
    res.status(429).json(options.message);
  },
});

/**
 * General API rate limiter - User based after authentication
 * Limit: 300 requests per minute per user
 * Much more generous for authenticated users
 * Requires extractUserForRateLimit middleware to run first
 */
export const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 300, // 300 requisições por minuto por usuário (aumentado de 100)
  keyGenerator: createHybridKeyGenerator('api:'),
  message: { 
    error: { 
      message: 'Limite de requisições excedido. Aguarde um momento.',
      status: 429
    } 
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: validateConfig,
  handler: (req, res, next, options) => {
    const authReq = req as AuthenticatedRequest;
    const identifier = authReq.rateLimitUser?.userId || authReq.user?.userId || normalizeIp(req.ip);
    logger.warn(`API rate limit exceeded for ${identifier} on ${req.path}`);
    res.status(429).json(options.message);
  },
  skip: (req) => {
    return req.path.startsWith("/static") || req.path === "/health";
  }
});

/**
 * Sync/Import rate limiter - User based after authentication
 * Limit: 30 requests per minute per user
 * For expensive sync operations
 */
export const syncRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 30, // 30 requisições por minuto por usuário (aumentado de 10)
  keyGenerator: createHybridKeyGenerator('sync:'),
  message: { 
    error: { 
      message: 'Muitas requisições de sincronização. Aguarde um momento.',
      status: 429
    } 
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: validateConfig,
  handler: (req, res, next, options) => {
    const authReq = req as AuthenticatedRequest;
    const identifier = authReq.rateLimitUser?.userId || authReq.user?.userId || normalizeIp(req.ip);
    logger.warn(`Sync rate limit exceeded for ${identifier} on ${req.path}`);
    res.status(429).json(options.message);
  },
});

/**
 * AI rate limiter - User based after authentication
 * Limit: 20 requests per minute per user
 * For expensive AI/OpenAI operations
 */
export const aiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 20, // 20 requisições por minuto por usuário (aumentado de 5)
  keyGenerator: createHybridKeyGenerator('ai:'),
  message: { 
    error: { 
      message: 'Muitas requisições de análise IA. Aguarde um momento.',
      status: 429
    } 
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: validateConfig,
  handler: (req, res, next, options) => {
    const authReq = req as AuthenticatedRequest;
    const identifier = authReq.rateLimitUser?.userId || authReq.user?.userId || normalizeIp(req.ip);
    logger.warn(`AI rate limit exceeded for ${identifier} on ${req.path}`);
    res.status(429).json(options.message);
  },
});

/**
 * Registration rate limiter - IP based (pre-authentication)
 * Limit: 10 attempts per 15 minutes per IP
 * Prevents mass account creation
 */
export const registerRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // 10 tentativas por IP
  keyGenerator: createIpKeyGenerator('register:'),
  message: { 
    error: { 
      message: 'Muitas tentativas de registro. Tente novamente em 15 minutos.',
      status: 429
    } 
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: validateConfig,
  handler: (req, res, next, options) => {
    logger.warn(`Register rate limit exceeded for IP: ${normalizeIp(req.ip)} on ${req.path}`);
    res.status(429).json(options.message);
  },
  skip: (req) => {
    return process.env.NODE_ENV === 'test';
  }
});
