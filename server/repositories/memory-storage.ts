import { randomUUID } from "crypto";
import type { User, InsertUser, Patient, InsertPatient, Alert, InsertAlert, ImportHistory, InsertImportHistory, NursingUnitTemplate, InsertNursingUnitTemplate } from "@shared/schema";
import type { IStorage } from "../storage";

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private patients: Map<string, Patient>;
  private alerts: Map<string, Alert>;
  private importHistory: Map<string, ImportHistory>;
  private templates: Map<string, NursingUnitTemplate>;

  constructor() {
    this.users = new Map();
    this.patients = new Map();
    this.alerts = new Map();
    this.importHistory = new Map();
    this.templates = new Map();
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

  async createImportHistory(history: Omit<InsertImportHistory, 'timestamp'>): Promise<ImportHistory> {
    const id = randomUUID();
    const record: ImportHistory = { ...history, id, timestamp: new Date() } as ImportHistory;
    this.importHistory.set(id, record);
    return record;
  }

  async getLastImport(): Promise<ImportHistory | undefined> {
    const history = await this.getAllImportHistory();
    return history[0];
  }

  async deleteOldImportHistory(daysToKeep: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    let deleted = 0;
    for (const [id, h] of this.importHistory) {
      if (h.timestamp < cutoffDate) {
        this.importHistory.delete(id);
        deleted++;
      }
    }
    return deleted;
  }

  async getImportStats(): Promise<{
    total: number;
    last24h: number;
    last7d: number;
    totalImportados: number;
    totalErros: number;
    runsComSucesso: number;
    runsComErro: number;
    avgDuracao: number;
    byEnfermaria: Record<string, { count: number; importados: number; erros: number }>;
  }> {
    const allHistory = await this.getAllImportHistory();
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const byEnfermaria: Record<string, { count: number; importados: number; erros: number }> = {};

    let totalImportados = 0;
    let totalErros = 0;
    let totalDuracao = 0;
    let last24h = 0;
    let last7d = 0;
    let runsComSucesso = 0;
    let runsComErro = 0;

    for (const h of allHistory) {
      totalImportados += h.importados || 0;
      totalErros += h.erros || 0;
      totalDuracao += h.duracao || 0;

      if ((h.erros || 0) === 0) {
        runsComSucesso++;
      } else {
        runsComErro++;
      }

      if (h.timestamp > dayAgo) last24h++;
      if (h.timestamp > weekAgo) last7d++;

      if (!byEnfermaria[h.enfermaria]) {
        byEnfermaria[h.enfermaria] = { count: 0, importados: 0, erros: 0 };
      }
      byEnfermaria[h.enfermaria].count++;
      byEnfermaria[h.enfermaria].importados += h.importados || 0;
      byEnfermaria[h.enfermaria].erros += h.erros || 0;
    }

    return {
      total: allHistory.length,
      last24h,
      last7d,
      totalImportados,
      totalErros,
      runsComSucesso,
      runsComErro,
      avgDuracao: allHistory.length > 0 ? Math.round(totalDuracao / allHistory.length) : 0,
      byEnfermaria,
    };
  }

  async getAllTemplates(): Promise<NursingUnitTemplate[]> {
    return Array.from(this.templates.values());
  }

  async getTemplate(id: string): Promise<NursingUnitTemplate | undefined> {
    return this.templates.get(id);
  }

  async getTemplateByName(name: string): Promise<NursingUnitTemplate | undefined> {
    return Array.from(this.templates.values()).find(t => t.name === name);
  }

  async createTemplate(template: InsertNursingUnitTemplate): Promise<NursingUnitTemplate> {
    const id = randomUUID();
    const record: NursingUnitTemplate = {
      ...template,
      id,
      createdAt: new Date(),
    } as NursingUnitTemplate;
    this.templates.set(id, record);
    return record;
  }

  async updateTemplate(id: string, template: Partial<InsertNursingUnitTemplate>): Promise<NursingUnitTemplate | undefined> {
    const existing = this.templates.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...template };
    this.templates.set(id, updated);
    return updated;
  }

  async deleteTemplate(id: string): Promise<boolean> {
    return this.templates.delete(id);
  }
}
