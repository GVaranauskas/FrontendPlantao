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

    // Check if patient already exists for this leito
    const existingPatients = await storage.getAllPatients();
    
    // Find existing patient using multiple strategies
    const registro = processada.registro;
    const codigoAtendimento = processada.codigoAtendimento;
    const patientEnfermaria = processada.dadosProcessados.dsEnfermaria || evolucao.dsEnfermaria || "";
    
    let existingPatient = null;
    
    if (registro && registro.trim() !== "") {
      existingPatient = existingPatients.find(p => p.registro === registro);
    }
    
    if (!existingPatient && codigoAtendimento && codigoAtendimento.trim() !== "") {
      existingPatient = existingPatients.find(p => p.codigoAtendimento === codigoAtendimento);
    }
    
    if (!existingPatient) {
      existingPatient = existingPatients.find(p => 
        p.leito === evoLeito && p.dsEnfermaria === patientEnfermaria
      );
    }

    let patient: Patient;
    if (existingPatient) {
      // Update existing patient
      const updated = await storage.updatePatient(existingPatient.id, processada.dadosProcessados);
      if (!updated) {
        console.error(`Failed to update patient for leito: ${leito}`);
        return null;
      }
      patient = updated;
      console.log(`Updated patient for leito: ${leito} (${processada.pacienteName})`);
    } else {
      // Create new patient
      patient = await storage.createPatient(processada.dadosProcessados);
      console.log(`Created new patient for leito: ${leito} (${processada.pacienteName})`);
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

    // OPTIMIZATION: Fetch all patients once before the loop, not inside each iteration
    const existingPatients = await storage.getAllPatients();
    console.log(`[Sync] Processing ${evolucoes.length} evolucoes against ${existingPatients.length} existing patients`);

    // Process each evolução
    for (const evolucao of evolucoes) {
      try {
        // Extract leito if available
        const leito = evolucao.leito || evolucao.dsLeito || evolucao.ds_leito_completo || evolucao.leito_completo || "";
        
        if (!leito) {
          console.warn("[Sync] Leito not found in evolução, skipping");
          continue;
        }

        // Process evolução data
        const processada = await n8nIntegrationService.processEvolucao(leito, evolucao);
        
        // Validate processed data
        const validacao = n8nIntegrationService.validateProcessedData(processada);
        
        if (!validacao.valid) {
          console.warn(`[Sync] Validation errors for leito ${leito}:`, validacao.errors);
          continue;
        }

        // Find existing patient using multiple strategies (prevent duplicates)
        // Priority: 1) registro (unique patient ID), 2) codigoAtendimento, 3) leito+enfermaria
        const registro = processada.registro;
        const codigoAtendimento = processada.codigoAtendimento;
        const patientEnfermaria = processada.dadosProcessados.dsEnfermaria || evolucao.dsEnfermaria || "";
        
        let existingPatient = null;
        
        // Strategy 1: Match by registro (most reliable - hospital patient ID)
        if (registro && registro.trim() !== "") {
          existingPatient = existingPatients.find(p => p.registro === registro);
        }
        
        // Strategy 2: Match by codigoAtendimento (appointment code)
        if (!existingPatient && codigoAtendimento && codigoAtendimento.trim() !== "") {
          existingPatient = existingPatients.find(p => p.codigoAtendimento === codigoAtendimento);
        }
        
        // Strategy 3: Match by leito + enfermaria (fallback)
        if (!existingPatient) {
          existingPatient = existingPatients.find(p => 
            p.leito === leito && p.dsEnfermaria === patientEnfermaria
          );
        }

        let patient: Patient;
        if (existingPatient) {
          // Update existing patient - preserve the ID, update all other fields
          const updated = await storage.updatePatient(existingPatient.id, processada.dadosProcessados);
          if (updated) {
            patient = updated;
            // Update cached list with new data
            const idx = existingPatients.findIndex(p => p.id === existingPatient!.id);
            if (idx >= 0) existingPatients[idx] = patient;
            console.log(`[Sync] Updated patient for leito: ${leito} (${processada.pacienteName})`);
          } else {
            console.error(`[Sync] Failed to update patient for leito: ${leito}`);
            continue;
          }
        } else {
          // Create new patient only if truly doesn't exist
          patient = await storage.createPatient(processada.dadosProcessados);
          // Add to cached list to prevent duplicate creates in same sync
          existingPatients.push(patient);
          console.log(`[Sync] Created new patient for leito: ${leito} (${processada.pacienteName})`);
        }

        results.push(patient);
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
