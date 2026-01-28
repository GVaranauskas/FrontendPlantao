import OpenAI from "openai";
import { env } from "../config/env";
import { intelligentCache } from "./intelligent-cache.service";
import { createHash } from 'node:crypto';

/**
 * UNIFIED CLINICAL ANALYSIS SERVICE
 * 
 * Serviço unificado para análise clínica de pacientes.
 * Resolve a inconsistência entre análise em lote (batch sync) e individual.
 * 
 * REGRAS:
 * 1. Chave de cache ÚNICA baseada em codigoAtendimento (identificador hospitalar)
 * 2. Mesmo modelo (GPT-4o-mini) e prompt para ambos os fluxos
 * 3. Invalidação cruzada de cache (quando um atualiza, limpa chaves antigas)
 * 4. Mantém otimizações de custo do batch system
 */

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

const MODEL = "gpt-4o-mini";

export interface PatientData {
  id?: string | null;
  codigoAtendimento?: string | null;
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

export interface ClinicalInsights {
  timestamp: string;
  nivel_alerta: "VERMELHO" | "AMARELO" | "VERDE";
  alertas_count: { vermelho: number; amarelo: number; verde: number };
  principais_alertas: Array<{ tipo: string; nivel: string; titulo: string; descricao?: string }>;
  gaps_criticos: string[];
  score_qualidade: number;
  categoria_qualidade: string;
  prioridade_acao: string | null;
  recomendacoes_enfermagem: string[];
}

interface CacheKeyInfo {
  primary: string;
  legacyUUID: string | null;
  legacyLeito: string | null;
}

interface AnalysisOptions {
  useCache?: boolean;
  forceRefresh?: boolean;
  caller?: 'batch' | 'individual' | 'auto';
}

export interface AnalysisResult {
  insights: ClinicalInsights;
  fromCache: boolean;
}

interface CostMetrics {
  totalCalls: number;
  cachedCalls: number;
  actualAPICalls: number;
  tokensUsed: number;
  tokensSaved: number;
  estimatedCost: number;
  estimatedSavings: number;
}

export class UnifiedClinicalAnalysisService {
  private metrics: CostMetrics = {
    totalCalls: 0,
    cachedCalls: 0,
    actualAPICalls: 0,
    tokensUsed: 0,
    tokensSaved: 0,
    estimatedCost: 0,
    estimatedSavings: 0
  };

  private readonly COMPACT_SYSTEM_PROMPT = `Assistente clínico de enfermagem hospitalar brasileira.

OBJETIVO: Identificar riscos e gaps em passagem de plantão.

RISCOS PRIORITÁRIOS:
- Queda: Braden≤14, mobilidade reduzida
- Lesão pressão: Braden≤14, acamado
- Aspiração: disfagia, rebaixamento
- Infecção: dispositivos invasivos, ATB
- Respiratório: O2, dispneia
- Nutricional: dieta inadequada

NÍVEIS:
- VERMELHO: risco iminente
- AMARELO: atenção necessária  
- VERDE: estável

Responda JSON válido com schema fornecido. Seja objetivo e técnico.`;

  private readonly BATCH_SYSTEM_PROMPT = `Assistente clínico de enfermagem hospitalar brasileira.

OBJETIVO: Analisar MÚLTIPLOS pacientes de uma vez, identificando riscos e gaps.

RISCOS PRIORITÁRIOS:
- Queda: Braden≤14, mobilidade reduzida
- Lesão pressão: Braden≤14, acamado
- Aspiração: disfagia, rebaixamento
- Infecção: dispositivos invasivos, ATB
- Respiratório: O2, dispneia
- Nutricional: dieta inadequada

NÍVEIS:
- VERMELHO: risco iminente
- AMARELO: atenção necessária  
- VERDE: estável

IMPORTANTE: Você receberá um array de pacientes. Retorne um array JSON com análises NA MESMA ORDEM dos pacientes recebidos.
Cada análise deve seguir o schema fornecido. Seja objetivo e técnico.`;

