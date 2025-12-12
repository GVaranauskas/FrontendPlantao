import { storage } from "../storage";
import type { InsertNursingUnit, InsertNursingUnitChange, NursingUnit } from "@shared/schema";
import { logger } from "../lib/logger";

const N8N_UNITS_API = "https://n8n-dev.iamspe.sp.gov.br/webhook/unidades-internacao";

// Simple in-memory cache for N8N API responses
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class APICache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    });
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

const apiCache = new APICache();

interface N8NUnitResponse {
  idUnidadeInternacao: number;
  dsUnidadeInternacao: string;
  localizacao?: string;
}

interface SyncResult {
  success: boolean;
  created: number;
  updated: number;
  unchanged: number;
  pendingApproval: number;
  errors: string[];
  timestamp: Date;
}

export class NursingUnitsSyncService {
  private static CACHE_KEY_UNITS = "n8n_units";

  async fetchExternalUnits(useCache: boolean = true): Promise<N8NUnitResponse[]> {
    const cacheKey = NursingUnitsSyncService.CACHE_KEY_UNITS;
    
    if (useCache) {
      const cached = apiCache.get<N8NUnitResponse[]>(cacheKey);
      if (cached) {
        logger.info(`[NursingUnitsSync] Using cached data (${cached.length} units)`);
        return cached;
      }
    }

    try {
      logger.info("[NursingUnitsSync] Fetching units from N8N API...");
      
      const response = await fetch(N8N_UNITS_API, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        throw new Error(`N8N API returned status ${response.status}`);
      }

      const data = await response.json();
      
      if (!Array.isArray(data)) {
        logger.warn("[NursingUnitsSync] API response is not an array, wrapping...");
        const result = data ? [data] : [];
        if (useCache) {
          apiCache.set(cacheKey, result);
        }
        return result;
      }

      logger.info(`[NursingUnitsSync] Fetched ${data.length} units from API`);
      if (useCache) {
        apiCache.set(cacheKey, data);
      }
      return data;
    } catch (error) {
      logger.error("[NursingUnitsSync] Error fetching units from N8N API", error instanceof Error ? error : undefined);
      throw error;
    }
  }

  invalidateCache(): void {
    apiCache.clear();
    logger.info("[NursingUnitsSync] Cache invalidated");
  }

