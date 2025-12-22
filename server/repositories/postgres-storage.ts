import { eq, desc, lt, gte, sql, and, count } from "drizzle-orm";
import { db } from "../lib/database";
import { users, patients, alerts, importHistory, nursingUnitTemplates, nursingUnits, nursingUnitChanges } from "@shared/schema";
import type { User, InsertUser, UpdateUser, Patient, InsertPatient, Alert, InsertAlert, ImportHistory, InsertImportHistory, NursingUnitTemplate, InsertNursingUnitTemplate, NursingUnit, InsertNursingUnit, UpdateNursingUnit, NursingUnitChange, InsertNursingUnitChange } from "@shared/schema";
import type { IStorage, PaginationParams, PaginatedResult } from "../storage";
import { encryptionService, SENSITIVE_PATIENT_FIELDS } from "../services/encryption.service";

export class PostgresStorage implements IStorage {
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async updateUser(id: string, user: UpdateUser): Promise<User | undefined> {
    const result = await db.update(users).set(user).where(eq(users.id, id)).returning();
    return result[0];
  }

  async deactivateUser(id: string): Promise<boolean> {
    const result = await db.update(users).set({ isActive: false }).where(eq(users.id, id));
    return (result.rowCount || 0) > 0;
  }

  async updateLastLogin(id: string): Promise<void> {
    await db.update(users).set({ lastLogin: new Date() }).where(eq(users.id, id));
  }

  private encryptPatientData(patient: InsertPatient): InsertPatient {
    return encryptionService.encryptFields(patient, SENSITIVE_PATIENT_FIELDS as unknown as Array<keyof InsertPatient>);
  }

  private decryptPatientData(patient: Patient): Patient {
    return encryptionService.decryptFields(patient, SENSITIVE_PATIENT_FIELDS as unknown as Array<keyof Patient>);
  }

  async getAllPatients(): Promise<Patient[]> {
    const result = await db.select().from(patients);
    return result.map(p => this.decryptPatientData(p));
  }

