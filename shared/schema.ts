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
  especialidadeRamal: text("especialidade_ramal"),
  nome: text("nome").notNull(),
  registro: text("registro"),
  dataNascimento: text("data_nascimento"),
  dataInternacao: text("data_internacao").notNull(),
  rqBradenScp: text("rq_braden_scp"),
  diagnosticoComorbidades: text("diagnostico_comorbidades"),
  alergias: text("alergias"),
  mobilidade: text("mobilidade"),
  dieta: text("dieta"),
  eliminacoes: text("eliminacoes"),
  dispositivos: text("dispositivos"),
  atb: text("atb"),
  curativos: text("curativos"),
  aporteSaturacao: text("aporte_saturacao"),
  examesRealizadosPendentes: text("exames_realizados_pendentes"),
  dataProgramacaoCirurgica: text("data_programacao_cirurgica"),
  observacoesIntercorrencias: text("observacoes_intercorrencias"),
  previsaoAlta: text("previsao_alta"),
  alerta: text("alerta"),
  status: text("status").notNull().default("pending"),
});

export const alerts = pgTable("alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leito: text("leito").notNull(),
  priority: text("priority").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  time: text("time").notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const insertPatientSchema = createInsertSchema(patients).omit({
  id: true,
}).extend({
  mobilidade: z.enum(["A", "D", "DA"]).nullable().optional(),
});

export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Patient = typeof patients.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alerts.$inferSelect;
