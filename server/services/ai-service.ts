import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { env } from "../config/env";

// OpenAI is the primary provider
const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

// Claude/Anthropic is the fallback provider (optional)
const anthropic = env.ANTHROPIC_API_KEY ? new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
}) : null;

const CLAUDE_MODEL = env.ANTHROPIC_MODEL;
const OPENAI_MODEL = env.OPENAI_MODEL;
const HAS_CLAUDE = !!env.ANTHROPIC_API_KEY;

interface PatientAnalysisResult {
  resumo: string;
  alertas: string[];
  recomendacoes: string[];
  riscos: string[];
  prioridade: "baixa" | "media" | "alta" | "critica";
}

interface PatientData {
  id?: string | null;
  nome?: string | null;
  leito?: string | null;
  diagnostico?: string | null;
  alergias?: string | null;
  mobilidade?: string | null;
  dieta?: string | null;
  dispositivos?: string | null;
  atb?: string | null;
  braden?: string | null;
  observacoes?: string | null;
  dsEnfermaria?: string | null;
  dataInternacao?: string | null;
  eliminacoes?: string | null;
  curativos?: string | null;
  aporteSaturacao?: string | null;
  exames?: string | null;
  cirurgia?: string | null;
  previsaoAlta?: string | null;
  [key: string]: any;
}

interface MultiplePatientAnalysis {
  resumoGeral: string;
  pacientesCriticos: string[];
  alertasGerais: string[];
  estatisticas: {
    total: number;
    altaComplexidade: number;
    mediaBraden: number;
  };
}

// Tipos para análise clínica completa de passagem de plantão
export interface ClinicalAlert {
  tipo: "RISCO_QUEDA" | "RISCO_LESAO" | "RISCO_ASPIRACAO" | "RISCO_INFECCAO" | "RISCO_RESPIRATORIO" | "RISCO_NUTRICIONAL";
  nivel: "VERMELHO" | "AMARELO" | "VERDE";
  titulo: string;
  descricao: string;
  evidencias: string[];
  impacto_clinico: string;
  recomendacao_imediata: string;
  fundamentacao_tecnica: string;
}

export interface DietRecommendation {
  tipo: "MUDANCA_DIETA" | "AVALIACAO_NUTRICIONAL" | "TESTE_DEGLUTICAO" | "SUPLEMENTACAO";
  justificativa: string;
  dieta_sugerida: string;
  via_recomendada: "VO" | "NE" | "NP";
}

export interface DietAnalysis {
  dieta_atual: string;
  adequacao: "ADEQUADA" | "INADEQUADA" | "INCOMPLETA";
  riscos_identificados: string[];
  recomendacoes: DietRecommendation[];
}

export interface DocumentationGap {
  campo: string;
  tipo_gap: "AUSENTE" | "INCOMPLETO" | "INCONSISTENTE";
  importancia: "CRITICA" | "ALTA" | "MEDIA";
  descricao: string;
  impacto_assistencial: string;
  como_documentar: string;
}

export interface ClinicalInconsistency {
  campos_envolvidos: string[];
  tipo: "DIAGNOSTICO_TRATAMENTO" | "MOBILIDADE_CUIDADOS" | "DIETA_CONDICAO" | "DISPOSITIVO_INDICACAO";
  descricao: string;
  risco_associado: string;
  correcao_sugerida: string;
}

export interface EducationOpportunity {
  categoria: "SBAR" | "TERMINOLOGIA" | "EXAME_FISICO" | "SEGURANCA_PACIENTE" | "ESCALAS" | "DISPOSITIVOS";
  titulo: string;
  gap_identificado: string;
  importancia: string;
  orientacao: string;
  exemplo_pratico: string;
  referencias: string[];
}

export interface PositiveAspect {
  aspecto: string;
  importancia: string;
  impacto: string;
}

export interface QualityScore {
  pontuacao_total: number;
  categoria: "EXCELENTE" | "MUITO_BOM" | "BOM" | "REGULAR" | "PRECISA_MELHORAR";
  criterios_avaliados: {
    identificacao_paciente: number;
    historia_clinica: number;
    sinais_vitais: number;
    dispositivos: number;
    dieta: number;
    eliminacoes: number;
    medicacoes: number;
    mobilidade: number;
    curativos: number;
    consciencia: number;
    exames: number;
    sbar: number;
    plano_cuidados: number;
    familia: number;
  };
}

export interface ActionPriority {
  prioridade: 1 | 2 | 3;
  acao: string;
  prazo: "IMEDIATO" | "2H" | "6H" | "24H";
  responsavel: "ENFERMEIRO" | "MEDICO" | "EQUIPE_MULTIPROFISSIONAL";
}

export interface ClinicalAnalysisResult {
  timestamp_analise: string;
  paciente_id: string;
  leito: string;
  alertas_criticos: ClinicalAlert[];
  analise_dieta: DietAnalysis;
  gaps_documentacao: DocumentationGap[];
  inconsistencias_clinicas: ClinicalInconsistency[];
  oportunidades_educacao: EducationOpportunity[];
  pontos_positivos: PositiveAspect[];
  score_qualidade: QualityScore;
  prioridades_acao: ActionPriority[];
}

// Simplified version for storage and display
export interface PatientClinicalInsights {
  timestamp: string;
  nivel_alerta: "VERMELHO" | "AMARELO" | "VERDE";
  alertas_count: { vermelho: number; amarelo: number; verde: number };
  principais_alertas: Array<{ tipo: string; nivel: string; titulo: string; descricao?: string }>;
  gaps_criticos: string[];
  score_qualidade: number;
  categoria_qualidade: string;
  prioridade_acao: string | null;
  recomendacoes_enfermagem: string[];
  analise_completa?: ClinicalAnalysisResult;
}

// Estrutura detalhada de cada leito para análise rica
export interface LeitoDetalhado {
  leito: string;
  nome: string;
  diagnostico_principal: string;
  tipo_enfermidade: string;
  dias_internacao: number;
  nivel_alerta: "VERMELHO" | "AMARELO" | "VERDE";
  score_qualidade: number;
  braden: string;
  mobilidade: string;
  riscos_identificados: Array<{
    tipo: string;
    nivel: "ALTO" | "MODERADO" | "BAIXO";
    descricao: string;
  }>;
  protocolos_ativos: Array<{
    nome: string;
    descricao: string;
    frequencia?: string;
  }>;
  recomendacoes_enfermagem: string[];
  alertas: Array<{
    tipo: string;
    nivel: "VERMELHO" | "AMARELO" | "VERDE";
    titulo: string;
    descricao?: string;
  }>;
  gaps_documentacao: string[];
  dispositivos: string[];
  antibioticos: string[];
}

