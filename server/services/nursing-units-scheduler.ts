import * as cron from 'node-cron';
import { NursingUnitsSyncService } from './nursing-units-sync.service';

export class NursingUnitsScheduler {
  private syncTask: ReturnType<typeof cron.schedule> | null = null;
  private enabled: boolean = false;
  private syncService: NursingUnitsSyncService;

  constructor() {
    this.syncService = new NursingUnitsSyncService();
  }

  async startDailySync(cronExpression: string = "0 6 * * *"): Promise<void> {
    if (this.enabled) {
      console.log("[NursingUnitsScheduler] Already running");
      return;
    }

    this.enabled = true;

    this.syncTask = cron.schedule(cronExpression, async () => {
      await this.runSync();
    });

    console.log(`[NursingUnitsScheduler] Daily sync scheduled with cron: ${cronExpression}`);
  }

  stop(): void {
    if (this.syncTask) {
      this.syncTask.stop();
      this.syncTask = null;
    }
    this.enabled = false;
    console.log("[NursingUnitsScheduler] Stopped");
  }

  private async runSync(): Promise<void> {
    const startTime = Date.now();
    console.log("[NursingUnitsScheduler] Starting automatic nursing units sync");

    try {
      const result = await this.syncService.syncUnits(false);
      const duration = Date.now() - startTime;

      console.log(
        `[NursingUnitsScheduler] Sync completed in ${duration}ms: ` +
        `${result.created} created, ${result.updated} updated, ` +
        `${result.pendingApproval} pending, ${result.unchanged} unchanged`
      );

      if (result.errors.length > 0) {
        console.error("[NursingUnitsScheduler] Errors:", result.errors);
      }
    } catch (error) {
      console.error("[NursingUnitsScheduler] Sync failed:", error);
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
