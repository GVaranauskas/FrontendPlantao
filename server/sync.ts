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
 * Sync evolucoes from N8N for a specific enfermaria
 */
export async function syncEvolucoesByEnfermaria(enfermaria: string): Promise<Patient[]> {
  const results: Patient[] = [];
  
  try {
    console.log(`[Sync] Starting sync for enfermaria: ${enfermaria}`);
    
    // Fetch raw evolucoes from N8N
    const evolucoes = await n8nIntegrationService.fetchEvolucoes(enfermaria);
    
    if (!evolucoes || evolucoes.length === 0) {
      console.log(`[Sync] No evolucoes found for enfermaria: ${enfermaria}`);
      return results;
    }

    // Process each evolução
    for (const evolucao of evolucoes) {
      try {
        // Extract leito if available
        const leito = evolucao.leito || evolucao.ds_leito_completo || evolucao.leito_completo || "";
        
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

        // Check if patient exists by leito AND enfermaria
        const existingPatients = await storage.getAllPatients();
        const patientEnfermaria = processada.dadosProcessados.dsEnfermaria || enfermaria;
        const existingPatient = existingPatients.find(p => 
          p.leito === leito && p.dsEnfermaria === patientEnfermaria
        );

        let patient: Patient;
        if (existingPatient) {
          // Update existing
          const updated = await storage.updatePatient(existingPatient.id, processada.dadosProcessados);
          if (updated) {
            patient = updated;
            console.log(`[Sync] Updated patient for leito: ${leito} (${processada.pacienteName})`);
          } else {
            console.error(`[Sync] Failed to update patient for leito: ${leito}`);
            continue;
          }
        } else {
          // Create new
          patient = await storage.createPatient(processada.dadosProcessados);
          console.log(`[Sync] Created new patient for leito: ${leito} (${processada.pacienteName})`);
        }

        results.push(patient);
      } catch (error) {
        console.error(`[Sync] Error processing evolução:`, error);
        continue;
      }
    }

    console.log(`[Sync] Completed sync for enfermaria ${enfermaria}. Processed: ${results.length} patients`);
  } catch (error) {
    console.error(`[Sync] Error syncing evolucoes by enfermaria:`, error);
  }

  return results;
}
