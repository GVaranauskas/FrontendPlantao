import OpenAI from "openai";
import { env } from "../config/env";

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

const MODEL = env.OPENAI_MODEL;

interface PatientAnalysisResult {
  resumo: string;
  alertas: string[];
  recomendacoes: string[];
  riscos: string[];
  prioridade: "baixa" | "media" | "alta" | "critica";
}

interface PatientData {
  nome?: string;
  leito?: string;
  diagnostico?: string;
  alergias?: string;
  mobilidade?: string;
  dieta?: string;
  dispositivos?: string;
  atb?: string;
  braden?: string;
  observacoes?: string;
  [key: string]: any;
}

export class OpenAIService {
  /**
   * Analisa dados de um paciente e gera insights clínicos
   */
  async analyzePatient(patient: PatientData): Promise<PatientAnalysisResult> {
    const prompt = this.buildPatientAnalysisPrompt(patient);

    try {
      const response = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: "system",
            content: `Você é um assistente clínico especializado em enfermagem hospitalar.
Sua função é analisar dados de pacientes e fornecer insights relevantes para a equipe de enfermagem.
Seja objetivo, conciso e focado em informações clinicamente relevantes.
Responda SEMPRE em formato JSON válido.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("Resposta vazia da OpenAI");
      }

      return JSON.parse(content) as PatientAnalysisResult;
    } catch (error) {
      console.error("[OpenAI] Erro na análise do paciente:", error);
      throw error;
    }
  }

  /**
   * Analisa múltiplos pacientes e gera um resumo geral
   */
  async analyzeMultiplePatients(patients: PatientData[]): Promise<{
    resumoGeral: string;
    pacientesCriticos: string[];
    alertasGerais: string[];
    estatisticas: {
      total: number;
      altaComplexidade: number;
      mediaBraden: number;
    };
  }> {
    const patientsSummary = patients.map(p => ({
      leito: p.leito,
      diagnostico: p.diagnostico?.substring(0, 100),
      braden: p.braden,
      mobilidade: p.mobilidade,
      alertas: p.observacoes?.substring(0, 50)
    }));

    try {
      const response = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: "system",
            content: `Você é um assistente clínico especializado em enfermagem hospitalar.
Analise o resumo dos pacientes e forneça insights para a passagem de plantão.
Identifique pacientes que precisam de atenção especial.
Responda SEMPRE em formato JSON válido com os campos:
- resumoGeral: string
- pacientesCriticos: string[] (lista de leitos que precisam de atenção)
- alertasGerais: string[] (alertas importantes para o plantão)
- estatisticas: { total: number, altaComplexidade: number, mediaBraden: number }`
          },
          {
            role: "user",
            content: `Analise estes ${patients.length} pacientes:\n${JSON.stringify(patientsSummary, null, 2)}`
          }
        ],
        temperature: 0.3,
        max_tokens: 1500,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("Resposta vazia da OpenAI");
      }

      return JSON.parse(content);
    } catch (error) {
      console.error("[OpenAI] Erro na análise múltipla:", error);
      throw error;
    }
  }

  /**
   * Gera sugestões de cuidados baseado no perfil do paciente
   */
  async generateCareRecommendations(patient: PatientData): Promise<string[]> {
    try {
      const response = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: "system",
            content: `Você é um assistente clínico especializado em enfermagem.
Gere recomendações de cuidados específicas e práticas para o paciente.
Responda em formato JSON com um array "recomendacoes" contendo strings.`
          },
          {
            role: "user",
            content: `Paciente:
- Diagnóstico: ${patient.diagnostico || "Não informado"}
- Braden: ${patient.braden || "Não avaliado"}
- Mobilidade: ${patient.mobilidade || "Não informada"}
- Dispositivos: ${patient.dispositivos || "Nenhum"}
- Alergias: ${patient.alergias || "NKDA"}

Gere 3-5 recomendações de cuidados prioritários.`
          }
        ],
        temperature: 0.4,
        max_tokens: 500,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) return [];

      const parsed = JSON.parse(content);
      return parsed.recomendacoes || [];
    } catch (error) {
      console.error("[OpenAI] Erro ao gerar recomendações:", error);
      return [];
    }
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

export const openaiService = new OpenAIService();
