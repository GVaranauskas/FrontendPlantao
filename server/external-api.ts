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
  [key: string]: string;
}

const EXTERNAL_API_URL = "https://n8n-dev.iamspe.sp.gov.br/webhook/evolucoes";

export class ExternalAPIService {
  /**
   * Fetch patient data from external API
   * Expects a leito (bed number) parameter
   */
  async fetchPatientData(leito: string): Promise<InsertPatient | null> {
    try {
      const payload: ExternalAPIRequest = {
        flowId: "1a2b3c",
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

    return {
      leito: leito,
      especialidadeRamal: data.especialidade || data.especialidadeRamal || "",
      nome: data.paciente || data.nome || "",
      registro: data.registro || "",
      dataNascimento: data.dataNascimento || data.nascimento || "",
      dataInternacao: data.dataInternacao || data.internacao || new Date().toLocaleDateString("pt-BR"),
      rqBradenScp: data.braden || "",
      diagnosticoComorbidades: data.diagnostico || "",
      alergias: data.alergias || "",
      mobilidade: mobilidade as "A" | "D" | "DA" | null | undefined,
      dieta: data.dieta || "",
      eliminacoes: data.eliminacoes || "",
      dispositivos: data.dispositivos || "",
      atb: data.atb || "",
      curativos: data.curativos || "",
      aporteSaturacao: data.aporteSaturacao || "",
      examesRealizadosPendentes: data.exames || "",
      dataProgramacaoCirurgica: data.cirurgia || "",
      observacoesIntercorrencias: data.observacoes || "",
      previsaoAlta: data.previsaoAlta || "",
      alerta: null,
      status: "pending"
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
