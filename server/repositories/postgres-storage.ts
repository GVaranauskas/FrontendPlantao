import { eq, desc, lt, gte, sql } from "drizzle-orm";
import { db } from "../lib/database";
import { users, patients, alerts, importHistory, nursingUnitTemplates } from "@shared/schema";
import type { User, InsertUser, Patient, InsertPatient, Alert, InsertAlert, ImportHistory, InsertImportHistory, NursingUnitTemplate, InsertNursingUnitTemplate } from "@shared/schema";
import type { IStorage } from "../storage";

export class PostgresStorage implements IStorage {
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

  async getAllPatients(): Promise<Patient[]> {
    return await db.select().from(patients);
  }

  async getPatient(id: string): Promise<Patient | undefined> {
    const result = await db.select().from(patients).where(eq(patients.id, id)).limit(1);
    return result[0];
  }

  async createPatient(patient: InsertPatient): Promise<Patient> {
    const result = await db.insert(patients).values(patient).returning();
    return result[0];
  }

  async updatePatient(id: string, patient: Partial<InsertPatient>): Promise<Patient | undefined> {
    const result = await db.update(patients).set(patient).where(eq(patients.id, id)).returning();
    return result[0];
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
}

export const postgresStorage = new PostgresStorage();
