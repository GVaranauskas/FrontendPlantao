import { apiRequest } from "@/lib/queryClient";
import { ApiService } from "./api.service";
import type { Patient } from "@shared/schema";

interface AIAnalysisResult {
  resumoGeral: string;
  pacientesCriticos: string[];
  alertasGerais: string[];
  estatisticas: {
    total: number;
    altaComplexidade: number;
    mediaBraden: number;
  };
}

interface ClinicalBatchResult {
  total: number;
  success: number;
  summary: { vermelho: number; amarelo: number; verde: number; errors: number };
  analiseGeral?: unknown;
  leitosAtencao: unknown[];
  leitosAlerta: unknown[];
  failedPatients: string[];
}

interface SyncResult {
  success: boolean;
  message?: string;
  data?: unknown;
}

class PatientsService extends ApiService {
  constructor() {
    super("/api/patients");
  }

  async syncSingle(leito: string): Promise<SyncResult> {
    const response = await apiRequest("POST", "/api/sync/evolucoes", { leito });
    return response.json();
  }

  async syncMultiple(leitos: string[]): Promise<SyncResult> {
    const response = await apiRequest("POST", "/api/sync/evolucoes/batch", { leitos });
    return response.json();
  }

  async syncManualWithAI(unitIds: string = "22,23", forceUpdate: boolean = false): Promise<SyncResult> {
    const response = await apiRequest("POST", "/api/sync-gpt4o/manual", {
      unitIds,
      forceUpdate,
    });
    return response.json();
  }

  async analyzeAll(): Promise<AIAnalysisResult> {
    const response = await apiRequest("POST", "/api/ai/analyze-patients");
    return response.json();
  }

  async clinicalAnalysisBatch(): Promise<ClinicalBatchResult> {
    const response = await apiRequest("POST", "/api/ai/clinical-analysis-batch");
    return response.json();
  }

  async clinicalAnalysisIndividual(patientId: string): Promise<{ insights: unknown; analysis: unknown }> {
    const response = await apiRequest("POST", `/api/ai/clinical-analysis/${patientId}`);
    return response.json();
  }

  async getPatient(id: string): Promise<Patient> {
    return this.getById<Patient>(id);
  }

  async getAllPatients(): Promise<Patient[]> {
    return this.getAll<Patient>();
  }

  async updatePatient(id: string, data: Partial<Patient>): Promise<Patient> {
    return this.update<Patient>(id, data);
  }

  async deletePatient(id: string): Promise<void> {
    return this.delete(id);
  }
}

export const patientsService = new PatientsService();
