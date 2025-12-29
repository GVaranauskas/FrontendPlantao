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
  sexo: text("sexo"),
  dataInternacao: text("data_internacao").notNull(),
  braden: text("braden"),
  diagnostico: text("diagnostico"),
  alergias: text("alergias"),
  mobilidade: text("mobilidade"),
  dieta: text("dieta"),
  eliminacoes: text("eliminacoes"),
  dispositivos: text("dispositivos"),
  atb: text("atb"),
  curativos: text("curativos"),
  aporteSaturacao: text("aporte_saturacao"),
  exames: text("exames"),
  cirurgia: text("cirurgia"),
  observacoes: text("observacoes"),
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
  importedAt: timestamp("imported_at").defaultNow(),
  
  // Análise clínica de IA para passagem de plantão
  clinicalInsights: jsonb("clinical_insights"),
  clinicalInsightsUpdatedAt: timestamp("clinical_insights_updated_at"),
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

// Gestão de Enfermarias/Unidades de Internação
export const nursingUnits = pgTable("nursing_units", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  externalId: integer("external_id").notNull().unique(), // idUnidadeInternacao da API
  codigo: text("codigo").notNull(), // dsUnidadeInternacao
  nome: text("nome").notNull(),
  localizacao: text("localizacao"),
  descricao: text("descricao"),
  observacoes: text("observacoes"),
  ramal: text("ramal"),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const nursingUnitChangeTypes = ["create", "update"] as const;
export type NursingUnitChangeType = typeof nursingUnitChangeTypes[number];

export const nursingUnitChangeStatuses = ["pending", "approved", "rejected"] as const;
export type NursingUnitChangeStatus = typeof nursingUnitChangeStatuses[number];

export const nursingUnitChanges = pgTable("nursing_unit_changes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  unitId: varchar("unit_id").references(() => nursingUnits.id), // null para novas unidades
  externalId: integer("external_id").notNull(), // idUnidadeInternacao da API
  changeType: text("change_type").notNull(), // 'create' ou 'update'
  fieldChanged: text("field_changed"), // campo que mudou (para updates)
  oldValue: text("old_value"),
  newValue: text("new_value"),
  newData: jsonb("new_data"), // dados completos da API para criação
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
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

export const aiCostMetrics = pgTable("ai_cost_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  
  patientId: varchar("patient_id"),
  leito: text("leito"),
  operation: text("operation").notNull(),
  
  model: text("model").notNull().default("gpt-4o-mini"),
  provider: text("provider").notNull().default("openai"),
  
  tokensUsed: integer("tokens_used").notNull().default(0),
  tokensPrompt: integer("tokens_prompt").notNull().default(0),
  tokensCompletion: integer("tokens_completion").notNull().default(0),
  
  estimatedCostCents: integer("estimated_cost_cents").notNull().default(0),
  
  cacheHit: boolean("cache_hit").notNull().default(false),
  cacheSource: text("cache_source"),
  
  durationMs: integer("duration_ms").notNull().default(0),
  
  alertLevel: text("alert_level"),
  success: boolean("success").notNull().default(true),
  errorMessage: text("error_message"),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastLogin: true,
}).extend({
  role: z.enum(userRoles).default("enfermagem"),
  email: z.string().email().optional().or(z.literal("")),
  password: z.string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um número')
    .regex(/[^A-Za-z0-9]/, 'Senha deve conter pelo menos um caractere especial'),
});

export const updateUserSchema = insertUserSchema.partial().extend({
  password: z.string().min(6).optional(),
});

export const insertPatientSchema = createInsertSchema(patients).omit({
  id: true,
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

export const insertNursingUnitSchema = createInsertSchema(nursingUnits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Schema para criação manual via UI (externalId gerado automaticamente)
export const insertNursingUnitManualSchema = insertNursingUnitSchema.extend({
  externalId: z.number().int().optional(),
});

export const updateNursingUnitSchema = insertNursingUnitSchema.partial().extend({
  descricao: z.string().optional(),
  observacoes: z.string().optional(),
  ramal: z.string().optional(),
  ativo: z.boolean().optional(),
});

export const insertNursingUnitChangeSchema = createInsertSchema(nursingUnitChanges).omit({
  id: true,
  createdAt: true,
}).extend({
  changeType: z.enum(nursingUnitChangeTypes),
  status: z.enum(nursingUnitChangeStatuses).default("pending"),
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
export type InsertNursingUnit = z.infer<typeof insertNursingUnitSchema>;
export type UpdateNursingUnit = z.infer<typeof updateNursingUnitSchema>;
export type NursingUnit = typeof nursingUnits.$inferSelect;
export type InsertNursingUnitChange = z.infer<typeof insertNursingUnitChangeSchema>;
export type NursingUnitChange = typeof nursingUnitChanges.$inferSelect;

export const insertAICostMetricSchema = createInsertSchema(aiCostMetrics).omit({
  id: true,
  timestamp: true,
});

export type InsertAICostMetric = z.infer<typeof insertAICostMetricSchema>;
export type AICostMetric = typeof aiCostMetrics.$inferSelect;
