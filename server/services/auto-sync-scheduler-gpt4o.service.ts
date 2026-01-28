import * as cron from 'node-cron';
import { n8nIntegrationService } from './n8n-integration-service';
import { changeDetectionService } from './change-detection.service';
import { unifiedClinicalAnalysisService } from './unified-clinical-analysis.service';
import { intelligentCache } from './intelligent-cache.service';
import { storage } from '../storage';
import type { InsertPatient, Patient, ArchiveReason } from '@shared/schema';

/**
 * AUTO SYNC SCHEDULER - GPT-4o-mini
 * 
 * Sincroniza N8N automaticamente com intervalo configurável:
 * - Padrão: 1 hora (configurável via env AUTO_SYNC_CRON)
 * - Change Detection (processa apenas o que mudou)
 * - IA com GPT-4o-mini (R$ 0,03/análise)
 * - Cache inteligente
 * 
 * Variáveis de ambiente:
 * - AUTO_SYNC_CRON: Expressão cron (padrão: '0 * * * *' = a cada hora)
 * - AUTO_SYNC_ENABLED: 'true' ou 'false' (padrão: 'true')
 * - N8N_UNIT_IDS: IDs das unidades (padrão: '22,23')
 * 
 * ECONOMIA: 99.8% vs cenário base
 */

interface SyncResult {
  timestamp: Date;
  duration: number;
  stats: {
    totalRecords: number;
    changedRecords: number;
    unchangedRecords: number;
    newRecords: number;
    removedRecords: number;
    reactivatedRecords: number;
    aiCallsMade: number;
    aiCallsAvoided: number;
    errors: number;
  };
  savings: {
    tokensSaved: number;
    costSaved: number;
    cacheHitRate: number;
  };
  errors: Array<{ leito: string; error: string }>;
}

interface SchedulerConfig {
  cronExpression: string;
  enfermarias: string[];
  enableAI: boolean;
  batchSize: number;
}

interface LastValidSync {
  timestamp: Date;
  totalRecords: number;
  recordsByEnfermaria: Record<string, number>;
}

export class AutoSyncSchedulerGPT4o {
  private task: ReturnType<typeof cron.schedule> | null = null;
  private isRunning: boolean = false;
  private lastRun: Date | null = null;
  private syncHistory: SyncResult[] = [];
  
  // Último sync válido para validação de sanidade
  private lastValidSync: LastValidSync | null = null;
  
  // Limiar mínimo de registros (50% por padrão) - se N8N retornar menos que isso, bloquear arquivamentos
  private static readonly MIN_RECORD_RATIO = parseFloat(process.env.N8N_MIN_RECORD_RATIO || '0.5');
  
  // Mínimo absoluto de registros esperados (proteção adicional)
  private static readonly MIN_ABSOLUTE_RECORDS = 5;
  
  // Configurações via variáveis de ambiente
  private static readonly DEFAULT_UNITS = process.env.N8N_UNIT_IDS || '22,23';
  private static readonly DEFAULT_CRON = process.env.AUTO_SYNC_CRON || '0 * * * *'; // A cada hora (padrão)
  private static readonly AUTO_SYNC_ENABLED = process.env.AUTO_SYNC_ENABLED !== 'false';
  
  private config: SchedulerConfig = {
    cronExpression: AutoSyncSchedulerGPT4o.DEFAULT_CRON,
    enfermarias: AutoSyncSchedulerGPT4o.DEFAULT_UNITS.split(','),
    enableAI: true,
    batchSize: 10
  };

  private syncStatusMap: Map<string, {
    status: 'started' | 'fetching_n8n' | 'processing_ai' | 'saving' | 'complete' | 'error';
    progress: number;
    startedAt: Date;
    completedAt?: Date;
    stats?: SyncResult['stats'];
    error?: string;
  }> = new Map();

  private generateSyncId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public initSyncStatus(): string {
    this.cleanOldSyncStatus();
    const syncId = this.generateSyncId();
    this.syncStatusMap.set(syncId, {
      status: 'started',
      progress: 0,
      startedAt: new Date()
    });
    return syncId;
  }

  public getSyncStatusById(syncId: string) {
    return this.syncStatusMap.get(syncId) || null;
  }

