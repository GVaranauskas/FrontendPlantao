import type { InsertPatient } from "@shared/schema";
import { validateEnfermaria, sanitizePatientData, validatePatientDataLength } from "../validation";

interface N8NRequest {
  flowId: string;
  forceUpdate: boolean;
  meta: {
    params: string[];
    formJson: string;
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

const N8N_API_URL = "https://n8n-dev.iamspe.sp.gov.br/webhook/evolucoes";

export class N8NIntegrationService {
  /**
   * Busca dados de evolução da API N8N para uma enfermaria
   */
  async fetchEvolucoes(enfermaria: string): Promise<N8NRawData[] | null> {
    try {
      // Validate enfermaria parameter to prevent injection
      if (!validateEnfermaria(enfermaria)) {
        console.error(`[N8N] Invalid enfermaria parameter: ${enfermaria}`);
        return null;
      }

      const payload: N8NRequest = {
        flowId: "1a2b3c4d5e",
        forceUpdate: false,
        meta: {
          params: [enfermaria],
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

      console.log(`[N8N] Fetching evolucoes for enfermaria: ${enfermaria}`);
      
      const response = await fetch(N8N_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[N8N] API error: ${response.status} ${response.statusText} - ${errorText}`);
        return null;
      }

      const responseText = await response.text();
      
      // Verificar se a resposta está vazia
      if (!responseText || responseText.trim() === "") {
        console.warn(`[N8N] Empty response from API for enfermaria: ${enfermaria}`);
        return [];
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error(`[N8N] Invalid JSON response for ${enfermaria}: ${responseText.substring(0, 200)}`);
        return null;
      }
      
      // N8N pode retornar array ou objeto único
      const resultado = Array.isArray(data) ? data : (data && Object.keys(data).length > 0 ? [data] : []);
      console.log(`[N8N] Received ${resultado.length} record(s) for enfermaria: ${enfermaria}`);
      
      return resultado;
    } catch (error) {
      console.error(`[N8N] Error fetching evolucoes for ${enfermaria}:`, error);
      return null;
    }
  }

  /**
   * Processa e mapeia dados brutos da API N8N para InsertPatient
   */
  async processEvolucao(leito: string, dadosBrutos: N8NRawData): Promise<ProcessedEvolucao> {
    const erros: string[] = [];

    try {
      // Extrair informações do nome do paciente
      const nomePaciente = this.extractNomePaciente(dadosBrutos);
      const registro = this.extractRegistro(dadosBrutos);
      const codigoAtendimento = this.extractCodigoAtendimento(dadosBrutos);

      // Mapear todos os campos
      // SINCRONIZAÇÃO: ds_especialidade (N8N) → especialidadeRamal (Replit)
      const especialidade = this.extractEspecialidade(dadosBrutos);
      
      let dadosProcessados: InsertPatient = {
        // Campos básicos
        leito,
        nome: nomePaciente,
        registro,
        codigoAtendimento,
        especialidadeRamal: especialidade,
        dataNascimento: this.formatDateToDDMMYYYY(dadosBrutos.data_nascimento || dadosBrutos.dataNascimento || ""),
        dataInternacao: this.formatDateToDDMMYYYY(dadosBrutos.data_internacao || dadosBrutos.dataInternacao || new Date().toISOString()),

        // Dados clínicos
        rqBradenScp: dadosBrutos.braden || dadosBrutos.rq_braden || "",
        diagnosticoComorbidades: dadosBrutos.diagnostico || dadosBrutos.diagnostico_comorbidades || "",
        alergias: dadosBrutos.alergias || "",

        // Mobilidade
        mobilidade: this.normalizeMobilidade(dadosBrutos.mobilidade || ""),

        // Cuidados
        dieta: dadosBrutos.dieta || "",
        eliminacoes: dadosBrutos.eliminacoes || "",
        dispositivos: dadosBrutos.dispositivos || "",
        atb: dadosBrutos.atb || dadosBrutos.antibioticos || "",
        curativos: dadosBrutos.curativos || "",

        // Monitoramento
        aporteSaturacao: dadosBrutos.aporte_saturacao || dadosBrutos.aporteSaturacao || "",
        examesRealizadosPendentes: dadosBrutos.exames || dadosBrutos.exames_realizados_pendentes || "",

        // Planejamento
        dataProgramacaoCirurgica: dadosBrutos.cirurgia || dadosBrutos.data_programacao_cirurgica || "",
        observacoesIntercorrencias: dadosBrutos.observacoes || dadosBrutos.observacoes_intercorrencias || "",
        previsaoAlta: dadosBrutos.previsao_alta || dadosBrutos.previsaoAlta || "",

        // Status
        alerta: null,
        status: "pending",

        // Campos N8N
        idEvolucao: dadosBrutos.id_evolucao || dadosBrutos.id || "",
        dsEnfermaria: this.extractEnfermaria(dadosBrutos, leito),
        dsLeitoCompleto: dadosBrutos.ds_leito_completo || dadosBrutos.leito_completo || leito,
        // SINCRONIZAÇÃO: Manter ds_especialidade sincronizado com especialidadeRamal
        dsEspecialidade: especialidade,
        dsEvolucaoCompleta: dadosBrutos.ds_evolucao_completa || dadosBrutos.evolucao_completa || dadosBrutos.descricao || "",
        dhCriacaoEvolucao: this.parseTimestamp(dadosBrutos.dh_criacao_evolucao || dadosBrutos.data_criacao),
        fonteDados: "N8N_IAMSPE",
        dadosBrutosJson: dadosBrutos,
      };

      // Sanitize and validate patient data
      dadosProcessados = sanitizePatientData(dadosProcessados);
      if (!validatePatientDataLength(dadosProcessados)) {
        erros.push("Patient data exceeds maximum field lengths");
      }

      return {
        pacienteName: nomePaciente,
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
   * Valida dados processados antes de salvar
   */
  validateProcessedData(dados: ProcessedEvolucao): { valid: boolean; errors: string[] } {
    const validacaoErros: string[] = [];

    // Validações obrigatórias
    if (!dados.dadosProcessados.leito || dados.dadosProcessados.leito.trim() === "") {
      validacaoErros.push("Leito é obrigatório");
    }

    if (!dados.dadosProcessados.nome || dados.dadosProcessados.nome.trim() === "") {
      validacaoErros.push("Nome do paciente é obrigatório");
    }

    if (!dados.dadosProcessados.dataInternacao || dados.dadosProcessados.dataInternacao.trim() === "") {
      validacaoErros.push("Data de internação é obrigatória");
    }

    // Validar formato de data (DD/MM/YYYY)
    if (dados.dadosProcessados.dataInternacao) {
      if (!this.isValidDateFormat(dados.dadosProcessados.dataInternacao)) {
        validacaoErros.push(`Data de internação em formato inválido: ${dados.dadosProcessados.dataInternacao}`);
      }
    }

    // Validar mobilidade se preenchida
    if (dados.dadosProcessados.mobilidade) {
      if (!["A", "D", "DA"].includes(dados.dadosProcessados.mobilidade)) {
        validacaoErros.push(`Mobilidade inválida: ${dados.dadosProcessados.mobilidade}. Deve ser A, D ou DA`);
      }
    }

    return {
      valid: validacaoErros.length === 0 && dados.erros.length === 0,
      errors: [...validacaoErros, ...dados.erros],
    };
  }

  /**
   * Extrai nome do paciente removendo PT e AT
   * Exemplo: "PACIENTE NOME PT: 123456 AT: 78901" -> "PACIENTE NOME"
   */
  private extractNomePaciente(dados: N8NRawData): string {
    let nome = dados.nome_paciente || dados.nome || dados.paciente || "";
    
    if (!nome) return "";

    // Remover padrões PT: XXXXX e AT: XXXXX
    nome = nome.replace(/\s*PT:\s*\d+\s*/g, "").replace(/\s*AT:\s*\d+\s*/g, "").trim();
    
    return nome;
  }

  /**
   * Extrai registro hospitalar (número após PT:)
   * Exemplo: "PACIENTE PT: 123456 AT: 78901" -> "123456"
   */
  private extractRegistro(dados: N8NRawData): string {
    if (dados.registro) return dados.registro;
    if (dados.pt) return dados.pt;

    const nome = dados.nome_paciente || dados.nome || "";
    const match = nome.match(/PT:\s*(\d+)/);
    
    return match ? match[1] : "";
  }

  /**
   * Extrai código atendimento (número após AT:)
   * Exemplo: "PACIENTE PT: 123456 AT: 78901" -> "78901"
   */
  private extractCodigoAtendimento(dados: N8NRawData): string {
    if (dados.codigo_atendimento) return dados.codigo_atendimento;
    if (dados.at) return dados.at;

    const nome = dados.nome_paciente || dados.nome || "";
    const match = nome.match(/AT:\s*(\d+)/);
    
    return match ? match[1] : "";
  }

  /**
   * Extrai especialidade
   * NOTA: ds_especialidade/ds_especialid (N8N) é equivalente a especialidadeRamal (Replit)
   * Prioriza o campo N8N quando disponível
   * N8N envia como "ds_especialid" (sem o "ade" no final)
   */
  private extractEspecialidade(dados: N8NRawData): string {
    return dados.ds_especialidade || 
           dados.ds_especialid ||      // Campo do N8N (sem "ade" no final)
           dados.especialidade || 
           dados.especialidadeRamal || 
           "";
  }

  /**
   * Extrai código de enfermaria (formato "10A", "10B", etc)
   */
  private extractEnfermaria(dados: N8NRawData, leito: string): string {
    if (dados.ds_enfermaria) return dados.ds_enfermaria;
    if (dados.enfermaria) return dados.enfermaria;
    
    // Tentar extrair do leito (ex: "10A02" -> "10A")
    const match = leito.match(/^(\d+[A-Z])/);
    return match ? match[1] : leito;
  }

  /**
   * Normaliza mobilidade para A, D, ou DA
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

  /**
   * Formata data para DD/MM/YYYY
   */
  private formatDateToDDMMYYYY(dateString: string): string {
    if (!dateString) return "";

    try {
      const date = new Date(dateString);
      
      if (isNaN(date.getTime())) return "";

      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();

      return `${day}/${month}/${year}`;
    } catch {
      return "";
    }
  }

  /**
   * Valida se a data está no formato DD/MM/YYYY
   */
  private isValidDateFormat(dateString: string): boolean {
    const regex = /^\d{2}\/\d{2}\/\d{4}$/;
    return regex.test(dateString);
  }

  /**
   * Parse timestamp da API para Date
   */
  private parseTimestamp(timestamp: any): Date | undefined {
    if (!timestamp) return undefined;

    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return undefined;
      return date;
    } catch {
      return undefined;
    }
  }
}

// Export singleton instance
export const n8nIntegrationService = new N8NIntegrationService();
