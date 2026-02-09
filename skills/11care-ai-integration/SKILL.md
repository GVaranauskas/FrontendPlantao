---
name: 11care-ai-integration
description: Guia completo para trabalhar com o sistema de IA do 11Care. Use quando precisar modificar análises clínicas, prompts, cache, ou integrar com GPT-4o-mini/Claude.
---

# Sistema de IA - 11Care

Documentação do sistema de análise clínica assistida por IA com economia de 99.8%.

## Visão Geral

O sistema de IA do 11Care analisa dados clínicos de pacientes para gerar:

- **Análises SBAR** (Situation, Background, Assessment, Recommendation)
- **Classificação de Riscos** (queda, lesão por pressão, infecção, etc.)
- **Recomendações de Enfermagem**
- **Indicadores do Plantão**
- **Protocolos Assistenciais**

### Modelos de IA

| Modelo | Uso | Custo | Latência |
|--------|-----|-------|----------|
| **GPT-4o-mini** | Principal | R$ 0,03/análise | 2-3s |
| **Claude Haiku 4.5** | Fallback (com prompt caching) | R$ 0,03/análise | 2-3s |

---

## Arquitetura de 4 Camadas

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
│     • Temperatura baixa (0.3)                        │
│     • Economia: 50% vs GPT-4                         │
└──────────────────┬───────────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────────┐
│  CAMADA 4: Auto Sync Scheduler                       │
│  └─ Sincronização periódica (não real-time)          │
│     • Cron job a cada 1 hora (configurável)          │
│     • Batch processing paralelo                      │
│     • Economia: 95%+ vs real-time                    │
└──────────────────────────────────────────────────────┘

🎯 ECONOMIA TOTAL: ~99.8%
```

---

## Serviço Unificado (UnifiedClinicalAnalysisService)

### Localização

```
server/services/unified-clinical-analysis.service.ts
```

### Cache Key Strategy

```typescript
// Chave de cache primária por codigoAtendimento
getCacheKey(patient: PatientData): string {
  if (patient.codigoAtendimento) {
    return `unified-clinical:codigo:${patient.codigoAtendimento}`;
  }
  if (patient.id) {
    return `unified-clinical:uuid:${patient.id}`;
  }
  return `unified-clinical:leito:${patient.leito}`;
}
```

### Benefícios do Serviço Unificado

- Consistência entre análise individual e batch sync
- Cache unificado evita resultados divergentes
- Invalidação cruzada de chaves legadas

---

## Batch Real Paralelo (v1.5.5)

### Como Funciona

```typescript
// server/services/unified-clinical-analysis.service.ts
async callGPT4oMiniBatch(patients: PatientData[]): Promise<ClinicalInsights[]> {
  // 1 chamada API para N pacientes (até 10 por lote)
  const prompt = this.buildBatchPrompt(patients);
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: BATCH_SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ]
  });
  return JSON.parse(response.choices[0].message.content);
}
```

### Performance

```
ANTES (v1.5.3):
  35 pacientes = 35 chamadas API = ~105 segundos

DEPOIS (v1.5.4):
  35 pacientes = 4 chamadas API sequenciais = ~56 segundos
  
DEPOIS (v1.5.5 - Paralelo):
  35 pacientes = 4 chamadas API em paralelo = ~14 segundos
  + Salvamento paralelo no banco = ~10 segundos
  = TOTAL: ~30 segundos
  
REDUÇÃO TOTAL: ~71% vs v1.5.4, ~95% vs v1.5.3
```

### Fluxo de Processamento

1. Separar pacientes em cache vs não-cache
2. Agrupar pacientes não-cache em lotes de 10
3. Enviar TODOS os lotes em paralelo via `Promise.all()`
4. Salvar resultados no cache
5. Salvar pacientes no banco em paralelo (CONCURRENCY_LIMIT=10)
6. Retornar todos na ordem correta

---

## Camada 1: Change Detection

### Conceito

Evita chamar IA se dados do paciente **não mudaram** desde última análise.

### Implementação

```typescript
// server/services/change-detection.service.ts

export class ChangeDetectionService {
  private snapshots = new Map<string, SnapshotData>();