// Estrutura para classificação de leitos por problema
export interface LeitoClassificado {
  leito: string;
  nome: string;
  nivel: "VERMELHO" | "AMARELO" | "VERDE";
  problemas: string[];
  recomendacoes: string[];
  alertas_prioritarios: string[];
}

export interface ClassificacaoProblemas {
  risco_queda: LeitoClassificado[];
  risco_lesao_pressao: LeitoClassificado[];
  risco_infeccao: LeitoClassificado[];
  risco_broncoaspiracao: LeitoClassificado[];
  risco_nutricional: LeitoClassificado[];
  risco_respiratorio: LeitoClassificado[];
}

// Protocolo de enfermagem por categoria de risco
export interface ProtocoloEnfermagem {
  categoria: string;
  icone: string;
  cor: string;
  leitos_afetados: string[];
  quantidade: number;
  protocolo_resumo: string;
  acoes_principais: string[];
}

// Indicadores avançados do plantão
export interface IndicadoresPlantao {
  total_pacientes: number;
  media_braden: number;
  media_dias_internacao: number;
  taxa_completude_documentacao: number;
  pacientes_alta_complexidade: number;
  pacientes_com_dispositivos: number;
  pacientes_com_atb: number;
  pacientes_acamados: number;
  pacientes_risco_queda_alto: number;
  pacientes_lesao_pressao: number;
}

export interface AnaliseGeralMelhorada {
  timestamp: string;
  resumo_executivo: string;
  alertas_criticos_enfermagem: string[];
  classificacao_por_problema: ClassificacaoProblemas;
  leitos_prioridade_maxima: LeitoClassificado[];
  leitos_detalhados: LeitoDetalhado[];
  protocolos_enfermagem: ProtocoloEnfermagem[];
  indicadores: IndicadoresPlantao;
  estatisticas: {
    total: number;
    vermelho: number;
    amarelo: number;
    verde: number;
    por_tipo_risco: Record<string, number>;
  };
  recomendacoes_gerais_plantao: string[];
}

const SYSTEM_PROMPT_PATIENT = `Você é um assistente clínico especializado em enfermagem hospitalar.
Sua função é analisar dados de pacientes e fornecer insights relevantes para a equipe de enfermagem.
Seja objetivo, conciso e focado em informações clinicamente relevantes.
Responda SEMPRE em formato JSON válido.`;

const SYSTEM_PROMPT_MULTIPLE = `Você é um assistente clínico especializado em enfermagem hospitalar.
Analise o resumo dos pacientes e forneça insights para a passagem de plantão.
Identifique pacientes que precisam de atenção especial.
Responda SEMPRE em formato JSON válido com os campos:
- resumoGeral: string
- pacientesCriticos: string[] (lista de leitos que precisam de atenção)
- alertasGerais: string[] (alertas importantes para o plantão)
- estatisticas: { total: number, altaComplexidade: number, mediaBraden: number }`;

const SYSTEM_PROMPT_CARE = `Você é um assistente clínico especializado em enfermagem.
Gere recomendações de cuidados específicas e práticas para o paciente.
Responda em formato JSON com um array "recomendacoes" contendo strings.`;

const CLINICAL_ANALYSIS_PROMPT = `Você é um sistema de análise clínica especializado em enfermagem hospitalar brasileira. 
Temperatura = 0 (análise objetiva).

Sua função é avaliar criticamente os dados de passagem de plantão, identificando:
1. Situações de risco clínico (urgentes ou potenciais)
2. Alertas de segurança do paciente
3. Necessidades nutricionais e dietéticas
4. Lacunas na documentação clínica
5. Oportunidades de educação continuada

GLOSSÁRIO DE DISPOSITIVOS:
AVP: Acesso Venoso Periférico | AVC: Acesso Venoso Central | PICC: Cateter Central de Inserção Periférica
SVD: Sonda Vesical de Demora | SVA: Sonda Vesical de Alívio | SNG: Sonda Nasogástrica | SNE: Sonda Nasoenteral
TOT: Tubo Orotraqueal | TQT: Traqueostomia | GTT: Gastrostomia

ESCALAS CLÍNICAS:
Braden: Risco de lesão por pressão (6-23, <13 alto risco)
Glasgow: Nível de consciência (3-15, <8 grave)
Morse: Risco de queda (0-125, >45 alto risco)

REGRAS DE ANÁLISE DE RISCO:

1. RISCO DE QUEDA (ALERTA VERMELHO):
- Braden < 13 + mobilidade "acamado"
- Dispositivos múltiplos (SVD + AVP) + mobilidade prejudicada
- Glasgow < 15 + deambulando
- Medicações sedativas + mobilidade

2. RISCO DE LESÃO POR PRESSÃO (ALERTA VERMELHO):
- Braden < 13
- Braden 13-14 + desnutrição/desidratado
- Acamado sem mudança de decúbito documentada

3. RISCO DE BRONCOASPIRAÇÃO (ALERTA VERMELHO):
- Dieta VO + Glasgow < 13
- Dieta VO + "sonolento" ou "torporoso"
- Dieta VO + diagnóstico de AVC agudo
- SNG presente mas dieta não especificada como enteral

4. RISCO INFECCIOSO (ALERTA AMARELO):
- AVP >72h sem documentação de troca
- SVD prolongada (>5 dias) sem justificativa
- Diagnóstico de sepse + ausência de ATB documentado
- Febre + ausência de culturas nos exames

5. RISCO NUTRICIONAL (ALERTA AMARELO):
- Dieta zero >48h sem NPT/NE
- Desnutrição + dieta não hiperproteica
- Diabetes + dieta não especificada como hipoglicídica

6. RISCO RESPIRATÓRIO (ALERTA VERMELHO):
- SatO2 <92% + ausência de O2 suplementar documentado
- DPOC/Asma + crise + ausência de nebulização
- Secreções abundantes + ausência de fisioterapia

CAMPOS OBRIGATÓRIOS (verificar ausência):
- Diagnóstico, Alergias, Mobilidade, Dieta, Eliminações, Braden

Responda SEMPRE em formato JSON válido conforme o schema especificado.
Priorize segurança do paciente. Riscos VERMELHO antes de AMARELO.
Seja técnico mas educativo. Cite evidências e protocolos.`;

