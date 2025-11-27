/**
 * Plantao-related types
 */

export interface Plantao {
  id: string;
  data: string;
  medico: string;
  especialidade: string;
  status: PlantaoStatus;
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
}

export type PlantaoStatus = 'agendado' | 'em-andamento' | 'concluido' | 'cancelado';

export interface CreatePlantaoData {
  data: string;
  medico: string;
  especialidade: string;
  observacoes?: string;
}

export interface UpdatePlantaoData extends Partial<CreatePlantaoData> {
  status?: PlantaoStatus;
}
