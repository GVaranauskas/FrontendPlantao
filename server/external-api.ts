import type { InsertPatient } from "@shared/schema";

interface ExternalAPIRequest {
  flowId: string;
  forceUpdate: boolean;
  meta: {
    params: string[];
    formJson: string;
  };
}

interface ExternalAPIResponse {
  [key: string]: any;
}

const EXTERNAL_API_URL = "https://dev-n8n.7care.com.br/webhook/evolucoes";

export class ExternalAPIService {
  /**
   * Fetch patient data from external API
   * Expects a leito (bed number) parameter
   */
  async fetchPatientData(leito: string): Promise<InsertPatient | null> {
    try {
      const payload: ExternalAPIRequest = {
        flowId: "1a2b3c4d5e",
        forceUpdate: false,
        meta: {
          params: [leito],
          formJson: JSON.stringify({
            braden: "escala braden",
            diagnostico: "diagnostico do paciente",
            alergias: "alergias reportadas",
            mobilidade: "questoes relacionadas à mobilidade do paciente",
            dieta: "questoes referentes a alimentação do paciente",
            eliminacoes: "questões referentes a eliminações do paciente",
            dispositivos: "dispositivos em uso pelo paciente",
            atb: "antibioticos em uso",
            curativos: "informações sobre curativos",
            aporteSaturacao: "informações sobre aporte e saturação",
            exames: "informaçoes sobre exames realizados e pendentes",
            cirurgia: "informações sobre cirurgia programada e data da programação cirurgica",
            observacoes: "informações sobre observações e intercorrencias",
            previsaoAlta: "informações sobre previsão de alta"
          })
        }
      };

      const response = await fetch(EXTERNAL_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error(`External API error: ${response.status} ${response.statusText}`);
        return null;
      }

      const data: ExternalAPIResponse = await response.json();
      
      // Map external API response to our InsertPatient schema
      const patientData = this.mapExternalDataToPatient(leito, data);
      return patientData;
    } catch (error) {
      console.error("Error fetching from external API:", error);
      return null;
    }
  }

  /**
   * Map external API response fields to our patient schema
   */
  private mapExternalDataToPatient(leito: string, data: ExternalAPIResponse): InsertPatient {
    // Parse timestamp de criação
    let dhCriacaoEvolucao: Date | undefined;
    if (data.dh_criacao_evolucao || data.data_criacao || data.dhCriacaoEvolucao) {
      const dateStr = data.dh_criacao_evolucao || data.data_criacao || data.dhCriacaoEvolucao;
      try {
        dhCriacaoEvolucao = new Date(dateStr);
      } catch {
        dhCriacaoEvolucao = undefined;
      }
    }

    return {
      leito: leito,
      especialidadeRamal: data.dsEpecialid || data.especialidade || "",
      nome: data.paciente || data.nome || data.nome_paciente || "",
      registro: data.registro || "",
      dataNascimento: data.dataNascimento || data.nascimento || data.data_nascimento || "",
      dataInternacao: data.dataInternacao || new Date().toLocaleDateString("pt-BR"),
      braden: data.braden || "",
      diagnostico: data.diagnostico || "",
      alergias: data.alergias || "",
      mobilidade: data.mobilidade || "",
      dieta: data.dieta || "",
      eliminacoes: data.eliminacoes || "",
      dispositivos: data.dispositivos || "",
      atb: data.atb || "",
      curativos: data.curativos || "",
      aporteSaturacao: data.aporteSaturacao || "",
      exames: data.exames || "",
      cirurgia: data.cirurgia || "",
      observacoes: data.observacoes || "",
      previsaoAlta: data.previsaoAlta || "",
      alerta: null,
      status: "pending",
      
      idEvolucao: data.id || "",
      dsEnfermaria: data.dsEnfermaria || leito,
      dsLeitoCompleto: data.dsLeito || leito,
      dsEspecialidade: data.dsEpecialid || "",
      codigoAtendimento: data.codigo_atendimento || "",
      dsEvolucaoCompleta: "",
      dhCriacaoEvolucao: dhCriacaoEvolucao,
      fonteDados: "N8N_IAMSPE",
      dadosBrutosJson: data,
    };
  }

}

export const externalAPIService = new ExternalAPIService();
