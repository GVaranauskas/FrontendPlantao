import { storage } from "./storage";
import { externalAPIService } from "./external-api";
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
