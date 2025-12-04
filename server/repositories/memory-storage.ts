import { randomUUID } from "crypto";
import type { User, InsertUser, UpdateUser, Patient, InsertPatient, Alert, InsertAlert, ImportHistory, InsertImportHistory, NursingUnitTemplate, InsertNursingUnitTemplate, Enfermaria, InsertEnfermaria, UpdateEnfermaria } from "@shared/schema";
import type { IStorage } from "../storage";

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private patients: Map<string, Patient>;
  private alerts: Map<string, Alert>;
  private importHistory: Map<string, ImportHistory>;
  private templates: Map<string, NursingUnitTemplate>;
  private enfermarias: Map<string, Enfermaria>;

  constructor() {
    this.users = new Map();
    this.patients = new Map();
    this.alerts = new Map();
    this.importHistory = new Map();
    this.templates = new Map();
    this.enfermarias = new Map();
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
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
    const user: User = { 
      ...insertUser, 
      id,
      email: insertUser.email || null,
      role: insertUser.role || "enfermagem",
      isActive: insertUser.isActive ?? true,
      createdAt: new Date(),
      lastLogin: null,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: UpdateUser): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updated = { ...user, ...updates };
    this.users.set(id, updated);
    return updated;
  }

  async deactivateUser(id: string): Promise<boolean> {
    const user = this.users.get(id);
    if (!user) return false;
    user.isActive = false;
    this.users.set(id, user);
    return true;
  }

  async updateLastLogin(id: string): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.lastLogin = new Date();
      this.users.set(id, user);
    }
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

  async getAllEnfermarias(): Promise<Enfermaria[]> {
    return Array.from(this.enfermarias.values()).sort((a, b) => a.codigo.localeCompare(b.codigo));
  }

  async getEnfermaria(id: string): Promise<Enfermaria | undefined> {
    return this.enfermarias.get(id);
  }

  async getEnfermariaByCodigo(codigo: string): Promise<Enfermaria | undefined> {
    return Array.from(this.enfermarias.values()).find(e => e.codigo === codigo);
  }

  async getActiveEnfermarias(): Promise<Enfermaria[]> {
    return Array.from(this.enfermarias.values())
      .filter(e => e.ativo)
      .sort((a, b) => a.codigo.localeCompare(b.codigo));
  }

  async createEnfermaria(enfermaria: InsertEnfermaria): Promise<Enfermaria> {
    const id = randomUUID();
    const record: Enfermaria = {
      ...enfermaria,
      id,
      flowId: enfermaria.flowId || "1a2b3c",
      descricao: enfermaria.descricao || null,
      ativo: enfermaria.ativo ?? true,
      ultimaSync: null,
      createdAt: new Date(),
    };
    this.enfermarias.set(id, record);
    return record;
  }

  async updateEnfermaria(id: string, enfermaria: UpdateEnfermaria): Promise<Enfermaria | undefined> {
    const existing = this.enfermarias.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...enfermaria };
    this.enfermarias.set(id, updated);
    return updated;
  }

  async deleteEnfermaria(id: string): Promise<boolean> {
    return this.enfermarias.delete(id);
  }

  async updateEnfermariaLastSync(id: string): Promise<void> {
    const existing = this.enfermarias.get(id);
    if (existing) {
      existing.ultimaSync = new Date();
      this.enfermarias.set(id, existing);
    }
  }
}
