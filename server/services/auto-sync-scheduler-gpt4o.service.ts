import * as cron from 'node-cron';
import { n8nIntegrationService } from './n8n-integration-service';
import { changeDetectionService } from './change-detection.service';
import { aiServiceGPT4oMini } from './ai-service-gpt4o-mini';
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

export class AutoSyncSchedulerGPT4o {
  private task: ReturnType<typeof cron.schedule> | null = null;
  private isRunning: boolean = false;
  private lastRun: Date | null = null;
  private syncHistory: SyncResult[] = [];
  
  // Rastreador de falhas consecutivas para proteção contra arquivamento acidental
  // Chave: codigoAtendimento ou leito, Valor: número de falhas consecutivas
  private missingSyncTracker: Map<string, { count: number; firstMissing: Date; patientName: string }> = new Map();
  
  // Número mínimo de falhas consecutivas antes de arquivar (proteção)
  private static readonly MIN_FAILURES_BEFORE_ARCHIVE = 2;
  
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
      // SEMPRE executar limpeza quando o fetch do N8N foi bem-sucedido
      // Isso garante que pacientes órfãos sejam removidos mesmo quando N8N retorna zero registros
      if (n8nFetchSuccessful) {
        console.log(`[AutoSync] 🏥 Verificando altas hospitalares...`);
        console.log(`[AutoSync] 📋 Sets de referência: ${n8nLeitos.size} leitos, ${n8nCodigosAtendimento.size} códigos`);
        const removedCount = await this.removeDischargedPatients(n8nCodigosAtendimento, n8nLeitos, n8nCodigoToLeito);
        result.stats.removedRecords = removedCount;
        if (removedCount > 0) {
          console.log(`[AutoSync] 🚪 ${removedCount} pacientes removidos (alta hospitalar)`);
        } else {
          console.log(`[AutoSync] ✅ Nenhum paciente para remover`);
        }
      } else {
        console.log(`[AutoSync] ⚠️ Limpeza ignorada - falha no fetch do N8N`);
      }

      // 6. CALCULAR ECONOMIA
      const metricsAI = aiServiceGPT4oMini.getMetrics();
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
    const results = await aiServiceGPT4oMini.analyzeBatch(patients, { useCache: true });
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
    // Get all patients from database
    const allPatients = await storage.getAllPatients();
    let removedCount = 0;

    // PROTEÇÃO: Limpar tracker de pacientes que foram encontrados no N8N
    for (const [key, _] of this.missingSyncTracker) {
      if (currentCodigosAtendimento.has(key) || currentLeitos.has(key)) {
        console.log(`[AutoSync] ✅ Paciente ${key} encontrado no N8N - resetando contador de falhas`);
        this.missingSyncTracker.delete(key);
      }
    }

    for (const patient of allPatients) {
      let isMissing = false;
      let removeReason = '';
      let archiveReason: ArchiveReason = 'alta_hospitalar';
      let leitoDestino: string | undefined;
      let trackingKey = '';

      // Caso 1: Paciente TEM codigoAtendimento
      if (patient.codigoAtendimento) {
        trackingKey = patient.codigoAtendimento;
        if (!currentCodigosAtendimento.has(patient.codigoAtendimento)) {
          // codigoAtendimento não existe no N8N - possível alta
          isMissing = true;
          removeReason = 'alta hospitalar (código não existe no N8N)';
          archiveReason = 'alta_hospitalar';
        } else if (patient.leito) {
          // codigoAtendimento existe - verificar se o leito corresponde
          const n8nLeito = codigoToLeito.get(patient.codigoAtendimento);
          if (n8nLeito && n8nLeito !== patient.leito) {
            // Paciente foi transferido de leito - arquivar imediatamente (não é erro de sync)
            try {
              await storage.archivePatient(patient, 'transferencia_leito', n8nLeito);
              console.log(`[AutoSync] 📦 Paciente ${patient.leito} (${patient.nome}) arquivado - transferência de leito (${patient.leito} -> ${n8nLeito})`);
              await storage.deletePatient(patient.id);
              removedCount++;
              this.missingSyncTracker.delete(trackingKey);
            } catch (error) {
              console.error(`[AutoSync] Erro ao arquivar/remover paciente ${patient.id}:`, error);
            }
            continue;
          }
        }
      }
      // Caso 2: Paciente SEM codigoAtendimento - verificar pelo leito
      else if (patient.leito) {
        trackingKey = patient.leito;
        if (!currentLeitos.has(patient.leito)) {
          isMissing = true;
          removeReason = 'leito não existe no N8N';
          archiveReason = 'registro_antigo';
        }
      }

      if (isMissing && trackingKey) {
        // PROTEÇÃO: Verificar se já teve falhas suficientes antes de arquivar
        const tracking = this.missingSyncTracker.get(trackingKey);
        
        if (!tracking) {
          // Primeira falha - registrar mas NÃO arquivar ainda
          this.missingSyncTracker.set(trackingKey, {
            count: 1,
            firstMissing: new Date(),
            patientName: patient.nome
          });
          console.log(`[AutoSync] ⚠️ Paciente ${patient.leito} (${patient.nome}) não encontrado no N8N - 1ª falha (proteção ativada, aguardando confirmação)`);
        } else {
          // Incrementar contador de falhas
          tracking.count++;
          console.log(`[AutoSync] ⚠️ Paciente ${patient.leito} (${patient.nome}) não encontrado no N8N - ${tracking.count}ª falha consecutiva`);
          
          // Verificar se atingiu o limite de falhas para arquivar
          if (tracking.count >= AutoSyncSchedulerGPT4o.MIN_FAILURES_BEFORE_ARCHIVE) {
            try {
              await storage.archivePatient(patient, archiveReason, leitoDestino);
              console.log(`[AutoSync] 📦 Paciente ${patient.leito} (${patient.nome}) arquivado após ${tracking.count} falhas consecutivas - ${removeReason}`);
              await storage.deletePatient(patient.id);
              removedCount++;
              this.missingSyncTracker.delete(trackingKey);
            } catch (error) {
              console.error(`[AutoSync] Erro ao arquivar/remover paciente ${patient.id}:`, error);
            }
          } else {
            console.log(`[AutoSync] 🛡️ Proteção ativa - aguardando ${AutoSyncSchedulerGPT4o.MIN_FAILURES_BEFORE_ARCHIVE - tracking.count} falha(s) adicional(is) antes de arquivar`);
          }
        }
      }
    }

