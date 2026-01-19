import { eq, desc, lt, gte, lte, sql, and, count, ilike, or, ne } from "drizzle-orm";
import { db } from "../lib/database";
import { users, patients, alerts, importHistory, nursingUnitTemplates, nursingUnits, nursingUnitChanges, patientsHistory } from "@shared/schema";
import type { User, InsertUser, UpdateUser, Patient, InsertPatient, Alert, InsertAlert, ImportHistory, InsertImportHistory, NursingUnitTemplate, InsertNursingUnitTemplate, NursingUnit, InsertNursingUnit, UpdateNursingUnit, NursingUnitChange, InsertNursingUnitChange, PatientsHistory, ArchiveReason } from "@shared/schema";
import type { IStorage, PaginationParams, PaginatedResult, PatientsHistoryFilters } from "../storage";
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
    
    // Calcula idade antes de criptografar (pois idade é integer e não está na lista de criptografia por padrão, 
    // mas o serviço de n8n já deve ter calculado. Aqui garantimos se vier manual)
    const patientToSave = { ...patient };
    
    const encryptedPatient = this.encryptPatientData(patientToSave);
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

  async upsertPatientByCodigoAtendimento(patient: InsertPatient): Promise<Patient> {
    const dsEnfermaria = patient.dsEnfermaria || '';
    if (!dsEnfermaria.startsWith('10A')) {
      throw new Error(`[BLOQUEADO] Enfermaria "${dsEnfermaria}" não pertence às unidades 22,23 (10A*). Paciente não será salvo.`);
    }
    
    const encryptedPatient = this.encryptPatientData(patient);
    
    const result = await db.insert(patients)
      .values(encryptedPatient)
      .onConflictDoUpdate({
        target: patients.codigoAtendimento,
        set: encryptedPatient
      })
      .returning();
    
    return this.decryptPatientData(result[0]);
  }

  async upsertPatientByLeito(patient: InsertPatient): Promise<Patient> {
    const dsEnfermaria = patient.dsEnfermaria || '';
    if (!dsEnfermaria.startsWith('10A')) {
      throw new Error(`[BLOQUEADO] Enfermaria "${dsEnfermaria}" não pertence às unidades 22,23 (10A*). Paciente não será salvo.`);
    }
    
    const encryptedPatient = this.encryptPatientData(patient);
    
    const result = await db.insert(patients)
      .values(encryptedPatient)
      .onConflictDoUpdate({
        target: patients.leito,
        set: encryptedPatient
      })
      .returning();
    
    return this.decryptPatientData(result[0]);
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

  // Patients History Methods (Histórico de altas/transferências)

  async archivePatient(patient: Patient, motivoArquivamento: ArchiveReason, leitoDestino?: string): Promise<PatientsHistory> {
    // Decripta os dados do paciente antes de arquivar
    const decryptedPatient = this.decryptPatientData(patient);

    // Cria snapshot completo do paciente (sem campos sensíveis criptografados)
    const dadosCompletos = { ...decryptedPatient };

    const historyRecord = {
      codigoAtendimento: decryptedPatient.codigoAtendimento || `LEITO_${decryptedPatient.leito}`,
      registro: decryptedPatient.registro,
      nome: decryptedPatient.nome,
      leito: decryptedPatient.leito,
      dataInternacao: decryptedPatient.dataInternacao,
      dsEnfermaria: decryptedPatient.dsEnfermaria,
      dsEspecialidade: decryptedPatient.dsEspecialidade,
      motivoArquivamento,
      leitoDestino,
      dadosCompletos,
      clinicalInsights: decryptedPatient.clinicalInsights,
      notasPaciente: decryptedPatient.notasPaciente,
    };

    const result = await db.insert(patientsHistory).values(historyRecord).returning();
    return result[0];
  }

  async getPatientsHistoryPaginated(params: PaginationParams, filters?: PatientsHistoryFilters): Promise<PaginatedResult<PatientsHistory>> {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const offset = (page - 1) * limit;

    // Build dynamic where conditions
    const conditions = [];

    if (filters?.nome) {
      conditions.push(ilike(patientsHistory.nome, `%${filters.nome}%`));
    }
    if (filters?.registro) {
      conditions.push(ilike(patientsHistory.registro, `%${filters.registro}%`));
    }
    if (filters?.leito) {
      conditions.push(ilike(patientsHistory.leito, `%${filters.leito}%`));
    }
    if (filters?.codigoAtendimento) {
      conditions.push(ilike(patientsHistory.codigoAtendimento, `%${filters.codigoAtendimento}%`));
    }
    if (filters?.motivoArquivamento) {
      conditions.push(eq(patientsHistory.motivoArquivamento, filters.motivoArquivamento));
    }
    if (filters?.dsEnfermaria) {
      conditions.push(ilike(patientsHistory.dsEnfermaria, `%${filters.dsEnfermaria}%`));
    }
    if (filters?.dataInicio) {
      conditions.push(gte(patientsHistory.arquivadoEm, filters.dataInicio));
    }
    if (filters?.dataFim) {
      conditions.push(lte(patientsHistory.arquivadoEm, filters.dataFim));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult, result] = await Promise.all([
      db.select({ total: count() }).from(patientsHistory).where(whereClause),
      db.select().from(patientsHistory)
        .where(whereClause)
        .orderBy(desc(patientsHistory.arquivadoEm))
        .limit(limit)
        .offset(offset)
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

  async getPatientsHistoryById(id: string): Promise<PatientsHistory | undefined> {
    const result = await db.select().from(patientsHistory).where(eq(patientsHistory.id, id)).limit(1);
    return result[0];
  }

  async getPatientsHistoryStats(): Promise<{
    total: number;
    last24h: number;
    last7d: number;
    last30d: number;
    byMotivo: Record<string, number>;
    byEnfermaria: Record<string, number>;
  }> {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [totalResult, last24hResult, last7dResult, last30dResult, allHistory] = await Promise.all([
      db.select({ count: count() }).from(patientsHistory),
      db.select({ count: count() }).from(patientsHistory).where(gte(patientsHistory.arquivadoEm, dayAgo)),
      db.select({ count: count() }).from(patientsHistory).where(gte(patientsHistory.arquivadoEm, weekAgo)),
      db.select({ count: count() }).from(patientsHistory).where(gte(patientsHistory.arquivadoEm, monthAgo)),
      db.select({
        motivoArquivamento: patientsHistory.motivoArquivamento,
        dsEnfermaria: patientsHistory.dsEnfermaria,
      }).from(patientsHistory)
    ]);

    const byMotivo: Record<string, number> = {};
    const byEnfermaria: Record<string, number> = {};

    for (const record of allHistory) {
      const motivo = record.motivoArquivamento || 'desconhecido';
      byMotivo[motivo] = (byMotivo[motivo] || 0) + 1;

      const enfermaria = record.dsEnfermaria || 'desconhecida';
      byEnfermaria[enfermaria] = (byEnfermaria[enfermaria] || 0) + 1;
    }

    return {
      total: totalResult[0]?.count || 0,
      last24h: last24hResult[0]?.count || 0,
      last7d: last7dResult[0]?.count || 0,
      last30d: last30dResult[0]?.count || 0,
      byMotivo,
      byEnfermaria,
    };
  }

  async reactivatePatient(historyId: string): Promise<Patient> {
    const historyRecord = await this.getPatientsHistoryById(historyId);
    if (!historyRecord) {
      throw new Error('Registro de histórico não encontrado');
    }

    const dadosCompletos = historyRecord.dadosCompletos as Record<string, any> || {};

    const patientData: any = {
      leito: historyRecord.leito,
      nome: historyRecord.nome,
      registro: historyRecord.registro,
      codigoAtendimento: historyRecord.codigoAtendimento,
      dataInternacao: historyRecord.dataInternacao,
      dsEnfermaria: historyRecord.dsEnfermaria,
      dsEspecialidade: historyRecord.dsEspecialidade,
      notasPaciente: historyRecord.notasPaciente,
      clinicalInsights: historyRecord.clinicalInsights,
      especialidadeRamal: dadosCompletos.especialidadeRamal || dadosCompletos.especialidade_ramal,
      dataNascimento: dadosCompletos.dataNascimento || dadosCompletos.data_nascimento,
      braden: dadosCompletos.braden,
      diagnostico: dadosCompletos.diagnostico,
      alergias: dadosCompletos.alergias,
      mobilidade: dadosCompletos.mobilidade,
      dieta: dadosCompletos.dieta,
      eliminacoes: dadosCompletos.eliminacoes,
      dispositivos: dadosCompletos.dispositivos,
      atb: dadosCompletos.atb,
      curativos: dadosCompletos.curativos,
      aporteSaturacao: dadosCompletos.aporteSaturacao || dadosCompletos.aporte_saturacao,
      exames: dadosCompletos.exames,
      cirurgia: dadosCompletos.cirurgia,
      observacoes: dadosCompletos.observacoes,
      previsaoAlta: dadosCompletos.previsaoAlta || dadosCompletos.previsao_alta,
      alerta: dadosCompletos.alerta,
      status: 'ativo',
      idEvolucao: dadosCompletos.idEvolucao || dadosCompletos.id_evolucao,
      dsLeitoCompleto: dadosCompletos.dsLeitoCompleto || dadosCompletos.ds_leito_completo,
      dsEvolucaoCompleta: dadosCompletos.dsEvolucaoCompleta || dadosCompletos.ds_evolucao_completa,
      fonteDados: 'reativacao_manual',
      dadosBrutosJson: dadosCompletos.dadosBrutosJson || dadosCompletos.dados_brutos_json,
      sexo: dadosCompletos.sexo,
      idade: dadosCompletos.idade,
    };

    const createdPatient = await this.upsertPatientByCodigoAtendimento(patientData);

    await this.deletePatientHistory(historyId);

    return createdPatient;
  }

  async deletePatientHistory(id: string): Promise<boolean> {
    const result = await db.delete(patientsHistory).where(eq(patientsHistory.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getPatientHistoryByCodigoAtendimento(codigoAtendimento: string): Promise<PatientsHistory | undefined> {
    const result = await db.select().from(patientsHistory)
      .where(eq(patientsHistory.codigoAtendimento, codigoAtendimento))
      .orderBy(desc(patientsHistory.arquivadoEm))
      .limit(1);
    return result[0];
  }

  async getPatientHistoryByLeito(leito: string): Promise<PatientsHistory | undefined> {
    const result = await db.select().from(patientsHistory)
      .where(eq(patientsHistory.leito, leito))
      .orderBy(desc(patientsHistory.arquivadoEm))
      .limit(1);
    return result[0];
  }

  /**
   * Verifica se um leito está ocupado por um paciente com código de atendimento diferente.
   * Retorna o paciente ocupando o leito, ou undefined se o leito está livre ou ocupado pelo mesmo código.
   */
  async getPatientOccupyingLeitoWithDifferentCodigo(leito: string, codigoAtendimento: string): Promise<Patient | undefined> {
    const result = await db.select().from(patients)
      .where(
        and(
          eq(patients.leito, leito),
          ne(patients.codigoAtendimento, codigoAtendimento)
        )
      )
      .limit(1);
    return result[0] ? this.decryptPatientData(result[0]) : undefined;
  }

  /**
   * Arquiva um paciente e remove da tabela principal (usado para liberar leito).
   * Retorna true se o paciente foi arquivado com sucesso.
   */
  async archiveAndRemovePatient(patientId: string, motivo: ArchiveReason, leitoDestino?: string): Promise<boolean> {
    const patient = await this.getPatient(patientId);
    if (!patient) return false;
    
    await this.archivePatient(patient, motivo, leitoDestino);
    await this.deletePatient(patientId);
    return true;
  }
}

export const postgresStorage = new PostgresStorage();
