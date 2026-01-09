import { apiRequest } from "@/lib/queryClient";
import { ApiService } from "./api.service";
import type { NursingUnit, NursingUnitChange } from "@shared/schema";

interface SyncResult {
  success: boolean;
  message?: string;
  changes?: NursingUnitChange[];
}

class NursingUnitsService extends ApiService {
  constructor() {
    super("/api/nursing-units");
  }

  async getAllUnits(): Promise<NursingUnit[]> {
    return this.getAll<NursingUnit>();
  }

  async getUnit(id: string): Promise<NursingUnit> {
    return this.getById<NursingUnit>(id);
  }

  async updateUnit(id: string, data: Partial<NursingUnit>): Promise<NursingUnit> {
    return this.update<NursingUnit>(id, data);
  }

  async deleteUnit(id: string): Promise<void> {
    return this.delete(id);
  }

  async syncFromExternal(): Promise<SyncResult> {
    const response = await apiRequest("POST", "/api/nursing-units/sync");
    return response.json();
  }

  async getPendingChanges(): Promise<NursingUnitChange[]> {
    const response = await apiRequest("GET", "/api/nursing-units/changes/pending");
    return response.json();
  }

  async approveChange(changeId: string): Promise<void> {
    await apiRequest("POST", `/api/nursing-units/changes/${changeId}/approve`);
  }

  async rejectChange(changeId: string): Promise<void> {
    await apiRequest("POST", `/api/nursing-units/changes/${changeId}/reject`);
  }

  async approveAllChanges(): Promise<void> {
    await apiRequest("POST", "/api/nursing-units/changes/approve-all");
  }
}

export const nursingUnitsService = new NursingUnitsService();
