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
    // Parse mobilidade to ensure it's valid (A, D, or DA)
    const mobilidadeRaw = data.mobilidade || "";
    const mobilidade = this.normalizeMobilidade(mobilidadeRaw);

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
      especialidadeRamal: data.especialidade || data.especialidadeRamal || data.ds_especialidade || "",
      nome: data.paciente || data.nome || data.nome_paciente || "",
      registro: data.registro || data.codigo_atendimento || "",
      dataNascimento: data.dataNascimento || data.nascimento || data.data_nascimento || "",
      dataInternacao: data.dataInternacao || data.internacao || data.data_internacao || new Date().toLocaleDateString("pt-BR"),
      rqBradenScp: data.braden || data.rq_braden || "",
      diagnosticoComorbidades: data.diagnostico || data.diagnostico_comorbidades || "",
      alergias: data.alergias || "",
      mobilidade: mobilidade as "A" | "D" | "DA" | null | undefined,
      dieta: data.dieta || "",
      eliminacoes: data.eliminacoes || "",
      dispositivos: data.dispositivos || "",
      atb: data.atb || data.antibioticos || "",
      curativos: data.curativos || "",
      aporteSaturacao: data.aporteSaturacao || data.aporte_saturacao || "",
      examesRealizadosPendentes: data.exames || data.exames_realizados_pendentes || "",
      dataProgramacaoCirurgica: data.cirurgia || data.data_programacao_cirurgica || "",
      observacoesIntercorrencias: data.observacoes || data.observacoes_intercorrencias || "",
      previsaoAlta: data.previsaoAlta || data.previsao_alta || "",
      alerta: null,
      status: "pending",
      
      // Novos campos da API N8N
      idEvolucao: data.id_evolucao || data.id || data.idEvolucao || "",
      dsEnfermaria: data.ds_enfermaria || data.enfermaria || data.dsEnfermaria || leito,
      dsLeitoCompleto: data.ds_leito_completo || data.leito_completo || data.dsLeitoCompleto || leito,
      dsEspecialidade: data.ds_especialidade || data.especialidade || data.dsEspecialidade || "",
      codigoAtendimento: data.codigo_atendimento || data.at || data.codigoAtendimento || "",
      dsEvolucaoCompleta: data.ds_evolucao_completa || data.evolucao_completa || data.descricao || data.dsEvolucaoCompleta || "",
      dhCriacaoEvolucao: dhCriacaoEvolucao,
      fonteDados: "N8N_IAMSPE",
      dadosBrutosJson: data,
    };
  }

  /**
   * Normalize mobilidade field to valid values
   */
  private normalizeMobilidade(value: string): "A" | "D" | "DA" | null {
    if (!value) return null;
    
    const normalized = value.toUpperCase().trim();
    
    if (normalized.includes("ACAMADO")) return "A";
    if (normalized.includes("DEAMBULA COM AUXÍLIO")) return "DA";
    if (normalized.includes("DEAMBULA") || normalized === "D") return "D";
    if (normalized === "A") return "A";
    if (normalized === "DA") return "DA";
    
    return null;
  }
}

export const externalAPIService = new ExternalAPIService();
