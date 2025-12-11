import { type User, type InsertUser, type UpdateUser, type Patient, type InsertPatient, type Alert, type InsertAlert, type ImportHistory, type InsertImportHistory, type NursingUnitTemplate, type InsertNursingUnitTemplate, type Enfermaria, type InsertEnfermaria, type UpdateEnfermaria, type PendingEnfermariaSync, type InsertPendingEnfermariaSync } from "@shared/schema";
import { MemStorage } from "./repositories/memory-storage";
import { postgresStorage } from "./repositories/postgres-storage";

export interface IStorage {
  getAllUsers(): Promise<User[]>;
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: UpdateUser): Promise<User | undefined>;
  deactivateUser(id: string): Promise<boolean>;
  updateLastLogin(id: string): Promise<void>;
  
  getAllPatients(): Promise<Patient[]>;
  getPatient(id: string): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: string, patient: Partial<InsertPatient>): Promise<Patient | undefined>;
  deletePatient(id: string): Promise<boolean>;

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

  // Enfermarias (Nursing Units)
  getAllEnfermarias(): Promise<Enfermaria[]>;
  getEnfermaria(id: string): Promise<Enfermaria | undefined>;
  getEnfermariaByIdExterno(idExterno: number): Promise<Enfermaria | undefined>;
  getEnfermariaByCodigo(codigo: string): Promise<Enfermaria | undefined>;
  createEnfermaria(enfermaria: InsertEnfermaria): Promise<Enfermaria>;
  updateEnfermaria(id: string, enfermaria: UpdateEnfermaria): Promise<Enfermaria | undefined>;
  deleteEnfermaria(id: string): Promise<boolean>;

  // Pending Enfermaria Sync
  getAllPendingEnfermariaSync(): Promise<PendingEnfermariaSync[]>;
  getPendingEnfermariaSync(id: string): Promise<PendingEnfermariaSync | undefined>;
  getPendingEnfermariaSyncByStatus(status: string): Promise<PendingEnfermariaSync[]>;
  createPendingEnfermariaSync(sync: InsertPendingEnfermariaSync): Promise<PendingEnfermariaSync>;
  updatePendingEnfermariaSync(id: string, data: Partial<PendingEnfermariaSync>): Promise<PendingEnfermariaSync | undefined>;
  deletePendingEnfermariaSync(id: string): Promise<boolean>;
  deleteAllPendingEnfermariaSync(): Promise<number>;
}

// Initialize storage based on environment
const storage: IStorage = process.env.DATABASE_URL ? postgresStorage : new MemStorage();

export { storage };
