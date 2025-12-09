import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoles = ["admin", "enfermagem"] as const;
export type UserRole = typeof userRoles[number];

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email"),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("enfermagem"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastLogin: timestamp("last_login"),
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
  
  // Campos da API N8N de Evolução
  idEvolucao: text("id_evolucao"),
  dsEnfermaria: text("ds_enfermaria"),
  dsLeitoCompleto: text("ds_leito_completo"),
  dsEspecialidade: text("ds_especialidade"),
  codigoAtendimento: text("codigo_atendimento"),
  dsEvolucaoCompleta: text("ds_evolucao_completa"),
  dhCriacaoEvolucao: timestamp("dh_criacao_evolucao"),
  fonteDados: text("fonte_dados").default("N8N_IAMSPE"),
  dadosBrutosJson: jsonb("dados_brutos_json"),
});

export const alerts = pgTable("alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leito: text("leito").notNull(),
  priority: text("priority").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  time: text("time").notNull(),
});

export const importHistory = pgTable("import_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  enfermaria: text("enfermaria").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  total: integer("total").notNull().default(0),
  importados: integer("importados").notNull().default(0),
  erros: integer("erros").notNull().default(0),
  detalhes: jsonb("detalhes").notNull().default(sql`'[]'::jsonb`),
  duracao: integer("duracao").notNull().default(0),
});

export const nursingUnitTemplates = pgTable("nursing_unit_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  enfermariaCodigo: text("enfermaria_codigo").notNull(),
  fieldsConfiguration: jsonb("fields_configuration").notNull().default(sql`'[]'::jsonb`),
  specialRules: jsonb("special_rules").notNull().default(sql`'{}'::jsonb`),
  isActive: integer("is_active").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const auditLog = pgTable("audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  
  userId: varchar("user_id").references(() => users.id),
  userName: text("user_name").notNull(),
  userRole: text("user_role").notNull(),
  
  action: text("action").notNull(),
  resource: text("resource").notNull(),
  resourceId: varchar("resource_id"),
  
  changes: jsonb("changes"),
  metadata: jsonb("metadata"),
  
  ipAddress: text("ip_address").notNull(),
  userAgent: text("user_agent"),
  endpoint: text("endpoint").notNull(),
  
  statusCode: integer("status_code").notNull(),
  errorMessage: text("error_message"),
  duration: integer("duration"),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastLogin: true,
}).extend({
  role: z.enum(userRoles).default("enfermagem"),
  email: z.string().email().optional().or(z.literal("")),
});

export const updateUserSchema = insertUserSchema.partial().extend({
  password: z.string().min(6).optional(),
});

export const insertPatientSchema = createInsertSchema(patients).omit({
  id: true,
}).extend({
  mobilidade: z.enum(["A", "D", "DA"]).nullable().optional(),
});

export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
});

export const insertImportHistorySchema = createInsertSchema(importHistory).omit({
  id: true,
});

export const insertNursingUnitTemplateSchema = createInsertSchema(nursingUnitTemplates).omit({
  id: true,
  createdAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLog).omit({
  id: true,
  timestamp: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Patient = typeof patients.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alerts.$inferSelect;
export type InsertImportHistory = z.infer<typeof insertImportHistorySchema>;
export type ImportHistory = typeof importHistory.$inferSelect;
export type InsertNursingUnitTemplate = z.infer<typeof insertNursingUnitTemplateSchema>;
export type NursingUnitTemplate = typeof nursingUnitTemplates.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLog.$inferSelect;
