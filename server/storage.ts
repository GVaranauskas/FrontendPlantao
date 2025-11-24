import { type User, type InsertUser, type Patient, type InsertPatient, type Alert, type InsertAlert } from "@shared/schema";
import { randomUUID } from "crypto";

export interface ImportHistory {
  id: string;
  enfermaria: string;
  timestamp: Date;
  total: number;
  importados: number;
  erros: number;
  detalhes: Array<{ leito: string; status: string; mensagem?: string }>;
  duracao: number;
}

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
  createImportHistory(history: Omit<ImportHistory, 'id'>): Promise<ImportHistory>;
  getLastImport(): Promise<ImportHistory | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private patients: Map<string, Patient>;
  private alerts: Map<string, Alert>;
  private importHistory: Map<string, ImportHistory>;

  constructor() {
    this.users = new Map();
    this.patients = new Map();
    this.alerts = new Map();
    this.importHistory = new Map();
    this.seedData();
  }

  private seedData() {
    // Todos os dados agora vêm exclusivamente da integração N8N
    // Os dados de exemplo foram removidos para manter o sistema limpo
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getAllPatients(): Promise<Patient[]> {
    return Array.from(this.patients.values());
  }

  async getPatient(id: string): Promise<Patient | undefined> {
    return this.patients.get(id);
  }

  async createPatient(insertPatient: InsertPatient): Promise<Patient> {
    const id = randomUUID();
    const patient = { ...insertPatient, id } as Patient;
    this.patients.set(id, patient);
    return patient;
  }

  async updatePatient(id: string, updates: Partial<InsertPatient>): Promise<Patient | undefined> {
    const patient = this.patients.get(id);
    if (!patient) return undefined;
    
    const updated = { ...patient, ...updates };
    this.patients.set(id, updated);
    return updated;
  }

  async deletePatient(id: string): Promise<boolean> {
    return this.patients.delete(id);
  }

  async getAllAlerts(): Promise<Alert[]> {
    return Array.from(this.alerts.values());
  }

  async getAlert(id: string): Promise<Alert | undefined> {
    return this.alerts.get(id);
  }

  async createAlert(insertAlert: InsertAlert): Promise<Alert> {
    const id = randomUUID();
    const alert = { ...insertAlert, id };
    this.alerts.set(id, alert);
    return alert;
  }

  async deleteAlert(id: string): Promise<boolean> {
    return this.alerts.delete(id);
  }

  async getAllImportHistory(): Promise<ImportHistory[]> {
    return Array.from(this.importHistory.values()).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async createImportHistory(history: Omit<ImportHistory, 'id'>): Promise<ImportHistory> {
    const id = randomUUID();
    const record: ImportHistory = { ...history, id };
    this.importHistory.set(id, record);
    return record;
  }

  async getLastImport(): Promise<ImportHistory | undefined> {
    const history = await this.getAllImportHistory();
    return history[0];
  }
}

export const storage = new MemStorage();
