import type { InsertPatient } from "@shared/schema";
import { validateEnfermaria, sanitizePatientData, validatePatientDataLength } from "../validation";

interface N8NRequest {
  flowId: string;
  forceUpdate: boolean;
  meta: {
    params: string[];
    formJson: Record<string, string>;
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
   */
  async fetchEvolucoes(unitIds: string = ""): Promise<N8NRawData[] | null> {
    try {
      const payload: N8NRequest = {
        flowId: "10A",
        forceUpdate: false,
        meta: {
          params: [unitIds],
          formJson: {
            dsEpecialid: "especialidade do paciente",
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
          }
        }
      };

      console.log(`[N8N] Fetching evolucoes with params: ["${unitIds}"]`);
      
      // Add timeout to prevent hanging indefinitely (60 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      
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
      
      // Verificar se a resposta está vazia
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
      
      // N8N pode retornar array ou objeto único
      const resultado = Array.isArray(data) ? data : (data && Object.keys(data).length > 0 ? [data] : []);
      console.log(`[N8N] Received ${resultado.length} record(s)`);
      
      return resultado;
    } catch (error) {
      console.error(`[N8N] Error fetching evolucoes:`, error);
      return null;
    }
  }

  /**
   * Processa e mapeia dados brutos da API N8N para InsertPatient
   * Extrai dados de múltiplas fontes: campos diretos, objetos aninhados (paciente, evolucao), e texto dsEvolucao
   */
  async processEvolucao(leito: string, dadosBrutos: N8NRawData): Promise<ProcessedEvolucao> {
    const erros: string[] = [];

    try {
      // Extrair objetos aninhados (nova estrutura N8N - atualizada dez/2025)
      const paciente = dadosBrutos.paciente || {};
      const pacienteEstado = paciente.estado || {};
      const pacienteObservacoes = paciente.observacoes || {};
      const pacienteExameFisico = paciente.exame_fisico || {};
      const pacienteManutencao = pacienteEstado.manutencao || {};
      const historico = paciente.historico || {};
      const evolucao = dadosBrutos.evolucao || {};
      const descricao = evolucao.descricao || {};
      const encontro = dadosBrutos.encontro || {};
      
      // Extrair informações do nome do paciente
      const nomePaciente = this.extractNomePaciente(dadosBrutos);
      const registro = this.extractRegistro(dadosBrutos);
      const codigoAtendimento = this.extractCodigoAtendimento(dadosBrutos);

      // Mapear todos os campos
      // SINCRONIZAÇÃO: ds_especialidade (N8N) → especialidadeRamal (Replit)
      const especialidade = this.extractEspecialidade(dadosBrutos);
      
      // Extrair campos com fallback para múltiplas fontes aninhadas (incluindo paciente.estado e paciente.observacoes)
      const alergias = this.extractNestedField(dadosBrutos, [pacienteObservacoes, paciente, historico, encontro], ['alergias', 'alergia']);
      const dispositivos = this.extractDispositivosFromData(dadosBrutos, pacienteManutencao);
      const mobilidade = this.extractNestedField(dadosBrutos, [pacienteEstado, descricao, encontro], ['mobilidade', 'condicao_mobilidade']);
      const dieta = this.extractNestedField(dadosBrutos, [pacienteEstado, descricao, encontro], ['dieta', 'alimentacao']);
      const eliminacoes = this.extractNestedField(dadosBrutos, [pacienteEstado, descricao, descricao.avaliação || {}, encontro], ['eliminacoes', 'eliminacao', 'evacuacao']);
      const atb = this.extractNestedField(dadosBrutos, [pacienteManutencao, encontro], ['atb', 'antibioticos', 'antibiotico', 'ATB']);
      const curativos = this.extractNestedField(dadosBrutos, [pacienteManutencao, encontro], ['curativos', 'curativo']);
      const aporteSaturacao = this.extractNestedField(dadosBrutos, [pacienteEstado, descricao, descricao.avaliação || {}, encontro], ['aporte_saturacao', 'aporteSaturacao', 'condicao_respiratoria', 'saturacao', 'respiração', 'frequencia_respiratoria']);
      const exames = this.extractNestedField(dadosBrutos, [paciente, encontro], ['exames', 'exames_realizados_pendentes', 'exame']);
      const cirurgia = this.extractNestedField(dadosBrutos, [paciente, encontro], ['cirurgia', 'data_programacao_cirurgica', 'procedimento', 'intervencao']);
      const observacoes = this.extractObservacoesFromData(dadosBrutos, pacienteObservacoes, pacienteEstado);
      const previsaoAlta = this.extractNestedField(dadosBrutos, [paciente, encontro], ['previsao_alta', 'previsaoAlta', 'alta']);
      const braden = this.extractNestedField(dadosBrutos, [pacienteEstado, encontro], ['braden', 'rq_braden', 'escala_braden']);
      const diagnostico = this.extractDiagnosticoFromData(dadosBrutos, paciente, historico);
      
      let dadosProcessados: InsertPatient = {
        // Campos básicos
        leito,
        nome: nomePaciente,
        registro,
        codigoAtendimento,
        especialidadeRamal: especialidade,
        dataNascimento: this.formatDateToDDMMYYYY(dadosBrutos.data_nascimento || dadosBrutos.dataNascimento || ""),
        dataInternacao: this.formatDateToDDMMYYYY(dadosBrutos.data_internacao || dadosBrutos.dataInternacao || new Date().toISOString()),

        // Dados clínicos (usando extração melhorada)
        rqBradenScp: braden,
        diagnosticoComorbidades: diagnostico,
        alergias: alergias,

        // Mobilidade
        mobilidade: this.normalizeMobilidade(mobilidade),

        // Cuidados
        dieta: dieta,
        eliminacoes: eliminacoes,
        dispositivos: dispositivos,
        atb: atb,
        curativos: curativos,

        // Monitoramento
        aporteSaturacao: aporteSaturacao,
        examesRealizadosPendentes: exames,

        // Planejamento
        dataProgramacaoCirurgica: cirurgia,
        observacoesIntercorrencias: observacoes,
        previsaoAlta: previsaoAlta,

        // Status - será calculado automaticamente
        alerta: null,
        status: "pending", // Será recalculado abaixo

        // Campos N8N
        idEvolucao: dadosBrutos.id_evolucao || dadosBrutos.id || "",
        dsEnfermaria: this.extractEnfermaria(dadosBrutos, leito),
        dsLeitoCompleto: dadosBrutos.ds_leito_completo || dadosBrutos.leito_completo || leito,
        // SINCRONIZAÇÃO: Manter ds_especialidade sincronizado com especialidadeRamal
        dsEspecialidade: especialidade,
        dsEvolucaoCompleta: dadosBrutos.dsEvolucao || dadosBrutos.ds_evolucao_completa || dadosBrutos.evolucao_completa || dadosBrutos.descricao || "",
        dhCriacaoEvolucao: this.parseTimestamp(dadosBrutos.dh_criacao_evolucao || dadosBrutos.data_criacao),
        fonteDados: "N8N_IAMSPE",
        dadosBrutosJson: dadosBrutos,
      };

      // Sanitize and validate patient data
      dadosProcessados = sanitizePatientData(dadosProcessados);
      if (!validatePatientDataLength(dadosProcessados)) {
        erros.push("Patient data exceeds maximum field lengths");
      }

      // Calcular status automaticamente baseado nos campos preenchidos
      dadosProcessados.status = this.calculatePatientStatus(dadosProcessados);

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
   * Calcula o status do paciente baseado nos campos preenchidos
   * Um paciente é considerado "complete" quando possui os campos essenciais preenchidos
   * Campos obrigatórios para ser considerado completo:
   * - leito, nome, dataInternacao (campos básicos)
   * - diagnosticoComorbidades OU observacoesIntercorrencias (dados clínicos)
   * - mobilidade (estado do paciente)
   */
  private calculatePatientStatus(dados: InsertPatient): "complete" | "pending" {
    // Campos básicos obrigatórios
    const hasLeito = !!dados.leito && dados.leito.trim() !== "";
    const hasNome = !!dados.nome && dados.nome.trim() !== "";
    const hasDataInternacao = !!dados.dataInternacao && dados.dataInternacao.trim() !== "";

    // Pelo menos um dado clínico relevante
    const hasDiagnostico = !!dados.diagnosticoComorbidades && dados.diagnosticoComorbidades.trim() !== "";
    const hasObservacoes = !!dados.observacoesIntercorrencias && dados.observacoesIntercorrencias.trim() !== "";
    const hasDadosClinicosRelevantes = hasDiagnostico || hasObservacoes;

    // Mobilidade (importante para cuidados)
    const hasMobilidade = !!dados.mobilidade && dados.mobilidade.trim() !== "";

    // Um paciente é completo se tem os dados básicos + dados clínicos + mobilidade
    if (hasLeito && hasNome && hasDataInternacao && hasDadosClinicosRelevantes && hasMobilidade) {
      return "complete";
    }

    return "pending";
  }

  /**
   * Extrai nome do paciente removendo PT e AT
   * Exemplo: "PACIENTE NOME PT: 123456 AT: 78901" -> "PACIENTE NOME"
   */
  private extractNomePaciente(dados: N8NRawData): string {
    let nome = dados.nomePaciente || dados.nome_paciente || dados.nome || dados.paciente || "";
    
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

    const nome = dados.nomePaciente || dados.nome_paciente || dados.nome || "";
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

    const nome = dados.nomePaciente || dados.nome_paciente || dados.nome || "";
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
    return dados.dsEpecialid ||        // Campo do N8N em camelCase (sem "ade" no final)
           dados.ds_especialidade || 
           dados.ds_especialid ||      
           dados.especialidade || 
           dados.especialidadeRamal || 
           "";
  }

  /**
   * Extrai código de enfermaria (formato "10A", "10B", etc)
   */
  private extractEnfermaria(dados: N8NRawData, leito: string): string {
    if (dados.dsEnfermaria) return dados.dsEnfermaria;
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
   * Extrai dispositivos de paciente.estado.manutencao
   * Campos: AVP, pelicula_transparente, sondas, drenos, etc.
   */
  private extractDispositivosFromData(dadosBrutos: N8NRawData, manutencao: N8NRawData): string {
    const dispositivos: string[] = [];
    
    // Verificar campos de manutenção
    if (manutencao.AVP) dispositivos.push(`AVP: ${manutencao.AVP}`);
    if (manutencao.pelicula_transparente) {
      const pt = manutencao.pelicula_transparente;
      if (typeof pt === "object" && pt.data) {
        dispositivos.push(`Película: ${pt.data}`);
      } else if (typeof pt === "string") {
        dispositivos.push(`Película: ${pt}`);
      }
    }
    if (manutencao.sonda) dispositivos.push(`Sonda: ${manutencao.sonda}`);
    if (manutencao.cateter) dispositivos.push(`Cateter: ${manutencao.cateter}`);
    if (manutencao.dreno) dispositivos.push(`Dreno: ${manutencao.dreno}`);
    
    // Fallback para campos diretos
    if (dispositivos.length === 0) {
      const disp = dadosBrutos.dispositivos || dadosBrutos.disp;
      if (disp) return this.valueToString(disp);
    }
    
    return dispositivos.join(" | ");
  }

  /**
   * Extrai observações de paciente.observacoes e paciente.estado
   * Combina informações relevantes de múltiplas fontes
   */
  private extractObservacoesFromData(dadosBrutos: N8NRawData, observacoes: N8NRawData, estado: N8NRawData): string {
    const obs: string[] = [];
    
    // Extrair observações estruturadas
    if (observacoes.deficit_auditivo) obs.push(`Déficit auditivo: ${observacoes.deficit_auditivo}`);
    if (observacoes.risco_quedas) obs.push(`Risco de quedas: ${observacoes.risco_quedas}`);
    if (observacoes.reposo === "sim") obs.push("Em repouso no leito");
    if (observacoes.pulseira_identificacao) obs.push(`Pulseira: ${observacoes.pulseira_identificacao}`);
    
    // Extrair consciência do estado
    if (estado.consciência) obs.push(estado.consciência);
    
    // Fallback para campos diretos
    if (obs.length === 0) {
      const obsField = dadosBrutos.observacoes || dadosBrutos.observacoes_intercorrencias;
      if (obsField) return this.valueToString(obsField);
    }
    
    return obs.join(" | ");
  }

  /**
   * Extrai diagnóstico de paciente.intervencao, historico, e campos diretos
   */
  private extractDiagnosticoFromData(dadosBrutos: N8NRawData, paciente: N8NRawData, historico: N8NRawData): string {
    // Priorizar intervenção do paciente
    if (paciente.intervencao) {
      return `HD: ${paciente.intervencao}`;
    }
    
    // Tentar histórico
    if (historico.diagnostico) return this.valueToString(historico.diagnostico);
    if (historico.comorbidades) return this.valueToString(historico.comorbidades);
    if (historico.antecedentes) return this.valueToString(historico.antecedentes);
    
    // Campos diretos
    if (dadosBrutos.diagnostico) return this.valueToString(dadosBrutos.diagnostico);
    if (dadosBrutos.diagnostico_comorbidades) return this.valueToString(dadosBrutos.diagnostico_comorbidades);
    
    return "";
  }

  /**
   * Formata data para DD/MM/YYYY
   * Aceita formatos: DD/MM/YYYY, ISO 8601, ou outros formatos parseáveis
   */
  private formatDateToDDMMYYYY(dateString: string): string {
    if (!dateString) return "";

    try {
      // Se já está no formato DD/MM/YYYY, retornar como está
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
        return dateString;
      }

      // Tentar parsear e converter
      const date = new Date(dateString);
      
      if (isNaN(date.getTime())) {
        // Se não parseou, usar data atual como fallback
        const now = new Date();
        const day = String(now.getDate()).padStart(2, "0");
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const year = now.getFullYear();
        return `${day}/${month}/${year}`;
      }

      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();

      return `${day}/${month}/${year}`;
    } catch {
      // Fallback para data atual
      const now = new Date();
      const day = String(now.getDate()).padStart(2, "0");
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const year = now.getFullYear();
      return `${day}/${month}/${year}`;
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

  /**
   * Converte um valor para string, tratando objetos aninhados
   */
  private valueToString(value: any): string {
    if (value === undefined || value === null) return "";
    
    // String simples
    if (typeof value === "string") {
      return value.trim();
    }
    
    // Número ou boolean
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    
    // Array - converter cada item e juntar
    if (Array.isArray(value)) {
      const items = value
        .map(item => this.valueToString(item))
        .filter(item => item !== "" && item !== "[object Object]");
      return items.join(" | ");
    }
    
    // Objeto - extrair valores relevantes
    if (typeof value === "object") {
      // Tentar campos comuns que contêm texto descritivo
      const textFields = ["descricao", "description", "valor", "value", "texto", "text", "nome", "name", "estado", "status"];
      for (const field of textFields) {
        if (value[field] && typeof value[field] === "string") {
          return value[field].trim();
        }
      }
      
      // Se não encontrou campo de texto, extrair todos os valores string
      const stringValues: string[] = [];
      for (const key of Object.keys(value)) {
        const v = value[key];
        if (typeof v === "string" && v.trim() !== "") {
          stringValues.push(v.trim());
        } else if (typeof v === "number" || typeof v === "boolean") {
          stringValues.push(`${key}: ${v}`);
        }
      }
      
      if (stringValues.length > 0) {
        return stringValues.join(", ");
      }
    }
    
    return "";
  }

  /**
   * Extrai campo de múltiplas fontes aninhadas com fallback
   * Prioridade: dadosBrutos (nível raiz) > objetos aninhados na ordem fornecida
   */
  private extractNestedField(dadosBrutos: N8NRawData, nestedObjects: N8NRawData[], fieldNames: string[]): string {
    // Primeiro tenta nos dados brutos (nível raiz)
    for (const fieldName of fieldNames) {
      const value = dadosBrutos[fieldName];
      const result = this.valueToString(value);
      if (result !== "") {
        return result;
      }
    }
    
    // Depois tenta em cada objeto aninhado na ordem fornecida
    for (const obj of nestedObjects) {
      if (!obj) continue;
      for (const fieldName of fieldNames) {
        const value = obj[fieldName];
        const result = this.valueToString(value);
        if (result !== "") {
          return result;
        }
      }
    }
    
    return "";
  }

  /**
   * Extrai campo que pode ser array ou string
   * Converte arrays para string separada por " | "
   */
  private extractNestedArrayOrString(dadosBrutos: N8NRawData, nestedObjects: N8NRawData[], fieldNames: string[]): string {
    // Primeiro tenta nos dados brutos (nível raiz)
    for (const fieldName of fieldNames) {
      const value = dadosBrutos[fieldName];
      const result = this.valueToString(value);
      if (result !== "") {
        return result;
      }
    }
    
    // Depois tenta em cada objeto aninhado
    for (const obj of nestedObjects) {
      if (!obj) continue;
      for (const fieldName of fieldNames) {
        const value = obj[fieldName];
        const result = this.valueToString(value);
        if (result !== "") {
          return result;
        }
      }
    }
    
    return "";
  }
}

// Export singleton instance
export const n8nIntegrationService = new N8NIntegrationService();