  /**
   * Gera chaves de cache para um paciente
   * Prioridade: codigoAtendimento > UUID > leito
   */
  private generateCacheKeys(patient: PatientData): CacheKeyInfo {
    const codigoAtendimento = patient.codigoAtendimento?.toString().trim();
    const patientId = patient.id?.toString().trim();
    const leito = patient.leito?.toString().trim();

    let primaryKey: string;
    if (codigoAtendimento) {
      primaryKey = `unified-clinical:codigo:${codigoAtendimento}`;
    } else if (patientId) {
      primaryKey = `unified-clinical:uuid:${patientId}`;
    } else if (leito) {
      primaryKey = `unified-clinical:leito:${leito}`;
    } else {
      primaryKey = `unified-clinical:unknown:${Date.now()}`;
    }

    return {
      primary: primaryKey,
      legacyUUID: patientId ? `clinical-analysis:${patientId}` : null,
      legacyLeito: leito ? `gpt4o-mini:patient:${leito}:analysis` : null
    };
  }

  /**
   * Gera hash de conteúdo para detecção de mudanças
   */
  private generateContentHash(patient: PatientData): string {
    const relevantData = {
      diagnostico: patient.diagnostico,
      braden: patient.braden,
      mobilidade: patient.mobilidade,
      dispositivos: patient.dispositivos,
      atb: patient.atb,
      observacoes: patient.observacoes,
      dieta: patient.dieta,
      eliminacoes: patient.eliminacoes,
      aporteSaturacao: patient.aporteSaturacao,
      curativos: patient.curativos,
      exames: patient.exames,
      cirurgia: patient.cirurgia,
      previsaoAlta: patient.previsaoAlta,
      alergias: patient.alergias
    };
    
    const jsonString = JSON.stringify(relevantData, Object.keys(relevantData).sort());
    return createHash('md5').update(jsonString).digest('hex');
  }

  /**
   * Invalida chaves de cache antigas (legadas) para um paciente
   */
  private invalidateLegacyCache(cacheKeys: CacheKeyInfo): void {
    if (cacheKeys.legacyUUID) {
      intelligentCache.invalidate(cacheKeys.legacyUUID.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    }
    if (cacheKeys.legacyLeito) {
      intelligentCache.invalidate(cacheKeys.legacyLeito.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    }
  }

  /**
   * Calcula TTL baseado no nível de alerta
   */
  private calculateTTL(nivelAlerta: string): number {
    switch (nivelAlerta) {
      case 'VERMELHO':
        return 15;
      case 'AMARELO':
        return 60;
      case 'VERDE':
        return 240;
      default:
        return 60;
    }
  }

  /**
   * Constrói prompt ultra-comprimido
   */
  private buildUltraCompactPrompt(patient: PatientData): string {
    const compact: Record<string, any> = {};
    
    const fields = [
      'leito', 'diagnostico', 'braden', 'mobilidade', 'alergias',
      'dispositivos', 'atb', 'observacoes', 'dieta', 'eliminacoes',
      'aporteSaturacao', 'curativos', 'exames', 'cirurgia', 'previsaoAlta'
    ];

    for (const field of fields) {
      const value = patient[field];
      if (value && value !== '' && value !== 'null' && value !== 'N/A') {
        compact[field] = value;
      }
    }

    return `Analise: ${JSON.stringify(compact)}

JSON:
{
  "alertas": [{"tipo":"RISCO_X","nivel":"COR","titulo":"","descricao":"","recomendacao":""}],
  "score": 0-100,
  "categoria": "EXCELENTE|BOM|REGULAR|PRECISA_MELHORAR",
  "gaps": ["campo faltante"],
  "prioridades": [{"ordem":1-3,"acao":"","prazo":"IMEDIATO|2H|6H|24H"}]
}`;
  }

  /**
   * Transforma resposta em insights estruturados
   */
  private transformToInsights(analysis: any): ClinicalInsights {
    const alertas = analysis.alertas || [];
    
    const alertasVermelho = alertas.filter((a: any) => a.nivel === 'VERMELHO').length;
    const alertasAmarelo = alertas.filter((a: any) => a.nivel === 'AMARELO').length;
    const alertasVerde = alertas.length - alertasVermelho - alertasAmarelo;

    const nivelAlerta = alertasVermelho > 0 
      ? 'VERMELHO' 
      : alertasAmarelo > 0 
        ? 'AMARELO' 
        : 'VERDE';

    return {
      timestamp: new Date().toISOString(),
      nivel_alerta: nivelAlerta,
      alertas_count: {
        vermelho: alertasVermelho,
        amarelo: alertasAmarelo,
        verde: Math.max(0, alertasVerde)
      },
      principais_alertas: alertas.slice(0, 5).map((a: any) => ({
        tipo: a.tipo,
        nivel: a.nivel,
        titulo: a.titulo,
        descricao: a.descricao || ''
      })),
      gaps_criticos: (analysis.gaps || []).slice(0, 5),
      score_qualidade: analysis.score || 0,
      categoria_qualidade: analysis.categoria || 'REGULAR',
      prioridade_acao: analysis.prioridades?.[0]?.acao || null,
      recomendacoes_enfermagem: (analysis.prioridades || [])
        .slice(0, 3)
        .map((p: any) => p.acao)
    };
  }

  /**
   * Chama GPT-4o-mini para um único paciente
   */
  private async callGPT4oMini(patient: PatientData): Promise<ClinicalInsights> {
    const userPrompt = this.buildUltraCompactPrompt(patient);

    try {
      const response = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: this.COMPACT_SYSTEM_PROMPT },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: "json_object" },
        stream: false
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Resposta vazia do GPT-4o-mini');
      }

      const analysis = JSON.parse(content);
      return this.transformToInsights(analysis);

    } catch (error) {
      console.error('[UnifiedClinicalAnalysis] Erro na chamada:', error);
      throw error;
    }
  }