  async getPatientsPaginated(params: PaginationParams): Promise<PaginatedResult<Patient>> {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const offset = (page - 1) * limit;

    const [countResult, result] = await Promise.all([
      db.select({ total: count() }).from(patients),
      db.select().from(patients).orderBy(patients.leito).limit(limit).offset(offset)
    ]);

    const total = countResult[0]?.total || 0;

    return {
      data: result.map(p => this.decryptPatientData(p)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getPatient(id: string): Promise<Patient | undefined> {
    const result = await db.select().from(patients).where(eq(patients.id, id)).limit(1);
    return result[0] ? this.decryptPatientData(result[0]) : undefined;
  }

  async createPatient(patient: InsertPatient): Promise<Patient> {
    // PRODUÇÃO: VALIDAÇÃO OBRIGATÓRIA - apenas enfermarias 10A* (unidades 22,23)
    const dsEnfermaria = patient.dsEnfermaria || '';
    if (!dsEnfermaria.startsWith('10A')) {
      throw new Error(`[BLOQUEADO] Enfermaria "${dsEnfermaria}" não pertence às unidades 22,23 (10A*). Paciente não será salvo.`);
    }
    
    const encryptedPatient = this.encryptPatientData(patient);
    const result = await db.insert(patients).values(encryptedPatient).returning();
    return this.decryptPatientData(result[0]);
  }

  async updatePatient(id: string, patient: Partial<InsertPatient>): Promise<Patient | undefined> {
    // PRODUÇÃO: VALIDAÇÃO OBRIGATÓRIA - se dsEnfermaria está sendo atualizada, deve ser 10A*
    if (patient.dsEnfermaria && !patient.dsEnfermaria.startsWith('10A')) {
      throw new Error(`[BLOQUEADO] Enfermaria "${patient.dsEnfermaria}" não pertence às unidades 22,23 (10A*). Atualização rejeitada.`);
    }
    
    const encryptedPatient = encryptionService.encryptFields(
      patient as Record<string, unknown>, 
      SENSITIVE_PATIENT_FIELDS as unknown as Array<keyof typeof patient>
    ) as Partial<InsertPatient>;
    const result = await db.update(patients).set(encryptedPatient).where(eq(patients.id, id)).returning();
    return result[0] ? this.decryptPatientData(result[0]) : undefined;
  }

  async deletePatient(id: string): Promise<boolean> {
    const result = await db.delete(patients).where(eq(patients.id, id));
    return result.rowCount > 0;
  }

  async getAllAlerts(): Promise<Alert[]> {
    return await db.select().from(alerts);
  }

  async getAlert(id: string): Promise<Alert | undefined> {
    const result = await db.select().from(alerts).where(eq(alerts.id, id)).limit(1);
    return result[0];
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const result = await db.insert(alerts).values(alert).returning();
    return result[0];
  }

  async deleteAlert(id: string): Promise<boolean> {
    const result = await db.delete(alerts).where(eq(alerts.id, id));
    return result.rowCount > 0;
  }

  async getAllImportHistory(): Promise<ImportHistory[]> {
    return await db.select().from(importHistory).orderBy(desc(importHistory.timestamp));
  }

  async createImportHistory(history: Omit<InsertImportHistory, 'timestamp'>): Promise<ImportHistory> {
    const result = await db.insert(importHistory).values({
      ...history,
      timestamp: new Date(),
    } as InsertImportHistory).returning();
    return result[0];
  }

  async getLastImport(): Promise<ImportHistory | undefined> {
    const result = await db.select().from(importHistory).orderBy(desc(importHistory.timestamp)).limit(1);
    return result[0];
  }

  async deleteOldImportHistory(daysToKeep: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const result = await db.delete(importHistory).where(lt(importHistory.timestamp, cutoffDate));
    return result.rowCount || 0;
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

      const ts = new Date(h.timestamp);
      if (ts > dayAgo) last24h++;
      if (ts > weekAgo) last7d++;

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
    return await db.select().from(nursingUnitTemplates).where(eq(nursingUnitTemplates.isActive, 1));
  }

  async getTemplate(id: string): Promise<NursingUnitTemplate | undefined> {
    const result = await db.select().from(nursingUnitTemplates).where(eq(nursingUnitTemplates.id, id)).limit(1);
    return result[0];
  }

  async getTemplateByName(name: string): Promise<NursingUnitTemplate | undefined> {
    const result = await db.select().from(nursingUnitTemplates).where(eq(nursingUnitTemplates.name, name)).limit(1);
    return result[0];
  }

  async createTemplate(template: InsertNursingUnitTemplate): Promise<NursingUnitTemplate> {
    const result = await db.insert(nursingUnitTemplates).values(template).returning();
    return result[0];
  }

  async updateTemplate(id: string, template: Partial<InsertNursingUnitTemplate>): Promise<NursingUnitTemplate | undefined> {
    const result = await db.update(nursingUnitTemplates).set(template).where(eq(nursingUnitTemplates.id, id)).returning();
    return result[0];
  }

  async deleteTemplate(id: string): Promise<boolean> {
    const result = await db.delete(nursingUnitTemplates).where(eq(nursingUnitTemplates.id, id));
    return result.rowCount > 0;
  }

  // Nursing Units CRUD
  async getAllNursingUnits(): Promise<NursingUnit[]> {
    return await db.select().from(nursingUnits).orderBy(nursingUnits.nome);
  }

  async getNursingUnitsPaginated(params: PaginationParams): Promise<PaginatedResult<NursingUnit>> {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const offset = (page - 1) * limit;

    const [countResult, result] = await Promise.all([
      db.select({ total: count() }).from(nursingUnits),
      db.select().from(nursingUnits).orderBy(nursingUnits.nome).limit(limit).offset(offset)
    ]);

    const total = countResult[0]?.total || 0;

    return {
      data: result,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getActiveNursingUnits(): Promise<NursingUnit[]> {
    return await db.select().from(nursingUnits).where(eq(nursingUnits.ativo, true)).orderBy(nursingUnits.nome);
  }

  async getNursingUnit(id: string): Promise<NursingUnit | undefined> {
    const result = await db.select().from(nursingUnits).where(eq(nursingUnits.id, id)).limit(1);
    return result[0];
  }

  async getNursingUnitByExternalId(externalId: number): Promise<NursingUnit | undefined> {
    const result = await db.select().from(nursingUnits).where(eq(nursingUnits.externalId, externalId)).limit(1);
    return result[0];
  }

  async getNursingUnitByCodigo(codigo: string): Promise<NursingUnit | undefined> {
    const result = await db.select().from(nursingUnits).where(eq(nursingUnits.codigo, codigo)).limit(1);
    return result[0];
  }

  async createNursingUnit(unit: InsertNursingUnit): Promise<NursingUnit> {
    const result = await db.insert(nursingUnits).values(unit).returning();
    return result[0];
  }

  async updateNursingUnit(id: string, unit: UpdateNursingUnit): Promise<NursingUnit | undefined> {
    const result = await db.update(nursingUnits).set({
      ...unit,
      updatedAt: new Date(),
    }).where(eq(nursingUnits.id, id)).returning();
    return result[0];
  }

  async deleteNursingUnit(id: string): Promise<boolean> {
    const result = await db.delete(nursingUnits).where(eq(nursingUnits.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Nursing Unit Changes (Pendências de Aprovação)
  async getAllNursingUnitChanges(): Promise<NursingUnitChange[]> {
    return await db.select().from(nursingUnitChanges).orderBy(desc(nursingUnitChanges.createdAt));
  }

  async getPendingNursingUnitChanges(): Promise<NursingUnitChange[]> {
    return await db.select().from(nursingUnitChanges)
      .where(eq(nursingUnitChanges.status, "pending"))
      .orderBy(desc(nursingUnitChanges.createdAt));
  }

  async getNursingUnitChange(id: string): Promise<NursingUnitChange | undefined> {
    const result = await db.select().from(nursingUnitChanges).where(eq(nursingUnitChanges.id, id)).limit(1);
    return result[0];
  }

  async getPendingChangeByExternalId(externalId: number, changeType: string): Promise<NursingUnitChange | undefined> {
    const result = await db.select().from(nursingUnitChanges)
      .where(and(
        eq(nursingUnitChanges.externalId, externalId),
        eq(nursingUnitChanges.changeType, changeType),
        eq(nursingUnitChanges.status, "pending")
      ))
      .limit(1);
    return result[0];
  }

  async createNursingUnitChange(change: InsertNursingUnitChange): Promise<NursingUnitChange> {
    const result = await db.insert(nursingUnitChanges).values(change).returning();
    return result[0];
  }

  async approveNursingUnitChange(id: string, reviewedBy: string): Promise<NursingUnitChange | undefined> {
    const result = await db.update(nursingUnitChanges).set({
      status: "approved",
      reviewedBy,
      reviewedAt: new Date(),
    }).where(eq(nursingUnitChanges.id, id)).returning();
    return result[0];
  }

  async rejectNursingUnitChange(id: string, reviewedBy: string): Promise<NursingUnitChange | undefined> {
    const result = await db.update(nursingUnitChanges).set({
      status: "rejected",
      reviewedBy,
      reviewedAt: new Date(),
    }).where(eq(nursingUnitChanges.id, id)).returning();
    return result[0];
  }

  async deleteNursingUnitChange(id: string): Promise<boolean> {
    const result = await db.delete(nursingUnitChanges).where(eq(nursingUnitChanges.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getPendingChangesCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(nursingUnitChanges)
      .where(eq(nursingUnitChanges.status, "pending"));
    return Number(result[0]?.count || 0);
  }
}

export const postgresStorage = new PostgresStorage();
