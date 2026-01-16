import { randomUUID } from "crypto";
import type { User, InsertUser, UpdateUser, Patient, InsertPatient, Alert, InsertAlert, ImportHistory, InsertImportHistory, NursingUnitTemplate, InsertNursingUnitTemplate, NursingUnit, InsertNursingUnit, UpdateNursingUnit, NursingUnitChange, InsertNursingUnitChange, PatientsHistory, ArchiveReason } from "@shared/schema";
import type { IStorage, PaginationParams, PaginatedResult, PatientsHistoryFilters } from "../storage";

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private patients: Map<string, Patient>;
  private alerts: Map<string, Alert>;
  private importHistory: Map<string, ImportHistory>;
  private templates: Map<string, NursingUnitTemplate>;
  private nursingUnits: Map<string, NursingUnit>;
  private nursingUnitChanges: Map<string, NursingUnitChange>;
  private patientsHistory: Map<string, PatientsHistory>;

  constructor() {
    this.users = new Map();
    this.patients = new Map();
    this.alerts = new Map();
    this.importHistory = new Map();
    this.templates = new Map();
    this.nursingUnits = new Map();
    this.nursingUnitChanges = new Map();
    this.patientsHistory = new Map();
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

  async getPatientsPaginated(params: PaginationParams): Promise<PaginatedResult<Patient>> {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const offset = (page - 1) * limit;
    const all = Array.from(this.patients.values());
    const data = all.slice(offset, offset + limit);
    return {
      data,
      total: all.length,
      page,
      limit,
      totalPages: Math.ceil(all.length / limit)
    };
  }

  async getPatient(id: string): Promise<Patient | undefined> {
    return this.patients.get(id);
  }

  async createPatient(insertPatient: InsertPatient): Promise<Patient> {
    const id = randomUUID();
    const patient = { 
      ...insertPatient, 
      id,
      idade: insertPatient.idade ?? null 
    } as Patient;
    this.patients.set(id, patient);
    return patient;
  }

  async updatePatient(id: string, updates: Partial<InsertPatient>): Promise<Patient | undefined> {
    const patient = this.patients.get(id);
    if (!patient) return undefined;
    
    const updated = { 
      ...patient, 
      ...updates,
      idade: updates.idade !== undefined ? updates.idade : patient.idade
    };
    this.patients.set(id, updated);
    return updated;
  }

  async deletePatient(id: string): Promise<boolean> {
    return this.patients.delete(id);
  }

  async upsertPatientByCodigoAtendimento(insertPatient: InsertPatient): Promise<Patient> {
    const codigo = insertPatient.codigoAtendimento?.toString().trim() || '';
    if (codigo) {
      const existing = Array.from(this.patients.values()).find(p => p.codigoAtendimento === codigo);
      if (existing) {
        const updated = { ...existing, ...insertPatient, idade: insertPatient.idade ?? existing.idade };
        this.patients.set(existing.id, updated);
        return updated;
      }
    }
    return this.createPatient(insertPatient);
  }

  async upsertPatientByLeito(insertPatient: InsertPatient): Promise<Patient> {
    const leito = insertPatient.leito?.toString().trim() || '';
    if (leito) {
      const existing = Array.from(this.patients.values()).find(p => p.leito === leito);
      if (existing) {
        const updated = { ...existing, ...insertPatient, idade: insertPatient.idade ?? existing.idade };
        this.patients.set(existing.id, updated);
        return updated;
      }
    }
    return this.createPatient(insertPatient);
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
    const entries = Array.from(this.importHistory.entries());
    for (const [id, h] of entries) {
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

  // Nursing Units CRUD
  async getAllNursingUnits(): Promise<NursingUnit[]> {
    return Array.from(this.nursingUnits.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  }

  async getNursingUnitsPaginated(params: PaginationParams): Promise<PaginatedResult<NursingUnit>> {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const offset = (page - 1) * limit;
    const all = Array.from(this.nursingUnits.values()).sort((a, b) => a.nome.localeCompare(b.nome));
    const data = all.slice(offset, offset + limit);
    return {
      data,
      total: all.length,
      page,
      limit,
      totalPages: Math.ceil(all.length / limit)
    };
  }

  async getActiveNursingUnits(): Promise<NursingUnit[]> {
    return Array.from(this.nursingUnits.values())
      .filter(u => u.ativo)
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }

  async getNursingUnit(id: string): Promise<NursingUnit | undefined> {
    return this.nursingUnits.get(id);
  }

  async getNursingUnitByExternalId(externalId: number): Promise<NursingUnit | undefined> {
    return Array.from(this.nursingUnits.values()).find(u => u.externalId === externalId);
  }

  async getNursingUnitByCodigo(codigo: string): Promise<NursingUnit | undefined> {
    return Array.from(this.nursingUnits.values()).find(u => u.codigo === codigo);
  }

  async createNursingUnit(unit: InsertNursingUnit): Promise<NursingUnit> {
    const id = randomUUID();
    const record: NursingUnit = {
      ...unit,
      id,
      localizacao: unit.localizacao || null,
      descricao: unit.descricao || null,
      observacoes: unit.observacoes || null,
      ramal: unit.ramal || null,
      ativo: unit.ativo ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.nursingUnits.set(id, record);
    return record;
  }

  async updateNursingUnit(id: string, unit: UpdateNursingUnit): Promise<NursingUnit | undefined> {
    const existing = this.nursingUnits.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...unit, updatedAt: new Date() };
    this.nursingUnits.set(id, updated);
    return updated;
  }

  async deleteNursingUnit(id: string): Promise<boolean> {
    return this.nursingUnits.delete(id);
  }

  // Nursing Unit Changes (Pendências de Aprovação)
  async getAllNursingUnitChanges(): Promise<NursingUnitChange[]> {
    return Array.from(this.nursingUnitChanges.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getPendingNursingUnitChanges(): Promise<NursingUnitChange[]> {
    return Array.from(this.nursingUnitChanges.values())
      .filter(c => c.status === "pending")
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getNursingUnitChange(id: string): Promise<NursingUnitChange | undefined> {
    return this.nursingUnitChanges.get(id);
  }

  async getPendingChangeByExternalId(externalId: number, changeType: string): Promise<NursingUnitChange | undefined> {
    return Array.from(this.nursingUnitChanges.values()).find(
      c => c.externalId === externalId && c.changeType === changeType && c.status === "pending"
    );
  }

  async createNursingUnitChange(change: InsertNursingUnitChange): Promise<NursingUnitChange> {
    const id = randomUUID();
    const record: NursingUnitChange = {
      ...change,
      id,
      unitId: change.unitId || null,
      fieldChanged: change.fieldChanged || null,
      oldValue: change.oldValue || null,
      newValue: change.newValue || null,
      newData: change.newData || null,
      status: change.status || "pending",
      reviewedBy: change.reviewedBy || null,
      reviewedAt: change.reviewedAt || null,
      createdAt: new Date(),
    };
    this.nursingUnitChanges.set(id, record);
    return record;
  }

  async approveNursingUnitChange(id: string, reviewedBy: string): Promise<NursingUnitChange | undefined> {
    const change = this.nursingUnitChanges.get(id);
    if (!change) return undefined;
    const updated = { ...change, status: "approved" as const, reviewedBy, reviewedAt: new Date() };
    this.nursingUnitChanges.set(id, updated);
    return updated;
  }

  async rejectNursingUnitChange(id: string, reviewedBy: string): Promise<NursingUnitChange | undefined> {
    const change = this.nursingUnitChanges.get(id);
    if (!change) return undefined;
    const updated = { ...change, status: "rejected" as const, reviewedBy, reviewedAt: new Date() };
    this.nursingUnitChanges.set(id, updated);
    return updated;
  }

  async deleteNursingUnitChange(id: string): Promise<boolean> {
    return this.nursingUnitChanges.delete(id);
  }

  async getPendingChangesCount(): Promise<number> {
    return Array.from(this.nursingUnitChanges.values()).filter(c => c.status === "pending").length;
  }

  // Patients History Methods
  async archivePatient(patient: Patient, motivoArquivamento: ArchiveReason, leitoDestino?: string): Promise<PatientsHistory> {
    const id = randomUUID();
    const record: PatientsHistory = {
      id,
      codigoAtendimento: patient.codigoAtendimento || `LEITO_${patient.leito}`,
      registro: patient.registro,
      nome: patient.nome,
      leito: patient.leito,
      dataInternacao: patient.dataInternacao,
      dsEnfermaria: patient.dsEnfermaria,
      dsEspecialidade: patient.dsEspecialidade,
      motivoArquivamento,
      leitoDestino: leitoDestino || null,
      dadosCompletos: patient,
      clinicalInsights: patient.clinicalInsights,
      notasPaciente: patient.notasPaciente,
      arquivadoEm: new Date(),
    };
    this.patientsHistory.set(id, record);
    return record;
  }

  async getPatientsHistoryPaginated(params: PaginationParams, filters?: PatientsHistoryFilters): Promise<PaginatedResult<PatientsHistory>> {
    let records = Array.from(this.patientsHistory.values());
    
    if (filters?.nome) {
      records = records.filter(r => r.nome.toLowerCase().includes(filters.nome!.toLowerCase()));
    }
    if (filters?.motivoArquivamento) {
      records = records.filter(r => r.motivoArquivamento === filters.motivoArquivamento);
    }
    
    records.sort((a, b) => (b.arquivadoEm?.getTime() || 0) - (a.arquivadoEm?.getTime() || 0));
    
    const page = params.page || 1;
    const limit = params.limit || 50;
    const offset = (page - 1) * limit;
    const total = records.length;
    
    return {
      data: records.slice(offset, offset + limit),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getPatientsHistoryById(id: string): Promise<PatientsHistory | undefined> {
    return this.patientsHistory.get(id);
  }

  async getPatientsHistoryStats(): Promise<{
    total: number;
    last24h: number;
    last7d: number;
    last30d: number;
    byMotivo: Record<string, number>;
    byEnfermaria: Record<string, number>;
  }> {
    const records = Array.from(this.patientsHistory.values());
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const byMotivo: Record<string, number> = {};
    const byEnfermaria: Record<string, number> = {};
    let last24h = 0, last7d = 0, last30d = 0;

    for (const record of records) {
      const time = record.arquivadoEm?.getTime() || 0;
      if (time >= dayAgo.getTime()) last24h++;
      if (time >= weekAgo.getTime()) last7d++;
      if (time >= monthAgo.getTime()) last30d++;

      const motivo = record.motivoArquivamento || 'desconhecido';
      byMotivo[motivo] = (byMotivo[motivo] || 0) + 1;
      
      const enfermaria = record.dsEnfermaria || 'desconhecida';
      byEnfermaria[enfermaria] = (byEnfermaria[enfermaria] || 0) + 1;
    }

    return { total: records.length, last24h, last7d, last30d, byMotivo, byEnfermaria };
  }

  async reactivatePatient(historyId: string): Promise<Patient> {
    const historyRecord = this.patientsHistory.get(historyId);
    if (!historyRecord) {
      throw new Error('Registro de histórico não encontrado');
    }

    const dadosCompletos = historyRecord.dadosCompletos as Record<string, any> || {};

    const patientData: InsertPatient = {
      leito: historyRecord.leito,
      nome: historyRecord.nome,
      registro: historyRecord.registro ?? undefined,
      codigoAtendimento: historyRecord.codigoAtendimento,
      dataInternacao: historyRecord.dataInternacao ?? undefined,
      dsEnfermaria: historyRecord.dsEnfermaria ?? undefined,
      dsEspecialidade: historyRecord.dsEspecialidade ?? undefined,
      notasPaciente: historyRecord.notasPaciente ?? undefined,
      clinicalInsights: historyRecord.clinicalInsights as Record<string, unknown> | undefined,
      especialidadeRamal: dadosCompletos.especialidadeRamal,
      dataNascimento: dadosCompletos.dataNascimento,
      braden: dadosCompletos.braden,
      diagnostico: dadosCompletos.diagnostico,
      alergias: dadosCompletos.alergias,
      mobilidade: dadosCompletos.mobilidade,
      dieta: dadosCompletos.dieta,
      eliminacoes: dadosCompletos.eliminacoes,
      dispositivos: dadosCompletos.dispositivos,
      atb: dadosCompletos.atb,
      curativos: dadosCompletos.curativos,
      aporteSaturacao: dadosCompletos.aporteSaturacao,
      exames: dadosCompletos.exames,
      cirurgia: dadosCompletos.cirurgia,
      observacoes: dadosCompletos.observacoes,
      previsaoAlta: dadosCompletos.previsaoAlta,
      alerta: dadosCompletos.alerta,
      status: 'ativo',
      fonteDados: 'reativacao_manual',
    };

    const createdPatient = await this.upsertPatientByCodigoAtendimento(patientData);
    this.patientsHistory.delete(historyId);
    return createdPatient;
  }

  async deletePatientHistory(id: string): Promise<boolean> {
    return this.patientsHistory.delete(id);
  }

  async getPatientHistoryByCodigoAtendimento(codigoAtendimento: string): Promise<PatientsHistory | undefined> {
    for (const record of this.patientsHistory.values()) {
      if (record.codigoAtendimento === codigoAtendimento) {
        return record;
      }
    }
    return undefined;
  }

  async getPatientHistoryByLeito(leito: string): Promise<PatientsHistory | undefined> {
    for (const record of this.patientsHistory.values()) {
      if (record.leito === leito) {
        return record;
      }
    }
    return undefined;
  }
}
