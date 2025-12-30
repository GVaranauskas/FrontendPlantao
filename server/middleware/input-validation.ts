import type { Request, Response, NextFunction } from "express";
import { containsSqlInjection, sanitizeString } from "../validation";
import { logger } from "../lib/logger";

interface SecurityLog {
  timestamp: string;
  ip: string;
  path: string;
  method: string;
  violations: string[];
  userAgent: string;
  body?: Record<string, unknown>;
}

const securityLogs: SecurityLog[] = [];
const MAX_SECURITY_LOGS = 1000;

export const getSecurityLogs = () => [...securityLogs];

export const clearSecurityLogs = () => {
  securityLogs.length = 0;
};

const logSecurityViolation = (log: SecurityLog) => {
  if (securityLogs.length >= MAX_SECURITY_LOGS) {
    securityLogs.shift();
  }
  securityLogs.push(log);
  
  logger.error("[SECURITY] SQL injection attempt blocked", undefined, {
    ip: log.ip,
    path: log.path,
    method: log.method,
    violations: log.violations,
    timestamp: log.timestamp,
  });
};

// Detection-only function - does NOT modify the original data
const detectInjection = (obj: unknown, path = ""): string[] => {
  const violations: string[] = [];

  if (obj === null || obj === undefined) {
    return violations;
  }

  if (typeof obj === "string") {
    if (containsSqlInjection(obj)) {
      violations.push(path || "value");
    }
    return violations;
  }

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      violations.push(...detectInjection(obj[i], `${path}[${i}]`));
    }
    return violations;
  }

  if (typeof obj === "object") {
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const fieldPath = path ? `${path}.${key}` : key;
      violations.push(...detectInjection(value, fieldPath));
    }
    return violations;
  }

  return violations;
};

export const validateInputMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Only detect SQL injection - do NOT modify or sanitize the original payload
  // This preserves data types for downstream Zod validation
  const bodyViolations = detectInjection(req.body, "body");
  const queryViolations = detectInjection(req.query, "query");
  const paramsViolations = detectInjection(req.params, "params");

  const allViolations = [
    ...bodyViolations,
    ...queryViolations,
    ...paramsViolations,
  ];

  if (allViolations.length > 0) {
    const securityLog: SecurityLog = {
      timestamp: new Date().toISOString(),
      ip: req.ip || req.socket.remoteAddress || "unknown",
      path: req.path,
      method: req.method,
      violations: allViolations,
      userAgent: req.get("user-agent") || "unknown",
      body: typeof req.body === "object" ? { ...req.body } : undefined,
    };

    logSecurityViolation(securityLog);

    return res.status(400).json({
      error: "Invalid input detected",
      code: "SECURITY_VIOLATION",
    });
  }

  // Pass through without modification - Zod will handle type validation
  next();
};

export const validateUUIDParam = (paramName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const value = req.params[paramName];
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!value) {
      return res.status(400).json({
        error: `Missing required parameter: ${paramName}`,
      });
    }

    if (!uuidRegex.test(value)) {
      logger.warn(`[SECURITY] Invalid UUID format for ${paramName}`, {
        value: value.substring(0, 50),
        ip: req.ip,
        path: req.path,
      });
      return res.status(400).json({
        error: `Invalid ${paramName} format`,
      });
    }

    next();
  };
};

export const validateLeitoParam = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const leito = req.params.leito;

  if (!leito) {
    return res.status(400).json({ error: "Missing required parameter: leito" });
  }

  if (!/^[0-9]{1,3}$/.test(leito)) {
    logger.warn("[SECURITY] Invalid leito format", {
      value: leito.substring(0, 50),
      ip: req.ip,
      path: req.path,
    });
    return res.status(400).json({ error: "Invalid leito format" });
  }

  next();
};

export const validateEnfermariaParam = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const enfermaria = req.params.enfermaria;

  if (!enfermaria) {
    return res
      .status(400)
      .json({ error: "Missing required parameter: enfermaria" });
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(enfermaria) || enfermaria.length > 50) {
    logger.warn("[SECURITY] Invalid enfermaria format", {
      value: enfermaria.substring(0, 50),
      ip: req.ip,
      path: req.path,
    });
    return res.status(400).json({ error: "Invalid enfermaria format" });
  }

  next();
};

export const validateUnitIdsBody = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { unitIds } = req.body;

  if (unitIds !== undefined && unitIds !== null && unitIds !== "") {
    if (typeof unitIds !== "string") {
      return res.status(400).json({ error: "unitIds must be a string" });
    }

    if (!/^[\d,\s]+$/.test(unitIds)) {
      logger.warn("[SECURITY] Invalid unitIds format", {
        value: String(unitIds).substring(0, 50),
        ip: req.ip,
        path: req.path,
      });
      return res
        .status(400)
        .json({ error: "unitIds must contain only numbers and commas" });
    }
  }

  next();
};

export const validateQueryNumber = (
  paramName: string,
  min: number,
  max: number
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const value = req.query[paramName];

    if (value === undefined || value === null || value === "") {
      return next();
    }

    const numValue = parseInt(String(value), 10);

    if (isNaN(numValue)) {
      return res.status(400).json({
        error: `${paramName} must be a number`,
      });
    }

    if (numValue < min || numValue > max) {
      return res.status(400).json({
        error: `${paramName} must be between ${min} and ${max}`,
      });
    }

    next();
  };
};
