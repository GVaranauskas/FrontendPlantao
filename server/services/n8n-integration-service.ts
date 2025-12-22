import type { InsertPatient } from "@shared/schema";
import { sanitizePatientData, validatePatientDataLength } from "../validation";

interface N8NRequest {
  flowId: string;
  forceUpdate: boolean;
  meta: {
    params: string[];
    formJson: string; // Must be a JSON string, not an object
  };
}

interface N8NRawData {
  [key: string]: any;
}

interface ProcessedEvolucao {
  pacienteName: string;
  registro: string;
  codigoAtendimento: string;
  dadosProcessados: InsertPatient;
  dadosBrutos: N8NRawData;
  erros: string[];
}

const N8N_API_URL = "https://dev-n8n.7care.com.br/webhook/evolucoes";

export class N8NIntegrationService {
  /**
   * Busca dados de evolução da API N8N
   * @param unitIds - IDs das unidades de internação (ex: "22,23") ou vazio para todas
   * @param forceUpdate - Se true, força atualização dos dados no N8N
   */
  async fetchEvolucoes(unitIds: string = "", forceUpdate: boolean = false): Promise<N8NRawData[] | null> {
    try {
      // formJson must be a JSON string, not an object
      const formJsonObject = {
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
      };

      // Build flowId from unit IDs (e.g., "22-23" from "22,23")
      const flowId = unitIds ? unitIds.replace(/,/g, "-") : "all";

      const payload: N8NRequest = {
        flowId: flowId,
        forceUpdate: forceUpdate,
        meta: {
          params: [unitIds], // ["22,23"] - single string with comma-separated IDs
          formJson: JSON.stringify(formJsonObject)
        }
      };

      // Log FULL payload for debugging
      console.log(`[N8N] REQUEST PAYLOAD:`);
      console.log(JSON.stringify(payload, null, 2));
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000);
      
      let response: Response;
      try {
        response = await fetch(N8N_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[N8N] API error: ${response.status} ${response.statusText} - ${errorText}`);
        return null;
      }

      const responseText = await response.text();
      
      if (!responseText || responseText.trim() === "") {
        console.warn(`[N8N] Empty response from API`);
        return [];
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error(`[N8N] Invalid JSON response: ${responseText.substring(0, 200)}`);
        return null;
      }
      
      const resultado = Array.isArray(data) ? data : (data && Object.keys(data).length > 0 ? [data] : []);
      console.log(`[N8N] Received ${resultado.length} record(s)`);
      
      return resultado;
    } catch (error) {
      console.error(`[N8N] Error fetching evolucoes:`, error);
      return null;
    }
  }

  /**
   * Maps N8N flat JSON response directly to InsertPatient
   * N8N returns normalized fields - we just map them directly without re-processing
   */
  async processEvolucao(leito: string, dadosBrutos: N8NRawData): Promise<ProcessedEvolucao> {
    const erros: string[] = [];

    try {
      const { nome, registro, codigoAtendimento } = this.parseNomePaciente(dadosBrutos.nomePaciente || "");
      
      let dadosProcessados: InsertPatient = {
        leito: dadosBrutos.leito || leito,
        nome,
        registro,
        codigoAtendimento,
        especialidadeRamal: dadosBrutos.dsEpecialid || "",
        dataNascimento: dadosBrutos.dataNascimento || "",
        sexo: dadosBrutos.sexo || "",
        dataInternacao: dadosBrutos.dataInternacao || this.getTodayDate(),

        braden: dadosBrutos.braden || "",
        diagnostico: dadosBrutos.diagnostico || "",
        alergias: dadosBrutos.alergias || "",
        mobilidade: dadosBrutos.mobilidade || "",
        dieta: dadosBrutos.dieta || "",
        eliminacoes: dadosBrutos.eliminacoes || "",
        dispositivos: dadosBrutos.dispositivos || "",
        atb: dadosBrutos.atb || "",
        curativos: dadosBrutos.curativos || "",
        aporteSaturacao: dadosBrutos.aporteSaturacao || "",
        exames: dadosBrutos.exames || "",
        cirurgia: dadosBrutos.cirurgia || "",
        observacoes: dadosBrutos.observacoes || "",
        previsaoAlta: dadosBrutos.previsaoAlta || "",

        alerta: null,
        status: "pending",

        idEvolucao: dadosBrutos.id || "",
        dsEnfermaria: dadosBrutos.dsEnfermaria || "",
        dsLeitoCompleto: dadosBrutos.dsLeito || "",
        dsEspecialidade: dadosBrutos.dsEpecialid || "",
        dsEvolucaoCompleta: "",
        dhCriacaoEvolucao: this.parseTimestamp(dadosBrutos.dhCriacao),
        fonteDados: "N8N_IAMSPE",
        dadosBrutosJson: dadosBrutos,
      };

      dadosProcessados = sanitizePatientData(dadosProcessados);
      if (!validatePatientDataLength(dadosProcessados)) {
        erros.push("Patient data exceeds maximum field lengths");
      }

      dadosProcessados.status = this.calculatePatientStatus(dadosProcessados);

      return {
        pacienteName: nome,
        registro,
        codigoAtendimento,
        dadosProcessados,
        dadosBrutos,
        erros,
      };
    } catch (error) {
      erros.push(`Erro ao processar evolução: ${error instanceof Error ? error.message : String(error)}`);
      return {
        pacienteName: "",
        registro: "",
        codigoAtendimento: "",
        dadosProcessados: {} as InsertPatient,
        dadosBrutos,
        erros,
      };
    }
  }

  /**
   * Parses nomePaciente to extract nome, registro (PT), and codigoAtendimento (AT)
   * Format: "NOME DO PACIENTE   PT: 1234567 AT: 7654321"
   */
  private parseNomePaciente(nomePaciente: string): { nome: string; registro: string; codigoAtendimento: string } {
    if (!nomePaciente) {
      return { nome: "", registro: "", codigoAtendimento: "" };
    }

    const ptMatch = nomePaciente.match(/PT:\s*(\d+)/);
    const atMatch = nomePaciente.match(/AT:\s*(\d+)/);
    
    const nome = nomePaciente
      .replace(/\s*PT:\s*\d+/g, "")
      .replace(/\s*AT:\s*\d+/g, "")
      .trim();

    return {
      nome,
      registro: ptMatch ? ptMatch[1] : "",
      codigoAtendimento: atMatch ? atMatch[1] : "",
    };
  }

  /**
   * Validates processed data before saving
   */
  validateProcessedData(dados: ProcessedEvolucao): { valid: boolean; errors: string[] } {
    const validacaoErros: string[] = [];

    if (!dados.dadosProcessados.leito || dados.dadosProcessados.leito.trim() === "") {
      validacaoErros.push("Leito é obrigatório");
    }

    if (!dados.dadosProcessados.nome || dados.dadosProcessados.nome.trim() === "") {
      validacaoErros.push("Nome do paciente é obrigatório");
    }

    if (!dados.dadosProcessados.dataInternacao || dados.dadosProcessados.dataInternacao.trim() === "") {
      validacaoErros.push("Data de internação é obrigatória");
    }

    if (dados.dadosProcessados.dataInternacao) {
      if (!this.isValidDateFormat(dados.dadosProcessados.dataInternacao)) {
        validacaoErros.push(`Data de internação em formato inválido: ${dados.dadosProcessados.dataInternacao}`);
      }
    }

    return {
      valid: validacaoErros.length === 0 && dados.erros.length === 0,
      errors: [...validacaoErros, ...dados.erros],
    };
  }

  /**
   * Calculates patient status based on filled fields
   */
  private calculatePatientStatus(dados: InsertPatient): "complete" | "pending" {
    const hasLeito = !!dados.leito && dados.leito.trim() !== "";
    const hasNome = !!dados.nome && dados.nome.trim() !== "";
    const hasDataInternacao = !!dados.dataInternacao && dados.dataInternacao.trim() !== "";

    const hasDiagnostico = !!dados.diagnostico && dados.diagnostico.trim() !== "";
    const hasObservacoes = !!dados.observacoes && dados.observacoes.trim() !== "";
    const hasDadosClinicosRelevantes = hasDiagnostico || hasObservacoes;

    const hasMobilidade = !!dados.mobilidade && dados.mobilidade.trim() !== "";

    if (hasLeito && hasNome && hasDataInternacao && hasDadosClinicosRelevantes && hasMobilidade) {
      return "complete";
    }

    return "pending";
  }

  private getTodayDate(): string {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = now.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private isValidDateFormat(dateString: string): boolean {
    return /^\d{2}\/\d{2}\/\d{4}$/.test(dateString);
  }

  private parseTimestamp(timestamp: any): Date | undefined {
    if (!timestamp) return undefined;

    try {
      if (typeof timestamp === "string" && timestamp.includes("/")) {
        const [datePart, timePart] = timestamp.split(" ");
        const [day, month, year] = datePart.split("/");
        const [hours, minutes] = (timePart || "00:00").split(":");
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours) || 0, parseInt(minutes) || 0);
        if (!isNaN(date.getTime())) return date;
      }
      
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) return date;
      return undefined;
    } catch {
      return undefined;
    }
  }
}

export const n8nIntegrationService = new N8NIntegrationService();
