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

const API_URL = "https://n8n-dev.iamspe.sp.gov.br/webhook/unidades-internacao";

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
      return unidades.map((u: UnidadeInternacao) => ({
        id: u.idUnidadeInternacao,
        codigo: u.dsUnidadeInternacao,
        nome: u.dsUnidadeInternacao,
      }));
    } catch (error) {
      console.error(`[Unidades] Error fetching unidades:`, error);
      return [];
    }
  }
}

export const unidadesInternacaoService = new UnidadesInternacaoService();
