import { type User, type InsertUser, type UpdateUser, type Patient, type InsertPatient, type Alert, type InsertAlert, type ImportHistory, type InsertImportHistory, type NursingUnitTemplate, type InsertNursingUnitTemplate, type NursingUnit, type InsertNursingUnit, type UpdateNursingUnit, type NursingUnitChange, type InsertNursingUnitChange } from "@shared/schema";
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
}

// Initialize storage based on environment
const storage: IStorage = env.DATABASE_URL ? postgresStorage : new MemStorage();

export { storage };
