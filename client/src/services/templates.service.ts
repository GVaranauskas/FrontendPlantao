import { ApiService } from "./api.service";
import type { NursingUnitTemplate, InsertNursingUnitTemplate } from "@shared/schema";

class TemplatesService extends ApiService {
  constructor() {
    super("/api/templates");
  }

  async getAllTemplates(): Promise<NursingUnitTemplate[]> {
    return this.getAll<NursingUnitTemplate>();
  }

  async getTemplate(id: string): Promise<NursingUnitTemplate> {
    return this.getById<NursingUnitTemplate>(id);
  }

  async createTemplate(data: InsertNursingUnitTemplate): Promise<NursingUnitTemplate> {
    return this.create<NursingUnitTemplate>(data as Partial<NursingUnitTemplate>);
  }

  async updateTemplate(id: string, data: Partial<NursingUnitTemplate>): Promise<NursingUnitTemplate> {
    return this.update<NursingUnitTemplate>(id, data);
  }

  async deleteTemplate(id: string): Promise<void> {
    return this.delete(id);
  }
}

export const templatesService = new TemplatesService();