  /**
   * Constrói prompt para múltiplos pacientes (batch real)
   */
  private buildBatchPrompt(patients: PatientData[]): string {
    const patientsData = patients.map((patient, index) => {
      const compact: Record<string, any> = { _index: index };
      
      const fields = [
        'leito', 'diagnostico', 'braden', 'mobilidade', 'alergias',
        'dispositivos', 'atb', 'observacoes', 'dieta', 'eliminacoes',
        'aporteSaturacao', 'curativos', 'exames', 'cirurgia', 'previsaoAlta'
      ];

      for (const field of fields) {
        const value = patient[field];
        if (value && value !== '' && value !== 'null' && value !== 'N/A') {
          compact[field] = value;
        }
      }
      
      return compact;
    });

    return `Analise ${patients.length} pacientes:
${JSON.stringify(patientsData)}

Retorne JSON com array "analises" contendo ${patients.length} objetos NA MESMA ORDEM:
{
  "analises": [
    {
      "alertas": [{"tipo":"RISCO_X","nivel":"COR","titulo":"","descricao":"","recomendacao":""}],
      "score": 0-100,
      "categoria": "EXCELENTE|BOM|REGULAR|PRECISA_MELHORAR",
      "gaps": ["campo faltante"],
      "prioridades": [{"ordem":1-3,"acao":"","prazo":"IMEDIATO|2H|6H|24H"}]
    }
  ]
}`;
  }

  /**
   * Chama GPT-4o-mini para múltiplos pacientes em UMA ÚNICA chamada
   * Reduz de N chamadas para 1 chamada por lote
   */
  private async callGPT4oMiniBatch(patients: PatientData[]): Promise<ClinicalInsights[]> {
    const userPrompt = this.buildBatchPrompt(patients);
    const startTime = Date.now();

    try {
      const response = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: this.BATCH_SYSTEM_PROMPT },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 4000,
        response_format: { type: "json_object" },
        stream: false
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Resposta vazia do GPT-4o-mini (batch)');
      }

      const parsed = JSON.parse(content);
      const analises = parsed.analises || parsed.analyses || [];
      
      if (analises.length !== patients.length) {
        console.warn(`[UnifiedClinicalAnalysis] ⚠️ Batch retornou ${analises.length} análises para ${patients.length} pacientes`);
      }

      const results: ClinicalInsights[] = [];
      for (let i = 0; i < patients.length; i++) {
        const analysis = analises[i];
        if (analysis) {
          results.push(this.transformToInsights(analysis));
        } else {
          results.push(this.createDefaultInsights());
        }
      }

      const duration = Date.now() - startTime;
      console.log(`[UnifiedClinicalAnalysis] ✅ Batch de ${patients.length} pacientes processado em ${duration}ms (1 chamada API)`);

