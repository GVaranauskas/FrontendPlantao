import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, integer, boolean, index } from "drizzle-orm/pg-core";
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
  leito: text("leito").notNull().unique(),
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
  idade: integer("idade"),
  status: text("status").notNull().default("pending"),

  // Campos da API N8N de Evolução
  idEvolucao: text("id_evolucao"),
  dsEnfermaria: text("ds_enfermaria"),
  dsLeitoCompleto: text("ds_leito_completo"),
  dsEspecialidade: text("ds_especialidade"),
  codigoAtendimento: text("codigo_atendimento").unique(),
  dsEvolucaoCompleta: text("ds_evolucao_completa"),
  dhCriacaoEvolucao: timestamp("dh_criacao_evolucao"),
  fonteDados: text("fonte_dados").default("N8N_IAMSPE"),
  dadosBrutosJson: jsonb("dados_brutos_json"),
  importedAt: timestamp("imported_at").defaultNow(),

  // Análise clínica de IA para passagem de plantão
  clinicalInsights: jsonb("clinical_insights"),
  clinicalInsightsUpdatedAt: timestamp("clinical_insights_updated_at"),

  // Notas do paciente (não clínicas)
  notasPaciente: text("notas_paciente"),
  notasUpdatedAt: timestamp("notas_updated_at"),
  notasUpdatedBy: varchar("notas_updated_by").references(() => users.id),
  notasCreatedAt: timestamp("notas_created_at"),
  notasCreatedBy: varchar("notas_created_by").references(() => users.id),
}, (table) => ({
  // Índices para queries frequentes
  enfermariaIdx: index("patients_enfermaria_idx").on(table.dsEnfermaria),
  statusIdx: index("patients_status_idx").on(table.status),
  importedAtIdx: index("patients_imported_at_idx").on(table.importedAt),
  registroIdx: index("patients_registro_idx").on(table.registro),
  nomeIdx: index("patients_nome_idx").on(table.nome),
}));

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
}, (table) => ({
  // Índices para queries de auditoria
  timestampIdx: index("audit_log_timestamp_idx").on(table.timestamp),
  userIdIdx: index("audit_log_user_id_idx").on(table.userId),
  actionIdx: index("audit_log_action_idx").on(table.action),
  resourceIdx: index("audit_log_resource_idx").on(table.resource),
  statusCodeIdx: index("audit_log_status_code_idx").on(table.statusCode),
}));

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
  // Mesmas regras de senha do insert, mas opcional para updates
  password: z.string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um número')
    .regex(/[^A-Za-z0-9]/, 'Senha deve conter pelo menos um caractere especial')
    .optional(),
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

export const patientNotesHistory = pgTable("patient_notes_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").notNull().references(() => patients.id, { onDelete: 'cascade' }),
  notaAnterior: text("nota_anterior"),
  notaNova: text("nota_nova"),
  alteradoPorId: varchar("alterado_por_id").notNull().references(() => users.id),
  alteradoPorNome: text("alterado_por_nome").notNull(),
  alteradoEm: timestamp("alterado_em").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
});

export type PatientNotesHistory = typeof patientNotesHistory.$inferSelect;
export type InsertPatientNotesHistory = typeof patientNotesHistory.$inferInsert;

// Tipos de ação para eventos de notas
export const noteEventActions = ["create", "update", "delete"] as const;
export type NoteEventAction = typeof noteEventActions[number];

// Eventos de notas de pacientes (auditoria completa incluindo deleções)
export const patientNoteEvents = pgTable("patient_note_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").notNull().references(() => patients.id, { onDelete: 'cascade' }),
  patientName: text("patient_name").notNull(), // Nome do paciente para referência
  patientLeito: text("patient_leito").notNull(), // Leito para referência
  
  // Ação realizada
  action: text("action").notNull(), // 'create', 'update', 'delete'
  
  // Conteúdo da nota (criptografado)
  previousValue: text("previous_value"), // Valor anterior (null para create)
  newValue: text("new_value"), // Novo valor (null para delete)
  
  // Quem realizou a ação
  performedById: varchar("performed_by_id").notNull().references(() => users.id),
  performedByName: text("performed_by_name").notNull(),
  performedByRole: text("performed_by_role").notNull(),
  
  // Quem era o dono/editor da nota (para notificação em caso de delete)
  targetUserId: varchar("target_user_id").references(() => users.id),
  targetUserName: text("target_user_name"),
  
  // Motivo (opcional, principalmente para deleções)
  reason: text("reason"),
  
  // Metadados
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  
  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPatientNoteEventSchema = createInsertSchema(patientNoteEvents).omit({
  id: true,
  createdAt: true,
});

