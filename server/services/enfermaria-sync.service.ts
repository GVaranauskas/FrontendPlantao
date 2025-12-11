import { storage } from "../storage";
import { unidadesInternacaoService } from "./unidades-internacao.service";
import type { InsertPendingEnfermariaSync } from "@shared/schema";

interface ExternalEnfermaria {
  id: number;
  codigo: string;
  nome: string;
}

interface SyncResult {
  checked: number;
  newFound: number;
  updatesFound: number;
  pendingCreated: number;
  noChanges: boolean;
}

export class EnfermariaSyncService {
  async checkForChanges(): Promise<SyncResult> {
    console.log("[EnfermariaSync] Checking for changes from external API...");
    
    const externalEnfermarias = await unidadesInternacaoService.fetchUnidades();
    const localEnfermarias = await storage.getAllEnfermarias();
    
    const result: SyncResult = {
      checked: externalEnfermarias.length,
      newFound: 0,
      updatesFound: 0,
      pendingCreated: 0,
      noChanges: true,
    };

    if (externalEnfermarias.length === 0) {
      console.log("[EnfermariaSync] No data from external API");
      return result;
    }

    const localByIdExterno = new Map(localEnfermarias.map(e => [e.idExterno, e]));

    for (const external of externalEnfermarias) {
      const local = localByIdExterno.get(external.id);

      if (!local) {
        result.newFound++;
        result.noChanges = false;

        const pending: InsertPendingEnfermariaSync = {
          idExterno: external.id,
          codigo: external.codigo,
          nome: external.nome,
          changeType: "insert",
          newDataJson: external as unknown as Record<string, unknown>,
          status: "pending",
        };

        await storage.createPendingEnfermariaSync(pending);
        result.pendingCreated++;
        
        console.log(`[EnfermariaSync] New enfermaria found: ${external.nome} (ID: ${external.id})`);
      } else {
        const hasNameChange = local.nome !== external.nome;
        const hasCodeChange = local.codigo !== external.codigo;

        if (hasNameChange || hasCodeChange) {
          result.updatesFound++;
          result.noChanges = false;

          const changes: Record<string, { from: string; to: string }> = {};
          if (hasNameChange) {
            changes.nome = { from: local.nome, to: external.nome };
          }
          if (hasCodeChange) {
            changes.codigo = { from: local.codigo, to: external.codigo };
          }

          const pending: InsertPendingEnfermariaSync = {
            idExterno: external.id,
            codigo: external.codigo,
            nome: external.nome,
            changeType: "update",
            changesJson: changes as unknown as Record<string, unknown>,
            originalDataJson: {
              id: local.id,
              idExterno: local.idExterno,
              codigo: local.codigo,
              nome: local.nome,
            } as unknown as Record<string, unknown>,
            newDataJson: external as unknown as Record<string, unknown>,
            status: "pending",
          };

          await storage.createPendingEnfermariaSync(pending);
          result.pendingCreated++;

          console.log(`[EnfermariaSync] Update found for: ${local.nome} -> ${external.nome}`);
        }
      }
    }

    if (result.noChanges) {
      console.log("[EnfermariaSync] No changes detected");
    } else {
      console.log(`[EnfermariaSync] Changes found: ${result.newFound} new, ${result.updatesFound} updates`);
      
      await storage.createAlert({
        leito: "SISTEMA",
        priority: "medium",
        title: "Sincronização de Enfermarias",
        description: `Foram encontradas ${result.newFound} novas enfermarias e ${result.updatesFound} atualizações pendentes de aprovação.`,
        time: new Date().toLocaleString("pt-BR"),
      });
    }

    return result;
  }

  async approveChange(pendingId: string, userId: string, notes?: string): Promise<boolean> {
    const pending = await storage.getPendingEnfermariaSync(pendingId);
    if (!pending || pending.status !== "pending") {
      return false;
    }

    try {
      if (pending.changeType === "insert") {
        await storage.createEnfermaria({
          idExterno: pending.idExterno,
          codigo: pending.codigo,
          nome: pending.nome,
          lastSyncAt: new Date(),
        });
        console.log(`[EnfermariaSync] Approved insert: ${pending.nome}`);
      } else if (pending.changeType === "update") {
        const existing = await storage.getEnfermariaByIdExterno(pending.idExterno);
        if (existing) {
          const newData = pending.newDataJson as { codigo?: string; nome?: string } | null;
          await storage.updateEnfermaria(existing.id, {
            nome: newData?.nome || pending.nome,
            lastSyncAt: new Date(),
          });
          console.log(`[EnfermariaSync] Approved update: ${pending.nome}`);
        }
      }

      await storage.updatePendingEnfermariaSync(pendingId, {
        status: "approved",
        reviewedAt: new Date(),
        reviewedBy: userId,
        reviewNotes: notes || null,
      });

      return true;
    } catch (error) {
      console.error(`[EnfermariaSync] Error approving change:`, error);
      return false;
    }
  }

  async rejectChange(pendingId: string, userId: string, notes?: string): Promise<boolean> {
    const pending = await storage.getPendingEnfermariaSync(pendingId);
    if (!pending || pending.status !== "pending") {
      return false;
    }

    await storage.updatePendingEnfermariaSync(pendingId, {
      status: "rejected",
      reviewedAt: new Date(),
      reviewedBy: userId,
      reviewNotes: notes || null,
    });

    console.log(`[EnfermariaSync] Rejected change: ${pending.nome}`);
    return true;
  }

  async approveAllPending(userId: string): Promise<number> {
    const pending = await storage.getPendingEnfermariaSyncByStatus("pending");
    let approved = 0;

    for (const p of pending) {
      const success = await this.approveChange(p.id, userId, "Aprovação em lote");
      if (success) approved++;
    }

    return approved;
  }

  async rejectAllPending(userId: string): Promise<number> {
    const pending = await storage.getPendingEnfermariaSyncByStatus("pending");
    let rejected = 0;

    for (const p of pending) {
      const success = await this.rejectChange(p.id, userId, "Rejeição em lote");
      if (success) rejected++;
    }

    return rejected;
  }

  async initialImport(): Promise<number> {
    console.log("[EnfermariaSync] Running initial import...");
    
    const externalEnfermarias = await unidadesInternacaoService.fetchUnidades();
    let imported = 0;

    for (const external of externalEnfermarias) {
      const existing = await storage.getEnfermariaByIdExterno(external.id);
      if (!existing) {
        await storage.createEnfermaria({
          idExterno: external.id,
          codigo: external.codigo,
          nome: external.nome,
          lastSyncAt: new Date(),
        });
        imported++;
        console.log(`[EnfermariaSync] Imported: ${external.nome}`);
      }
    }

    console.log(`[EnfermariaSync] Initial import complete: ${imported} enfermarias`);
    return imported;
  }
}

export const enfermariaSyncService = new EnfermariaSyncService();
