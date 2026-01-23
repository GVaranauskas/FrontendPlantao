# Sistema de IA - Integração e Otimização

Documentação completa do sistema de análise clínica assistida por IA do **11Care Nursing Platform**.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Arquitetura Multi-Camada](#arquitetura-multi-camada)
- [Camada 1: Change Detection](#camada-1-change-detection)
- [Camada 2: Intelligent Cache](#camada-2-intelligent-cache)
- [Camada 3: GPT-4o-mini](#camada-3-gpt-4o-mini)
- [Camada 4: Auto Sync Scheduler](#camada-4-auto-sync-scheduler)
- [Análises Disponíveis](#análises-disponíveis)
- [Prompts](#prompts)
- [Custos e Economia](#custos-e-economia)
- [Monitoramento](#monitoramento)
- [Como Usar](#como-usar)
- [Configuração](#configuração)
- [Troubleshooting](#troubleshooting)

## 🎯 Visão Geral

O sistema de IA do 11Care analisa dados clínicos de pacientes para gerar:

- **Análises SBAR** (Situation, Background, Assessment, Recommendation)
- **Classificação de Riscos** (queda, lesão por pressão, infecção, etc.)
- **Recomendações de Enfermagem**
- **Indicadores do Plantão**
- **Protocolos Assistenciais**

### Diferencial

Sistema de **4 camadas de otimização** que reduz custos em até **99.8%**:

```
Economia Total = 99.8%
Custo médio por análise: R$ 0,003 (três milésimos de real)
Vs. abordagem naive: R$ 1,50 por análise
```

### Modelos de IA

**Principal**: GPT-4o-mini (OpenAI)
- Custo: 50% mais barato que GPT-4
- Performance: Suficiente para análises estruturadas
- Latência: ~2-3s por análise

**Fallback**: Claude Haiku 3.5 (Anthropic)
- Usado se GPT-4o-mini falhar
- Similar custo e performance

### Serviço Unificado (v1.4.1)

A partir da versão 1.4.1, todas as análises clínicas passam pelo **UnifiedClinicalAnalysisService**:

```typescript
// server/services/unified-clinical-analysis.service.ts
export class UnifiedClinicalAnalysisService {
  // Chave de cache primária por codigoAtendimento
  // Fallback: UUID do paciente, depois leito
  getCacheKey(patient: PatientData): string {
    if (patient.codigoAtendimento) {
      return `unified-clinical:codigo:${patient.codigoAtendimento}`;
    }
    if (patient.id) {
      return `unified-clinical:uuid:${patient.id}`;
    }
    return `unified-clinical:leito:${patient.leito}`;
  }
}
```

**Benefícios:**
- Consistência entre análise individual e batch sync
- Cache unificado evita resultados divergentes
- Invalidação cruzada de chaves legadas

## 🏗️ Arquitetura Multi-Camada

```
┌─────────────────────────────────────────────────────┐
│  REQUEST: Sincronizar Paciente                      │
└──────────────────┬──────────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────────┐
│  CAMADA 1: Change Detection Service                  │
│  └─ Detecta se dados mudaram desde última análise    │
│     • Snapshot de dados                              │
│     • Hash comparison                                │
│     • Economia: 85-90%                               │
└──────────────────┬───────────────────────────────────┘
                   │ Mudança detectada
                   ↓
┌──────────────────────────────────────────────────────┐
│  CAMADA 2: Intelligent Cache                         │
│  └─ Verifica se análise já existe em cache           │
│     • Cache em memória + PostgreSQL                  │
│     • TTL configurável (1 hora padrão)               │
│     • Economia: 60-80%                               │
└──────────────────┬───────────────────────────────────┘
                   │ Cache miss
                   ↓
┌──────────────────────────────────────────────────────┐
│  CAMADA 3: GPT-4o-mini                               │
│  └─ Gera análise clínica                             │
│     • Prompts ultra-comprimidos                      │
│     • Temperatura baixa (cache GPT)                  │
│     • Economia: 50% vs GPT-4                         │
└──────────────────┬───────────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────────┐
│  CAMADA 4: Auto Sync Scheduler                       │
│  └─ Sincronização periódica (não real-time)          │
│     • Cron job a cada 1 hora (configurável)          │
│     • Batch processing                               │
│     • Economia: 95%+ vs real-time                    │
└──────────────────────────────────────────────────────┘

🎯 ECONOMIA TOTAL: ~99.8%
```

## 🔍 Camada 1: Change Detection

### Conceito

Evita chamar IA se dados do paciente **não mudaram** desde última análise.

### Implementação

```typescript
// server/services/change-detection.service.ts

export class ChangeDetectionService {
  private snapshots = new Map<string, SnapshotData>();

  /**
   * Detecta se dados mudaram
   */
  hasChanged(key: string, data: PatientData): boolean {
    const snapshot = this.snapshots.get(key);

    if (!snapshot) {
      // Primeira vez - salva snapshot
      this.saveSnapshot(key, data);
      return true; // Considera mudança
    }

    // Compara hash dos dados
    const currentHash = this.hashData(data);
    const hasChanged = currentHash !== snapshot.hash;

    if (hasChanged) {
      this.saveSnapshot(key, data);
    }

    return hasChanged;
  }

  private hashData(data: PatientData): string {
    const relevantFields = {
      diagnostico: data.diagnostico,
      alergias: data.alergias,
      escoreBraden: data.escoreBraden,
      mobilidade: data.mobilidade,
      dieta: data.dieta,
      // ... outros campos relevantes
    };

    return crypto
      .createHash('sha256')
      .update(JSON.stringify(relevantFields))
      .digest('hex');
  }
}
```

### Economia

**Cenário**: Paciente sem alterações por 8 horas

```
Sem Change Detection:
  Syncs: 8 (a cada hora)
  Custo: 8 × R$ 0,03 = R$ 0,24

Com Change Detection:
  Syncs: 1 (apenas quando mudar)
  Custo: 1 × R$ 0,03 = R$ 0,03
  Economia: 87.5%
```

### Configuração

```typescript
// Limpeza automática de snapshots antigos (> 24h)
changeDetectionService.cleanupOldSnapshots(24);
```

## 💾 Camada 2: Intelligent Cache

### Conceito

Armazena análises de IA já geradas para reusar sem chamar API novamente.

### Implementação

```typescript
// server/services/intelligent-cache.service.ts

export class IntelligentCache {
  private cache = new Map<string, CachedAnalysis>();
  private readonly TTL = 60 * 60 * 1000; // 1 hora

  /**
   * Obtém análise do cache
   */
  get(key: string): CachedAnalysis | null {
    const cached = this.cache.get(key);

    if (!cached) return null;

    // Verifica expiração
    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }

    return cached;
  }

  /**
   * Salva análise no cache
   */
  set(key: string, analysis: any): void {
    this.cache.set(key, {
      data: analysis,
      timestamp: Date.now(),
    });
  }
}
```

### Cache Key

```typescript
// Chave única por paciente
const cacheKey = `patient:${patientId}:analysis`;

// Ou com versionamento
const cacheKey = `patient:${patientId}:v2:${dataHash}`;
```

### Persistência

**Atualmente**: Cache em memória (limpa ao reiniciar)

**Roadmap**: Redis para cache persistente

```typescript
// Futuro: Redis
const analysis = await redis.get(cacheKey);
if (analysis) {
  return JSON.parse(analysis);
}
```

### Economia

**Cenário**: Múltiplos usuários acessando mesmo paciente

```
Sem Cache:
  Usuários: 5
  Requests: 5
  Custo: 5 × R$ 0,03 = R$ 0,15

Com Cache (TTL 1h):
  Requests IA: 1 (outros usam cache)
  Custo: 1 × R$ 0,03 = R$ 0,03
  Economia: 80%
```

## 🤖 Camada 3: GPT-4o-mini

### Por que GPT-4o-mini?

| Feature | GPT-4 | GPT-4o-mini | Claude Haiku |
|---------|-------|-------------|--------------|
| Custo | R$ 0,06 | R$ 0,03 | R$ 0,03 |
| Latência | 5-7s | 2-3s | 2-3s |
| Qualidade | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Contexto | 128K | 128K | 200K |

**Decisão**: GPT-4o-mini oferece melhor custo-benefício para análises estruturadas.

### Implementação

```typescript
// server/services/ai-service-gpt4o-mini.ts

export class AIServiceGPT4oMini {
  private openai: OpenAI;

  async analyzePatient(patient: Patient): Promise<ClinicalInsights> {
    const prompt = this.buildCompressedPrompt(patient);

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Você é um assistente de enfermagem especializado em análise SBAR.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3, // Baixa = mais cache hits
      max_tokens: 800,
      response_format: { type: 'json_object' },
    });

    return this.parseResponse(response);
  }
}
```

### Prompts Ultra-Comprimidos

**Técnica**: Remover palavras desnecessárias, abreviações, formato compacto.

**Antes** (verbose):
```
Paciente: João da Silva
Idade: 65 anos
Diagnóstico: Pneumonia adquirida na comunidade
Alergias: Alergia conhecida à Penicilina
Escore de Braden: 14 pontos (risco de lesão)

Por favor, analise este paciente e forneça uma análise SBAR completa...
```

**Depois** (comprimido):
```
Pac: João Silva, 65a
Dx: Pneumonia
Alergia: Penicilina
Braden: 14

SBAR + riscos
```

**Economia**: ~70% menos tokens → ~70% menos custo

### Temperature 0.3

**Por quê?**
- Respostas mais determinísticas
- Maior chance de cache hits no GPT (OpenAI cacheia prompts idênticos)
- Qualidade suficiente para análises clínicas

### Fallback para Claude

```typescript
try {
  return await this.analyzeWithGPT4oMini(patient);
} catch (error) {
  logger.warn('GPT-4o-mini failed, falling back to Claude');
  return await this.analyzeWithClaude(patient);
}
```

## ⏰ Camada 4: Auto Sync Scheduler

### Conceito

Ao invés de sincronizar **toda vez** que usuário acessa, sincroniza **periodicamente** em background.

### Implementação

```typescript
// server/services/auto-sync-scheduler-gpt4o.service.ts

export class AutoSyncSchedulerGPT4o {
  start(cronExpression: string = '0 * * * *') {
    cron.schedule(cronExpression, async () => {
      logger.info('[Auto Sync] Starting scheduled sync...');

      const patients = await storage.getActivePatients();

      for (const patient of patients) {
        try {
          // Usa todas as camadas de otimização
          await this.syncPatient(patient.id);
        } catch (error) {
          logger.error(`[Auto Sync] Failed for patient ${patient.id}`, error);
        }
      }

      logger.info('[Auto Sync] Completed');
    });
  }
}
```

### Cron Expressions

```bash
# A cada 1 hora (padrão)
0 * * * *

# A cada 30 minutos
*/30 * * * *

# A cada 2 horas
0 */2 * * *

# A cada 6 horas
0 */6 * * *

# Apenas em horário comercial (8h-18h)
0 8-18 * * *
```

### Configuração

```bash
# .env
AUTO_SYNC_CRON=0 * * * *  # A cada 1 hora
```

### Economia

**Cenário**: Paciente acessado 20x/dia por diferentes usuários

```
Sem Scheduler (on-demand):
  Syncs: 20
  Custo: 20 × R$ 0,03 = R$ 0,60

Com Scheduler (1h):
  Syncs: 24 (a cada hora)
  Mas: Change Detection + Cache reduzem a ~2 syncs reais
  Custo: 2 × R$ 0,03 = R$ 0,06
  Economia: 90%
```

## 📊 Análises Disponíveis

### 1. Análise Individual

Análise completa de um paciente:

```json
{
  "patientId": 1,
  "clinicalInsights": {
    "riskLevel": "medium",
    "risks": {
      "quedas": "high",
      "lesaoPressao": "medium",
      "infeccao": "low",
      "broncoaspiracao": "low",
      "nutricional": "medium",
      "respiratorio": "low"
    },
    "sbarAnalysis": {
      "situation": "Paciente de 65 anos, internado há 5 dias com pneumonia...",
      "background": "História de hipertensão, diabetes tipo 2...",
      "assessment": "Apresenta melhora clínica gradual, SpO2 94%...",
      "recommendation": "Manter antibioticoterapia, atenção à mobilização..."
    },
    "recommendations": [
      "Monitorar lesão sacral diariamente",
      "Implementar protocolo de prevenção de quedas",
      "Avaliar necessidade de suporte nutricional"
    ],
    "protocols": [
      "Protocolo de Prevenção de Lesão por Pressão",
      "Protocolo de Prevenção de Quedas"
    ]
  }
}
```

### 2. Análise em Batch

Análise de múltiplos pacientes + indicadores gerais:

```json
{
  "patients": [
    {
      "patientId": 1,
      "risks": { ... }
    }
  ],
  "shiftIndicators": {
    "totalPatients": 25,
    "highRiskPatients": 3,
    "criticalAlerts": 1,
    "averageBraden": 16.4,
    "priorityCases": [1, 5, 12]
  },
  "recommendations": [
    "Atenção redobrada aos pacientes de leitos 101A, 105B e 112C",
    "Considerar aumento de vigilância no turno noturno"
  ]
}
```

### 3. Classificação de Riscos

| Risco | Critérios | Níveis |
|-------|-----------|--------|
| **Quedas** | Idade, mobilidade, medicações | low, medium, high |
| **Lesão por Pressão** | Braden, mobilidade, nutrição | low, medium, high |
| **Infecção** | Dispositivos, ATB, procedimentos | low, medium, high |
| **Broncoaspiração** | Disfagia, nível consciência, dieta | low, medium, high |
| **Nutricional** | IMC, dieta, albumina | low, medium, high |
| **Respiratório** | SpO2, suporte O2, patologia | low, medium, high |

## 📝 Prompts

### Prompt Individual (Comprimido)

```typescript
function buildCompressedPrompt(patient: Patient): string {
  return `
Pac: ${patient.nome}, ${patient.idade}a
Leito: ${patient.leito}
Dx: ${patient.diagnostico}
Alergia: ${patient.alergias || 'Sem alergias'}
Braden: ${patient.escoreBraden || 'N/A'}
Mob: ${patient.mobilidade || 'N/A'}
Dieta: ${patient.dieta || 'N/A'}
Elim: ${patient.eliminacoes || 'N/A'}
Disp: ${patient.dispositivos || 'N/A'}
ATB: ${patient.atb || 'N/A'}
Curativo: ${patient.curativos || 'N/A'}
Aporte: ${patient.aporteSaturacao || 'N/A'}
Obs: ${patient.observacoes || 'Sem observações'}

Análise SBAR + riscos (JSON):
{
  "riskLevel": "low|medium|high",
  "risks": {
    "quedas": "low|medium|high",
    "lesaoPressao": "low|medium|high",
    "infeccao": "low|medium|high",
    "broncoaspiracao": "low|medium|high",
    "nutricional": "low|medium|high",
    "respiratorio": "low|medium|high"
  },
  "sbar": {
    "situation": "...",
    "background": "...",
    "assessment": "...",
    "recommendation": "..."
  },
  "recommendations": ["..."],
  "protocols": ["..."]
}
`.trim();
}
```

### Prompt Batch

```typescript
function buildBatchPrompt(patients: Patient[]): string {
  const patientsData = patients.map(p =>
    `${p.leito}: ${p.nome}, ${p.idade}a, Dx: ${p.diagnostico}, Braden: ${p.escoreBraden}`
  ).join('\n');

  return `
Pacientes do plantão:
${patientsData}

Análise geral + indicadores (JSON):
{
  "shiftIndicators": {
    "totalPatients": ${patients.length},
    "highRiskPatients": ...,
    "criticalAlerts": ...,
    "priorityCases": [...]
  },
  "recommendations": ["..."]
}
`.trim();
}
```

## 💰 Custos e Economia

### Custos por Análise

| Modelo | Custo por 1K tokens | Análise típica | Custo/análise |
|--------|---------------------|----------------|---------------|
| GPT-4 | R$ 0,12 | ~500 tokens | R$ 0,06 |
| **GPT-4o-mini** | R$ 0,06 | ~500 tokens | **R$ 0,03** |
| Claude Haiku | R$ 0,06 | ~500 tokens | R$ 0,03 |

### Economia por Camada

```
Cenário: 100 pacientes, 30 dias

─────────────────────────────────────────────────────
ABORDAGEM NAIVE (Real-time, sem otimização)
─────────────────────────────────────────────────────
  • Syncs: 100 pac × 30 dias × 20 acessos = 60.000
  • Custo por análise: R$ 0,06 (GPT-4)
  • TOTAL: R$ 3.600,00

─────────────────────────────────────────────────────
CAMADA 1: Change Detection (-85%)
─────────────────────────────────────────────────────
  • Syncs reais: 60.000 × 15% = 9.000
  • TOTAL: R$ 540,00
  • ECONOMIA: R$ 3.060,00

─────────────────────────────────────────────────────
CAMADA 2: Intelligent Cache (-60% adicional)
─────────────────────────────────────────────────────
  • Syncs após cache: 9.000 × 40% = 3.600
  • TOTAL: R$ 216,00
  • ECONOMIA: R$ 3.384,00

─────────────────────────────────────────────────────
CAMADA 3: GPT-4o-mini (-50% adicional)
─────────────────────────────────────────────────────
  • Custo por análise: R$ 0,03
  • TOTAL: R$ 108,00
  • ECONOMIA: R$ 3.492,00

─────────────────────────────────────────────────────
CAMADA 4: Auto Sync Scheduler (-95% adicional)
─────────────────────────────────────────────────────
  • Syncs: 100 pac × 30 dias × 24h = 72.000
  • Mas: Change + Cache reduzem a ~360 reais
  • TOTAL: R$ 10,80
  • ECONOMIA: R$ 3.589,20

═════════════════════════════════════════════════════
ECONOMIA TOTAL: 99.7%
CUSTO MENSAL: R$ 10,80 vs R$ 3.600,00
═════════════════════════════════════════════════════
```

### Dashboard de Custos

```typescript
// Métricas em tempo real
costMonitorService.printDashboard();

/*
╔══════════════════════════════════════════╗
║     💰 DASHBOARD DE CUSTOS - IA         ║
╠══════════════════════════════════════════╣
║  Período: Últimas 24 horas              ║
║                                          ║
║  📊 Requests                             ║
║    Total: 1.250                          ║
║    ├─ Cache Hits: 1.050 (84%)           ║
║    └─ API Calls: 200 (16%)              ║
║                                          ║
║  💵 Custos                               ║
║    Custo Real: R$ 6,00                   ║
║    Custo Naive: R$ 75,00                 ║
║    Economia: R$ 69,00 (92%)              ║
║                                          ║
║  ⚡ Performance                          ║
║    Latência Média: 0.8s                  ║
║    Cache Hit Rate: 84%                   ║
║    Change Detection: 89%                 ║
╚══════════════════════════════════════════╝
*/
```

## 📈 Monitoramento

### Logs

```typescript
// Change Detection
logger.info('[Change Detection] No changes detected', {
  patientId,
  lastSnapshot: snapshot.timestamp,
});

// Cache
logger.info('[Cache] Hit', { key, age: '45min' });
logger.info('[Cache] Miss', { key });

// IA API
logger.info('[GPT-4o-mini] Analysis completed', {
  patientId,
  cost: 0.03,
  latency: 2.4,
  tokens: 512,
});
```

### Métricas

```typescript
interface Metrics {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  changeDetectionSkips: number;
  apiCalls: number;
  totalCost: number;
  averageLatency: number;
  errorRate: number;
}
```

### Alertas

```typescript
// Custo diário excede limite
if (dailyCost > COST_THRESHOLD) {
  logger.warn('[Cost Alert] Daily cost exceeded', {
    current: dailyCost,
    threshold: COST_THRESHOLD,
  });
  // Enviar notificação
}

// Taxa de erro alta
if (errorRate > 0.05) {
  logger.error('[Error Alert] High error rate', {
    errorRate,
    last100: errors.slice(-100),
  });
}
```

## 🔧 Como Usar

### Sincronizar Paciente Individual

```typescript
// Frontend
import { useSyncPatient } from '@/hooks/use-sync-patient';

const { mutate: syncPatient, isLoading } = useSyncPatient();

// Sincronizar
syncPatient(patientId, {
  forceRefresh: false, // Usa cache se disponível
});
```

### Sincronizar em Batch

```typescript
// Frontend
const { mutate: syncBatch } = useMutation({
  mutationFn: async (patientIds: number[]) => {
    const response = await fetch('/api/sync/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientIds }),
    });
    return response.json();
  },
});

// Sincronizar todos
syncBatch([1, 2, 3, 4, 5]);
```

### Auto Sync Manual

```typescript
// Backend
import { autoSyncSchedulerGPT4o } from './services/auto-sync-scheduler-gpt4o.service';

// Iniciar scheduler
autoSyncSchedulerGPT4o.start('0 * * * *');

// Parar scheduler
autoSyncSchedulerGPT4o.stop();

// Sync manual (force)
await autoSyncSchedulerGPT4o.syncAll({ forceRefresh: true });
```

## ⚙️ Configuração

### Environment Variables

```bash
# .env

# OpenAI (GPT-4o-mini)
OPENAI_API_KEY=sk-...

# Anthropic (Claude Haiku - fallback)
ANTHROPIC_API_KEY=sk-ant-...

# Auto Sync
AUTO_SYNC_CRON=0 * * * *  # A cada 1 hora
AUTO_SYNC_ENABLED=true

# Cache
CACHE_TTL=3600  # 1 hora em segundos

# Monitoramento
COST_ALERT_THRESHOLD=50  # R$ 50/dia
```

### Ajustes Finos

```typescript
// Change Detection - Sensibilidade
const RELEVANT_FIELDS = [
  'diagnostico',
  'alergias',
  'escoreBraden',
  'mobilidade',
  'dieta',
  // Adicione/remova campos conforme necessário
];

// Cache - TTL
const CACHE_TTL = {
  patient: 60 * 60 * 1000, // 1 hora
  batch: 30 * 60 * 1000,   // 30 minutos
};

// Auto Sync - Frequência
const CRON_EXPRESSIONS = {
  highFrequency: '*/30 * * * *',  // 30 minutos
  normal: '0 * * * *',            // 1 hora
  lowFrequency: '0 */6 * * *',    // 6 horas
};
```

## 🐛 Troubleshooting

### Alta Taxa de Cache Miss

**Sintoma**: Cache hit rate < 50%

**Causas**:
- TTL muito curto
- Dados mudando frequentemente
- Cache key incorreto

**Solução**:
```typescript
// Aumentar TTL
const CACHE_TTL = 2 * 60 * 60 * 1000; // 2 horas

// Verificar cache key
console.log('Cache key:', cacheKey);
```

### Change Detection Não Funciona

**Sintoma**: Todos requests são "mudança detectada"

**Causas**:
- Campos com timestamps na comparação
- Serialização JSON não determinística
- Campos sendo mutados

**Solução**:
```typescript
// Apenas campos relevantes estáticos
const relevantFields = {
  diagnostico: data.diagnostico,
  alergias: data.alergias,
  // NÃO incluir: updatedAt, timestamps, etc.
};
```

### Custos Altos

**Sintoma**: Custo > R$ 50/dia

**Verificar**:
```bash
# Logs de custos
tail -f logs/app-*.log | grep -i "cost"

# Dashboard
# (no console do servidor)
```

**Soluções**:
1. Aumentar TTL do cache
2. Reduzir frequência do scheduler
3. Verificar se force refresh não está sendo usado demais

### IA API Timeout

**Sintoma**: Erro "timeout" ou "429 Rate Limit"

**Causas**:
- API key sem créditos
- Rate limit excedido
- Latência alta

**Solução**:
```typescript
// Retry com exponential backoff
const response = await retry(
  () => this.openai.chat.completions.create(...),
  {
    retries: 3,
    backoff: 'exponential',
  }
);
```

### Análises Inconsistentes

**Sintoma**: Análises variam muito para mesmo paciente

**Causa**: Temperature alta

**Solução**:
```typescript
// Reduzir temperature
temperature: 0.1, // Mais determinístico
```

---

## 📚 Recursos

- [OpenAI API Docs](https://platform.openai.com/docs/api-reference)
- [Anthropic Claude API](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)
- [Cron Expression Generator](https://crontab.guru/)

---

**Última atualização**: 2026-01-15

**Contato**: ai-support@11care.com