  hasChanged(key: string, data: PatientData): boolean {
    const snapshot = this.snapshots.get(key);

    if (!snapshot) {
      this.saveSnapshot(key, data);
      return true; // Primeira vez = considera mudança
    }

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

```
Cenário: Paciente sem alterações por 8 horas

Sem Change Detection:
  Syncs: 8 (a cada hora)
  Custo: 8 × R$ 0,03 = R$ 0,24

Com Change Detection:
  Syncs: 1 (apenas quando mudar)
  Custo: 1 × R$ 0,03 = R$ 0,03
  Economia: 87.5%
```

---

## Camada 2: Intelligent Cache

### Conceito

Armazena análises de IA já geradas para reusar sem chamar API novamente.

### Implementação

```typescript
// server/services/intelligent-cache.service.ts

export class IntelligentCache {
  private cache = new Map<string, CachedAnalysis>();
  private readonly TTL = 60 * 60 * 1000; // 1 hora

  get(key: string): CachedAnalysis | null {
    const cached = this.cache.get(key);

    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }

    return cached;
  }

  set(key: string, analysis: any): void {
    this.cache.set(key, {
      data: analysis,
      timestamp: Date.now(),
    });
  }
}
```

### Economia

```
Cenário: 5 usuários acessando mesmo paciente

Sem Cache:
  Requests IA: 5
  Custo: 5 × R$ 0,03 = R$ 0,15

Com Cache (TTL 1h):
  Requests IA: 1 (outros usam cache)
  Custo: 1 × R$ 0,03 = R$ 0,03
  Economia: 80%
```

---

## Camada 3: GPT-4o-mini

### Configuração

```typescript
// server/services/ai-service-gpt4o-mini.ts

export class AIServiceGPT4oMini {
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
      temperature: 0.3, // Baixa = mais determinístico = mais cache hits
      max_tokens: 800,
      response_format: { type: 'json_object' },
    });

    return this.parseResponse(response);
  }
}
```

### Prompts Ultra-Comprimidos

```typescript
// Técnica: Remover palavras desnecessárias, abreviações, formato compacto

// ANTES (verbose):
Paciente: João da Silva
Idade: 65 anos
Diagnóstico: Pneumonia adquirida na comunidade
Alergias: Alergia conhecida à Penicilina
Escore de Braden: 14 pontos (risco de lesão)

Por favor, analise este paciente e forneça uma análise SBAR completa...

// DEPOIS (comprimido):
Pac: João Silva, 65a
Dx: Pneumonia
Alergia: Penicilina
Braden: 14

SBAR + riscos

// Economia: ~70% menos tokens = ~70% menos custo
```

### Fallback para Claude

```typescript
try {
  return await this.analyzeWithGPT4oMini(patient);
} catch (error) {
  logger.warn('GPT-4o-mini failed, falling back to Claude');
  return await this.analyzeWithClaude(patient);
}
```

---

## Camada 4: Auto Sync Scheduler

### Conceito

Sincroniza periodicamente em background ao invés de real-time.

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

---

## Estrutura de Resposta da IA

### Análise Individual

```json
{
  "patientId": "uuid",
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

### Classificação de Riscos

| Risco | Critérios | Níveis |
|-------|-----------|--------|
| **Quedas** | Idade, mobilidade, medicações | low, medium, high |
| **Lesão por Pressão** | Braden, mobilidade, nutrição | low, medium, high |
| **Infecção** | Dispositivos, ATB, procedimentos | low, medium, high |
| **Broncoaspiração** | Disfagia, nível consciência, dieta | low, medium, high |
| **Nutricional** | IMC, dieta, albumina | low, medium, high |
| **Respiratório** | SpO2, suporte O2, patologia | low, medium, high |

---

## Prompts

### Prompt Individual (Template)

```typescript
function buildCompressedPrompt(patient: Patient): string {
  return `
Pac: ${patient.nome}, ${patient.idade}a
Leito: ${patient.leito}
Dx: ${patient.diagnostico}
Alergia: ${patient.alergias || 'Sem alergias'}
Braden: ${patient.braden || 'N/A'}
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

### Prompt Batch (Template)

```typescript
function buildBatchPrompt(patients: Patient[]): string {
  const patientsData = patients.map(p =>
    `${p.leito}: ${p.nome}, ${p.idade}a, Dx: ${p.diagnostico}, Braden: ${p.braden}`
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

---

## Economia de Custos

### Comparação

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

---

## Troubleshooting

### IA não responde

```bash
# Verificar API keys
echo $OPENAI_API_KEY | head -c 10
echo $ANTHROPIC_API_KEY | head -c 10

# Verificar logs
grep -i "openai\|anthropic\|gpt\|claude" logs/app-*.log | tail -20
```

### Cache não está funcionando

```bash
# Verificar se cache está sendo usado
grep -i "cache hit\|cache miss" logs/app-*.log | tail -20

# Limpar cache manualmente (reiniciar servidor)
```

### Análises inconsistentes

```typescript
// Verificar se está usando UnifiedClinicalAnalysisService
// E não serviços individuais

// ✅ CORRETO
import { unifiedClinicalAnalysisService } from './unified-clinical-analysis.service';

// ❌ ERRADO (serviços separados podem ter caches diferentes)
import { aiServiceGPT4oMini } from './ai-service-gpt4o-mini';
```

### Sync muito lento

```typescript
// Verificar se batch paralelo está ativo (v1.5.5+)
// Deve processar 4 batches de 10 em paralelo

// Verificar CONCURRENCY_LIMIT
const CONCURRENCY_LIMIT = 10; // Salvamento paralelo
```

---

## Arquivos Relevantes

| Arquivo | Descrição |
|---------|-----------|
| `server/services/unified-clinical-analysis.service.ts` | Serviço unificado de IA |
| `server/services/ai-service-gpt4o-mini.ts` | Integração GPT-4o-mini |
| `server/services/change-detection.service.ts` | Detecção de mudanças |
| `server/services/intelligent-cache.service.ts` | Cache inteligente |
| `server/services/auto-sync-scheduler-gpt4o.service.ts` | Scheduler automático |
| `server/services/n8n-integration-service.ts` | Sincronização N8N + IA |

---

## Variáveis de Ambiente

```bash
# API Keys
OPENAI_API_KEY=sk-...          # GPT-4o-mini (principal)
ANTHROPIC_API_KEY=sk-ant-...   # Claude Haiku 4.5 (fallback com prompt caching)

# Auto Sync
AUTO_SYNC_CRON=0 * * * *       # Cron expression (default: a cada hora)
```
