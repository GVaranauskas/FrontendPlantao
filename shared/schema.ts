import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(),
});

export const patients = pgTable("patients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leito: text("leito").notNull(),
  nome: text("nome").notNull(),
  internacao: text("internacao").notNull(),
  braden: text("braden"),
  diagnostico: text("diagnostico"),
  alergias: text("alergias"),
  delta: text("delta"),
  eliminacoes: text("eliminacoes"),
  dispositivos: text("dispositivos"),
  atb: text("atb"),
  outros: text("outros"),
  aporte: text("aporte"),
  exames: text("exames"),
  cirurgia: text("cirurgia"),
  observacoes: text("observacoes"),
  previsaoAlta: text("previsao_alta"),
  alerta: text("alerta"),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const insertPatientSchema = createInsertSchema(patients).omit({
  id: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Patient = typeof patients.$inferSelect;
