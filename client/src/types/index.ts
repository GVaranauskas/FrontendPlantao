export interface Enfermaria {
  codigo: string;
  nome: string;
}

export interface User {
  id: string;
  username: string;
  email?: string | null;
  name: string;
  role: string;
  isActive?: boolean;
  createdAt?: string;
  lastLogin?: string | null;
}

export interface NursingTemplate {
  id: string;
  name: string;
  description?: string;
}

export interface ImportStats {
  total: number;
  importados: number;
  erros: number;
  detalhes: Array<{ leito: string; status: string; mensagem?: string }>;
}

export interface ImportResponse {
  success: boolean;
  enfermaria: string;
  stats: ImportStats;
  mensagem: string;
}

export interface ImportStatus {
  status: "online" | "offline";
  latency: string;
}

export type UserRole = "admin" | "enfermagem" | "visualizador";
