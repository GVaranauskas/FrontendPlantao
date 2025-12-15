import { z } from "zod";
import type { InsertPatient } from "@shared/schema";

/**
 * Enhanced validation for N8N API responses
 * Ensures data integrity and prevents injection attacks
 */

export const N8NResponseSchema = z.record(z.unknown()).superRefine((data, ctx) => {
  // Validate critical fields exist and have reasonable types
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
 * Sanitize string input to prevent XSS
 */
export const sanitizeString = (input: string): string => {
  if (typeof input !== "string") return "";
  
  return input
    .replace(/[<>]/g, "") // Remove angle brackets
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/onerror=/gi, "") // Remove onerror handlers
    .trim()
    .substring(0, 5000); // Reasonable limit
};

/**
 * Validate all string fields in patient data
 */
export const sanitizePatientData = (patient: InsertPatient): InsertPatient => {
  const sanitized: any = {};

  for (const [key, value] of Object.entries(patient)) {
    if (typeof value === "string") {
      sanitized[key] = sanitizeString(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as InsertPatient;
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