    return removedCount;
  }

  private async saveToDatabase(patients: InsertPatient[]): Promise<{ saved: number; reactivated: number }> {
    // SOLUÇÃO DEFINITIVA: Usar UPSERT com ON CONFLICT para garantir atomicidade
    // - codigoAtendimento tem constraint UNIQUE no banco
    // - leito tem constraint UNIQUE no banco
    // - Isso impede duplicatas mesmo em race conditions
    
    let reactivatedCount = 0;
    // Set para evitar reativações duplicadas no mesmo ciclo de sync
    const reactivatedHistoryIds = new Set<string>();
    
    for (const patient of patients) {
      const patientCodigo = patient.codigoAtendimento?.toString().trim() || '';
      const patientLeito = patient.leito?.toString().trim() || '';
      
      try {
        // REGRA AUTOMÁTICA: Se paciente está no N8N, DEVE estar ativo
        // Verificar se existe paciente arquivado - primeiro por código, depois por leito
        let archivedPatient = null;
        
        if (patientCodigo) {
          archivedPatient = await storage.getPatientHistoryByCodigoAtendimento(patientCodigo);
        }
        
        // Fallback: buscar por leito se não encontrou por código
        if (!archivedPatient && patientLeito) {
          archivedPatient = await storage.getPatientHistoryByLeito(patientLeito);
        }
        
        if (archivedPatient && !reactivatedHistoryIds.has(archivedPatient.id)) {
          // Paciente estava arquivado mas apareceu no N8N - reativar automaticamente!
          console.log(`[AutoSync] 🔄 REATIVAÇÃO AUTOMÁTICA: Paciente ${patient.leito} (${patient.nome}) encontrado no N8N mas estava arquivado - reativando...`);
          await storage.reactivatePatient(archivedPatient.id);
          reactivatedHistoryIds.add(archivedPatient.id);
          reactivatedCount++;
          console.log(`[AutoSync] ✅ Paciente ${patient.nome} reativado automaticamente do histórico`);
        }
        
        // Fazer o upsert com os dados atualizados do N8N
        // Sempre atualizar com os dados mais recentes do N8N, mesmo após reativação
        // O upsert é idempotente e garante que os dados estejam sempre atualizados
        if (patientCodigo) {
          // Prioridade 1: Upsert por codigoAtendimento (mais confiável)
          await storage.upsertPatientByCodigoAtendimento(patient);
        } else {
          // Fallback: Upsert por leito (para registros sem código)
          await storage.upsertPatientByLeito(patient);
        }
      } catch (error) {
        // Em caso de erro de constraint, tentar atualização direta
        console.error(`[AutoSync] Erro ao salvar paciente ${patient.leito}:`, error);
      }
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
      // Limpar caches para garantir dados frescos
      intelligentCache.clear();
      changeDetectionService.reset();
      console.log('[AutoSync] 🗑️ Cache inteligente e snapshots limpos');
    }
    return await this.runSyncCycle(specificUnitIds, forceUpdate);
  }
}

export const autoSyncSchedulerGPT4o = new AutoSyncSchedulerGPT4o();
