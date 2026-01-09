import { apiRequest } from "@/lib/queryClient";
import { ApiService } from "./api.service";
import type { User, InsertUser } from "@shared/schema";

interface AuthResponse {
  user: User;
  accessToken: string;
}

interface MeResponse {
  id: string;
  username: string;
  name: string;
  role: string;
}

class UsersService extends ApiService {
  constructor() {
    super("/api/users");
  }

  async login(username: string, password: string): Promise<AuthResponse> {
    const response = await apiRequest("POST", "/api/auth/login", { username, password });
    return response.json();
  }

  async logout(): Promise<void> {
    await apiRequest("POST", "/api/auth/logout");
  }

  async me(): Promise<MeResponse> {
    const response = await apiRequest("GET", "/api/auth/me");
    return response.json();
  }

  async refreshToken(): Promise<AuthResponse> {
    const response = await apiRequest("POST", "/api/auth/refresh");
    return response.json();
  }

  async getAllUsers(): Promise<User[]> {
    return this.getAll<User>();
  }

  async getUser(id: string): Promise<User> {
    return this.getById<User>(id);
  }

  async createUser(data: InsertUser): Promise<User> {
    return this.create<User>(data as Partial<User>);
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    return this.update<User>(id, data);
  }

  async deleteUser(id: string): Promise<void> {
    return this.delete(id);
  }

  async changePassword(id: string, newPassword: string): Promise<void> {
    await apiRequest("PATCH", `${this.endpoint}/${id}/password`, { password: newPassword });
  }
}

export const usersService = new UsersService();
