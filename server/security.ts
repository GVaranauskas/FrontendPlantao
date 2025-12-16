import type { Express } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

/**
 * Configure security headers using helmet
 * Protects against: XSS, Clickjacking, MIME type sniffing, etc.
 */
export function setupHelmet(app: Express): void {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https:"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:"],
        imgSrc: ["'self'", "https:", "data:"],
        connectSrc: ["'self'", "https:"],
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
 * Limits: 100 requests per 15 minutes per IP
 */
export function setupRateLimit(app: Express): void {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skip: (req) => {
      // Don't count static assets and health checks
      return req.path.startsWith("/static") || req.path === "/health";
    },
  });

  // Apply to all API routes
  app.use("/api/", limiter);
  
  // More restrictive limit for auth endpoints (if implemented)
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: "Too many login attempts, please try again later.",
    skipSuccessfulRequests: true, // Don't count successful requests
  });
  
  // Apply stricter limits to auth endpoints to prevent brute force attacks
  app.use("/api/auth/", authLimiter);
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
 */
export function sanitizeInput(input: unknown): string {
  if (typeof input !== "string") return "";
  
  return input
    .trim()
    .replace(/[<>]/g, "") // Remove dangerous characters
    .substring(0, 1000); // Limit length
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