export type PatientNoteEvent = typeof patientNoteEvents.$inferSelect;
export type InsertPatientNoteEvent = z.infer<typeof insertPatientNoteEventSchema>;

// Notificações para usuários (alertas de sistema)
export const userNotifications = pgTable("user_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Tipo e conteúdo
  type: text("type").notNull(), // 'note_deleted', 'note_edited', etc.
  title: text("title").notNull(),
  message: text("message").notNull(),
  
  // Referência ao evento relacionado
  relatedEventId: varchar("related_event_id").references(() => patientNoteEvents.id),
  relatedPatientId: varchar("related_patient_id"),
  
  // Status
  isRead: boolean("is_read").notNull().default(false),
  readAt: timestamp("read_at"),
  
  // Metadados
  metadata: jsonb("metadata"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserNotificationSchema = createInsertSchema(userNotifications).omit({
  id: true,
  createdAt: true,
  readAt: true,
});

export type UserNotification = typeof userNotifications.$inferSelect;
export type InsertUserNotification = z.infer<typeof insertUserNotificationSchema>;

// Motivos de arquivamento de pacientes
export const archiveReasons = ["alta_hospitalar", "transferencia_leito", "obito", "registro_antigo"] as const;
export type ArchiveReason = typeof archiveReasons[number];

// Histórico de pacientes (alta/transferência)
// Tabela append-only para armazenar snapshot dos pacientes que saíram da passagem de plantão
export const patientsHistory = pgTable("patients_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  // Identificadores - podem repetir em internações diferentes do mesmo paciente
  codigoAtendimento: text("codigo_atendimento").notNull(), // único por internação
  registro: text("registro"),        // PT do paciente - repete entre internações
  nome: text("nome").notNull(),
  leito: text("leito").notNull(),

  // Contexto da internação
  dataInternacao: text("data_internacao"),
  dsEnfermaria: text("ds_enfermaria"),
  dsEspecialidade: text("ds_especialidade"),

  // Motivo do arquivamento
  motivoArquivamento: text("motivo_arquivamento").notNull(),
  leitoDestino: text("leito_destino"), // preenchido em caso de transferência

  // Snapshot completo do paciente no momento da alta (JSONB)
  dadosCompletos: jsonb("dados_completos").notNull(),

  // Insights de IA (preservados)
  clinicalInsights: jsonb("clinical_insights"),

  // Notas de enfermagem (preservadas)
  notasPaciente: text("notas_paciente"),

  // Metadados de arquivamento
  arquivadoEm: timestamp("arquivado_em").notNull().defaultNow(),
}, (table) => ({
  // Índices para queries de histórico
  codigoAtendimentoIdx: index("patients_history_codigo_atendimento_idx").on(table.codigoAtendimento),
  registroIdx: index("patients_history_registro_idx").on(table.registro),
  nomeIdx: index("patients_history_nome_idx").on(table.nome),
  enfermariaIdx: index("patients_history_enfermaria_idx").on(table.dsEnfermaria),
  motivoIdx: index("patients_history_motivo_idx").on(table.motivoArquivamento),
  arquivadoEmIdx: index("patients_history_arquivado_em_idx").on(table.arquivadoEm),
}));

export const insertPatientsHistorySchema = createInsertSchema(patientsHistory).omit({
  id: true,
  arquivadoEm: true,
});

export type PatientsHistory = typeof patientsHistory.$inferSelect;
export type InsertPatientsHistory = z.infer<typeof insertPatientsHistorySchema>;
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
