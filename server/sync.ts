import { storage } from "./storage";
import { n8nIntegrationService } from "./services/n8n-integration-service";
import type { Patient } from "@shared/schema";

/**
 * Sync a patient from external API and store/update in our system
 * Uses n8nIntegrationService for unified integration path
 */
export async function syncPatientFromExternalAPI(leito: string): Promise<Patient | null> {
  try {
    // Fetch data from N8N using the leito as the unitIds parameter
    const evolucoes = await n8nIntegrationService.fetchEvolucoes(leito);
    
    if (!evolucoes || evolucoes.length === 0) {
      console.warn(`No data retrieved from N8N for leito: ${leito}`);
      return null;
    }

    // Find the evolução that matches the requested leito
    const evolucao = evolucoes.find(e => {
      const evoLeito = e.leito || e.dsLeito || e.ds_leito_completo || e.leito_completo || "";
      return evoLeito === leito || evoLeito.includes(leito);
    }) || evolucoes[0];

    const evoLeito = evolucao.leito || evolucao.dsLeito || evolucao.ds_leito_completo || evolucao.leito_completo || leito;

    // Process evolução data using n8nIntegrationService
    const processada = await n8nIntegrationService.processEvolucao(evoLeito, evolucao);
    
    // Validate processed data
    const validacao = n8nIntegrationService.validateProcessedData(processada);
    if (!validacao.valid) {
      console.warn(`Validation errors for leito ${leito}:`, validacao.errors);
      return null;
    }

    // UPSERT: Usa codigoAtendimento ou leito para insert/update atômico
    const codigoAtendimento = processada.codigoAtendimento?.toString().trim() || '';
    
    let patient: Patient;
    try {
      if (codigoAtendimento) {
        patient = await storage.upsertPatientByCodigoAtendimento(processada.dadosProcessados);
      } else {
        patient = await storage.upsertPatientByLeito(processada.dadosProcessados);
      }
      console.log(`[Sync] Upserted patient for leito: ${leito} (${processada.pacienteName})`);
    } catch (error) {
      console.error(`[Sync] Failed to upsert patient for leito: ${leito}`, error);
      return null;
    }

    return patient;
  } catch (error) {
    console.error(`Error syncing patient from external API (leito: ${leito}):`, error);
    return null;
  }
}

/**
 * Sync multiple patients from external API
 */
export async function syncMultiplePatientsFromExternalAPI(leitos: string[]): Promise<Patient[]> {
  const results: Patient[] = [];

  for (const leito of leitos) {
    const patient = await syncPatientFromExternalAPI(leito);
    if (patient) {
      results.push(patient);
    }
  }

  return results;
}

/**
 * Sync evolucoes from N8N for specific unit IDs or all units
 * @param unitIds - IDs das unidades de internação (ex: "22,23") ou vazio para todas
 * @param forceUpdate - Se true, força atualização dos dados no N8N
 */
export async function syncEvolucoesByUnitIds(unitIds: string = "", forceUpdate: boolean = false): Promise<Patient[]> {
  const results: Patient[] = [];
  
  try {
    console.log(`[Sync] Starting sync with params: ["${unitIds}"], forceUpdate: ${forceUpdate}`);
    
    // Fetch raw evolucoes from N8N
    const evolucoes = await n8nIntegrationService.fetchEvolucoes(unitIds, forceUpdate);
    
    if (!evolucoes || evolucoes.length === 0) {
      console.log(`[Sync] No evolucoes found`);
      return results;
    }

    console.log(`[Sync] Processing ${evolucoes.length} evolucoes with UPSERT`);

    // Process each evolução usando UPSERT atômico
    for (const evolucao of evolucoes) {
      try {
        const leito = evolucao.leito || evolucao.dsLeito || evolucao.ds_leito_completo || evolucao.leito_completo || "";
        
        if (!leito) {
          console.warn("[Sync] Leito not found in evolução, skipping");
          continue;
        }

        const processada = await n8nIntegrationService.processEvolucao(leito, evolucao);
        const validacao = n8nIntegrationService.validateProcessedData(processada);
        
        if (!validacao.valid) {
          console.warn(`[Sync] Validation errors for leito ${leito}:`, validacao.errors);
          continue;
        }

        // UPSERT atômico: usa codigoAtendimento ou leito como chave única
        const codigoAtendimento = processada.codigoAtendimento?.toString().trim() || '';
        
        try {
          let patient: Patient;
          if (codigoAtendimento) {
            patient = await storage.upsertPatientByCodigoAtendimento(processada.dadosProcessados);
          } else {
            patient = await storage.upsertPatientByLeito(processada.dadosProcessados);
          }
          results.push(patient);
          console.log(`[Sync] Upserted patient for leito: ${leito} (${processada.pacienteName})`);
        } catch (upsertError) {
          console.error(`[Sync] UPSERT failed for leito ${leito}:`, upsertError);
        }
      } catch (error) {
        console.error(`[Sync] Error processing evolução:`, error);
        continue;
      }
    }

    console.log(`[Sync] Completed sync. Processed: ${results.length} patients`);
  } catch (error) {
    console.error(`[Sync] Error syncing evolucoes:`, error);
  }

  return results;
}

/**
 * Sync all evolucoes from N8N - PRODUÇÃO: apenas unidades 22,23
 */
export async function syncAllEvolucoes(): Promise<Patient[]> {
  // PRODUÇÃO: Forçar apenas unidades 22,23
  return syncEvolucoesByUnitIds("22,23");
}

/**
 * Legacy alias for backward compatibility
 */
export async function syncEvolucoesByEnfermaria(enfermaria: string): Promise<Patient[]> {
  return syncEvolucoesByUnitIds(enfermaria);
}
