import * as cron from 'node-cron';
import { n8nIntegrationService } from './n8n-integration-service';
import { changeDetectionService } from './change-detection.service';
import { aiServiceGPT4oMini } from './ai-service-gpt4o-mini';
import { intelligentCache } from './intelligent-cache.service';
import { storage } from '../storage';
import type { InsertPatient } from '@shared/schema';

/**
 * AUTO SYNC SCHEDULER - GPT-4o-mini
 * 
 * Sincroniza N8N a cada 15 minutos com:
 * - Change Detection (processa apenas o que mudou)
 * - IA com GPT-4o-mini (R$ 0,03/análise)
 * - Cache inteligente
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
  
  private config: SchedulerConfig = {
    cronExpression: '*/15 * * * *', // A cada 15 minutos
    enfermarias: [],
    enableAI: true,
    batchSize: 10
  };

  start(config?: Partial<SchedulerConfig>): void {
    if (this.isRunning) {
      console.warn('[AutoSync] Já está rodando');
      return;
    }

    this.config = { ...this.config, ...config };

    console.log('[AutoSync] Iniciando scheduler...');
    console.log('[AutoSync] Config:', this.config);

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

  async runSyncCycle(): Promise<SyncResult> {
    const startTime = Date.now();
    console.log('');
    console.log('='.repeat(80));
    console.log('[AutoSync] 🔄 INICIANDO CICLO DE SINCRONIZAÇÃO (GPT-4o-mini)');
    console.log('='.repeat(80));

    const result: SyncResult = {
      timestamp: new Date(),
      duration: 0,
      stats: {
        totalRecords: 0,
        changedRecords: 0,
        unchangedRecords: 0,
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
      const unitIds = this.config.enfermarias.join(',');
      const rawData = await n8nIntegrationService.fetchEvolucoes(unitIds, false);

      if (!rawData || rawData.length === 0) {
        console.log('[AutoSync] ⚠️  Nenhum dado retornado do N8N');
        result.duration = Date.now() - startTime;
        return result;
      }

      result.stats.totalRecords = rawData.length;
      console.log(`[AutoSync] ✅ ${rawData.length} registros recebidos`);

      // 2. PROCESSAR E DETECTAR MUDANÇAS
      console.log('[AutoSync] 🔍 Detectando mudanças...');
      
      const patientsToProcess: InsertPatient[] = [];

      for (const rawPatient of rawData) {
        const leito = rawPatient.leito || 'DESCONHECIDO';
        
        try {
          const processed = await n8nIntegrationService.processEvolucao(leito, rawPatient);

          if (processed.erros.length > 0) {
            result.errors.push({ leito, error: processed.erros.join('; ') });
            result.stats.errors++;
            continue;
          }

          // CHANGE DETECTION
          const patientId = processed.registro || leito;
          const changeResult = changeDetectionService.detectChanges(
            patientId,
            processed.dadosProcessados
          );

          if (!changeResult.hasChanged) {
            result.stats.unchangedRecords++;
            result.stats.aiCallsAvoided++;
            continue;
          }

          if (changeResult.changedFields.includes('NOVO_PACIENTE')) {
            result.stats.newRecords++;
          } else {
            result.stats.changedRecords++;
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

      console.log(`[AutoSync] 📊 Estatísticas:`);
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
        await this.saveToDatabase(patientsToProcess);
      }

      // 5. CALCULAR ECONOMIA
      const metricsAI = aiServiceGPT4oMini.getMetrics();
      const cacheStats = intelligentCache.getStats();
      
      result.savings.tokensSaved = metricsAI.tokensSaved;
      result.savings.costSaved = metricsAI.estimatedSavings;
      result.savings.cacheHitRate = cacheStats.hitRate;

      // 6. LIMPEZA
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
    console.log(`[AutoSync] ✅ ${results.length} análises concluídas`);
  }

  private async saveToDatabase(patients: InsertPatient[]): Promise<void> {
    // Cache all patients once to avoid repeated queries
    const allPatients = await storage.getAllPatients();
    
    for (const patient of patients) {
      // Use codigoAtendimento as PRIMARY key for deduplication (unique per admission)
      // Fallback to registro, then leito only if codigoAtendimento is not available
      const existing = allPatients.find(p => {
        // Priority 1: Match by codigoAtendimento (most reliable - unique per admission)
        if (patient.codigoAtendimento && p.codigoAtendimento === patient.codigoAtendimento) {
          return true;
        }
        // Priority 2: Match by registro (patient medical record number)
        if (patient.registro && p.registro === patient.registro) {
          return true;
        }
        // Priority 3: Match by leito (fallback - least reliable)
        // Only use if no other identifiers are available
        if (!patient.codigoAtendimento && !patient.registro && p.leito === patient.leito) {
          return true;
        }
        return false;
      });
      
      if (existing) {
        await storage.updatePatient(existing.id, patient);
      } else {
        // Create new patient and add to cache to prevent duplicates within same batch
        const created = await storage.createPatient(patient);
        allPatients.push(created);
      }
    }
    console.log(`[AutoSync] ✅ ${patients.length} registros salvos`);
  }

  private logSyncResult(result: SyncResult): void {
    console.log('');
    console.log('📊 RESUMO:');
    console.log(`   ⏱️  Duração: ${(result.duration / 1000).toFixed(2)}s`);
    console.log(`   📦 Total: ${result.stats.totalRecords}`);
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

  async runManualSync(): Promise<SyncResult> {
    console.log('[AutoSync] 🔧 Executando sincronização manual...');
    return await this.runSyncCycle();
  }
}

export const autoSyncSchedulerGPT4o = new AutoSyncSchedulerGPT4o();
