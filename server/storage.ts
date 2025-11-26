import { type User, type InsertUser, type Patient, type InsertPatient, type Alert, type InsertAlert, type ImportHistory, type InsertImportHistory } from "@shared/schema";
import { MemStorage } from "./repositories/memory-storage";
import { postgresStorage } from "./repositories/postgres-storage";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
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
}

// Initialize storage based on environment
const storage: IStorage = process.env.DATABASE_URL ? postgresStorage : new MemStorage();

export { storage };
