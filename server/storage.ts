import { type User, type InsertUser, type UpdateUser, type Patient, type InsertPatient, type Alert, type InsertAlert, type ImportHistory, type InsertImportHistory, type NursingUnitTemplate, type InsertNursingUnitTemplate, type NursingUnit, type InsertNursingUnit, type UpdateNursingUnit, type NursingUnitChange, type InsertNursingUnitChange, type PatientsHistory, type InsertPatientsHistory, type ArchiveReason, type UserSession, type InsertUserSession, type AnalyticsEvent, type InsertAnalyticsEvent } from "@shared/schema";
import { MemStorage } from "./repositories/memory-storage";
import { postgresStorage } from "./repositories/postgres-storage";
import { env } from "./config/env";

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PatientsHistoryFilters {
  nome?: string;
  registro?: string;
  leito?: string;
  codigoAtendimento?: string;
  motivoArquivamento?: ArchiveReason;
  dsEnfermaria?: string;
  dataInicio?: Date;
  dataFim?: Date;
}

export interface IStorage {
  getAllUsers(): Promise<User[]>;
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: UpdateUser): Promise<User | undefined>;
  deactivateUser(id: string): Promise<boolean>;
  updateLastLogin(id: string): Promise<void>;
  
  getAllPatients(): Promise<Patient[]>;
  getPatientsPaginated(params: PaginationParams): Promise<PaginatedResult<Patient>>;
  getPatient(id: string): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: string, patient: Partial<InsertPatient>): Promise<Patient | undefined>;
  deletePatient(id: string): Promise<boolean>;
  upsertPatientByCodigoAtendimento(patient: InsertPatient): Promise<Patient>;
  upsertPatientByLeito(patient: InsertPatient): Promise<Patient>;

  getAllAlerts(): Promise<Alert[]>;
  getAlert(id: string): Promise<Alert | undefined>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  deleteAlert(id: string): Promise<boolean>;

  getAllImportHistory(): Promise<ImportHistory[]>;
  createImportHistory(history: Omit<InsertImportHistory, 'timestamp'>): Promise<ImportHistory>;
  getLastImport(): Promise<ImportHistory | undefined>;
  deleteOldImportHistory(daysToKeep: number): Promise<number>;
  getImportStats(): Promise<{
    total: number;
    last24h: number;
    last7d: number;
    totalImportados: number;
    totalErros: number;
    runsComSucesso: number;
    runsComErro: number;
    avgDuracao: number;
    byEnfermaria: Record<string, { count: number; importados: number; erros: number }>;
  }>;

  getAllTemplates(): Promise<NursingUnitTemplate[]>;
  getTemplate(id: string): Promise<NursingUnitTemplate | undefined>;
  getTemplateByName(name: string): Promise<NursingUnitTemplate | undefined>;
  createTemplate(template: InsertNursingUnitTemplate): Promise<NursingUnitTemplate>;
  updateTemplate(id: string, template: Partial<InsertNursingUnitTemplate>): Promise<NursingUnitTemplate | undefined>;
  deleteTemplate(id: string): Promise<boolean>;

  // Nursing Units (Enfermarias)
  getAllNursingUnits(): Promise<NursingUnit[]>;
  getNursingUnitsPaginated(params: PaginationParams): Promise<PaginatedResult<NursingUnit>>;
  getActiveNursingUnits(): Promise<NursingUnit[]>;
  getNursingUnit(id: string): Promise<NursingUnit | undefined>;
  getNursingUnitByExternalId(externalId: number): Promise<NursingUnit | undefined>;
  getNursingUnitByCodigo(codigo: string): Promise<NursingUnit | undefined>;
  createNursingUnit(unit: InsertNursingUnit): Promise<NursingUnit>;
  updateNursingUnit(id: string, unit: UpdateNursingUnit): Promise<NursingUnit | undefined>;
  deleteNursingUnit(id: string): Promise<boolean>;

  // Nursing Unit Changes (Pendências de Aprovação)
  getAllNursingUnitChanges(): Promise<NursingUnitChange[]>;
  getPendingNursingUnitChanges(): Promise<NursingUnitChange[]>;
  getNursingUnitChange(id: string): Promise<NursingUnitChange | undefined>;
  getPendingChangeByExternalId(externalId: number, changeType: string): Promise<NursingUnitChange | undefined>;
  createNursingUnitChange(change: InsertNursingUnitChange): Promise<NursingUnitChange>;
  approveNursingUnitChange(id: string, reviewedBy: string): Promise<NursingUnitChange | undefined>;
  rejectNursingUnitChange(id: string, reviewedBy: string): Promise<NursingUnitChange | undefined>;
  deleteNursingUnitChange(id: string): Promise<boolean>;
  getPendingChangesCount(): Promise<number>;

  // Patients History (Histórico de altas/transferências)
  archivePatient(patient: Patient, motivoArquivamento: ArchiveReason, leitoDestino?: string): Promise<PatientsHistory>;
  getPatientsHistoryPaginated(params: PaginationParams, filters?: PatientsHistoryFilters): Promise<PaginatedResult<PatientsHistory>>;
  getPatientsHistoryById(id: string): Promise<PatientsHistory | undefined>;
  getPatientsHistoryStats(): Promise<{
    total: number;
    last24h: number;
    last7d: number;
    last30d: number;
    byMotivo: Record<string, number>;
    byEnfermaria: Record<string, number>;
  }>;
  reactivatePatient(historyId: string): Promise<Patient>;
  deletePatientHistory(id: string): Promise<boolean>;
  getPatientHistoryByCodigoAtendimento(codigoAtendimento: string): Promise<PatientsHistory | undefined>;
  getPatientHistoryByLeito(leito: string): Promise<PatientsHistory | undefined>;
  getPatientOccupyingLeitoWithDifferentCodigo(leito: string, codigoAtendimento: string): Promise<Patient | undefined>;
  archiveAndRemovePatient(patientId: string, motivo: ArchiveReason, leitoDestino?: string): Promise<boolean>;

  // Analytics & Usage Tracking
  createSession(session: InsertUserSession): Promise<UserSession>;
  getSession(id: string): Promise<UserSession | undefined>;
  getActiveSessionByUserId(userId: string): Promise<UserSession | undefined>;
  updateSessionActivity(id: string): Promise<void>;
  endSession(id: string, logoutReason?: string): Promise<UserSession | undefined>;
  incrementSessionCounts(id: string, pageViews?: number, actions?: number): Promise<void>;
  
  createAnalyticsEvent(event: InsertAnalyticsEvent): Promise<AnalyticsEvent>;
  createAnalyticsEventsBatch(events: InsertAnalyticsEvent[]): Promise<number>;
  getAnalyticsEvents(params: AnalyticsFilters & PaginationParams): Promise<PaginatedResult<AnalyticsEvent>>;
  
  getUsageMetrics(startDate?: Date, endDate?: Date): Promise<UsageMetrics>;
  getSessionsStats(startDate?: Date, endDate?: Date): Promise<SessionStats>;
  getTopPages(limit?: number, startDate?: Date, endDate?: Date): Promise<PageStats[]>;
  getTopActions(limit?: number, startDate?: Date, endDate?: Date): Promise<ActionStats[]>;
  getUserActivity(userId: string, startDate?: Date, endDate?: Date): Promise<UserActivityStats>;
}

