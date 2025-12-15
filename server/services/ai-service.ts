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
