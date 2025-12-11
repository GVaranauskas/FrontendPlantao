import * as cron from 'node-cron';
import { NursingUnitsSyncService } from './nursing-units-sync.service';
import { logger } from '../lib/logger';

export class NursingUnitsScheduler {
  private syncTask: ReturnType<typeof cron.schedule> | null = null;
  private enabled: boolean = false;
  private syncService: NursingUnitsSyncService;

  constructor() {
    this.syncService = new NursingUnitsSyncService();
  }

  async startDailySync(cronExpression: string = "0 6 * * *"): Promise<void> {
    if (this.enabled) {
      logger.warn("[NursingUnitsScheduler] Already running");
      return;
    }

    this.enabled = true;

    this.syncTask = cron.schedule(cronExpression, async () => {
      try {
        await this.runSync();
      } catch (error) {
        logger.error("[NursingUnitsScheduler] Cron job failed", error instanceof Error ? error : undefined);
      }
    });

    logger.info(`[NursingUnitsScheduler] Daily sync scheduled with cron: ${cronExpression}`);
  }

  stop(): void {
    if (this.syncTask) {
      this.syncTask.stop();
      this.syncTask = null;
    }
    this.enabled = false;
    logger.info("[NursingUnitsScheduler] Stopped");
  }

  private async runSync(): Promise<void> {
    const startTime = Date.now();
    logger.info("[NursingUnitsScheduler] Starting automatic nursing units sync");

    try {
      const result = await this.syncService.syncUnits(false);
      const duration = Date.now() - startTime;

      logger.info(
        `[NursingUnitsScheduler] Sync completed in ${duration}ms: ` +
        `${result.created} created, ${result.updated} updated, ` +
        `${result.pendingApproval} pending, ${result.unchanged} unchanged`
      );

      if (result.errors.length > 0) {
        logger.warn("[NursingUnitsScheduler] Sync completed with errors", { errors: result.errors });
      }
    } catch (error) {
      logger.error("[NursingUnitsScheduler] Sync failed", error instanceof Error ? error : undefined);
      throw error;
    }
  }

  async runManualSync(autoApprove: boolean = false) {
    return this.syncService.syncUnits(autoApprove);
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

export const nursingUnitsScheduler = new NursingUnitsScheduler();