      return results;

    } catch (error) {
      console.error('[UnifiedClinicalAnalysis] Erro no batch:', error);
      throw error;
    }
  }

  /**
   * Cria insights padrão quando a análise falha
   */
  private createDefaultInsights(): ClinicalInsights {
    return {
      timestamp: new Date().toISOString(),
      nivel_alerta: 'AMARELO',
      alertas_count: { vermelho: 0, amarelo: 1, verde: 0 },
      principais_alertas: [{
        tipo: 'ANALISE_INCOMPLETA',
        nivel: 'AMARELO',
        titulo: 'Análise não disponível',
        descricao: 'Não foi possível analisar este paciente'
      }],
      gaps_criticos: [],
      score_qualidade: 50,
      categoria_qualidade: 'REGULAR',
      prioridade_acao: null,
      recomendacoes_enfermagem: []
    };
  }

  /**
   * MÉTODO PRINCIPAL: Análise clínica unificada
   * 
   * Usado tanto pelo batch sync quanto pela análise individual.
   * Retorna insights + flag indicando se veio do cache.
   */
  async analyze(
    patient: PatientData,
    options: AnalysisOptions = {}
  ): Promise<AnalysisResult> {
    const useCache = options.useCache !== false;
    const forceRefresh = options.forceRefresh || false;
    const caller = options.caller || 'auto';

    this.metrics.totalCalls++;

    const cacheKeys = this.generateCacheKeys(patient);
    const contentHash = this.generateContentHash(patient);
    const patientIdentifier = patient.codigoAtendimento || patient.leito || patient.id || 'unknown';

    if (useCache && !forceRefresh) {
      const cached = intelligentCache.get<ClinicalInsights>(
        cacheKeys.primary,
        contentHash
      );
      
      if (cached) {
        this.metrics.cachedCalls++;
        this.metrics.tokensSaved += 3500;
        this.metrics.estimatedSavings += 0.03;
        
        console.log(`[UnifiedClinicalAnalysis] ✅ Cache HIT: ${patientIdentifier} (caller: ${caller})`);
        return { insights: cached, fromCache: true };
      }
    }

    this.metrics.actualAPICalls++;

    try {
      const insights = await this.callGPT4oMini(patient);

      if (useCache) {
        this.invalidateLegacyCache(cacheKeys);

        const criticality = insights.nivel_alerta === 'VERMELHO' ? 'critical' : 
                           insights.nivel_alerta === 'AMARELO' ? 'high' : 'medium';
        
        intelligentCache.set(cacheKeys.primary, insights, {
          contentHash,
          ttlMinutes: this.calculateTTL(insights.nivel_alerta),
          criticality
        });
      }

      this.metrics.tokensUsed += 3500;
      this.metrics.estimatedCost += 0.03;

      console.log(`[UnifiedClinicalAnalysis] ✅ Análise concluída: ${patientIdentifier} - ${insights.nivel_alerta} (caller: ${caller})`);
      return { insights, fromCache: false };

    } catch (error) {
      console.error('[UnifiedClinicalAnalysis] Erro na análise:', error);
      throw error;
    }
  }

  /**
   * Análise em lote otimizada com BATCH REAL
   * Envia múltiplos pacientes em UMA ÚNICA chamada à API (não N chamadas)
   * 
   * ANTES: 35 pacientes = 35 chamadas API = ~105s
   * DEPOIS: 35 pacientes = 4 chamadas API = ~12s
   */
  async analyzeBatch(
    patients: PatientData[],
    options?: { useCache?: boolean }
  ): Promise<ClinicalInsights[]> {
    const startTime = Date.now();
    const useCache = options?.useCache !== false;
    
    console.log(`[UnifiedClinicalAnalysis] 🚀 Processando ${patients.length} pacientes com BATCH REAL...`);
    
    const results: (ClinicalInsights | null)[] = new Array(patients.length).fill(null);
    const patientsToAnalyze: { index: number; patient: PatientData; cacheKeys: CacheKeyInfo; contentHash: string }[] = [];
    let cachedCount = 0;
    
    for (let i = 0; i < patients.length; i++) {
      const patient = patients[i];
      const cacheKeys = this.generateCacheKeys(patient);
      const contentHash = this.generateContentHash(patient);
      
      this.metrics.totalCalls++;
      
      if (useCache) {
        const cached = intelligentCache.get<ClinicalInsights>(cacheKeys.primary, contentHash);
        if (cached) {
          results[i] = cached;
          this.metrics.cachedCalls++;
          this.metrics.tokensSaved += 3500;
          this.metrics.estimatedSavings += 0.03;
          cachedCount++;
          continue;
        }
      }
      
      patientsToAnalyze.push({ index: i, patient, cacheKeys, contentHash });
    }
    
    console.log(`[UnifiedClinicalAnalysis] 📊 Cache: ${cachedCount}/${patients.length} | Para analisar: ${patientsToAnalyze.length}`);
    
    if (patientsToAnalyze.length > 0) {
      const batchSize = 10;
      const totalBatches = Math.ceil(patientsToAnalyze.length / batchSize);
      
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const batchStart = batchIndex * batchSize;
        const batchEnd = Math.min(batchStart + batchSize, patientsToAnalyze.length);
        const currentBatch = patientsToAnalyze.slice(batchStart, batchEnd);
        
        console.log(`[UnifiedClinicalAnalysis] 🔄 Lote ${batchIndex + 1}/${totalBatches} (${currentBatch.length} pacientes, 1 chamada API)...`);
        
        try {
          const batchPatients = currentBatch.map(item => item.patient);
          const batchInsights = await this.callGPT4oMiniBatch(batchPatients);
          
          this.metrics.actualAPICalls++;
          this.metrics.tokensUsed += 3500 * currentBatch.length;
          this.metrics.estimatedCost += 0.03 * currentBatch.length;
          
          for (let j = 0; j < currentBatch.length; j++) {
            const item = currentBatch[j];
            const insights = batchInsights[j] || this.createDefaultInsights();
            
            results[item.index] = insights;
            
            if (useCache) {
              this.invalidateLegacyCache(item.cacheKeys);
              const criticality = insights.nivel_alerta === 'VERMELHO' ? 'critical' : 
                                 insights.nivel_alerta === 'AMARELO' ? 'high' : 'medium';
              intelligentCache.set(item.cacheKeys.primary, insights, {
                contentHash: item.contentHash,
                ttlMinutes: this.calculateTTL(insights.nivel_alerta),
                criticality
              });
            }
            
            const patientId = item.patient.codigoAtendimento || item.patient.leito || 'unknown';
            console.log(`[UnifiedClinicalAnalysis] ✅ ${patientId} - ${insights.nivel_alerta}`);
          }
          
        } catch (error) {
          console.error(`[UnifiedClinicalAnalysis] ❌ Erro no lote ${batchIndex + 1}:`, error);
          
          for (const item of currentBatch) {
            results[item.index] = this.createDefaultInsights();
          }
        }
      }
    }
    
    const duration = Date.now() - startTime;
    const apiCalls = Math.ceil(patientsToAnalyze.length / 10);
    console.log(`[UnifiedClinicalAnalysis] ✅ BATCH COMPLETO: ${patients.length} pacientes em ${duration}ms (${apiCalls} chamadas API vs ${patientsToAnalyze.length} antes)`);
    
    return results.map(r => r || this.createDefaultInsights());
  }

  /**
   * Invalida cache de um paciente específico (por qualquer identificador)
   */
  invalidatePatientCache(patient: PatientData): void {
    const cacheKeys = this.generateCacheKeys(patient);
    
    intelligentCache.invalidate(cacheKeys.primary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    this.invalidateLegacyCache(cacheKeys);
    
    console.log(`[UnifiedClinicalAnalysis] Cache invalidado para: ${patient.codigoAtendimento || patient.leito || patient.id}`);
  }

  /**
   * Retorna métricas
   */
  getMetrics(): CostMetrics & {
    cacheHitRate: number;
    savingsPercentage: number;
    averageCost: number;
  } {
    const cacheHitRate = this.metrics.totalCalls > 0
      ? (this.metrics.cachedCalls / this.metrics.totalCalls) * 100
      : 0;

    const totalCostWithoutCache = this.metrics.totalCalls * 0.03;
    const savingsPercentage = totalCostWithoutCache > 0
      ? (this.metrics.estimatedSavings / totalCostWithoutCache) * 100
      : 0;

    const averageCost = this.metrics.totalCalls > 0
      ? this.metrics.estimatedCost / this.metrics.totalCalls
      : 0;

    return {
      ...this.metrics,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      savingsPercentage: Math.round(savingsPercentage * 100) / 100,
      averageCost: Math.round(averageCost * 1000) / 1000
    };
  }

  resetMetrics(): void {
    this.metrics = {
      totalCalls: 0,
      cachedCalls: 0,
      actualAPICalls: 0,
      tokensUsed: 0,
      tokensSaved: 0,
      estimatedCost: 0,
      estimatedSavings: 0
    };
  }
}

export const unifiedClinicalAnalysisService = new UnifiedClinicalAnalysisService();
