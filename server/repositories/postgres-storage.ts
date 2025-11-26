import { eq, desc } from "drizzle-orm";
import { db } from "../lib/database";
import { users, patients, alerts, importHistory } from "@shared/schema";
import type { User, InsertUser, Patient, InsertPatient, Alert, InsertAlert, ImportHistory, InsertImportHistory } from "@shared/schema";
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
}

export const postgresStorage = new PostgresStorage();
