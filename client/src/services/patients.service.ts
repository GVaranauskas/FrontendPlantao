import { apiRequest } from "@/lib/queryClient";
import { ApiService } from "./api.service";
import type { Patient } from "@shared/schema";
import type { 
  AIAnalysisResult, 
  ClinicalBatchResult, 
  ClinicalInsights 
} from "@/types";

interface SyncResult {
  success: boolean;
  message?: string;
  data?: unknown;
}

export interface SyncInitResponse {
  success: boolean;
  message: string;
  syncId: string;
  statusCheckUrl: string;
  unitIds: string;
  forceUpdate: boolean;
}

export interface SyncStatusResponse {
  syncId: string;
  status: 'started' | 'fetching_n8n' | 'processing_ai' | 'saving' | 'complete' | 'error';
  progress: number;
  startedAt: string;
  completedAt?: string;
  stats?: {
    totalRecords: number;
    changedRecords: number;
    unchangedRecords: number;
    newRecords: number;
    removedRecords: number;
    reactivatedRecords: number;
    aiCallsMade: number;
    aiCallsAvoided: number;
    errors: number;
  };
  error?: string;
}

export interface SyncDetailedStatus {
  isRunning: boolean;
  lastRun: string | null;
  lastSyncDuration: number | null;
  lastSyncStats: {
    totalRecords: number;
    changedRecords: number;
    unchangedRecords: number;
    newRecords: number;
    removedRecords: number;
    reactivatedRecords: number;
    aiCallsMade: number;
    aiCallsAvoided: number;
    errors: number;
  } | null;
  totalSyncsCompleted: number;
  config: {
    cronExpression: string;
    enableAI: boolean;
  };
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

  async syncManualWithAI(unitIds: string = "22,23", forceUpdate: boolean = false): Promise<SyncInitResponse> {
    const response = await apiRequest("POST", "/api/sync-gpt4o/manual", {
      unitIds,
      forceUpdate,
    });
    return response.json();
  }

  async getSyncStatusById(syncId: string): Promise<SyncStatusResponse> {
    const response = await apiRequest("GET", `/api/sync-gpt4o/status/${syncId}`);
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

  async clinicalAnalysisIndividual(patientId: string): Promise<{ insights: ClinicalInsights; analysis: unknown }> {
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

  async getSyncDetailedStatus(): Promise<SyncDetailedStatus> {
    const response = await apiRequest("GET", "/api/sync-gpt4o/detailed-status");
    return response.json();
  }
}

export const patientsService = new PatientsService();