export interface AnalyticsFilters {
  userId?: string;
  eventType?: string;
  pagePath?: string;
  actionName?: string;
  actionCategory?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface UsageMetrics {
  totalSessions: number;
  activeSessions: number;
  totalPageViews: number;
  totalActions: number;
  uniqueUsers: number;
  avgSessionDuration: number;
  avgPageViewsPerSession: number;
}

export interface SessionStats {
  totalSessions: number;
  avgDuration: number;
  byDevice: Record<string, number>;
  byBrowser: Record<string, number>;
  byUser: Array<{ userId: string; userName: string; sessions: number }>;
}

export interface PageStats {
  pagePath: string;
  pageTitle: string | null;
  views: number;
  uniqueUsers: number;
}

export interface ActionStats {
  actionName: string;
  actionCategory: string | null;
  count: number;
  uniqueUsers: number;
}

export interface UserActivityStats {
  userId: string;
  userName: string;
  totalSessions: number;
  totalPageViews: number;
  totalActions: number;
  lastActivityAt: Date | null;
  topPages: Array<{ pagePath: string; views: number }>;
  topActions: Array<{ actionName: string; count: number }>;
}

// Initialize storage based on environment
const storage: IStorage = env.DATABASE_URL ? postgresStorage : new MemStorage();

export { storage };