  async syncUnits(autoApprove: boolean = false): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      created: 0,
      updated: 0,
      unchanged: 0,
      pendingApproval: 0,
      errors: [],
      timestamp: new Date(),
    };

    try {
      this.invalidateCache();
      const externalUnits = await this.fetchExternalUnits(false);
      const existingUnits = await storage.getAllNursingUnits();
      
      const existingByExternalId = new Map<number, NursingUnit>();
      for (const unit of existingUnits) {
        if (unit.externalId) {
          existingByExternalId.set(unit.externalId, unit);
        }
      }

      for (const extUnit of externalUnits) {
        try {
          const existing = existingByExternalId.get(extUnit.idUnidadeInternacao);
          
          if (!existing) {
            await this.handleNewUnit(extUnit, autoApprove, result);
          } else {
            await this.handleExistingUnit(extUnit, existing, autoApprove, result);
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          result.errors.push(`Error processing unit ${extUnit.idUnidadeInternacao}: ${errorMsg}`);
          logger.error(`[NursingUnitsSync] Error processing unit ${extUnit.idUnidadeInternacao}`, error instanceof Error ? error : undefined);
        }
      }

      result.success = result.errors.length === 0;
      logger.info(`[NursingUnitsSync] Sync completed: ${result.created} created, ${result.updated} updated, ${result.unchanged} unchanged, ${result.pendingApproval} pending approval`);
      
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.errors.push(`Sync failed: ${errorMsg}`);
      logger.error("[NursingUnitsSync] Sync failed", error instanceof Error ? error : undefined);
      return result;
    }
  }

  private async handleNewUnit(
    extUnit: N8NUnitResponse,
    autoApprove: boolean,
    result: SyncResult
  ): Promise<void> {
    const existingPending = await storage.getPendingChangeByExternalId(
      extUnit.idUnidadeInternacao,
      "create"
    );
    
    if (existingPending) {
      logger.info(`[NursingUnitsSync] Pending creation already exists for unit ${extUnit.idUnidadeInternacao}`);
      return;
    }

    const newUnitData: InsertNursingUnit = {
      externalId: extUnit.idUnidadeInternacao,
      codigo: extUnit.idUnidadeInternacao.toString(),
      nome: extUnit.dsUnidadeInternacao.trim(),
      localizacao: extUnit.localizacao?.trim() || null,
      ativo: true,
    };

    if (autoApprove) {
      await storage.createNursingUnit(newUnitData);
      result.created++;
      logger.info(`[NursingUnitsSync] Auto-created unit: ${newUnitData.nome}`);
    } else {
      const changeRequest: InsertNursingUnitChange = {
        externalId: extUnit.idUnidadeInternacao,
        changeType: "create",
        newData: newUnitData as Record<string, unknown>,
        status: "pending",
      };
      await storage.createNursingUnitChange(changeRequest);
      result.pendingApproval++;
      logger.info(`[NursingUnitsSync] Created pending approval for new unit: ${newUnitData.nome}`);
    }
  }

  private async handleExistingUnit(
    extUnit: N8NUnitResponse,
    existing: NursingUnit,
    autoApprove: boolean,
    result: SyncResult
  ): Promise<void> {
    const newNome = extUnit.dsUnidadeInternacao.trim();
    const newLocalizacao = extUnit.localizacao?.trim() || null;
    
    const changes: Array<{ field: string; oldValue: string | null; newValue: string | null }> = [];
    
    if (existing.nome !== newNome) {
      changes.push({ field: "nome", oldValue: existing.nome, newValue: newNome });
    }
    
    if (existing.localizacao !== newLocalizacao) {
      changes.push({ field: "localizacao", oldValue: existing.localizacao, newValue: newLocalizacao });
    }

    if (changes.length === 0) {
      result.unchanged++;
      return;
    }

    const existingPending = await storage.getPendingChangeByExternalId(
      extUnit.idUnidadeInternacao,
      "update"
    );
    
    if (existingPending) {
      logger.info(`[NursingUnitsSync] Pending update already exists for unit ${extUnit.idUnidadeInternacao}`);
      return;
    }

    if (autoApprove) {
      await storage.updateNursingUnit(existing.id, {
        nome: newNome,
        localizacao: newLocalizacao,
      });
      result.updated++;
      logger.info(`[NursingUnitsSync] Auto-updated unit: ${existing.nome} -> ${newNome}`);
    } else {
      for (const change of changes) {
        const changeRequest: InsertNursingUnitChange = {
          unitId: existing.id,
          externalId: extUnit.idUnidadeInternacao,
          changeType: "update",
          fieldChanged: change.field,
          oldValue: change.oldValue,
          newValue: change.newValue,
          status: "pending",
        };
        await storage.createNursingUnitChange(changeRequest);
      }
      result.pendingApproval += changes.length;
      logger.info(`[NursingUnitsSync] Created ${changes.length} pending approvals for unit: ${existing.nome}`);
    }
  }

  async approveChange(changeId: string, reviewerId: string): Promise<{ success: boolean; message: string }> {
    try {
      const change = await storage.getNursingUnitChange(changeId);
      if (!change) {
        return { success: false, message: "Pendência não encontrada" };
      }

      if (change.status !== "pending") {
        return { success: false, message: "Esta pendência já foi processada" };
      }

      if (change.changeType === "create" && change.newData) {
        const newUnitData = change.newData as InsertNursingUnit;
        
        // Check if unit already exists (may have been created by another process)
        if (newUnitData.externalId) {
          const existingUnits = await storage.getAllNursingUnits();
          const alreadyExists = existingUnits.find(u => u.externalId === newUnitData.externalId);
          
          if (alreadyExists) {
            // Unit already exists, just mark the change as approved without creating duplicate
            await storage.approveNursingUnitChange(changeId, reviewerId);
            logger.info(`[NursingUnitsSync] Unit already exists, marking as approved: ${newUnitData.nome}`);
            return { success: true, message: `Unidade "${newUnitData.nome}" já existe, pendência marcada como aprovada` };
          }
        }
        
        await storage.createNursingUnit(newUnitData);
        await storage.approveNursingUnitChange(changeId, reviewerId);
        logger.info(`[NursingUnitsSync] Approved creation of unit: ${newUnitData.nome}`);
        return { success: true, message: `Unidade "${newUnitData.nome}" criada com sucesso` };
      }

      if (change.changeType === "update" && change.unitId && change.fieldChanged) {
        const updateData: Record<string, unknown> = {};
        updateData[change.fieldChanged] = change.newValue;
        await storage.updateNursingUnit(change.unitId, updateData);
        await storage.approveNursingUnitChange(changeId, reviewerId);
        logger.info(`[NursingUnitsSync] Approved update of field ${change.fieldChanged}`);
        return { success: true, message: `Campo "${change.fieldChanged}" atualizado com sucesso` };
      }

      return { success: false, message: "Tipo de mudança não suportado" };
    } catch (error) {
      logger.error("[NursingUnitsSync] Error approving change", error instanceof Error ? error : undefined);
      const errorMsg = error instanceof Error ? error.message : String(error);
      return { success: false, message: `Erro ao aprovar: ${errorMsg}` };
    }
  }

  async rejectChange(changeId: string, reviewerId: string): Promise<{ success: boolean; message: string }> {
    try {
      const change = await storage.getNursingUnitChange(changeId);
      if (!change) {
        return { success: false, message: "Pendência não encontrada" };
      }

      if (change.status !== "pending") {
        return { success: false, message: "Esta pendência já foi processada" };
      }

      await storage.rejectNursingUnitChange(changeId, reviewerId);
      logger.info(`[NursingUnitsSync] Rejected change ${changeId}`);
      return { success: true, message: "Pendência rejeitada" };
    } catch (error) {
      logger.error("[NursingUnitsSync] Error rejecting change", error instanceof Error ? error : undefined);
      const errorMsg = error instanceof Error ? error.message : String(error);
      return { success: false, message: `Erro ao rejeitar: ${errorMsg}` };
    }
  }

  async approveAllPending(reviewerId: string): Promise<{ success: boolean; approved: number; errors: number }> {
    const pending = await storage.getPendingNursingUnitChanges();
    let approved = 0;
    let errors = 0;

    for (const change of pending) {
      const result = await this.approveChange(change.id, reviewerId);
      if (result.success) {
        approved++;
      } else {
        errors++;
      }
    }

    return { success: errors === 0, approved, errors };
  }
}

export const nursingUnitsSyncService = new NursingUnitsSyncService();
