import type { Express } from "express";
import helmet from "helmet";
import { 
  extractUserForRateLimit,
  apiRateLimiter, 
  loginRateLimiter, 
  registerRateLimiter,
  syncRateLimiter, 
  aiRateLimiter 
} from "./middleware/rate-limiter";

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Configure security headers using helmet
 * Protects against: XSS, Clickjacking, MIME type sniffing, etc.
 * In development, CSP is relaxed to allow Vite's inline scripts
 */
export function setupHelmet(app: Express): void {
  app.use(helmet({
    contentSecurityPolicy: isDev ? false : {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "https:"],
        scriptSrc: ["'self'", "https:"],
        imgSrc: ["'self'", "https:", "data:"],
        connectSrc: ["'self'", "https:", "wss:"],
        fontSrc: ["'self'", "https:"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    frameguard: {
      action: "deny",
    },
    referrerPolicy: {
      policy: "strict-origin-when-cross-origin",
    },
  }));
  
  // Additional security headers not in helmet
  app.use((req, res, next) => {
    res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    next();
  });
}

/**
 * Configure rate limiting to prevent abuse
 * Uses hybrid key generation: userId for authenticated users, IP for unauthenticated
 * 
 * Limits (v2 - Flexible Rate Limits):
 * - General API: 300/min per user (or IP if not authenticated)
 * - Login/Register: 10/15min per IP (pre-authentication protection)
 * - Sync/Import: 30/min per user
 * - AI: 20/min per user
 * 
 * The extractUserForRateLimit middleware runs first to extract userId from JWT
 * before rate limiters execute, enabling user-based rate limiting even when
 * auth middleware hasn't run yet.
 */
export function setupRateLimit(app: Express): void {
  // Extract user from JWT before rate limiting (enables user-based limits)
  app.use("/api/", extractUserForRateLimit);
  
  // General API limiter - user-based after authentication
  app.use("/api/", apiRateLimiter);
  
  // Auth endpoints - IP based (pre-authentication)
  app.use("/api/auth/login", loginRateLimiter);
  app.use("/api/auth/register", registerRateLimiter);
  
  // Sync/Import endpoints - user-based
  app.use("/api/sync/", syncRateLimiter);
  app.use("/api/import/evolucoes", syncRateLimiter);
  
  // AI endpoints - user-based
  app.use("/api/ai/", aiRateLimiter);
}

/**
 * Security best practices for request validation
 */
export const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
};

/**
 * Validation and sanitization helpers
 * Uses a more robust approach to prevent common XSS vectors
 */
export function sanitizeInput(input: unknown): string {
  if (typeof input !== "string") return "";

  return input
    .trim()
    .replace(/[&<>"'/]|\((?:alert|confirm|prompt|eval)\)/gi, (match) => {
      const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '/': '&#x2F;'
      };
      return map[match.toLowerCase()] || "";
    })
    .substring(0, 5000); // Increased limit as clinical observations can be long
}

/**
 * Validate URL to prevent SSRF attacks
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
