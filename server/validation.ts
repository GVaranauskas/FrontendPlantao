import { z } from "zod";
import type { InsertPatient } from "@shared/schema";

/**
 * SQL Injection detection patterns
 * Blocks common SQL injection attack vectors
 * Uses [\s\S] instead of . to match newlines
 */
const SQL_INJECTION_PATTERNS = [
  /UNION[\s\S]+(ALL[\s\S]+)?SELECT/i,
  /SELECT[\s\S]+FROM/i,
  /INSERT[\s\S]+INTO/i,
  /DELETE[\s\S]+FROM/i,
  /UPDATE[\s\S]+SET/i,
  /DROP[\s\S]+(TABLE|DATABASE)/i,
  /CREATE[\s\S]+(TABLE|DATABASE)/i,
  /ALTER[\s\S]+TABLE/i,
  /EXEC(\s+|\()/i,
  /EXECUTE(\s+|\()/i,
  /xp_cmdshell/i,
  /sp_executesql/i,
  /--\s*$/m,
  /;\s*--/,
  /\/\*[\s\S]*\*\//,
  /CHR\s*\(/i,
  /CHAR\s*\(/i,
  /CONCAT\s*\(/i,
  /0x[0-9a-fA-F]{4,}/,
  /MSysAccessObjects/i,
  /information_schema/i,
  /sys\.objects/i,
  /sysobjects/i,
  /'\s*OR\s+['"]?1['"]?\s*=\s*['"]?1/i,
  /'\s*OR\s+['"]?true['"]?/i,
  /'\s*OR\s+1\s*--/i,
  /'\s*;\s*DROP/i,
  /'\s*;\s*DELETE/i,
  /'\s*;\s*UPDATE/i,
  /'\s*;\s*INSERT/i,
  /WAITFOR[\s\S]+DELAY/i,
  /BENCHMARK\s*\(/i,
  /SLEEP\s*\(/i,
  /pg_sleep/i,
  /LOAD_FILE\s*\(/i,
  /INTO[\s\S]+OUTFILE/i,
  /INTO[\s\S]+DUMPFILE/i,
];

/**
 * Checks if a string contains SQL injection patterns
 */
export const containsSqlInjection = (input: string): boolean => {
  if (typeof input !== "string") return false;
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(input));
};

/**
 * Validates enfermaria format (10A01-10A20)
 * Returns true if valid, false if invalid or suspicious
 */
export const isValidEnfermaria = (enfermaria: string): boolean => {
  if (!enfermaria || typeof enfermaria !== "string") return false;
  const trimmed = enfermaria.trim();
  if (trimmed === "") return true;
  return /^10A(0[1-9]|1[0-9]|20)$/.test(trimmed);
};

/**
 * Validates leito format (numeric 01-99)
 * Returns true if valid, false if invalid or suspicious
 */
export const isValidLeito = (leito: string): boolean => {
  if (!leito || typeof leito !== "string") return false;
  const trimmed = leito.trim();
  if (trimmed === "") return true;
  return /^[0-9]{1,2}$/.test(trimmed);
};

/**
 * Validates registro format (numeric only)
 */
export const isValidRegistro = (registro: string): boolean => {
  if (!registro || typeof registro !== "string") return false;
  const trimmed = registro.trim();
  if (trimmed === "") return true;
  return /^[0-9]+$/.test(trimmed);
};

/**
 * Enhanced validation for N8N API responses
 * Ensures data integrity and prevents injection attacks
 */

export const N8NResponseSchema = z.record(z.unknown()).superRefine((data, ctx) => {
  const criticalFields = ["leito", "nome", "registro"];
  
  for (const field of criticalFields) {
    if (field in data && typeof data[field] !== "string") {
      ctx.addIssue({
        code: z.ZodIssueCode.invalid_type,
        expected: "string",
        received: typeof data[field],
        path: [field],
        message: `Field ${field} must be a string`,
      });
    }
  }
});

/**
 * Validate patient data length to prevent storage attacks
 */
export const validatePatientDataLength = (patient: InsertPatient): boolean => {
  const maxLengths: Record<string, number> = {
    leito: 10,
    nome: 255,
    registro: 50,
    especialidadeRamal: 100,
    dataNascimento: 20,
    dataInternacao: 20,
    braden: 255,
    diagnostico: 2000,
    alergias: 500,
    mobilidade: 2000,
    dieta: 500,
    eliminacoes: 500,
    dispositivos: 500,
    atb: 500,
    curativos: 500,
    aporteSaturacao: 500,
    exames: 1000,
    cirurgia: 500,
    observacoes: 2000,
    previsaoAlta: 500,
    codigoAtendimento: 50,
  };

  for (const [field, maxLength] of Object.entries(maxLengths)) {
    const value = patient[field as keyof InsertPatient];
    if (typeof value === "string" && value.length > maxLength) {
      console.warn(`Field ${field} exceeds maximum length of ${maxLength}`);
      return false;
    }
  }

  return true;
};

/**
 * Sanitize string input - removes dangerous patterns
 * Note: Does NOT escape HTML - escaping should be done at render time by frontend
 * This stores raw data, preventing injection vectors but preserving original text
 */
export const sanitizeString = (input: string): string => {
  if (typeof input !== "string") return "";
  
  return input
    .replace(/javascript:/gi, "")
    .replace(/vbscript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .replace(/data:text\/html/gi, "")
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .trim()
    .substring(0, 5000);
};

/**
 * Security result for patient validation
 */
export interface PatientSecurityResult {
  isValid: boolean;
  sanitizedData: InsertPatient | null;
  errors: string[];
  blocked: boolean;
  blockReason?: string;
}

/**
 * Validates and sanitizes patient data with SQL injection protection
 * Returns null if data contains malicious patterns
 */
export const validateAndSanitizePatient = (patient: InsertPatient): PatientSecurityResult => {
  const errors: string[] = [];
  const sanitized: any = {};

  for (const [key, value] of Object.entries(patient)) {
    if (typeof value === "string") {
      if (containsSqlInjection(value)) {
        console.error(`[SECURITY] SQL injection detected in field "${key}": ${value.substring(0, 100)}...`);
        return {
          isValid: false,
          sanitizedData: null,
          errors: [`SQL injection detected in field ${key}`],
          blocked: true,
          blockReason: `SQL injection pattern in ${key}`,
        };
      }
      sanitized[key] = sanitizeString(value);
    } else {
      sanitized[key] = value;
    }
  }

  if (sanitized.dsEnfermaria && !isValidEnfermaria(sanitized.dsEnfermaria)) {
    console.error(`[SECURITY] Invalid enfermaria format: ${sanitized.dsEnfermaria}`);
    return {
      isValid: false,
      sanitizedData: null,
      errors: [`Invalid enfermaria format: ${sanitized.dsEnfermaria}`],
      blocked: true,
      blockReason: `Invalid enfermaria: ${sanitized.dsEnfermaria}`,
    };
  }

  if (sanitized.leito && !isValidLeito(sanitized.leito)) {
    console.error(`[SECURITY] Invalid leito format: ${sanitized.leito}`);
    return {
      isValid: false,
      sanitizedData: null,
      errors: [`Invalid leito format: ${sanitized.leito}`],
      blocked: true,
      blockReason: `Invalid leito: ${sanitized.leito}`,
    };
  }

  if (sanitized.registro && !isValidRegistro(sanitized.registro)) {
    console.error(`[SECURITY] Invalid registro format: ${sanitized.registro}`);
    return {
      isValid: false,
      sanitizedData: null,
      errors: [`Invalid registro format: ${sanitized.registro}`],
      blocked: true,
      blockReason: `Invalid registro: ${sanitized.registro}`,
    };
  }

  return {
    isValid: true,
    sanitizedData: sanitized as InsertPatient,
    errors,
    blocked: false,
  };
};

/**
 * Validate all string fields in patient data (legacy function)
 * @deprecated Use validateAndSanitizePatient for security validation
 */
export const sanitizePatientData = (patient: InsertPatient): InsertPatient => {
  const result = validateAndSanitizePatient(patient);
  if (result.blocked || !result.sanitizedData) {
    throw new Error(`[SECURITY BLOCKED] ${result.blockReason || "Invalid patient data"}`);
  }
  return result.sanitizedData;
};

/**
 * Validate N8N API response structure
 */
export const validateN8NResponse = (data: unknown): data is Record<string, unknown> => {
  try {
    return N8NResponseSchema.safeParse(data).success;
  } catch {
    return false;
  }
};

/**
 * Safe JSON parsing with error handling
 */
export const safeJsonParse = (json: string): Record<string, unknown> | null => {
  try {
    const parsed = JSON.parse(json);
    if (typeof parsed === "object" && parsed !== null) {
      return parsed;
    }
    return null;
  } catch {
    console.error("Failed to parse JSON");
    return null;
  }
};

/**
 * Validate enfermaria parameter to prevent injection
 */
export const validateEnfermaria = (enfermaria: string): boolean => {
  // Only allow alphanumeric, hyphens, and underscores
  return /^[a-zA-Z0-9_-]+$/.test(enfermaria) && enfermaria.length <= 50;
};