export class AIService {
  private provider: "claude" | "openai" = "claude";

  /**
   * Try OpenAI first, fallback to Claude if it fails
   */
  private async callWithFallback<T>(
    claudeCall: () => Promise<T>,
    openaiCall: () => Promise<T>
  ): Promise<T> {
    try {
      console.log(`[AI] Attempting with OpenAI (${OPENAI_MODEL})...`);
      const result = await openaiCall();
      this.provider = "openai";
      return result;
    } catch (openaiError) {
      console.warn("[AI] OpenAI failed:", openaiError);
      
      // Only try Claude fallback if it's available
      if (!HAS_CLAUDE || !anthropic) {
        console.error("[AI] Claude fallback not available (no API key configured)");
        throw openaiError;
      }
      
      try {
        console.log(`[AI] Falling back to Claude (${CLAUDE_MODEL})...`);
        const result = await claudeCall();
        this.provider = "claude";
        return result;
      } catch (claudeError) {
        console.error("[AI] Both providers failed");
        throw claudeError;
      }
    }
  }

  /**
   * Get the current provider being used
   */
  getProvider(): string {
    return this.provider;
  }

  /**
   * Analyze patient data using Claude (primary) or OpenAI (fallback)
   */
  async analyzePatient(patient: PatientData): Promise<PatientAnalysisResult> {
    const userPrompt = this.buildPatientAnalysisPrompt(patient);

    return this.callWithFallback(
      // Claude fallback
      async () => {
        const response = await anthropic!.messages.create({
          model: CLAUDE_MODEL,
          max_tokens: 1000,
          temperature: 0,
          messages: [
            {
              role: "user",
              content: userPrompt,
            },
          ],
          system: SYSTEM_PROMPT_PATIENT,
        });

        const content = response.content[0];
        if (content.type !== "text") {
          throw new Error("Resposta inesperada do Claude");
        }

        // Extract JSON from response (Claude may add text around it)
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("JSON não encontrado na resposta do Claude");
        }

        return JSON.parse(jsonMatch[0]) as PatientAnalysisResult;
      },
      // OpenAI primary
      async () => {
        const response = await openai.chat.completions.create({
          model: OPENAI_MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT_PATIENT },
            { role: "user", content: userPrompt },
          ],
          temperature: 0,
          max_tokens: 1000,
          response_format: { type: "json_object" },
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error("Resposta vazia da OpenAI");
        }

        return JSON.parse(content) as PatientAnalysisResult;
      }
    );
  }

  /**
   * Analyze multiple patients for shift handover summary
   */
  async analyzeMultiplePatients(patients: PatientData[]): Promise<MultiplePatientAnalysis> {
    const patientsSummary = patients.map((p) => ({
      leito: p.leito,
      diagnostico: p.diagnostico?.substring(0, 100),
      braden: p.braden,
      mobilidade: p.mobilidade,
      alertas: p.observacoes?.substring(0, 50),
    }));

    const userPrompt = `Analise estes ${patients.length} pacientes:\n${JSON.stringify(patientsSummary, null, 2)}`;

    return this.callWithFallback(
      // Claude fallback
      async () => {
        const response = await anthropic!.messages.create({
          model: CLAUDE_MODEL,
          max_tokens: 1500,
          temperature: 0,
          messages: [
            {
              role: "user",
              content: userPrompt,
            },
          ],
          system: SYSTEM_PROMPT_MULTIPLE,
        });

        const content = response.content[0];
        if (content.type !== "text") {
          throw new Error("Resposta inesperada do Claude");
        }

        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("JSON não encontrado na resposta do Claude");
        }

        return JSON.parse(jsonMatch[0]) as MultiplePatientAnalysis;
      },
      // OpenAI primary
      async () => {
        const response = await openai.chat.completions.create({
          model: OPENAI_MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT_MULTIPLE },
            { role: "user", content: userPrompt },
          ],
          temperature: 0,
          max_tokens: 1500,
          response_format: { type: "json_object" },
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error("Resposta vazia da OpenAI");
        }

        return JSON.parse(content) as MultiplePatientAnalysis;
      }
    );
  }

  /**
   * Generate care recommendations for a patient
   */
  async generateCareRecommendations(patient: PatientData): Promise<string[]> {
    const userPrompt = `Paciente:
- Diagnóstico: ${patient.diagnostico || "Não informado"}
- Braden: ${patient.braden || "Não avaliado"}
- Mobilidade: ${patient.mobilidade || "Não informada"}
- Dispositivos: ${patient.dispositivos || "Nenhum"}
- Alergias: ${patient.alergias || "NKDA"}

Gere 3-5 recomendações de cuidados prioritários.`;

    try {
      return await this.callWithFallback(
        // Claude fallback
        async () => {
          const response = await anthropic!.messages.create({
            model: CLAUDE_MODEL,
            max_tokens: 500,
            temperature: 0,
            messages: [
              {
                role: "user",
                content: userPrompt,
              },
            ],
            system: SYSTEM_PROMPT_CARE,
          });

          const content = response.content[0];
          if (content.type !== "text") {
            return [];
          }

          const jsonMatch = content.text.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            return [];
          }

          const parsed = JSON.parse(jsonMatch[0]);
          return parsed.recomendacoes || [];
        },
        // OpenAI primary
        async () => {
          const response = await openai.chat.completions.create({
            model: OPENAI_MODEL,
            messages: [
              { role: "system", content: SYSTEM_PROMPT_CARE },
              { role: "user", content: userPrompt },
            ],
            temperature: 0,
            max_tokens: 500,
            response_format: { type: "json_object" },
          });

          const content = response.choices[0]?.message?.content;
          if (!content) return [];

          const parsed = JSON.parse(content);
          return parsed.recomendacoes || [];
        }
      );
    } catch (error) {
      console.error("[AI] Erro ao gerar recomendações:", error);
      return [];
    }
  }

  /**
   * Perform comprehensive clinical analysis for shift handover
   */
  async performClinicalAnalysis(patient: PatientData): Promise<ClinicalAnalysisResult> {
    const userPrompt = this.buildClinicalAnalysisPrompt(patient);

    return this.callWithFallback(
      // Claude fallback
      async () => {
        const response = await anthropic!.messages.create({
          model: CLAUDE_MODEL,
          max_tokens: 4000,
          temperature: 0,
          messages: [{ role: "user", content: userPrompt }],
          system: CLINICAL_ANALYSIS_PROMPT,
        });

        const content = response.content[0];
        if (content.type !== "text") {
          throw new Error("Resposta inesperada do Claude");
        }

        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("JSON não encontrado na resposta do Claude");
        }

        return JSON.parse(jsonMatch[0]) as ClinicalAnalysisResult;
      },
      // OpenAI primary
      async () => {
        const response = await openai.chat.completions.create({
          model: OPENAI_MODEL,
          messages: [
            { role: "system", content: CLINICAL_ANALYSIS_PROMPT },
            { role: "user", content: userPrompt },
          ],
          temperature: 0,
          max_tokens: 4000,
          response_format: { type: "json_object" },
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error("Resposta vazia da OpenAI");
        }

        return JSON.parse(content) as ClinicalAnalysisResult;
      }
    );
  }

  /**
   * Simplified clinical insights extraction from full analysis
   */
  extractClinicalInsights(analysis: ClinicalAnalysisResult): PatientClinicalInsights {
    const alertas = analysis.alertas_criticos || [];
    const vermelho = alertas.filter((a) => a.nivel === "VERMELHO").length;
    const amarelo = alertas.filter((a) => a.nivel === "AMARELO").length;
    const verde = alertas.filter((a) => a.nivel === "VERDE").length;

    let nivel_alerta: "VERMELHO" | "AMARELO" | "VERDE" = "VERDE";
    if (vermelho > 0) nivel_alerta = "VERMELHO";
    else if (amarelo > 0) nivel_alerta = "AMARELO";

    const gaps_criticos = (analysis.gaps_documentacao || [])
      .filter((g) => g.importancia === "CRITICA")
      .map((g) => g.campo);

    const prioridadeImediata = (analysis.prioridades_acao || []).find(
      (p) => p.prazo === "IMEDIATO"
    );

    // Extrair recomendações prioritárias para enfermagem
    const recomendacoes_enfermagem: string[] = [];
    
    // Recomendações imediatas dos alertas
    alertas.filter(a => a.nivel === "VERMELHO" || a.nivel === "AMARELO")
      .slice(0, 3)
      .forEach(a => {
        if (a.recomendacao_imediata) {
          recomendacoes_enfermagem.push(a.recomendacao_imediata);
        }
      });
    
    // Prioridades de ação do enfermeiro
    (analysis.prioridades_acao || [])
      .filter(p => p.responsavel === "ENFERMEIRO" && p.prazo !== "24H")
      .slice(0, 2)
      .forEach(p => {
        if (!recomendacoes_enfermagem.includes(p.acao)) {
          recomendacoes_enfermagem.push(p.acao);
        }
      });

    return {
      timestamp: new Date().toISOString(),
      nivel_alerta,
      alertas_count: { vermelho, amarelo, verde },
      principais_alertas: alertas.slice(0, 5).map((a) => ({
        tipo: a.tipo,
        nivel: a.nivel,
        titulo: a.titulo,
        descricao: a.descricao,
      })),
      gaps_criticos,
      score_qualidade: analysis.score_qualidade?.pontuacao_total || 0,
      categoria_qualidade: analysis.score_qualidade?.categoria || "NAO_AVALIADO",
      prioridade_acao: prioridadeImediata?.acao || null,
      recomendacoes_enfermagem,
      analise_completa: analysis,
    };
  }

  /**
   * Generate enhanced general analysis with problem classification and detailed bed information
   */
  async generateEnhancedGeneralAnalysis(
    patients: PatientData[],
    patientInsights: Map<string, PatientClinicalInsights>
  ): Promise<AnaliseGeralMelhorada> {
    // Classificar leitos por tipo de problema
    const classificacao: ClassificacaoProblemas = {
      risco_queda: [],
      risco_lesao_pressao: [],
      risco_infeccao: [],
      risco_broncoaspiracao: [],
      risco_nutricional: [],
      risco_respiratorio: [],
    };

    const leitosPrioridadeMaxima: LeitoClassificado[] = [];
    const leitosDetalhados: LeitoDetalhado[] = [];
    const stats = {
      total: patients.length,
      vermelho: 0,
      amarelo: 0,
      verde: 0,
      por_tipo_risco: {} as Record<string, number>,
    };

    // Indicadores avançados
    let totalBraden = 0;
    let bradenCount = 0;
    let totalDiasInternacao = 0;
    let totalScoreQualidade = 0;
    let pacientesComDispositivos = 0;
    let pacientesComAtb = 0;
    let pacientesAcamados = 0;
    let pacientesRiscoQuedaAlto = 0;
    let pacientesLesaoPressao = 0;

    for (const patient of patients) {
      const insights = patientInsights.get(patient.id || "");
      if (!insights) continue;

      // Contar por nível
      if (insights.nivel_alerta === "VERMELHO") stats.vermelho++;
      else if (insights.nivel_alerta === "AMARELO") stats.amarelo++;
      else stats.verde++;

      // Calcular indicadores
      const bradenValue = parseInt(patient.braden || "0");
      if (bradenValue > 0) {
        totalBraden += bradenValue;
        bradenCount++;
        if (bradenValue <= 12) pacientesLesaoPressao++;
      }

      // Calcular dias de internação
      let diasInternacao = 0;
      if (patient.dataInternacao) {
        const dataInt = new Date(patient.dataInternacao.split("/").reverse().join("-"));
        if (!isNaN(dataInt.getTime())) {
          diasInternacao = Math.floor((Date.now() - dataInt.getTime()) / (1000 * 60 * 60 * 24));
          totalDiasInternacao += diasInternacao;
        }
      }

      totalScoreQualidade += insights.score_qualidade || 0;

      if (patient.dispositivos && patient.dispositivos.trim() !== "" && patient.dispositivos !== "-") {
        pacientesComDispositivos++;
      }
      if (patient.atb && patient.atb.trim() !== "" && patient.atb !== "-") {
        pacientesComAtb++;
      }
      if (patient.mobilidade?.toLowerCase().includes("acamado") || patient.mobilidade === "A") {
        pacientesAcamados++;
      }

      // Detectar tipo de enfermidade baseado no diagnóstico
      const tipoEnfermidade = this.detectarTipoEnfermidade(patient.diagnostico || "");

      // Criar leito detalhado
      const leitoDetalhado: LeitoDetalhado = {
        leito: patient.leito || "",
        nome: patient.nome || "",
        diagnostico_principal: patient.diagnostico || "Não informado",
        tipo_enfermidade: tipoEnfermidade,
        dias_internacao: diasInternacao,
        nivel_alerta: insights.nivel_alerta,
        score_qualidade: insights.score_qualidade || 0,
        braden: patient.braden || "-",
        mobilidade: patient.mobilidade || "-",
        riscos_identificados: [],
        protocolos_ativos: [],
        recomendacoes_enfermagem: insights.recomendacoes_enfermagem || [],
        alertas: insights.principais_alertas?.map(a => ({
          tipo: a.tipo,
          nivel: a.nivel as "VERMELHO" | "AMARELO" | "VERDE",
          titulo: a.titulo,
          descricao: a.descricao
        })) || [],
        gaps_documentacao: insights.gaps_criticos || [],
        dispositivos: patient.dispositivos?.split(",").map(d => d.trim()).filter(d => d) || [],
        antibioticos: patient.atb?.split(",").map(a => a.trim()).filter(a => a) || [],
      };

      // Identificar riscos e protocolos baseados nos alertas
      for (const alerta of insights.principais_alertas || []) {
        const tipo = alerta.tipo;
        stats.por_tipo_risco[tipo] = (stats.por_tipo_risco[tipo] || 0) + 1;

        // Adicionar risco identificado
        leitoDetalhado.riscos_identificados.push({
          tipo: this.formatarTipoRisco(tipo),
          nivel: alerta.nivel === "VERMELHO" ? "ALTO" : alerta.nivel === "AMARELO" ? "MODERADO" : "BAIXO",
          descricao: alerta.titulo,
        });

        // Adicionar protocolo correspondente
        const protocolo = this.getProtocoloParaRisco(tipo, alerta.nivel);
        if (protocolo && !leitoDetalhado.protocolos_ativos.some(p => p.nome === protocolo.nome)) {
          leitoDetalhado.protocolos_ativos.push(protocolo);
        }

        if (tipo === "RISCO_QUEDA" && (alerta.nivel === "VERMELHO" || alerta.nivel === "AMARELO")) {
          pacientesRiscoQuedaAlto++;
        }
      }

      leitosDetalhados.push(leitoDetalhado);

      const leitoInfo: LeitoClassificado = {
        leito: patient.leito || "",
        nome: patient.nome || "",
        nivel: insights.nivel_alerta,
        problemas: [],
        recomendacoes: insights.recomendacoes_enfermagem || [],
        alertas_prioritarios: insights.principais_alertas?.map(a => a.titulo) || [],
      };

      // Classificar por tipo de problema
      for (const alerta of insights.principais_alertas || []) {
        const tipo = alerta.tipo;
        leitoInfo.problemas.push(alerta.titulo);

        if (tipo === "RISCO_QUEDA") {
          classificacao.risco_queda.push({ ...leitoInfo });
        } else if (tipo === "RISCO_LESAO") {
          classificacao.risco_lesao_pressao.push({ ...leitoInfo });
        } else if (tipo === "RISCO_INFECCAO") {
          classificacao.risco_infeccao.push({ ...leitoInfo });
        } else if (tipo === "RISCO_ASPIRACAO") {
          classificacao.risco_broncoaspiracao.push({ ...leitoInfo });
        } else if (tipo === "RISCO_NUTRICIONAL") {
          classificacao.risco_nutricional.push({ ...leitoInfo });
        } else if (tipo === "RISCO_RESPIRATORIO") {
          classificacao.risco_respiratorio.push({ ...leitoInfo });
        }
      }

      // Adicionar aos de prioridade máxima se vermelho
      if (insights.nivel_alerta === "VERMELHO") {
        leitosPrioridadeMaxima.push(leitoInfo);
      }
    }

    // Calcular indicadores
    const indicadores: IndicadoresPlantao = {
      total_pacientes: patients.length,
      media_braden: bradenCount > 0 ? Math.round((totalBraden / bradenCount) * 10) / 10 : 0,
      media_dias_internacao: patients.length > 0 ? Math.round(totalDiasInternacao / patients.length) : 0,
      taxa_completude_documentacao: patients.length > 0 ? Math.round(totalScoreQualidade / patients.length) : 0,
      pacientes_alta_complexidade: stats.vermelho + stats.amarelo,
      pacientes_com_dispositivos: pacientesComDispositivos,
      pacientes_com_atb: pacientesComAtb,
      pacientes_acamados: pacientesAcamados,
      pacientes_risco_queda_alto: pacientesRiscoQuedaAlto,
      pacientes_lesao_pressao: pacientesLesaoPressao,
    };

    // Gerar protocolos de enfermagem consolidados
    const protocolosEnfermagem: ProtocoloEnfermagem[] = this.gerarProtocolosConsolidados(classificacao);

    // Gerar alertas críticos consolidados para enfermagem
    const alertasCriticos: string[] = [];
    
    if (stats.vermelho > 0) {
      alertasCriticos.push(`${stats.vermelho} paciente(s) em estado CRÍTICO requer(em) atenção imediata`);
    }
    
    if (classificacao.risco_queda.filter(l => l.nivel === "VERMELHO").length > 0) {
      const leitos = classificacao.risco_queda.filter(l => l.nivel === "VERMELHO").map(l => l.leito).join(", ");
      alertasCriticos.push(`RISCO DE QUEDA ELEVADO: Leitos ${leitos} - Verificar grades, contenção e supervisão`);
    }
    
    if (classificacao.risco_lesao_pressao.filter(l => l.nivel === "VERMELHO").length > 0) {
      const leitos = classificacao.risco_lesao_pressao.filter(l => l.nivel === "VERMELHO").map(l => l.leito).join(", ");
      alertasCriticos.push(`RISCO DE LESÃO POR PRESSÃO: Leitos ${leitos} - Mudança de decúbito a cada 2h`);
    }
    
    if (classificacao.risco_broncoaspiracao.filter(l => l.nivel === "VERMELHO").length > 0) {
      const leitos = classificacao.risco_broncoaspiracao.filter(l => l.nivel === "VERMELHO").map(l => l.leito).join(", ");
      alertasCriticos.push(`RISCO DE BRONCOASPIRAÇÃO: Leitos ${leitos} - Cabeceira elevada 30-45°`);
    }

    if (classificacao.risco_infeccao.filter(l => l.nivel === "VERMELHO").length > 0) {
      const leitos = classificacao.risco_infeccao.filter(l => l.nivel === "VERMELHO").map(l => l.leito).join(", ");
      alertasCriticos.push(`RISCO DE INFECÇÃO: Leitos ${leitos} - Revisar dispositivos e técnica asséptica`);
    }

    // Recomendações gerais para o plantão
    const recomendacoesGerais: string[] = [];
    
    if (stats.vermelho > 0) {
      recomendacoesGerais.push(`Priorizar rounds nos ${stats.vermelho} leitos críticos: ${leitosPrioridadeMaxima.map(l => l.leito).join(", ")}`);
    }

    if (classificacao.risco_queda.length > 0) {
      recomendacoesGerais.push(`Verificar protocolo de prevenção de quedas em ${classificacao.risco_queda.length} paciente(s)`);
    }
    
    if (classificacao.risco_infeccao.length > 0) {
      recomendacoesGerais.push(`Revisar técnica asséptica e troca de dispositivos em ${classificacao.risco_infeccao.length} paciente(s)`);
    }

    if (pacientesAcamados > 0) {
      recomendacoesGerais.push(`${pacientesAcamados} paciente(s) acamado(s) - Atenção à mudança de decúbito e prevenção de lesões`);
    }

    if (pacientesComAtb > 0) {
      recomendacoesGerais.push(`${pacientesComAtb} paciente(s) em uso de ATB - Verificar horários e observar reações`);
    }

    // Resumo executivo
    const resumoExecutivo = `Plantão com ${stats.total} pacientes: ${stats.vermelho} críticos (VERMELHO), ${stats.amarelo} com alertas (AMARELO), ${stats.verde} estáveis (VERDE). Média Braden: ${indicadores.media_braden}. Taxa de completude documental: ${indicadores.taxa_completude_documentacao}%. Principais riscos: ${Object.entries(stats.por_tipo_risco).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([tipo, count]) => `${this.formatarTipoRisco(tipo)} (${count})`).join(", ") || "Nenhum identificado"}.`;

    // Ordenar leitos detalhados por prioridade (vermelho primeiro)
    leitosDetalhados.sort((a, b) => {
      const prioridadeA = a.nivel_alerta === "VERMELHO" ? 0 : a.nivel_alerta === "AMARELO" ? 1 : 2;
      const prioridadeB = b.nivel_alerta === "VERMELHO" ? 0 : b.nivel_alerta === "AMARELO" ? 1 : 2;
      return prioridadeA - prioridadeB;
    });

    return {
      timestamp: new Date().toISOString(),
      resumo_executivo: resumoExecutivo,
      alertas_criticos_enfermagem: alertasCriticos,
      classificacao_por_problema: classificacao,
      leitos_prioridade_maxima: leitosPrioridadeMaxima,
      leitos_detalhados: leitosDetalhados,
      protocolos_enfermagem: protocolosEnfermagem,
      indicadores,
      estatisticas: stats,
      recomendacoes_gerais_plantao: recomendacoesGerais,
    };
  }

  private detectarTipoEnfermidade(diagnostico: string): string {
    const diag = diagnostico.toLowerCase();
    if (diag.includes("pneumonia") || diag.includes("bronquite") || diag.includes("asma") || diag.includes("dpoc") || diag.includes("respirat")) {
      return "Respiratória";
    }
    if (diag.includes("cardio") || diag.includes("infarto") || diag.includes("arritmia") || diag.includes("insuficiência cardíaca") || diag.includes("hipertens")) {
      return "Cardiovascular";
    }
    if (diag.includes("diabetes") || diag.includes("tireoide") || diag.includes("endocrin")) {
      return "Endócrina";
    }
    if (diag.includes("renal") || diag.includes("rim") || diag.includes("nefr")) {
      return "Renal";
    }
    if (diag.includes("neuro") || diag.includes("avc") || diag.includes("convuls") || diag.includes("epilep")) {
      return "Neurológica";
    }
    if (diag.includes("cancer") || diag.includes("tumor") || diag.includes("neoplasia") || diag.includes("oncol")) {
      return "Oncológica";
    }
    if (diag.includes("cirurg") || diag.includes("pós-op") || diag.includes("fratura") || diag.includes("ortop")) {
      return "Cirúrgica/Ortopédica";
    }
    if (diag.includes("infec") || diag.includes("sepse") || diag.includes("sepsis")) {
      return "Infecciosa";
    }
    if (diag.includes("gastro") || diag.includes("intestin") || diag.includes("hepat") || diag.includes("fígado")) {
      return "Gastrointestinal";
    }
    return "Clínica Geral";
  }

  private formatarTipoRisco(tipo: string): string {
    const mapa: Record<string, string> = {
      "RISCO_QUEDA": "Risco de Queda",
      "RISCO_LESAO": "Lesão por Pressão",
      "RISCO_INFECCAO": "Infecção",
      "RISCO_ASPIRACAO": "Broncoaspiração",
      "RISCO_NUTRICIONAL": "Nutricional",
      "RISCO_RESPIRATORIO": "Respiratório",
    };
    return mapa[tipo] || tipo;
  }

  private getProtocoloParaRisco(tipo: string, nivel: string): { nome: string; descricao: string; frequencia?: string } | null {
    const protocolos: Record<string, { nome: string; descricao: string; frequencia?: string }> = {
      "RISCO_QUEDA": {
        nome: "Protocolo de Prevenção de Quedas",
        descricao: "Grades elevadas, campainha ao alcance, ambiente livre de obstáculos, supervisão durante deambulação",
        frequencia: "Contínuo"
      },
      "RISCO_LESAO": {
        nome: "Protocolo de Prevenção de Lesão por Pressão",
        descricao: "Mudança de decúbito, hidratação da pele, colchão pneumático, inspeção diária da pele",
        frequencia: "A cada 2 horas"
      },
      "RISCO_INFECCAO": {
        nome: "Protocolo de Prevenção de Infecção",
        descricao: "Técnica asséptica rigorosa, troca de curativos, higiene das mãos, monitorar sinais de infecção",
        frequencia: "A cada procedimento"
      },
      "RISCO_ASPIRACAO": {
        nome: "Protocolo de Prevenção de Broncoaspiração",
        descricao: "Cabeceira elevada 30-45°, supervisão da dieta, avaliação da deglutição, pausar dieta se necessário",
        frequencia: "Durante alimentação"
      },
      "RISCO_NUTRICIONAL": {
        nome: "Protocolo de Suporte Nutricional",
        descricao: "Avaliação nutricional, controle de ingesta, peso semanal, suplementação se indicado",
        frequencia: "Diário"
      },
      "RISCO_RESPIRATORIO": {
        nome: "Protocolo de Suporte Respiratório",
        descricao: "Monitorar saturação, oxigenoterapia conforme prescrição, cabeceira elevada, fisioterapia respiratória",
        frequencia: "A cada 4 horas"
      }
    };
    return protocolos[tipo] || null;
  }

  private gerarProtocolosConsolidados(classificacao: ClassificacaoProblemas): ProtocoloEnfermagem[] {
    const protocolos: ProtocoloEnfermagem[] = [];

    if (classificacao.risco_queda.length > 0) {
      protocolos.push({
        categoria: "Prevenção de Quedas",
        icone: "AlertTriangle",
        cor: "yellow",
        leitos_afetados: [...new Set(classificacao.risco_queda.map(l => l.leito))],
        quantidade: classificacao.risco_queda.length,
        protocolo_resumo: "Pacientes com risco identificado de queda requerem supervisão aumentada",
        acoes_principais: [
          "Manter grades do leito elevadas",
          "Campainha ao alcance do paciente",
          "Piso seco e ambiente iluminado",
          "Supervisionar deambulação",
          "Revisar medicações que causam tontura"
        ]
      });
    }

    if (classificacao.risco_lesao_pressao.length > 0) {
      protocolos.push({
        categoria: "Prevenção de Lesão por Pressão",
        icone: "Shield",
        cor: "red",
        leitos_afetados: [...new Set(classificacao.risco_lesao_pressao.map(l => l.leito))],
        quantidade: classificacao.risco_lesao_pressao.length,
        protocolo_resumo: "Pacientes com Braden baixo ou mobilidade reduzida requerem cuidados intensivos de pele",
        acoes_principais: [
          "Mudança de decúbito a cada 2 horas",
          "Avaliar e documentar integridade da pele",
          "Manter pele limpa e hidratada",
          "Usar colchão pneumático/caixa de ovo",
          "Proteger proeminências ósseas"
        ]
      });
    }

    if (classificacao.risco_infeccao.length > 0) {
      protocolos.push({
        categoria: "Prevenção de Infecção",
        icone: "Bug",
        cor: "orange",
        leitos_afetados: [...new Set(classificacao.risco_infeccao.map(l => l.leito))],
        quantidade: classificacao.risco_infeccao.length,
        protocolo_resumo: "Pacientes com dispositivos invasivos ou imunossuprimidos requerem técnica asséptica rigorosa",
        acoes_principais: [
          "Higiene rigorosa das mãos",
          "Técnica asséptica em procedimentos",
          "Trocar curativos conforme protocolo",
          "Avaliar sinais flogísticos",
          "Monitorar temperatura"
        ]
      });
    }

    if (classificacao.risco_broncoaspiracao.length > 0) {
      protocolos.push({
        categoria: "Prevenção de Broncoaspiração",
        icone: "Wind",
        cor: "blue",
        leitos_afetados: [...new Set(classificacao.risco_broncoaspiracao.map(l => l.leito))],
        quantidade: classificacao.risco_broncoaspiracao.length,
        protocolo_resumo: "Pacientes com disfagia ou rebaixamento de consciência requerem supervisão durante alimentação",
        acoes_principais: [
          "Manter cabeceira elevada 30-45°",
          "Supervisionar durante alimentação",
          "Avaliar deglutição antes de ofertar VO",
          "Pausar dieta se vômitos ou distensão",
          "Aspirar secreções se necessário"
        ]
      });
    }

    if (classificacao.risco_nutricional.length > 0) {
      protocolos.push({
        categoria: "Suporte Nutricional",
        icone: "Utensils",
        cor: "green",
        leitos_afetados: [...new Set(classificacao.risco_nutricional.map(l => l.leito))],
        quantidade: classificacao.risco_nutricional.length,
        protocolo_resumo: "Pacientes com risco nutricional requerem monitoramento da ingesta e peso",
        acoes_principais: [
          "Controlar aceitação da dieta",
          "Pesar semanalmente",
          "Avaliar necessidade de suplementação",
          "Comunicar nutricionista se baixa aceitação",
          "Documentar ingesta hídrica"
        ]
      });
    }

    if (classificacao.risco_respiratorio.length > 0) {
      protocolos.push({
        categoria: "Suporte Respiratório",
        icone: "Heart",
        cor: "purple",
        leitos_afetados: [...new Set(classificacao.risco_respiratorio.map(l => l.leito))],
        quantidade: classificacao.risco_respiratorio.length,
        protocolo_resumo: "Pacientes com comprometimento respiratório requerem monitorização contínua",
        acoes_principais: [
          "Monitorar saturação de O2",
          "Administrar O2 conforme prescrição",
          "Manter cabeceira elevada",
          "Avaliar padrão respiratório",
          "Comunicar desconforto respiratório"
        ]
      });
    }

    return protocolos;
  }

  private buildClinicalAnalysisPrompt(patient: PatientData): string {
    return `Analise criticamente os dados deste paciente para passagem de plantão:

DADOS DO PACIENTE:
{
  "id": "${patient.id || ""}",
  "leito": "${patient.leito || ""}",
  "ds_enfermaria": "${patient.dsEnfermaria || ""}",
  "nome_paciente": "${patient.nome || ""}",
  "data_internacao": "${patient.dataInternacao || ""}",
  "braden": "${patient.braden || ""}",
  "diagnostico": "${patient.diagnostico || ""}",
  "alergias": "${patient.alergias || ""}",
  "mobilidade": "${patient.mobilidade || ""}",
  "dieta": "${patient.dieta || ""}",
  "eliminacoes": "${patient.eliminacoes || ""}",
  "dispositivos": "${patient.dispositivos || ""}",
  "atb": "${patient.atb || ""}",
  "curativos": "${patient.curativos || ""}",
  "aporteSaturacao": "${patient.aporteSaturacao || ""}",
  "exames": "${patient.exames || ""}",
  "cirurgia": "${patient.cirurgia || ""}",
  "observacoes": "${patient.observacoes || ""}",
  "previsaoAlta": "${patient.previsaoAlta || ""}"
}

Responda em JSON com o seguinte formato:
{
  "timestamp_analise": "ISO 8601 datetime",
  "paciente_id": "${patient.id || ""}",
  "leito": "${patient.leito || ""}",
  "alertas_criticos": [
    {
      "tipo": "RISCO_QUEDA | RISCO_LESAO | RISCO_ASPIRACAO | RISCO_INFECCAO | RISCO_RESPIRATORIO | RISCO_NUTRICIONAL",
      "nivel": "VERMELHO | AMARELO | VERDE",
      "titulo": "título objetivo do alerta",
      "descricao": "descrição técnica do risco",
      "evidencias": ["campo: valor"],
      "impacto_clinico": "consequências potenciais",
      "recomendacao_imediata": "ação específica",
      "fundamentacao_tecnica": "base científica/protocolo"
    }
  ],
  "analise_dieta": {
    "dieta_atual": "conforme documentado",
    "adequacao": "ADEQUADA | INADEQUADA | INCOMPLETA",
    "riscos_identificados": ["risco específico"],
    "recomendacoes": [
      {
        "tipo": "MUDANCA_DIETA | AVALIACAO_NUTRICIONAL | TESTE_DEGLUTICAO | SUPLEMENTACAO",
        "justificativa": "base clínica",
        "dieta_sugerida": "tipo recomendado",
        "via_recomendada": "VO | NE | NP"
      }
    ]
  },
  "gaps_documentacao": [
    {
      "campo": "nome do campo",
      "tipo_gap": "AUSENTE | INCOMPLETO | INCONSISTENTE",
      "importancia": "CRITICA | ALTA | MEDIA",
      "descricao": "o que está faltando",
      "impacto_assistencial": "como afeta o cuidado",
      "como_documentar": "orientação específica"
    }
  ],
  "inconsistencias_clinicas": [
    {
      "campos_envolvidos": ["campo1", "campo2"],
      "tipo": "DIAGNOSTICO_TRATAMENTO | MOBILIDADE_CUIDADOS | DIETA_CONDICAO | DISPOSITIVO_INDICACAO",
      "descricao": "qual a inconsistência",
      "risco_associado": "risco clínico",
      "correcao_sugerida": "como corrigir"
    }
  ],
  "oportunidades_educacao": [
    {
      "categoria": "SBAR | TERMINOLOGIA | EXAME_FISICO | SEGURANCA_PACIENTE | ESCALAS | DISPOSITIVOS",
      "titulo": "tema educativo",
      "gap_identificado": "o que precisa melhorar",
      "importancia": "por que é importante",
      "orientacao": "como fazer corretamente",
      "exemplo_pratico": "exemplo aplicado ao caso",
      "referencias": ["protocolo/diretriz"]
    }
  ],
  "pontos_positivos": [
    {
      "aspecto": "o que foi bem feito",
      "importancia": "por que é bom",
      "impacto": "benefício para o paciente"
    }
  ],
  "score_qualidade": {
    "pontuacao_total": 0-100,
    "categoria": "EXCELENTE | MUITO_BOM | BOM | REGULAR | PRECISA_MELHORAR",
    "criterios_avaliados": {
      "identificacao_paciente": 0-15,
      "historia_clinica": 0-10,
      "sinais_vitais": 0-15,
      "dispositivos": 0-10,
      "dieta": 0-5,
      "eliminacoes": 0-5,
      "medicacoes": 0-10,
      "mobilidade": 0-5,
      "curativos": 0-5,
      "consciencia": 0-5,
      "exames": 0-5,
      "sbar": 0-10,
      "plano_cuidados": 0-5,
      "familia": 0-5
    }
  },
  "prioridades_acao": [
    {
      "prioridade": 1 | 2 | 3,
      "acao": "ação específica",
      "prazo": "IMEDIATO | 2H | 6H | 24H",
      "responsavel": "ENFERMEIRO | MEDICO | EQUIPE_MULTIPROFISSIONAL"
    }
  ]
}`;
  }

  private buildPatientAnalysisPrompt(patient: PatientData): string {
    return `Analise os dados deste paciente e forneça insights clínicos:

DADOS DO PACIENTE:
- Leito: ${patient.leito || "N/A"}
- Diagnóstico: ${patient.diagnostico || "Não informado"}
- Alergias: ${patient.alergias || "NKDA"}
- Mobilidade: ${patient.mobilidade || "Não avaliada"}
- Escala Braden: ${patient.braden || "Não avaliado"}
- Dieta: ${patient.dieta || "Não informada"}
- Dispositivos: ${patient.dispositivos || "Nenhum"}
- ATB em uso: ${patient.atb || "Nenhum"}
- Observações: ${patient.observacoes || "Sem intercorrências"}

Responda em JSON com:
{
  "resumo": "Resumo clínico breve do paciente",
  "alertas": ["Lista de alertas importantes"],
  "recomendacoes": ["Lista de recomendações de cuidados"],
  "riscos": ["Lista de riscos identificados"],
  "prioridade": "baixa|media|alta|critica"
}`;
  }
}

export const aiService = new AIService();
