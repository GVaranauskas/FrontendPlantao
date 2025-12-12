import { storage } from "./storage";
import { externalAPIService } from "./external-api";
import { n8nIntegrationService } from "./services/n8n-integration-service";
import type { Patient } from "@shared/schema";

/**
 * Sync a patient from external API and store/update in our system
 */
export async function syncPatientFromExternalAPI(leito: string): Promise<Patient | null> {
  try {
    // Fetch data from external API
    const externalData = await externalAPIService.fetchPatientData(leito);
    
    if (!externalData) {
      console.warn(`No data retrieved from external API for leito: ${leito}`);
      return null;
    }

    // Check if patient already exists for this leito
    const existingPatients = await storage.getAllPatients();
    const existingPatient = existingPatients.find(p => p.leito === leito);

    let patient: Patient;
    if (existingPatient) {
      // Update existing patient
      const updated = await storage.updatePatient(existingPatient.id, externalData);
      if (!updated) {
        console.error(`Failed to update patient for leito: ${leito}`);
        return null;
      }
      patient = updated;
      console.log(`Updated patient for leito: ${leito}`);
    } else {
      // Create new patient
      patient = await storage.createPatient(externalData);
      console.log(`Created new patient for leito: ${leito}`);
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
 */
export async function syncEvolucoesByUnitIds(unitIds: string = ""): Promise<Patient[]> {
  const results: Patient[] = [];
  
  try {
    console.log(`[Sync] Starting sync with params: ["${unitIds}"]`);
    
    // Fetch raw evolucoes from N8N
    const evolucoes = await n8nIntegrationService.fetchEvolucoes(unitIds);
    
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
 * Sync all evolucoes from N8N (params: [""])
 */
export async function syncAllEvolucoes(): Promise<Patient[]> {
  return syncEvolucoesByUnitIds("");
}

/**
 * Legacy alias for backward compatibility
 */
export async function syncEvolucoesByEnfermaria(enfermaria: string): Promise<Patient[]> {
  return syncEvolucoesByUnitIds(enfermaria);
}