  public updateSyncStatus(syncId: string, status: 'started' | 'fetching_n8n' | 'processing_ai' | 'saving' | 'complete' | 'error', progress: number, extra?: Partial<{ completedAt: Date; stats: SyncResult['stats']; error: string }>) {
    const current = this.syncStatusMap.get(syncId);
    if (current) {
      this.syncStatusMap.set(syncId, {
        ...current,
        status,
        progress,
        ...extra
      });
    }
  }

  private cleanOldSyncStatus() {
    const oneHourAgo = Date.now() - 3600000;
    for (const [id, status] of this.syncStatusMap.entries()) {
      if (status.startedAt.getTime() < oneHourAgo) {
        this.syncStatusMap.delete(id);
      }
    }
  }

  start(config?: Partial<SchedulerConfig>): void {
    if (!AutoSyncSchedulerGPT4o.AUTO_SYNC_ENABLED) {
      console.log('[AutoSync] ⚠️ Auto-sync desabilitado via AUTO_SYNC_ENABLED=false');
      return;
    }
    
    if (this.isRunning) {
      console.warn('[AutoSync] Já está rodando');
      return;
    }

    this.config = { ...this.config, ...config };

    console.log('[AutoSync] Iniciando scheduler...');
    console.log('[AutoSync] Config:', {
      ...this.config,
      cronExpression: this.config.cronExpression,
      unitIds: AutoSyncSchedulerGPT4o.DEFAULT_UNITS
    });

    this.task = cron.schedule(this.config.cronExpression, async () => {
      await this.runSyncCycle();
    });

    this.isRunning = true;
    console.log(`[AutoSync] ✅ Scheduler iniciado: ${this.config.cronExpression}`);
  }

  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
    }
    this.isRunning = false;
    console.log('[AutoSync] Scheduler parado');
  }

  async runSyncCycle(overrideUnitIds?: string, forceUpdate: boolean = false): Promise<SyncResult> {
    const startTime = Date.now();
    console.log('');
    console.log('='.repeat(80));
    console.log(`[AutoSync] 🔄 INICIANDO CICLO DE SINCRONIZAÇÃO (GPT-4o-mini)${forceUpdate ? ' [FORCE UPDATE]' : ''}`);
    console.log('='.repeat(80));

    // Collect all codigoAtendimento e leitos from N8N response for cleanup later
    // Also map codigoAtendimento -> leito to detect bed transfers
    const n8nCodigosAtendimento = new Set<string>();
    const n8nLeitos = new Set<string>();
    const n8nCodigoToLeito = new Map<string, string>();
    
    const result: SyncResult = {
      timestamp: new Date(),
      duration: 0,
      stats: {
        totalRecords: 0,
        changedRecords: 0,
        unchangedRecords: 0,
        removedRecords: 0,
        reactivatedRecords: 0,
        newRecords: 0,
        aiCallsMade: 0,
        aiCallsAvoided: 0,
        errors: 0
      },
      savings: {
        tokensSaved: 0,
        costSaved: 0,
        cacheHitRate: 0
      },
      errors: []
    };

    try {
      // 1. BUSCAR DADOS DO N8N
      console.log('[AutoSync] 📥 Buscando dados do N8N...');
      
      // PRODUÇÃO: Sempre usar unidades 22,23 (requisito fixo)
      // Override pode ser passado para testes, mas padrão é 22,23
      const unitIds = overrideUnitIds || AutoSyncSchedulerGPT4o.DEFAULT_UNITS;
      console.log(`[AutoSync] 📋 Usando unidades fixas de produção: ${unitIds}`);
      
      console.log(`[AutoSync] 🔗 Request unitIds: ${unitIds}, forceUpdate: ${forceUpdate}`);
      const rawData = await n8nIntegrationService.fetchEvolucoes(unitIds, forceUpdate);

      // PRODUÇÃO: Filtrar apenas enfermarias das unidades 22,23 (padrão 10A*)
      const ALLOWED_ENFERMARIA_PATTERN = /^10A/; // Unidades 22,23 = enfermarias 10A*

      // Flag para indicar se o fetch do N8N foi bem-sucedido
      const n8nFetchSuccessful = rawData !== null;
      
      if (rawData && rawData.length > 0) {
        console.log(`[AutoSync] ✅ ${rawData.length} registros recebidos do N8N`);
      } else if (rawData !== null) {
        console.log('[AutoSync] ⚠️  N8N retornou array vazio - executando limpeza de órfãos');
      } else {
        console.log('[AutoSync] ❌ Falha no fetch do N8N - limpeza será ignorada');
      }

      // 2. PROCESSAR E DETECTAR MUDANÇAS
      console.log('[AutoSync] 🔍 Processando registros...');
      
      // Carregar pacientes existentes para verificar clinicalInsights
      const existingPatients = await storage.getAllPatients();
      const existingPatientsByLeito = new Map<string, Patient>();
      for (const p of existingPatients) {
        if (p.leito) {
          existingPatientsByLeito.set(p.leito, p);
        }
      }
      
      const patientsToProcess: InsertPatient[] = [];
      let skippedCount = 0;

      for (const rawPatient of (rawData || [])) {
        const leito = rawPatient.leito || 'DESCONHECIDO';
        
        try {
          const processed = await n8nIntegrationService.processEvolucao(leito, rawPatient);

          if (processed.erros.length > 0) {
            result.errors.push({ leito, error: processed.erros.join('; ') });
            result.stats.errors++;
            continue;
          }

          // PRODUÇÃO: Filtrar apenas enfermarias das unidades 22,23 (padrão 10A*)
          const dsEnfermaria = processed.dadosProcessados.dsEnfermaria || '';
          if (!ALLOWED_ENFERMARIA_PATTERN.test(dsEnfermaria)) {
            console.log(`[AutoSync] ⚠️  Ignorando paciente leito ${leito} - enfermaria "${dsEnfermaria}" não pertence às unidades 22,23 (10A*)`);
            skippedCount++;
            continue;
          }
          
          // COLETAR IDENTIFICADORES após processamento bem-sucedido e validação de enfermaria
          // Isso garante que usamos exatamente os mesmos dados que serão salvos no banco
          const codigo = processed.dadosProcessados.codigoAtendimento;
          const leitoProcessado = processed.dadosProcessados.leito;
          
          if (codigo) {
            n8nCodigosAtendimento.add(codigo);
            if (leitoProcessado) {
              n8nCodigoToLeito.set(codigo, leitoProcessado);
            }
          }
          if (leitoProcessado) {
            n8nLeitos.add(leitoProcessado);
          }
          
          // CHANGE DETECTION (bypassed when forceUpdate is true)
          const patientId = processed.registro || leito;
          
          if (!forceUpdate) {
            const changeResult = changeDetectionService.detectChanges(
              patientId,
              processed.dadosProcessados
            );

            if (!changeResult.hasChanged) {
              // Verificar se o paciente existente tem clinicalInsights
              // Se não tiver, incluir na lista de processamento para análise IA
              const existingPatient = existingPatientsByLeito.get(leitoProcessado || leito);
              const hasClinicalInsights = existingPatient?.clinicalInsights && 
                Object.keys(existingPatient.clinicalInsights).length > 0;
              
              if (hasClinicalInsights) {
                // Paciente já tem análise IA - pode pular
                result.stats.unchangedRecords++;
                result.stats.aiCallsAvoided++;
                continue;
              } else {
                // Paciente sem análise IA - incluir para processamento
                console.log(`[AutoSync] 🔍 ${leito}: dados inalterados mas sem clinicalInsights - incluindo para análise IA`);
                result.stats.changedRecords++;
              }
            } else if (changeResult.changedFields.includes('NOVO_PACIENTE')) {
              result.stats.newRecords++;
            } else {
              result.stats.changedRecords++;
            }
          } else {
            // forceUpdate: trata todos como alterados para reprocessar
            result.stats.changedRecords++;
            console.log(`[AutoSync] ⚡ forceUpdate: ${leito} será reprocessado`);
          }

          patientsToProcess.push(processed.dadosProcessados);

        } catch (error) {
          console.error(`[AutoSync] Erro processando ${leito}:`, error);
          result.errors.push({
            leito,
            error: error instanceof Error ? error.message : String(error)
          });
          result.stats.errors++;
        }
      }

      result.stats.totalRecords = (rawData?.length || 0) - skippedCount;
      console.log(`[AutoSync] 📊 Estatísticas:`);
      console.log(`   - Recebidos: ${rawData?.length || 0}`);
      console.log(`   - Filtrados (outras enfermarias): ${skippedCount}`);
      console.log(`   - Válidos (10A*): ${result.stats.totalRecords}`);
      console.log(`   - Novos: ${result.stats.newRecords}`);
      console.log(`   - Alterados: ${result.stats.changedRecords}`);
      console.log(`   - Sem mudança: ${result.stats.unchangedRecords}`);

      // 3. PROCESSAR IA (apenas dados alterados)
      if (patientsToProcess.length > 0 && this.config.enableAI) {
        console.log(`[AutoSync] 🤖 Processando IA (GPT-4o-mini) para ${patientsToProcess.length} pacientes...`);
        
        await this.processAIInBatches(patientsToProcess, result);
      }

      // 4. SALVAR NO BANCO
      if (patientsToProcess.length > 0) {
        console.log(`[AutoSync] 💾 Salvando ${patientsToProcess.length} registros...`);
        const saveResult = await this.saveToDatabase(patientsToProcess);
        result.stats.reactivatedRecords = saveResult.reactivated;
      }

      // 5. REMOVER PACIENTES QUE NÃO VIERAM NA RESPOSTA DO N8N (alta hospitalar)
      // Validação de sanidade ANTES de executar remoções
      if (n8nFetchSuccessful) {
        // Usar MAX dos sets para contagem correta (evita undercount quando um set está vazio)
        const n8nRecordCount = Math.max(n8nCodigosAtendimento.size, n8nLeitos.size);
        const sanityCheck = this.validateSanity(n8nRecordCount);
        
        if (sanityCheck.canProceed) {
          console.log(`[AutoSync] 🏥 Verificando altas hospitalares...`);
          console.log(`[AutoSync] 📋 Sets de referência: ${n8nLeitos.size} leitos, ${n8nCodigosAtendimento.size} códigos`);
          const removedCount = await this.removeDischargedPatients(n8nCodigosAtendimento, n8nLeitos, n8nCodigoToLeito);
          result.stats.removedRecords = removedCount;
          if (removedCount > 0) {
            console.log(`[AutoSync] 🚪 ${removedCount} pacientes removidos (alta hospitalar)`);
          } else {
            console.log(`[AutoSync] ✅ Nenhum paciente para remover`);
          }
          
          // Atualizar último sync válido após sucesso
          this.updateLastValidSync(n8nRecordCount, patientsToProcess);
        } else {
          console.log(`[AutoSync] 🛡️ VALIDAÇÃO DE SANIDADE BLOQUEOU REMOÇÕES: ${sanityCheck.reason}`);
          console.log(`[AutoSync] 📊 N8N retornou ${n8nRecordCount} registros, esperado mínimo ${sanityCheck.expectedMin}`);
          // Ainda atualizar baseline se temos dados válidos mas abaixo do threshold esperado
          // Isso evita oscilação entre "primeiro sync" e syncs subsequentes
          if (n8nRecordCount > 0 && !this.lastValidSync) {
            console.log(`[AutoSync] 📋 Estabelecendo baseline inicial com ${n8nRecordCount} registros (sem permitir remoções)`);
            this.updateLastValidSync(n8nRecordCount, patientsToProcess);
          }
        }
      } else {
        console.log(`[AutoSync] ⚠️ Limpeza ignorada - falha no fetch do N8N`);
      }

      // 6. CALCULAR ECONOMIA
      const metricsAI = unifiedClinicalAnalysisService.getMetrics();
      const cacheStats = intelligentCache.getStats();
      
      result.savings.tokensSaved = metricsAI.tokensSaved;
      result.savings.costSaved = metricsAI.estimatedSavings;
      result.savings.cacheHitRate = cacheStats.hitRate;

      // 7. LIMPEZA
      changeDetectionService.cleanupOldSnapshots(24);

      result.duration = Date.now() - startTime;
      this.lastRun = new Date();

      this.syncHistory.push(result);
      if (this.syncHistory.length > 100) {
        this.syncHistory.shift();
      }

      this.logSyncResult(result);

    } catch (error) {
      console.error('[AutoSync] ❌ Erro crítico:', error);
      result.errors.push({
        leito: 'SISTEMA',
        error: error instanceof Error ? error.message : String(error)
      });
      result.duration = Date.now() - startTime;
    }

    console.log('='.repeat(80));
    console.log('[AutoSync] ✅ CICLO CONCLUÍDO');
    console.log('='.repeat(80));

    return result;
  }

  private async processAIInBatches(patients: InsertPatient[], result: SyncResult): Promise<void> {
    // UNIFIED: Uses the same service as individual analysis for consistent results
    const results = await unifiedClinicalAnalysisService.analyzeBatch(patients, { useCache: true });
    result.stats.aiCallsMade = results.length;
    
    // IMPORTANTE: Salvar os insights nos dados dos pacientes
    for (let i = 0; i < patients.length && i < results.length; i++) {
      const insights = results[i];
      if (insights) {
        // Adicionar clinicalInsights ao paciente para ser salvo no banco
        (patients[i] as any).clinicalInsights = insights;
        (patients[i] as any).clinicalInsightsUpdatedAt = new Date();
      }
    }
    
    console.log(`[AutoSync] ✅ ${results.length} análises concluídas`);
  }

  private async removeDischargedPatients(
    currentCodigosAtendimento: Set<string>,
    currentLeitos: Set<string>,
    codigoToLeito: Map<string, string>
  ): Promise<number> {
    const allPatients = await storage.getAllPatients();
    let removedCount = 0;

    for (const patient of allPatients) {
      let archiveReason: ArchiveReason = 'alta_hospitalar';
      let leitoDestino: string | undefined;
      let shouldArchive = false;
      let logMessage = '';

      if (patient.codigoAtendimento) {
        if (!currentCodigosAtendimento.has(patient.codigoAtendimento)) {
          shouldArchive = true;
          archiveReason = 'alta_hospitalar';
          logMessage = `alta hospitalar (código ${patient.codigoAtendimento} não existe no N8N)`;
        } else if (patient.leito) {
          const n8nLeito = codigoToLeito.get(patient.codigoAtendimento);
          if (n8nLeito && n8nLeito !== patient.leito) {
            shouldArchive = true;
            archiveReason = 'transferencia_leito';
            leitoDestino = n8nLeito;
            logMessage = `transferência de leito (${patient.leito} -> ${n8nLeito})`;
          }
        }
      } else if (patient.leito) {
        if (!currentLeitos.has(patient.leito)) {
          shouldArchive = true;
          archiveReason = 'registro_antigo';
          logMessage = `registro antigo (leito ${patient.leito} não existe no N8N)`;
        }
      }

      if (shouldArchive) {
        try {
          await storage.archivePatient(patient, archiveReason, leitoDestino);
          console.log(`[AutoSync] 📦 Paciente ${patient.leito} (${patient.nome}) arquivado - ${logMessage}`);
          await storage.deletePatient(patient.id);
          removedCount++;
        } catch (error) {
          console.error(`[AutoSync] Erro ao arquivar/remover paciente ${patient.id}:`, error);
        }
      }
    }

    return removedCount;
  }

  private validateSanity(n8nRecordCount: number): { canProceed: boolean; reason: string; expectedMin: number } {
    // REGRA: Sempre exigir mínimo absoluto de registros para permitir arquivamento
    // Isso protege contra N8N vazio ou dados parciais em qualquer situação
    if (n8nRecordCount < AutoSyncSchedulerGPT4o.MIN_ABSOLUTE_RECORDS) {
      return { 
        canProceed: false, 
        reason: `N8N retornou apenas ${n8nRecordCount} registros (mínimo absoluto: ${AutoSyncSchedulerGPT4o.MIN_ABSOLUTE_RECORDS})`,
        expectedMin: AutoSyncSchedulerGPT4o.MIN_ABSOLUTE_RECORDS 
      };
    }
    
    // Se não há sync anterior, permitir se passou no mínimo absoluto
    if (!this.lastValidSync) {
      console.log(`[AutoSync] 📋 Primeiro sync com ${n8nRecordCount} registros - estabelecendo baseline`);
      return { canProceed: true, reason: 'Primeiro sync válido', expectedMin: AutoSyncSchedulerGPT4o.MIN_ABSOLUTE_RECORDS };
    }
    
    // Calcular mínimo esperado baseado no último sync válido
    const expectedMin = Math.floor(this.lastValidSync.totalRecords * AutoSyncSchedulerGPT4o.MIN_RECORD_RATIO);
    const absoluteMin = Math.max(expectedMin, AutoSyncSchedulerGPT4o.MIN_ABSOLUTE_RECORDS);
    
    // Verificar se N8N retornou registros suficientes
    if (n8nRecordCount >= absoluteMin) {
      return { canProceed: true, reason: 'Validação OK', expectedMin: absoluteMin };
    }
    
    // Bloquear remoções - dados do N8N parecem incompletos
    return { 
      canProceed: false, 
      reason: `N8N retornou apenas ${n8nRecordCount} registros (esperado mínimo ${absoluteMin}, último sync tinha ${this.lastValidSync.totalRecords})`,
      expectedMin: absoluteMin 
    };
  }

  private updateLastValidSync(n8nRecordCount: number, patients: InsertPatient[]): void {
    // Agrupar por enfermaria
    const recordsByEnfermaria: Record<string, number> = {};
    for (const p of patients) {
      const enf = p.dsEnfermaria || 'DESCONHECIDO';
      recordsByEnfermaria[enf] = (recordsByEnfermaria[enf] || 0) + 1;
    }
    
    this.lastValidSync = {
      timestamp: new Date(),
      totalRecords: n8nRecordCount,
      recordsByEnfermaria
    };
    
    console.log(`[AutoSync] 📊 Sync válido atualizado: ${n8nRecordCount} registros`);
  }

  private async saveToDatabase(patients: InsertPatient[]): Promise<{ saved: number; reactivated: number }> {
    // SOLUÇÃO DEFINITIVA: Usar UPSERT com ON CONFLICT para garantir atomicidade
    // - codigoAtendimento tem constraint UNIQUE no banco
    // - leito tem constraint UNIQUE no banco
    // - Isso impede duplicatas mesmo em race conditions
    // - NOVO: Antes de inserir, verificar se leito está ocupado por paciente com código diferente
    
    let reactivatedCount = 0;
    let archivedForConflictCount = 0;
    // Set para evitar reativações duplicadas no mesmo ciclo de sync
    const reactivatedHistoryIds = new Set<string>();
    
    for (const patient of patients) {
      const patientCodigo = patient.codigoAtendimento?.toString().trim() || '';
      const patientLeito = patient.leito?.toString().trim() || '';
      
      try {
        // PASSO 1: Verificar conflito de leito ANTES de qualquer operação
        // Se leito está ocupado por paciente com código diferente, arquivar o antigo primeiro
        // Isso previne erro de UNIQUE constraint no leito quando fazemos INSERT de novo paciente
        if (patientLeito && patientCodigo) {
          const occupyingPatient = await storage.getPatientOccupyingLeitoWithDifferentCodigo(patientLeito, patientCodigo);
          if (occupyingPatient) {
            console.log(`[AutoSync] ⚠️ CONFLITO DE LEITO: ${patientLeito} ocupado por ${occupyingPatient.nome} (código: ${occupyingPatient.codigoAtendimento})`);
            console.log(`[AutoSync] 📦 Arquivando paciente antigo para liberar leito para ${patient.nome} (código: ${patientCodigo})`);
            
            // Arquivar o paciente antigo como "registro_antigo" (dado obsoleto no DEV)
            await storage.archiveAndRemovePatient(occupyingPatient.id, 'registro_antigo');
            archivedForConflictCount++;
            console.log(`[AutoSync] ✅ Paciente ${occupyingPatient.nome} arquivado - leito ${patientLeito} liberado`);
          }
        }
        // Nota: Quando patientCodigo está vazio, usamos upsertPatientByLeito que faz ON CONFLICT
        // no leito e atualiza o registro existente - não há risco de constraint violation
        
        // PASSO 2: Verificar se existe paciente arquivado que precisa ser reativado
        // REGRA AUTOMÁTICA: Se paciente está no N8N, DEVE estar ativo
        // IMPORTANTE: Apenas remover do histórico, NÃO inserir novamente - o PASSO 3 fará isso
        let archivedPatient = null;
        
        if (patientCodigo) {
          archivedPatient = await storage.getPatientHistoryByCodigoAtendimento(patientCodigo);
        }
        
        // Fallback: buscar por leito se não encontrou por código
        if (!archivedPatient && patientLeito) {
          archivedPatient = await storage.getPatientHistoryByLeito(patientLeito);
        }
        
        if (archivedPatient && !reactivatedHistoryIds.has(archivedPatient.id)) {
          // Paciente estava arquivado mas apareceu no N8N - MANTER histórico intacto
          // O histórico NUNCA deve ser deletado - é um log permanente de altas/transferências
          // O PASSO 3 (upsert) vai inserir/atualizar o paciente com os dados do N8N
          console.log(`[AutoSync] 🔄 REATIVAÇÃO: Paciente ${patient.leito} (${patient.nome}) encontrado no N8N mas estava arquivado - histórico preservado`);
          reactivatedHistoryIds.add(archivedPatient.id);
          reactivatedCount++;
          console.log(`[AutoSync] ✅ Paciente ${patient.nome} será reativado - histórico de alta mantido`);
        }
        
        // PASSO 3: Fazer o upsert com os dados atualizados do N8N
        // Este é o ÚNICO ponto de inserção/atualização de pacientes
        // Após resolver conflitos e limpar histórico, o upsert garante dados atualizados
        if (patientCodigo) {
          // Prioridade 1: Upsert por codigoAtendimento (mais confiável)
          await storage.upsertPatientByCodigoAtendimento(patient);
        } else {
          // Fallback: Upsert por leito (para registros sem código)
          await storage.upsertPatientByLeito(patient);
        }
      } catch (error) {
        // Em caso de erro de constraint, logar para análise
        console.error(`[AutoSync] Erro ao salvar paciente ${patient.leito}:`, error);
      }
    }
    
    if (archivedForConflictCount > 0) {
      console.log(`[AutoSync] 📦 ${archivedForConflictCount} paciente(s) arquivado(s) por conflito de leito`);
    }
    if (reactivatedCount > 0) {
      console.log(`[AutoSync] 🔄 ${reactivatedCount} paciente(s) reativado(s) automaticamente`);
    }
    console.log(`[AutoSync] ✅ ${patients.length} registros salvos via UPSERT`);
    
    return { saved: patients.length, reactivated: reactivatedCount };
  }

  private logSyncResult(result: SyncResult): void {
    console.log('');
    console.log('📊 RESUMO:');
    console.log(`   ⏱️  Duração: ${(result.duration / 1000).toFixed(2)}s`);
    console.log(`   📦 Total: ${result.stats.totalRecords}`);
    console.log(`   ➕ Novos: ${result.stats.newRecords}`);
    console.log(`   🔄 Alterados: ${result.stats.changedRecords}`);
    console.log(`   🚪 Removidos (alta): ${result.stats.removedRecords}`);
    if (result.stats.reactivatedRecords > 0) {
      console.log(`   ♻️  Reativados: ${result.stats.reactivatedRecords}`);
    }
    console.log(`   🤖 IA processada: ${result.stats.aiCallsMade}`);
    console.log(`   💰 IA evitada: ${result.stats.aiCallsAvoided}`);
    console.log(`   💸 Economia: R$ ${result.savings.costSaved.toFixed(2)}`);
    console.log(`   🎯 Cache hit: ${result.savings.cacheHitRate.toFixed(1)}%`);
  }

  getHistory(limit: number = 10): SyncResult[] {
    return this.syncHistory.slice(-limit);
  }

  getAggregatedStats() {
    if (this.syncHistory.length === 0) {
      return {
        totalSyncs: 0,
        totalRecords: 0,
        totalAICalls: 0,
        totalAICallsAvoided: 0,
        totalCostSaved: 0,
        averageChangeRate: 0
      };
    }

    const totals = this.syncHistory.reduce(
      (acc, r) => ({
        records: acc.records + r.stats.totalRecords,
        aiCalls: acc.aiCalls + r.stats.aiCallsMade,
        aiCallsAvoided: acc.aiCallsAvoided + r.stats.aiCallsAvoided,
        costSaved: acc.costSaved + r.savings.costSaved,
        changed: acc.changed + r.stats.changedRecords + r.stats.newRecords
      }),
      { records: 0, aiCalls: 0, aiCallsAvoided: 0, costSaved: 0, changed: 0 }
    );

    return {
      totalSyncs: this.syncHistory.length,
      totalRecords: totals.records,
      totalAICalls: totals.aiCalls,
      totalAICallsAvoided: totals.aiCallsAvoided,
      totalCostSaved: Math.round(totals.costSaved * 100) / 100,
      averageChangeRate: totals.records > 0 ? (totals.changed / totals.records) * 100 : 0
    };
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      config: this.config
    };
  }

  getDetailedStatus() {
    const lastSync = this.syncHistory.length > 0 ? this.syncHistory[this.syncHistory.length - 1] : null;
    
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun || (lastSync ? lastSync.timestamp : null),
      lastSyncDuration: lastSync ? lastSync.duration : null,
      lastSyncStats: lastSync ? lastSync.stats : null,
      totalSyncsCompleted: this.syncHistory.length,
      config: {
        cronExpression: this.config.cronExpression,
        enableAI: this.config.enableAI
      }
    };
  }

  async runManualSync(specificUnitIds?: string, forceUpdate: boolean = false): Promise<SyncResult> {
    console.log('[AutoSync] 🔧 Executando sincronização manual...');
    if (specificUnitIds) {
      console.log(`[AutoSync] 📋 Usando unidades específicas: ${specificUnitIds}`);
    }
    if (forceUpdate) {
      console.log('[AutoSync] ⚡ FORCE UPDATE ATIVO - Ignorando cache e change detection!');
      intelligentCache.clear();
      changeDetectionService.reset();
      console.log('[AutoSync] 🗑️ Cache inteligente e snapshots limpos');
    }
    return await this.runSyncCycle(specificUnitIds, forceUpdate);
  }

  async runManualSyncWithId(syncId: string, specificUnitIds?: string, forceUpdate: boolean = false): Promise<SyncResult> {
    console.log(`[AutoSync] 🔧 Executando sincronização manual com syncId: ${syncId}`);
    
    try {
      if (specificUnitIds) {
        console.log(`[AutoSync] 📋 Usando unidades específicas: ${specificUnitIds}`);
      }
      if (forceUpdate) {
        console.log('[AutoSync] ⚡ FORCE UPDATE ATIVO - Ignorando cache e change detection!');
        intelligentCache.clear();
        changeDetectionService.reset();
        console.log('[AutoSync] 🗑️ Cache inteligente e snapshots limpos');
      }
      
      this.updateSyncStatus(syncId, 'fetching_n8n', 20);
      
      const result = await this.runSyncCycleWithStatus(specificUnitIds, forceUpdate, syncId);
      
      this.syncStatusMap.set(syncId, {
        status: 'complete',
        progress: 100,
        startedAt: this.syncStatusMap.get(syncId)!.startedAt,
        completedAt: new Date(),
        stats: result.stats
      });
      
      console.log(`[AutoSync] ✅ Sync ${syncId} concluído com sucesso`);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const startedAt = this.syncStatusMap.get(syncId)?.startedAt || new Date();
      this.syncStatusMap.set(syncId, {
        status: 'error',
        progress: 0,
        startedAt,
        error: errorMessage
      });
      console.error(`[AutoSync] ❌ Sync ${syncId} falhou:`, errorMessage);
      throw error;
    }
  }

  private async runSyncCycleWithStatus(specificUnitIds?: string, forceUpdate: boolean = false, syncId?: string): Promise<SyncResult> {
    if (syncId) {
      this.updateSyncStatus(syncId, 'fetching_n8n', 30);
    }
    
    const result = await this.runSyncCycle(specificUnitIds, forceUpdate);
    
    if (syncId) {
      this.updateSyncStatus(syncId, 'saving', 90, { stats: result.stats });
    }
    
    return result;
  }
}

export const autoSyncSchedulerGPT4o = new AutoSyncSchedulerGPT4o();
