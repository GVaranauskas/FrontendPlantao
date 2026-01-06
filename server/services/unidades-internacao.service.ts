interface UnidadeInternacao {
  idUnidadeInternacao: number;
  dsUnidadeInternacao: string;
  localizacao?: string;
}

export interface Enfermaria {
  id: number;
  codigo: string;
  nome: string;
}

// N8N Unidades API URL - configurável via variável de ambiente
const API_URL = process.env.N8N_UNIDADES_API_URL || "https://dev-n8n.7care.com.br/webhook/unidades-internacao";

export class UnidadesInternacaoService {
  /**
   * Busca lista de unidades de internação da API N8N
   */
  async fetchUnidades(): Promise<Enfermaria[]> {
    try {
      const response = await fetch(API_URL, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.error(`[Unidades] API error: ${response.status} ${response.statusText}`);
        return [];
      }

      const responseText = await response.text();
      
      if (!responseText || responseText.trim() === "") {
        console.warn(`[Unidades] Empty response from API`);
        return [];
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error(`[Unidades] Invalid JSON response: ${responseText.substring(0, 200)}`);
        return [];
      }
      
      // Pode retornar array ou objeto único
      const unidades = Array.isArray(data) ? data : (data && Object.keys(data).length > 0 ? [data] : []);
      
      console.log(`[Unidades] Received ${unidades.length} unidade(s)`);
      
      // Mapear para formato esperado pelo frontend
      const mapped = unidades.map((u: UnidadeInternacao) => ({
        id: u.idUnidadeInternacao,
        codigo: u.dsUnidadeInternacao,
        nome: u.dsUnidadeInternacao,
      }));
      
      // Remove duplicates based on 'nome' field to prevent React key warnings
      const seen = new Set<string>();
      const deduplicated = mapped.filter((enfermaria) => {
        if (seen.has(enfermaria.nome)) {
          console.log(`[Unidades] Removing duplicate enfermaria: ${enfermaria.nome}`);
          return false;
        }
        seen.add(enfermaria.nome);
        return true;
      });
      
      if (mapped.length !== deduplicated.length) {
        console.log(`[Unidades] Removed ${mapped.length - deduplicated.length} duplicate(s)`);
      }
      
      return deduplicated;
    } catch (error) {
      console.error(`[Unidades] Error fetching unidades:`, error);
      return [];
    }
  }
}

export const unidadesInternacaoService = new UnidadesInternacaoService();
