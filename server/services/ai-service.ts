import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { env } from "../config/env";

const anthropic = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
});

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

const CLAUDE_MODEL = env.ANTHROPIC_MODEL;
const OPENAI_MODEL = env.OPENAI_MODEL;

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
  principais_alertas: Array<{ tipo: string; nivel: string; titulo: string }>;
  gaps_criticos: string[];
  score_qualidade: number;
  categoria_qualidade: string;
  prioridade_acao: string | null;
  analise_completa?: ClinicalAnalysisResult;
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
   * Try Claude first, fallback to OpenAI if it fails
   */
  private async callWithFallback<T>(
    claudeCall: () => Promise<T>,
    openaiCall: () => Promise<T>
  ): Promise<T> {
    try {
      console.log(`[AI] Attempting with Claude (${CLAUDE_MODEL})...`);
      const result = await claudeCall();
      this.provider = "claude";
      return result;
    } catch (claudeError) {
      console.warn("[AI] Claude failed, falling back to OpenAI:", claudeError);
      try {
        console.log(`[AI] Attempting with OpenAI (${OPENAI_MODEL})...`);
        const result = await openaiCall();
        this.provider = "openai";
        return result;
      } catch (openaiError) {
        console.error("[AI] Both providers failed");
        throw openaiError;
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
      // Claude call
      async () => {
        const response = await anthropic.messages.create({
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
      // OpenAI fallback
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
      // Claude call
      async () => {
        const response = await anthropic.messages.create({
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
      // OpenAI fallback
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
        // Claude call
        async () => {
          const response = await anthropic.messages.create({
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
        // OpenAI fallback
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
      async () => {
        const response = await anthropic.messages.create({
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

    return {
      timestamp: new Date().toISOString(),
      nivel_alerta,
      alertas_count: { vermelho, amarelo, verde },
      principais_alertas: alertas.slice(0, 3).map((a) => ({
        tipo: a.tipo,
        nivel: a.nivel,
        titulo: a.titulo,
      })),
      gaps_criticos,
      score_qualidade: analysis.score_qualidade?.pontuacao_total || 0,
      categoria_qualidade: analysis.score_qualidade?.categoria || "NAO_AVALIADO",
      prioridade_acao: prioridadeImediata?.acao || null,
      analise_completa: analysis,
    };
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

// Legacy export for backward compatibility
export const openaiService = aiService;
