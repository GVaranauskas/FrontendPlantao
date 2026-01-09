import { apiRequest } from "@/lib/queryClient";

export class ApiService {
  protected endpoint: string;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  async getAll<T>(): Promise<T[]> {
    const response = await apiRequest("GET", this.endpoint);
    return response.json();
  }

  async getById<T>(id: string): Promise<T> {
    const response = await apiRequest("GET", `${this.endpoint}/${id}`);
    return response.json();
  }

  async create<T>(data: Partial<T>): Promise<T> {
    const response = await apiRequest("POST", this.endpoint, data);
    return response.json();
  }

  async update<T>(id: string, data: Partial<T>): Promise<T> {
    const response = await apiRequest("PATCH", `${this.endpoint}/${id}`, data);
    return response.json();
  }

  async delete(id: string): Promise<void> {
    await apiRequest("DELETE", `${this.endpoint}/${id}`);
  }
}
