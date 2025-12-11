import * as cron from 'node-cron';
import { syncEvolucoesByEnfermaria } from '../sync';
import { storage } from '../storage';
import { enfermariaSyncService } from './enfermaria-sync.service';

interface ScheduleConfig {
  enfermaria: string;
  cronExpression: string;
}

export class ImportScheduler {
  private tasks: Map<string, ReturnType<typeof cron.schedule>> = new Map();
  private enabled: boolean = false;

  /**
   * Inicia sincronização periódica para uma enfermaria
   * Expressão cron padrão: "0 * * * *" = a cada hora
   */
  async scheduleImport(enfermaria: string, cronExpression: string = "0 * * * *"): Promise<void> {
    const taskId = `import-${enfermaria}`;

    if (this.tasks.has(taskId)) {
      console.warn(`[Scheduler] Task already scheduled for enfermaria: ${enfermaria}`);
      return;
    }

    const task = cron.schedule(cronExpression, async () => {
      await this.runImport(enfermaria);
    });

    this.tasks.set(taskId, task);
    console.log(`[Scheduler] Scheduled import for enfermaria ${enfermaria} with cron: ${cronExpression}`);
  }

  /**
   * Agenda sincronização diária de enfermarias na madrugada
   * Expressão cron: "0 3 * * *" = às 03:00 todos os dias
   */
  scheduleEnfermariaSync(cronExpression: string = "0 3 * * *"): void {
    const taskId = "enfermaria-sync-daily";

    if (this.tasks.has(taskId)) {
      console.warn("[Scheduler] Enfermaria sync already scheduled");
      return;
    }

    const task = cron.schedule(cronExpression, async () => {
      await this.runEnfermariaSync();
    });

    this.tasks.set(taskId, task);
    console.log(`[Scheduler] Scheduled enfermaria sync with cron: ${cronExpression} (daily at 3 AM)`);
  }

  /**
   * Executa sincronização de enfermarias (verifica alterações da API externa)
   */
  private async runEnfermariaSync(): Promise<void> {
    console.log("[Scheduler] Starting daily enfermaria sync check...");

    try {
      const result = await enfermariaSyncService.checkForChanges();
      
      if (result.noChanges) {
        console.log("[Scheduler] Enfermaria sync: No changes detected");
      } else {
        console.log(`[Scheduler] Enfermaria sync: Found ${result.newFound} new, ${result.updatesFound} updates - pending approval`);
      }
    } catch (error) {
      console.error("[Scheduler] Enfermaria sync error:", error);
    }
  }

  /**
   * Inicia scheduler com configurações padrão
   */
  async startDefaultSchedule(): Promise<void> {
    if (this.enabled) {
      console.warn("[Scheduler] Already started");
      return;
    }

    this.enabled = true;

    // Schedule daily enfermaria sync at 3 AM
    this.scheduleEnfermariaSync("0 3 * * *");

    // Schedule imports for main enfermarias a cada hora (disabled by default)
    // await this.scheduleImport("10A", "0 * * * *");  // A cada hora
    // await this.scheduleImport("10B", "30 * * * *"); // A cada hora, 30 minutos

    console.log("[Scheduler] Default schedule started (enfermaria sync at 3 AM daily)");
  }

  /**
   * Para scheduler
   */
  stop(): void {
    this.tasks.forEach((task, id) => {
      task.stop();
      console.log(`[Scheduler] Stopped task: ${id}`);
    });
    this.tasks.clear();
    this.enabled = false;
    console.log("[Scheduler] All tasks stopped");
  }

  /**
   * Executa import para uma enfermaria
   */
  private async runImport(enfermaria: string): Promise<void> {
    const startTime = Date.now();
    console.log(`[Scheduler] Starting automatic import for enfermaria: ${enfermaria}`);

    try {
      const patients = await syncEvolucoesByEnfermaria(enfermaria);
      const duracao = Date.now() - startTime;

      // Calcula estatísticas
      const total = patients.length;
      const importados = total; // Todos foram importados/atualizados
      const erros = 0;

      // Salva histórico
      await storage.createImportHistory({
        enfermaria,
        total,
        importados,
        erros,
        detalhes: patients.map(p => ({
          leito: p.leito,
          status: "importado",
          mensagem: p.nome
        })),
        duracao
      });

      console.log(`[Scheduler] Completed import for ${enfermaria}: ${importados} patients in ${duracao}ms`);
    } catch (error) {
      const duracao = Date.now() - startTime;
      console.error(`[Scheduler] Error importing ${enfermaria}:`, error);

      // Salva histórico com erro
      await storage.createImportHistory({
        enfermaria,
        total: 0,
        importados: 0,
        erros: 1,
        detalhes: [{
          leito: "N/A",
          status: "erro",
          mensagem: error instanceof Error ? error.message : "Unknown error"
        }],
        duracao
      });
    }
  }

  /**
   * Retorna lista de tasks agendadas
   */
  getScheduledTasks(): string[] {
    return Array.from(this.tasks.keys());
  }

  /**
   * Verifica se scheduler está ativo
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

export const importScheduler = new ImportScheduler();
