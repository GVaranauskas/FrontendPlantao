# Análise Profunda: Filtro de Enfermarias na Passagem de Plantão

**Data:** 13 de Janeiro de 2026
**Objetivo:** Entender a implementação atual do filtro de enfermarias e propor solução dinâmica

---

## 📋 Índice

1. [Estado Atual](#1-estado-atual)
2. [Fluxo Completo de Dados](#2-fluxo-completo-de-dados)
3. [Locais com Código Hardcoded](#3-locais-com-código-hardcoded)
4. [Integração com N8N](#4-integração-com-n8n)
5. [Infraestrutura Existente (Não Utilizada)](#5-infraestrutura-existente-não-utilizada)
6. [Interfaces e Tipos Importantes](#6-interfaces-e-tipos-importantes)
7. [Como funciona o forceUpdate](#7-como-funciona-o-forceupdate)
8. [Arquivos Críticos](#8-arquivos-críticos)
9. [Proposta de Solução Dinâmica](#9-proposta-de-solução-dinâmica)
10. [Plano de Implementação](#10-plano-de-implementação)

---

## 🎯 Resumo Executivo (TL;DR)

### **Situação Atual**
O filtro de enfermarias está **hardcoded com "22,23"** em 3 pontos do código (frontend, backend, scheduler). Usuários não podem escolher quais enfermarias visualizar na passagem de plantão.

### **Descoberta Importante** 💡
O sistema **JÁ POSSUI** infraestrutura completa de gestão de enfermarias (banco de dados, admin UI, serviços), mas está **desconectada** da passagem de plantão!

### **Caso de Uso Especial: Enfermarias Virtuais** 🏥
Enfermarias **22 e 23** operam como **uma unidade virtual única** (mesma equipe, turnos compartilhados). Ao tornar o filtro dinâmico, precisamos preservar essa lógica de agrupamento para não prejudicar a usabilidade.

### **Solução Proposta (Incremental)**
| Fase | Descrição | Tempo | Status |
|------|-----------|-------|---------|
| **1** | Filtro dinâmico básico | 3.5 dias | 🔴 Obrigatório |
| **1.5** | Tags visuais de grupos | +1.25 dias | 🟡 Recomendado |
| **2** | Persistência de preferências | +5 dias | 🟢 Opcional |
| **2.5** | Grupos como entidade | +5.5 dias | 🟢 Opcional |

### **Recomendação** ⭐
Implementar **Fase 1 + 1.5 juntas** (~5 dias), validar com usuários, e evoluir para fases seguintes conforme necessidade.

### **Impacto Estimado**
- **Arquivos:** 14 arquivos
- **Código:** ~510 linhas
- **Tempo total:** 5 dias (Fases 1 + 1.5)
- **Complexidade:** Média

### **Perguntas Críticas a Responder**
1. ❓ Quantas enfermarias virtuais existem além de "22,23"?
2. ❓ Grupos mudam com frequência ou são estáveis?
3. ❓ Uma enfermaria pode pertencer a múltiplos grupos?
4. ❓ Apenas admins gerenciam grupos ou usuários criam os seus?
5. ❓ Existem permissões por enfermaria/grupo?

---

## 1. Estado Atual

### 🔴 Problema Principal
O filtro de enfermarias está **HARDCODED** com os valores `"22,23"` em múltiplos pontos do código.

### Localização no Frontend

**Arquivo:** `client/src/pages/shift-handover.tsx` (Linha 142)

```typescript
const manualSyncMutation = useMutation({
  mutationFn: async () => {
    setIsSyncing(true);
    return patientsService.syncManualWithAI("22,23", false);  // ⚠️ HARDCODED
  },
  // ...
});
```

### Componente de Filtro Atual

**Arquivo:** `client/src/components/shift-handover/SearchFilterBar.tsx`

O componente `SearchFilterBar` atual possui apenas:
- ✅ Busca por texto (nome do paciente/leito)
- ✅ Filtro de criticidade
- ❌ **NÃO possui seletor de enfermaria**

```typescript
interface SearchFilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filterCritical: boolean;
  criticalCount: number;
  onClearFilter: () => void;
}
// ❌ Nenhum filtro de enfermaria/unidade
```

---

## 2. Fluxo Completo de Dados

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. CAMADA FRONTEND                                                  │
│ Arquivo: shift-handover.tsx                                         │
│                                                                     │
│ patientsService.syncManualWithAI("22,23", forceUpdate)             │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 2. CAMADA DE SERVIÇO (Cliente)                                     │
│ Arquivo: patients.service.ts (Linhas 31-37)                        │
│                                                                     │
│ async syncManualWithAI(unitIds: string, forceUpdate: boolean) {    │
│   return api.post('/api/sync-gpt4o/manual', {                      │
│     unitIds,      // "22,23"                                        │
│     forceUpdate   // false                                          │
│   })                                                                │
│ }                                                                   │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 3. CAMADA DE ROTAS (Servidor)                                      │
│ Arquivo: server/routes/sync-gpt4o.routes.ts (Linha 13)             │
│                                                                     │
│ router.post('/manual', async (req, res) => {                       │
│   const { unitIds, forceUpdate } = req.body;                       │
│   autoSyncSchedulerGPT4o.runManualSync(unitIds, forceUpdate);      │
│   return res.status(202).json({ message: "Sync iniciado" });       │
│ });                                                                 │
│                                                                     │
│ ⚠️ Responde imediatamente (202) - processa em background           │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 4. CAMADA DE AGENDAMENTO                                           │
│ Arquivo: auto-sync-scheduler-gpt4o.service.ts (Linhas 525-537)     │
│                                                                     │
│ async runManualSync(specificUnitIds?, forceUpdate?) {              │
│   return this.runSyncCycle(specificUnitIds, forceUpdate);          │
│ }                                                                   │
│                                                                     │
│ // Linha 149: Fallback para DEFAULT_UNITS                          │
│ const unitIds = overrideUnitIds || DEFAULT_UNITS; // "22,23"       │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 5. CAMADA DE INTEGRAÇÃO N8N                                        │
│ Arquivo: n8n-integration-service.ts (Linhas 35-133)                │
│                                                                     │
│ async fetchEvolucoes(unitIds: string, forceUpdate: boolean) {      │
│                                                                     │
│   // Monta requisição para N8N                                     │
│   const requestBody = {                                            │
│     flowId: "22-23",        // unitIds.replace(',', '-')           │
│     forceUpdate: false,                                            │
│     meta: {                                                        │
│       params: ["22,23"],    // ⭐ IDs das enfermarias              │
│       formJson: JSON.stringify({                                   │
│         braden: "escala braden",                                   │
│         diagnostico: "diagnostico do paciente",                    │
│         // ... 17 campos clínicos                                  │
│       })                                                           │
│     }                                                              │
│   };                                                               │
│                                                                     │
│   // POST para webhook N8N                                         │
│   const response = await axios.post(N8N_API_URL, requestBody);     │
│   return response.data;                                            │
│ }                                                                   │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 6. WEBHOOK N8N                                                     │
│ URL: https://dev-n8n.7care.com.br/webhook/evolucoes                │
│                                                                     │
│ ✅ Recebe: flowId, forceUpdate, meta.params, meta.formJson         │
│ ⚙️ Processa: Busca dados do IAMSPE filtrados pelas enfermarias     │
│ 📤 Retorna: Array de pacientes com evoluções                        │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 7. RESPOSTA N8N (Exemplo)                                          │
│                                                                     │
│ [                                                                  │
│   {                                                                │
│     "dsEnfermaria": "10A17",      // 🏥 Código da enfermaria       │
│     "dsLeito": "10A1733",         // 🛏️ ID completo do leito       │
│     "leito": "33",                // Número do leito               │
│     "nomePaciente": "...",        // Nome + PT/AT                  │
│     "braden": "...",              // Dados clínicos                │
│     "diagnostico": "...",                                          │
│     "alergias": "...",                                             │
│     // ... 14 campos adicionais                                    │
│   },                                                               │
│   // ... mais pacientes das enfermarias 22 e 23                    │
│ ]                                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Locais com Código Hardcoded

### A. Frontend - Requisição Manual
**Arquivo:** `client/src/pages/shift-handover.tsx:142`
```typescript
return patientsService.syncManualWithAI("22,23", false);
```
⚠️ **Impacto:** Usuário não pode escolher enfermarias

---

### B. Servidor - Fallback Padrão
**Arquivo:** `server/routes.ts:569`
```typescript
const PRODUCTION_UNIT_IDS = "22,23";

// Linhas 577-578: Usa hardcoded se vazio
const params = (unitIds && unitIds.trim() !== "")
  ? unitIds
  : PRODUCTION_UNIT_IDS;
```
⚠️ **Impacto:** Sempre volta para 22,23 se não especificado

---

### C. Scheduler - Constante Default
**Arquivo:** `server/services/auto-sync-scheduler-gpt4o.service.ts:61`
```typescript
private static readonly DEFAULT_UNITS = process.env.N8N_UNIT_IDS || '22,23';

// Linha 149
const unitIds = overrideUnitIds || AutoSyncSchedulerGPT4o.DEFAULT_UNITS;
```
⚠️ **Impacto:** Sincronizações automáticas sempre usam 22,23

---

## 4. Integração com N8N

### Especificação do Webhook

**Documentação:** `docs/N8N_WEBHOOK_SPECIFICATION.md`

#### Request para N8N
```json
{
  "flowId": "22-23",          // ⭐ IDs separados por hífen
  "forceUpdate": false,       // Controla cache do N8N
  "meta": {
    "params": ["22,23"],      // ⭐ IDs das enfermarias (array)
    "formJson": {             // Campos clínicos a buscar
      "braden": "escala braden",
      "diagnostico": "diagnostico do paciente",
      "alergias": "alergias reportadas",
      "alergiasDetalhes": "detalhes das alergias",
      "historicoPatologiaPregresso": "historico de patologia",
      "anticoagulantes": "anticoagulantes em uso",
      "hemoglobinaGlicada": "hemoglobina glicada",
      "glicemiaJejum": "glicemia de jejum",
      "intoleranciaAlimentar": "intolerancia alimentar",
      "intoleranciaDetalhes": "detalhes da intolerancia",
      "dietaAtual": "dieta atual do paciente",
      "aceitatacaoDieta": "aceitacao da dieta",
      "prescricoesDietaNutricao": "prescricoes de dieta e nutricao",
      "prescricoesMedicamentos": "prescricoes de medicamentos",
      "isolamento": "tipo de isolamento",
      "medidaIsolamento": "medidas de isolamento",
      "motivoInternacao": "motivo da internacao"
    }
  }
}
```

#### Response do N8N
```json
[
  {
    "dsEnfermaria": "10A17",           // 🏥 Código da enfermaria
    "dsLeito": "10A1733",              // 🛏️ ID completo do leito
    "leito": "33",                     // Número do leito
    "nomePaciente": "PACIENTE TESTE (PT: Dr. João) (AT: Dr. Maria)",
    "braden": "Risco moderado",
    "diagnostico": "Pneumonia...",
    "alergias": "Dipirona, Penicilina",
    // ... todos os 17 campos solicitados
  }
]
```

### Mapeamento de Campos

| Campo N8N | Descrição | Origem IAMSPE |
|-----------|-----------|---------------|
| `dsEnfermaria` | Código da enfermaria | `dsUnidadeInternacao` |
| `dsLeito` | ID completo do leito | `dsLeito` |
| `leito` | Número do leito | Extraído de `dsLeito` |
| `dsEpecialid` | Especialidade + Ramal | Combinação de campos |

---

## 5. Infraestrutura Existente (Não Utilizada)

### 💡 Descoberta Importante

**O sistema JÁ POSSUI** gestão completa de unidades de enfermagem, mas está **DESCONECTADA** da passagem de plantão!

### Estrutura do Banco de Dados

**Arquivo:** `shared/schema.ts:104-116`

```typescript
export const nursingUnits = pgTable("nursing_units", {
  id: varchar("id").primaryKey(),
  externalId: integer("external_id"),     // idUnidadeInternacao da API IAMSPE
  codigo: text("codigo"),                 // dsUnidadeInternacao
  nome: text("nome"),
  localizacao: text("localizacao"),
  descricao: text("descricao"),
  observacoes: text("observacoes"),
  ramal: text("ramal"),
  ativo: boolean("ativo"),                // ⭐ Pode ser ativado/desativado
});
```

### Página Admin Existente

**Arquivo:** `client/src/pages/admin-nursing-units.tsx`

Funcionalidades já implementadas:
- ✅ CRUD completo de unidades de enfermagem
- ✅ Sincronização com API externa
- ✅ Workflow de aprovação de mudanças
- ✅ Toggle de ativo/inativo
- ✅ Pesquisa e filtros
- ❌ **NÃO está integrado com passagem de plantão**

### Serviço Disponível

**Arquivo:** `client/src/services/nursing-units.service.ts`

```typescript
class NursingUnitsService {
  async getAllUnits(): Promise<NursingUnit[]> { ... }
  async getUnit(id: string): Promise<NursingUnit[]> { ... }
  async createUnit(unit: Partial<NursingUnit>): Promise<void> { ... }
  async updateUnit(id: string, unit: Partial<NursingUnit>): Promise<void> { ... }
  async deleteUnit(id: string): Promise<void> { ... }
  async syncUnits(): Promise<void> { ... }
  async getChanges(): Promise<NursingUnitChange[]> { ... }
  async approveChange(id: string): Promise<void> { ... }
  async rejectChange(id: string): Promise<void> { ... }
}
```

**Todos esses métodos estão disponíveis mas não são usados na passagem de plantão!**

---

## 6. Interfaces e Tipos Importantes

### Request N8N

**Arquivo:** `server/services/n8n-integration-service.ts:4-11`

```typescript
interface N8NRequest {
  flowId: string;           // Formato: "22-23" (vírgulas viram hífens)
  forceUpdate: boolean;     // true = força refresh do IAMSPE
  meta: {
    params: string[];       // ["22,23"] - IDs das enfermarias
    formJson: string;       // JSON string com definições dos campos
  };
}
```

### Unidade de Enfermagem

**Arquivo:** `shared/schema.ts`

```typescript
export type NursingUnit = {
  id: string;
  externalId: number | null;      // ID do sistema IAMSPE
  codigo: string | null;           // Código da enfermaria (ex: "10A17")
  nome: string | null;             // Nome da unidade
  localizacao: string | null;      // Localização física
  descricao: string | null;
  observacoes: string | null;
  ramal: string | null;            // Ramal telefônico
  ativo: boolean | null;           // ⭐ Se está ativa para uso
};
```

---

## 7. Como funciona o forceUpdate

**Arquivo:** `server/services/n8n-integration-service.ts:58-62`

```typescript
// forceUpdate=true causa timeout (~60s+) no N8N
// Estratégia:
// 1. Syncs normais: forceUpdate=false (1s, usa cache)
// 2. Syncs manuais: Tenta true primeiro, fallback para false se timeout
// 3. Auto syncs: Sempre false (agendados)

const TIMEOUT_NORMAL = 30000;   // 30s para forceUpdate=false
const TIMEOUT_FORCE = 120000;   // 120s para forceUpdate=true
```

### Comportamento no Sync Manual

1. **Primeira tentativa:** `forceUpdate=true`
   - Busca dados frescos diretamente do IAMSPE
   - Pode levar 60-120 segundos
   - Garante dados atualizados

2. **Se timeout:** Fallback automático para `forceUpdate=false`
   - Usa cache do N8N
   - Resposta em ~1 segundo
   - Dados podem ter alguns minutos de atraso

3. **Auto Sync (agendado):** Sempre `forceUpdate=false`
   - Evita sobrecarga no IAMSPE
   - Mantém cache do N8N atualizado
   - Roda periodicamente

---

## 8. Arquivos Críticos

### Para Implementar Filtro Dinâmico

| Camada | Arquivo | Linha(s) | Mudança Necessária |
|--------|---------|----------|-------------------|
| **Frontend UI** | `client/src/pages/shift-handover.tsx` | 142 | Adicionar seletor de enfermarias |
| | `client/src/components/shift-handover/SearchFilterBar.tsx` | - | Adicionar prop de enfermarias |
| **Frontend Service** | `client/src/services/patients.service.ts` | 31-37 | Já aceita unitIds (OK) |
| **Server Route** | `server/routes/sync-gpt4o.routes.ts` | 13 | Já aceita unitIds (OK) |
| | `server/routes.ts` | 569, 577-578 | Remover fallback hardcoded |
| **Backend Services** | `server/services/auto-sync-scheduler-gpt4o.service.ts` | 61, 149 | Tornar DEFAULT_UNITS configurável |
| | `server/services/n8n-integration-service.ts` | 35-133 | Já aceita unitIds (OK) |
| **Database** | `shared/schema.ts` | 104-116 | Já tem nursing_units (OK) |

### ✅ O que já está pronto
- Serviço de enfermarias completo
- Banco de dados estruturado
- Backend aceita unitIds dinâmicos
- N8N aceita múltiplas enfermarias

### ❌ O que precisa ser criado
- Seletor de enfermarias no UI
- Integração do seletor com sync manual
- Gestão de preferências do usuário
- Configuração de enfermarias default por perfil

---

## 9. Proposta de Solução Dinâmica

### 🎯 Objetivo
Permitir que usuários selecionem quais enfermarias desejam visualizar na passagem de plantão, substituindo o hardcoded `"22,23"`.

### 🏥 Caso de Uso Especial: Enfermarias Virtuais

#### **Problema Identificado**
Existem situações onde **2 ou mais enfermarias fisicamente separadas operam como uma unidade virtual única**:

**Exemplos:**
- **Enfermarias 22 + 23** = "UTI Unificada" (mesma equipe, turnos compartilhados)
- **Enfermarias 10A17 + 10A18** = "Cardiologia Completa" (mesmo coordenador)
- **Enfermarias Pediátricas dispersas** = "Unidade Pediátrica Virtual"

**Por que isso acontece?**
- ✅ Mesma equipe de enfermagem cobre ambas
- ✅ Passagem de plantão unificada
- ✅ Coordenação médica compartilhada
- ✅ Gestão de recursos integrada
- ✅ Relatórios consolidados

**Impacto no filtro dinâmico:**
- ❌ Usuário **NÃO QUER** selecionar "22" e "23" individualmente toda vez
- ✅ Usuário **QUER** um botão "UTI Unificada" que já seleciona ambas
- ✅ Mas ainda deve poder selecionar individualmente se necessário

#### **Fluxo de Resolução de Grupos → IDs**

```
┌─────────────────────────────────────────────────────────────────────┐
│ USUÁRIO SELECIONA                                                   │
├─────────────────────────────────────────────────────────────────────┤
│ ☑ Grupo: "UTI Unificada"                                            │
│ ☑ Grupo: "Cardiologia"                                              │
│ ☑ Individual: Enfermaria 15 (Pediatria)                             │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ RESOLUÇÃO DE GRUPOS (Backend Service)                               │
├─────────────────────────────────────────────────────────────────────┤
│ "UTI Unificada"      →  SELECT * FROM ward_group_members           │
│                          WHERE groupId = 'uti-unificada'            │
│                          → [Enf.22, Enf.23]                         │
│                          → externalIds: "22,23"                     │
│                                                                     │
│ "Cardiologia"        →  SELECT * FROM ward_group_members           │
│                          WHERE groupId = 'cardiologia'              │
│                          → [Enf.10A17, Enf.10A18]                  │
│                          → externalIds: "10A17,10A18"               │
│                                                                     │
│ Individual: Enf.15   →  Já é ID direto: "15"                       │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ CONSOLIDAÇÃO                                                        │
├─────────────────────────────────────────────────────────────────────┤
│ Combinar todos os IDs: ["22,23", "10A17,10A18", "15"]             │
│ Remover duplicatas:    ["22", "23", "10A17", "10A18", "15"]        │
│ Juntar com vírgula:    "22,23,10A17,10A18,15"                      │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ ENVIO PARA N8N                                                      │
├─────────────────────────────────────────────────────────────────────┤
│ {                                                                   │
│   "flowId": "22-23-10A17-10A18-15",                                 │
│   "meta": {                                                         │
│     "params": ["22,23,10A17,10A18,15"]                              │
│   }                                                                 │
│ }                                                                   │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ N8N RETORNA                                                         │
├─────────────────────────────────────────────────────────────────────┤
│ Pacientes das enfermarias: 22, 23, 10A17, 10A18, 15                │
└─────────────────────────────────────────────────────────────────────┘
```

#### **Vantagens da Resolução Backend**

1. **Transparente para N8N:** N8N continua recebendo IDs, sem mudanças
2. **Flexível:** Usuário pode misturar grupos + individuais
3. **Sem duplicatas:** Sistema automaticamente remove IDs repetidos
4. **Rastreável:** Logs mostram quais grupos foram resolvidos
5. **Performático:** Resolução em batch, uma query por grupo

---

### 🔧 Soluções para Enfermarias Virtuais

#### **Solução A: Tags/Labels Visuais** (Mais Simples)

```
┌─────────────────────────────────────────────────────┐
│ Selecione enfermarias:                              │
│                                                     │
│ [▼ Multi-select]                                    │
│   ☑ Enfermaria 22 - UTI        🏷️ UTI Unificada    │
│   ☑ Enfermaria 23 - Semi       🏷️ UTI Unificada    │
│   ☐ Enfermaria 10A17           🏷️ Cardiologia      │
│   ☐ Enfermaria 10A18           🏷️ Cardiologia      │
│                                                     │
│ 💡 Dica: Enfermarias com mesma tag formam uma      │
│          unidade virtual                            │
└─────────────────────────────────────────────────────┘
```

**Banco de dados:**
```typescript
// Adicionar campo na tabela nursing_units
export const nursingUnits = pgTable("nursing_units", {
  // ... campos existentes ...
  virtualGroup: text("virtual_group"),  // "UTI Unificada", "Cardiologia", etc.
  groupColor: text("group_color"),      // "#FF5733" para cor da tag
});
```

**Vantagens:**
- ✅ Implementação rápida (~1 dia)
- ✅ Visual simples e intuitivo
- ✅ Não muda fluxo de seleção
- ✅ Usuário entende agrupamento visualmente

**Desvantagens:**
- ⚠️ Usuário ainda precisa clicar em cada enfermaria
- ⚠️ Sem seleção automática do grupo

---

#### **Solução B: Grupos com Atalho "Selecionar Todos"** (Intermediária)

```
┌─────────────────────────────────────────────────────┐
│ 🏷️ Grupos:                                          │
│ [UTI Unificada ⚡Selecionar todos]                  │
│ [Cardiologia ⚡Selecionar todos]                    │
│                                                     │
│ Enfermarias selecionadas:                           │
│ ☑ Enf. 22 - UTI (Grupo: UTI Unificada)             │
│ ☑ Enf. 23 - Semi (Grupo: UTI Unificada)            │
│ ☐ Enf. 10A17 - Cardio (Grupo: Cardiologia)         │
│ ☐ Enf. 10A18 - Cardio (Grupo: Cardiologia)         │
│                                                     │
│ ✅ Selecionadas: 2 enfermarias (1 grupo)            │
└─────────────────────────────────────────────────────┘
```

**Banco de dados:** (mesmo da Solução A)

**Frontend logic:**
```typescript
const selectGroup = (groupName: string) => {
  const groupWards = availableWards
    .filter(w => w.virtualGroup === groupName)
    .map(w => w.externalId.toString());

  setSelectedWards([...selectedWards, ...groupWards]);
};
```

**Vantagens:**
- ✅ Um clique seleciona múltiplas enfermarias
- ✅ Visual claro do agrupamento
- ✅ Permite seleção mista (grupo + individuais)
- ✅ Fácil de implementar (~1.5 dias)

**Desvantagens:**
- ⚠️ Ocupa mais espaço na UI
- ⚠️ Ainda não é um "preset" salvo

---

#### **Solução C: Grupos como Entidade Completa** (Mais Robusta) ⭐ RECOMENDADO

```
┌─────────────────────────────────────────────────────┐
│ Ver por:  ( ) Grupos  (•) Enfermarias Individuais   │
│                                                     │
│ 📁 Grupos disponíveis:                              │
│ ☑ 🏥 UTI Unificada (Enf. 22, 23)                    │
│ ☐ ❤️  Cardiologia (Enf. 10A17, 10A18)               │
│ ☐ 👶 Pediatria (Enf. 15, 16, 17)                    │
│                                                     │
│ 🔧 [Gerenciar grupos]                               │
│                                                     │
│ 🔄 [Sincronizar]                                    │
└─────────────────────────────────────────────────────┘
```

**Estrutura do banco:**

```typescript
// Nova tabela: ward_groups
export const wardGroups = pgTable("ward_groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),              // "UTI Unificada"
  description: text("description"),          // Descrição do grupo
  icon: text("icon"),                        // Emoji ou ícone
  color: text("color"),                      // Cor do grupo
  isDefault: boolean("is_default").default(false),  // Grupo padrão
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tabela de relacionamento N:N
export const wardGroupMembers = pgTable("ward_group_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id")
    .notNull()
    .references(() => wardGroups.id, { onDelete: "cascade" }),
  wardId: varchar("ward_id")
    .notNull()
    .references(() => nursingUnits.id, { onDelete: "cascade" }),
  order: integer("order").default(0),        // Ordem de exibição
  createdAt: timestamp("created_at").defaultNow(),
});

// Índice único para evitar duplicatas
export const wardGroupMembersUniqueIdx = uniqueIndex("ward_group_members_unique")
  .on(wardGroupMembers.groupId, wardGroupMembers.wardId);
```

**Backend Service:**

```typescript
// server/services/ward-groups.service.ts

class WardGroupsService {
  // Obter todos os grupos ativos
  async getActiveGroups(): Promise<WardGroup[]> {
    return db
      .select()
      .from(wardGroups)
      .where(eq(wardGroups.isActive, true))
      .orderBy(wardGroups.name);
  }

  // Obter enfermarias de um grupo
  async getGroupWards(groupId: string): Promise<NursingUnit[]> {
    return db
      .select({
        id: nursingUnits.id,
        externalId: nursingUnits.externalId,
        codigo: nursingUnits.codigo,
        nome: nursingUnits.nome,
      })
      .from(wardGroupMembers)
      .innerJoin(nursingUnits, eq(wardGroupMembers.wardId, nursingUnits.id))
      .where(eq(wardGroupMembers.groupId, groupId))
      .orderBy(wardGroupMembers.order);
  }

  // Resolver grupo para IDs (para N8N)
  async resolveGroupToWardIds(groupId: string): Promise<string> {
    const wards = await this.getGroupWards(groupId);
    return wards
      .map(w => w.externalId)
      .filter(id => id !== null)
      .join(',');
  }

  // CRUD completo
  async createGroup(data: NewWardGroup): Promise<WardGroup> { ... }
  async updateGroup(id: string, data: Partial<WardGroup>): Promise<void> { ... }
  async deleteGroup(id: string): Promise<void> { ... }
  async addWardToGroup(groupId: string, wardId: string): Promise<void> { ... }
  async removeWardFromGroup(groupId: string, wardId: string): Promise<void> { ... }
}
```

**Frontend Integration:**

```typescript
// client/src/pages/shift-handover.tsx

const [viewMode, setViewMode] = useState<'groups' | 'individual'>('groups');
const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
const [wardGroups, setWardGroups] = useState<WardGroup[]>([]);

// Carregar grupos disponíveis
useEffect(() => {
  wardGroupsService.getActiveGroups()
    .then(groups => setWardGroups(groups));
}, []);

// Sincronizar com grupos selecionados
const manualSyncMutation = useMutation({
  mutationFn: async () => {
    setIsSyncing(true);

    // Resolver grupos para IDs de enfermarias
    const wardIds = await Promise.all(
      selectedGroups.map(groupId =>
        wardGroupsService.resolveGroupToWardIds(groupId)
      )
    );

    // Combinar todos os IDs (remove duplicatas)
    const allWardIds = [...new Set(wardIds.flatMap(ids => ids.split(',')))].join(',');

    return patientsService.syncManualWithAI(allWardIds, false);
  },
});
```

**Admin UI para Grupos:**

```typescript
// client/src/pages/admin-ward-groups.tsx

<Card>
  <CardHeader>
    <CardTitle>🏥 Grupos de Enfermarias</CardTitle>
  </CardHeader>
  <CardContent>
    <Button onClick={createNewGroup}>+ Novo Grupo</Button>

    <Table>
      <TableHeader>
        <TableRow>
          <TableCell>Nome</TableCell>
          <TableCell>Enfermarias</TableCell>
          <TableCell>Padrão</TableCell>
          <TableCell>Ações</TableCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {wardGroups.map(group => (
          <TableRow key={group.id}>
            <TableCell>{group.icon} {group.name}</TableCell>
            <TableCell>
              <WardGroupBadges groupId={group.id} />
            </TableCell>
            <TableCell>
              {group.isDefault && <Badge>Padrão</Badge>}
            </TableCell>
            <TableCell>
              <Button onClick={() => editGroup(group)}>Editar</Button>
              <Button onClick={() => deleteGroup(group.id)}>Excluir</Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </CardContent>
</Card>
```

**Vantagens:**
- ✅ Modelagem completa e escalável
- ✅ Suporta enfermarias em múltiplos grupos
- ✅ Admin UI dedicada para gestão
- ✅ Grupos podem ser padrão
- ✅ Pode ser favorito do usuário
- ✅ Auditável e rastreável
- ✅ Suporta hierarquias complexas

**Desvantagens:**
- ⚠️ Implementação mais longa (~3 dias)
- ⚠️ Requer 2 novas tabelas
- ⚠️ Maior complexidade de manutenção

---

#### **Solução D: Presets de Usuário** (Mais Flexível)

Combina grupos fixos (admin) + presets personalizados (usuário):

```
┌─────────────────────────────────────────────────────┐
│ 📁 Grupos do Sistema:                               │
│ ☐ 🏥 UTI Unificada (Enf. 22, 23)                    │
│ ☐ ❤️  Cardiologia (Enf. 10A17, 10A18)               │
│                                                     │
│ ⭐ Meus Presets:                                    │
│ ☑ Meu Turno Noite (Enf. 22, 23, 10A17)             │
│ ☐ Apenas UTI (Enf. 22)                             │
│                                                     │
│ [💾 Salvar seleção atual como preset]              │
│ [🗑️ Gerenciar meus presets]                         │
└─────────────────────────────────────────────────────┘
```

**Nova tabela:**

```typescript
export const userWardPresets = pgTable("user_ward_presets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),              // "Meu Turno Noite"
  wardIds: text("ward_ids").notNull(),       // "22,23,10A17"
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

**Vantagens:**
- ✅ Máxima flexibilidade
- ✅ Cada usuário cria seus próprios grupos
- ✅ Admin mantém grupos oficiais
- ✅ Suporta workflows individuais

**Desvantagens:**
- ⚠️ Dois sistemas paralelos (grupos + presets)
- ⚠️ Pode confundir usuários
- ⚠️ Implementação mais complexa (~4 dias)

---

### 📊 Comparação de Soluções para Enfermarias Virtuais

| Critério | Solução A<br>Tags | Solução B<br>Atalhos | Solução C<br>Grupos ⭐ | Solução D<br>Presets |
|----------|-------------------|----------------------|----------------------|---------------------|
| **Implementação** | 1 dia | 1.5 dias | 3 dias | 4 dias |
| **Complexidade** | Baixa | Baixa | Média | Alta |
| **Flexibilidade** | ⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **UX Simplicidade** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| **Escalabilidade** | ⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Admin UI** | Não precisa | Não precisa | Sim | Sim |
| **Novas tabelas** | 0 (add campo) | 0 (add campo) | 2 | 3 |
| **Multi-grupo** | Não | Não | Sim | Sim |

---

### 🏆 Recomendação para Enfermarias Virtuais

**Abordagem Incremental:**

1. **Fase 1.5 (Adicionar à Fase 1 inicial):** Solução A - Tags
   - Adiciona campo `virtualGroup` na tabela existente
   - Visual simples com badges coloridos
   - Tempo: +0.5 dia

2. **Fase 2.5 (Após validação):** Solução C - Grupos Completos
   - Cria entidade de grupos
   - Admin UI para gestão
   - Resolve para IDs automaticamente
   - Tempo: +3 dias

3. **Fase 3 (Futuro, se necessário):** Adicionar Presets de Usuário
   - Cada usuário personaliza seus grupos
   - Tempo: +2 dias

**Por quê essa ordem?**
- ✅ Valida necessidade com implementação rápida (Tags)
- ✅ Evolui para solução robusta após feedback (Grupos)
- ✅ Adiciona personalização se usuários pedirem (Presets)

---

### Abordagem Recomendada

#### **Opção 1: Seletor Simples + Tags (Implementação Rápida)** ⭐ RECOMENDADO

```
┌─────────────────────────────────────────────────────┐
│ 🏥 Passagem de Plantão                              │
├─────────────────────────────────────────────────────┤
│                                                     │
│ [🔍 Buscar paciente/leito...]                      │
│                                                     │
│ Enfermarias: [▼ Selecionar enfermarias]            │
│              ☑ Enfermaria 22 - UTI                 │
│              ☑ Enfermaria 23 - Semi-Intensiva      │
│              ☐ Enfermaria 10A17 - Cardiologia      │
│              ☐ Enfermaria 10A18 - Neurologia       │
│                                                     │
│ [🔄 Atualizar] [Apenas Críticos: OFF]              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Vantagens:**
- ✅ Rápida implementação (1-2 dias)
- ✅ UX familiar (multi-select)
- ✅ Usa infraestrutura existente
- ✅ Compatível com sistema atual

**Desvantagens:**
- ⚠️ Não salva preferências entre sessões
- ⚠️ Usuário precisa selecionar toda vez

---

#### **Opção 2: Perfis de Enfermaria (Implementação Completa)**

```
┌─────────────────────────────────────────────────────┐
│ 🏥 Passagem de Plantão                              │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Meu Perfil: [▼ Enfermeiro - UTI Adulto]            │
│              ▸ Enfermeiro - UTI Pediátrica         │
│              ▸ Médico - Clínica Geral              │
│              ▸ Personalizado...                    │
│                                                     │
│ Enfermarias ativas (do perfil):                    │
│ • Enfermaria 22 - UTI Adulto                       │
│ • Enfermaria 23 - Semi-Intensiva                   │
│                                                     │
│ [⚙️ Gerenciar Perfis] [🔄 Atualizar]                │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Vantagens:**
- ✅ Salva preferências do usuário
- ✅ Troca rápida entre perfis
- ✅ Suporta múltiplos workflows
- ✅ Gerenciamento centralizado

**Desvantagens:**
- ⚠️ Implementação mais longa (1-2 semanas)
- ⚠️ Requer nova tabela no banco
- ⚠️ UX mais complexa

---

#### **Opção 3: Filtro por Permissão/Cargo (Enterprise)**

```
Tabela: user_ward_permissions
├─ userId
├─ wardId
├─ canView
├─ canEdit
└─ isDefault

Fluxo:
1. Admin atribui enfermarias ao usuário
2. Sistema mostra apenas enfermarias permitidas
3. Usuário pode marcar favoritas
4. Sync automático usa apenas as permitidas
```

**Vantagens:**
- ✅ Segurança por permissão
- ✅ Auditoria completa
- ✅ Multi-tenant ready
- ✅ Escalável

**Desvantagens:**
- ⚠️ Muito complexo para MVP
- ⚠️ Requer refatoração de autenticação
- ⚠️ Implementação longa (3-4 semanas)

---

### 🏆 Recomendação Final

**Implementar Opção 1 primeiro**, depois evoluir para Opção 2 conforme necessidade.

#### Por quê?
1. **Validação rápida:** Testa a feature com usuários reais
2. **Infraestrutura pronta:** Usa 90% do código existente
3. **Baixo risco:** Não mexe em autenticação/permissões
4. **Iterativo:** Fácil evoluir depois

---

## 10. Plano de Implementação

### 📅 FASE 1: Filtro Dinâmico Básico (Opção 1)

#### **Passo 1: Adicionar Seletor no SearchFilterBar**
**Arquivo:** `client/src/components/shift-handover/SearchFilterBar.tsx`

```typescript
interface SearchFilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filterCritical: boolean;
  criticalCount: number;
  onClearFilter: () => void;

  // ⭐ NOVOS
  selectedWards: string[];                    // IDs das enfermarias selecionadas
  availableWards: NursingUnit[];              // Enfermarias disponíveis
  onWardSelectionChange: (wardIds: string[]) => void;
}
```

**Componente visual:**
```tsx
<Select multiple>
  <SelectTrigger>
    <SelectValue placeholder="Selecione enfermarias" />
  </SelectTrigger>
  <SelectContent>
    {availableWards
      .filter(ward => ward.ativo)  // Apenas ativas
      .map(ward => (
        <SelectItem key={ward.id} value={ward.externalId.toString()}>
          <Checkbox checked={selectedWards.includes(ward.externalId.toString())} />
          {ward.codigo} - {ward.nome}
        </SelectItem>
      ))
    }
  </SelectContent>
</Select>
```

---

#### **Passo 2: Integrar no shift-handover.tsx**
**Arquivo:** `client/src/pages/shift-handover.tsx`

```typescript
// ⭐ Novo estado
const [selectedWards, setSelectedWards] = useState<string[]>(["22", "23"]); // Default
const [availableWards, setAvailableWards] = useState<NursingUnit[]>([]);

// ⭐ Buscar enfermarias disponíveis no mount
useEffect(() => {
  nursingUnitsService.getAllUnits()
    .then(units => setAvailableWards(units.filter(u => u.ativo)));
}, []);

// ⭐ Atualizar mutation para usar seleção dinâmica
const manualSyncMutation = useMutation({
  mutationFn: async () => {
    setIsSyncing(true);
    const wardIds = selectedWards.join(','); // Converte ["22","23"] para "22,23"
    return patientsService.syncManualWithAI(wardIds, false);
  },
  // ...
});

// ⭐ Passar props para SearchFilterBar
<SearchFilterBar
  searchTerm={searchTerm}
  onSearchChange={setSearchTerm}
  filterCritical={filterCritical}
  criticalCount={criticalPatients.length}
  onClearFilter={handleClearFilter}
  selectedWards={selectedWards}
  availableWards={availableWards}
  onWardSelectionChange={setSelectedWards}
/>
```

---

#### **Passo 3: Remover Hardcoded do Backend**
**Arquivo:** `server/routes.ts:569,577-578`

```typescript
// ❌ REMOVER
const PRODUCTION_UNIT_IDS = "22,23";

// ❌ REMOVER fallback hardcoded
const params = (unitIds && unitIds.trim() !== "") ? unitIds : PRODUCTION_UNIT_IDS;

// ✅ SUBSTITUIR POR: validação obrigatória
if (!unitIds || unitIds.trim() === "") {
  return res.status(400).json({
    error: "unitIds é obrigatório. Especifique quais enfermarias sincronizar."
  });
}
```

**Arquivo:** `server/services/auto-sync-scheduler-gpt4o.service.ts:61`

```typescript
// ❌ REMOVER
private static readonly DEFAULT_UNITS = process.env.N8N_UNIT_IDS || '22,23';

// ✅ SUBSTITUIR POR: configuração do banco de dados
private static async getDefaultUnits(): Promise<string> {
  const activeUnits = await db
    .select({ externalId: nursingUnits.externalId })
    .from(nursingUnits)
    .where(eq(nursingUnits.ativo, true));

  return activeUnits
    .map(u => u.externalId)
    .filter(id => id !== null)
    .join(',');
}
```

---

#### **Passo 4: Validação de Input**
**Arquivo:** `server/middleware/input-validation.ts`

```typescript
// Adicionar validador para unitIds
export const validateUnitIds = (req: Request, res: Response, next: NextFunction) => {
  const { unitIds } = req.body;

  // Deve ser string no formato "22,23" ou "22"
  if (!unitIds || typeof unitIds !== 'string') {
    return res.status(400).json({ error: 'unitIds deve ser uma string' });
  }

  // Valida formato: números separados por vírgula
  const pattern = /^\d+(,\d+)*$/;
  if (!pattern.test(unitIds)) {
    return res.status(400).json({
      error: 'unitIds deve conter apenas números separados por vírgula (ex: "22,23")'
    });
  }

  next();
};

// Aplicar no route
router.post('/manual', validateUnitIds, async (req, res) => {
  // ...
});
```

---

#### **Passo 5: Testes**

```typescript
// client/src/pages/__tests__/shift-handover.test.tsx

describe('Ward Filter', () => {
  it('should load available wards on mount', async () => {
    const mockWards = [
      { id: '1', externalId: 22, codigo: '10A17', nome: 'UTI', ativo: true },
      { id: '2', externalId: 23, codigo: '10A18', nome: 'Semi', ativo: true },
    ];

    jest.spyOn(nursingUnitsService, 'getAllUnits').mockResolvedValue(mockWards);

    render(<ShiftHandoverPage />);

    await waitFor(() => {
      expect(screen.getByText('10A17 - UTI')).toBeInTheDocument();
    });
  });

  it('should sync with selected wards', async () => {
    const syncSpy = jest.spyOn(patientsService, 'syncManualWithAI');

    render(<ShiftHandoverPage />);

    // Seleciona enfermarias
    fireEvent.click(screen.getByText('Enfermaria 22'));
    fireEvent.click(screen.getByText('Enfermaria 23'));

    // Clica em sincronizar
    fireEvent.click(screen.getByText('Atualizar'));

    expect(syncSpy).toHaveBeenCalledWith('22,23', false);
  });
});
```

---

### 📅 FASE 1.5: Suporte a Tags de Grupos Virtuais

#### **Passo 1: Adicionar campo virtualGroup ao schema**

```typescript
// shared/schema.ts

export const nursingUnits = pgTable("nursing_units", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  externalId: integer("external_id").notNull().unique(),
  codigo: text("codigo").notNull(),
  nome: text("nome").notNull(),
  localizacao: text("localizacao"),
  descricao: text("descricao"),
  observacoes: text("observacoes"),
  ramal: text("ramal"),
  ativo: boolean("ativo").notNull().default(true),

  // ⭐ NOVOS CAMPOS
  virtualGroup: text("virtual_group"),        // "UTI Unificada", "Cardiologia"
  groupColor: text("group_color"),            // "#FF5733" para cor da tag
  groupIcon: text("group_icon"),              // "🏥", "❤️", etc.

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

#### **Passo 2: Migration para adicionar campos**

```typescript
// server/db/migrations/XXXX_add_virtual_groups.ts

export async function up(db: Database) {
  await db.schema
    .alterTable('nursing_units')
    .addColumn('virtual_group', 'text')
    .addColumn('group_color', 'text')
    .addColumn('group_icon', 'text')
    .execute();
}

export async function down(db: Database) {
  await db.schema
    .alterTable('nursing_units')
    .dropColumn('virtual_group')
    .dropColumn('group_color')
    .dropColumn('group_icon')
    .execute();
}
```

#### **Passo 3: Seed inicial com grupos atuais**

```typescript
// server/db/seeds/ward_groups.ts

await db.update(nursingUnits)
  .set({
    virtualGroup: 'UTI Unificada',
    groupColor: '#FF5733',
    groupIcon: '🏥'
  })
  .where(inArray(nursingUnits.externalId, [22, 23]));
```

#### **Passo 4: Atualizar SearchFilterBar para mostrar tags**

```typescript
// client/src/components/shift-handover/SearchFilterBar.tsx

<SelectItem key={ward.id} value={ward.externalId.toString()}>
  <div className="flex items-center gap-2">
    <Checkbox checked={selectedWards.includes(ward.externalId.toString())} />
    <span>{ward.codigo} - {ward.nome}</span>

    {/* ⭐ TAG DE GRUPO */}
    {ward.virtualGroup && (
      <Badge
        variant="secondary"
        style={{ backgroundColor: ward.groupColor || '#gray' }}
      >
        {ward.groupIcon} {ward.virtualGroup}
      </Badge>
    )}
  </div>
</SelectItem>
```

#### **Passo 5: Adicionar gestão de grupos no Admin UI**

```typescript
// client/src/pages/admin-nursing-units.tsx

// Adicionar campos ao formulário de edição
<FormField
  label="Grupo Virtual"
  name="virtualGroup"
  placeholder="Ex: UTI Unificada"
/>

<FormField
  label="Cor do Grupo"
  name="groupColor"
  type="color"
/>

<FormField
  label="Ícone do Grupo"
  name="groupIcon"
  placeholder="Ex: 🏥"
/>
```

---

### 📅 FASE 2: Persistência de Preferências (Opção 2)

#### **Passo 1: Nova Tabela no Banco**

```typescript
// shared/schema.ts

export const userWardPreferences = pgTable("user_ward_preferences", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  wardIds: text("ward_ids").notNull(),  // "22,23,24"
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

#### **Passo 2: Endpoints de Preferências**

```typescript
// server/routes/user-preferences.routes.ts

// GET /api/user-preferences/wards
// Retorna wardIds do usuário logado
router.get('/wards', async (req, res) => {
  const userId = req.user.id;
  const prefs = await db
    .select()
    .from(userWardPreferences)
    .where(eq(userWardPreferences.userId, userId))
    .limit(1);

  if (prefs.length === 0) {
    // Default: todas as enfermarias ativas
    const activeWards = await getActiveWards();
    return res.json({ wardIds: activeWards.join(',') });
  }

  return res.json({ wardIds: prefs[0].wardIds });
});

// POST /api/user-preferences/wards
// Salva preferências do usuário
router.post('/wards', async (req, res) => {
  const userId = req.user.id;
  const { wardIds } = req.body;

  await db
    .insert(userWardPreferences)
    .values({ userId, wardIds })
    .onConflictDoUpdate({
      target: userWardPreferences.userId,
      set: { wardIds, updatedAt: new Date() }
    });

  return res.json({ success: true });
});
```

#### **Passo 3: Auto-load no Frontend**

```typescript
// client/src/pages/shift-handover.tsx

useEffect(() => {
  // Carrega preferências salvas
  userPreferencesService.getWardPreferences()
    .then(prefs => {
      setSelectedWards(prefs.wardIds.split(','));
    });
}, []);

// Salva automaticamente quando muda
useEffect(() => {
  if (selectedWards.length > 0) {
    userPreferencesService.saveWardPreferences(selectedWards.join(','));
  }
}, [selectedWards]);
```

---

### 📅 FASE 2.5: Grupos Completos como Entidade

Esta fase transforma grupos virtuais simples (tags) em entidades completas gerenciáveis.

#### **Passo 1: Criar tabelas de grupos**

```typescript
// shared/schema.ts

export const wardGroups = pgTable("ward_groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"),                          // "🏥"
  color: text("color"),                        // "#FF5733"
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const wardGroupMembers = pgTable("ward_group_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id")
    .notNull()
    .references(() => wardGroups.id, { onDelete: "cascade" }),
  wardId: varchar("ward_id")
    .notNull()
    .references(() => nursingUnits.id, { onDelete: "cascade" }),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Índice único
export const wardGroupMembersIdx = uniqueIndex("ward_group_members_unique")
  .on(wardGroupMembers.groupId, wardGroupMembers.wardId);
```

#### **Passo 2: Criar serviço de grupos**

```typescript
// server/services/ward-groups.service.ts

class WardGroupsService {
  async getActiveGroups(): Promise<WardGroup[]> {
    return db.select().from(wardGroups)
      .where(eq(wardGroups.isActive, true))
      .orderBy(wardGroups.name);
  }

  async getGroupWards(groupId: string): Promise<NursingUnit[]> {
    return db
      .select({
        id: nursingUnits.id,
        externalId: nursingUnits.externalId,
        codigo: nursingUnits.codigo,
        nome: nursingUnits.nome,
      })
      .from(wardGroupMembers)
      .innerJoin(nursingUnits, eq(wardGroupMembers.wardId, nursingUnits.id))
      .where(eq(wardGroupMembers.groupId, groupId))
      .orderBy(wardGroupMembers.order);
  }

  async resolveGroupToWardIds(groupId: string): Promise<string> {
    const wards = await this.getGroupWards(groupId);
    return wards
      .map(w => w.externalId)
      .filter(id => id !== null)
      .join(',');
  }

  async createGroup(data: NewWardGroup): Promise<WardGroup> {
    const [group] = await db.insert(wardGroups).values(data).returning();
    return group;
  }

  async addWardToGroup(groupId: string, wardId: string, order?: number): Promise<void> {
    await db.insert(wardGroupMembers).values({
      groupId,
      wardId,
      order: order || 0
    });
  }

  async removeWardFromGroup(groupId: string, wardId: string): Promise<void> {
    await db.delete(wardGroupMembers)
      .where(
        and(
          eq(wardGroupMembers.groupId, groupId),
          eq(wardGroupMembers.wardId, wardId)
        )
      );
  }

  async updateGroup(id: string, data: Partial<WardGroup>): Promise<void> {
    await db.update(wardGroups)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(wardGroups.id, id));
  }

  async deleteGroup(id: string): Promise<void> {
    await db.delete(wardGroups).where(eq(wardGroups.id, id));
  }
}

export const wardGroupsService = new WardGroupsService();
```

#### **Passo 3: Criar rotas de API**

```typescript
// server/routes/ward-groups.routes.ts

const router = Router();

// GET /api/ward-groups - Listar grupos ativos
router.get('/', async (req, res) => {
  const groups = await wardGroupsService.getActiveGroups();
  res.json(groups);
});

// GET /api/ward-groups/:id/wards - Enfermarias de um grupo
router.get('/:id/wards', async (req, res) => {
  const wards = await wardGroupsService.getGroupWards(req.params.id);
  res.json(wards);
});

// GET /api/ward-groups/:id/resolve - Resolver para IDs
router.get('/:id/resolve', async (req, res) => {
  const wardIds = await wardGroupsService.resolveGroupToWardIds(req.params.id);
  res.json({ wardIds });
});

// POST /api/ward-groups - Criar grupo
router.post('/', requireAdmin, async (req, res) => {
  const group = await wardGroupsService.createGroup(req.body);
  res.status(201).json(group);
});

// PUT /api/ward-groups/:id - Atualizar grupo
router.put('/:id', requireAdmin, async (req, res) => {
  await wardGroupsService.updateGroup(req.params.id, req.body);
  res.json({ success: true });
});

// DELETE /api/ward-groups/:id - Deletar grupo
router.delete('/:id', requireAdmin, async (req, res) => {
  await wardGroupsService.deleteGroup(req.params.id);
  res.status(204).send();
});

// POST /api/ward-groups/:id/wards - Adicionar enfermaria ao grupo
router.post('/:id/wards', requireAdmin, async (req, res) => {
  const { wardId, order } = req.body;
  await wardGroupsService.addWardToGroup(req.params.id, wardId, order);
  res.status(201).json({ success: true });
});

// DELETE /api/ward-groups/:id/wards/:wardId - Remover enfermaria
router.delete('/:id/wards/:wardId', requireAdmin, async (req, res) => {
  await wardGroupsService.removeWardFromGroup(req.params.id, req.params.wardId);
  res.status(204).send();
});

export default router;
```

#### **Passo 4: Criar serviço frontend**

```typescript
// client/src/services/ward-groups.service.ts

class WardGroupsService {
  async getActiveGroups(): Promise<WardGroup[]> {
    return api.get('/api/ward-groups');
  }

  async getGroupWards(groupId: string): Promise<NursingUnit[]> {
    return api.get(`/api/ward-groups/${groupId}/wards`);
  }

  async resolveGroupToWardIds(groupId: string): Promise<string> {
    const response = await api.get(`/api/ward-groups/${groupId}/resolve`);
    return response.wardIds;
  }

  async createGroup(data: NewWardGroup): Promise<WardGroup> {
    return api.post('/api/ward-groups', data);
  }

  async updateGroup(id: string, data: Partial<WardGroup>): Promise<void> {
    return api.put(`/api/ward-groups/${id}`, data);
  }

  async deleteGroup(id: string): Promise<void> {
    return api.delete(`/api/ward-groups/${id}`);
  }

  async addWardToGroup(groupId: string, wardId: string, order?: number): Promise<void> {
    return api.post(`/api/ward-groups/${groupId}/wards`, { wardId, order });
  }

  async removeWardFromGroup(groupId: string, wardId: string): Promise<void> {
    return api.delete(`/api/ward-groups/${groupId}/wards/${wardId}`);
  }
}

export const wardGroupsService = new WardGroupsService();
```

#### **Passo 5: Atualizar shift-handover para usar grupos**

```typescript
// client/src/pages/shift-handover.tsx

const [viewMode, setViewMode] = useState<'groups' | 'individual'>('groups');
const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
const [wardGroups, setWardGroups] = useState<WardGroup[]>([]);

// Carregar grupos
useEffect(() => {
  if (viewMode === 'groups') {
    wardGroupsService.getActiveGroups()
      .then(groups => setWardGroups(groups));
  }
}, [viewMode]);

// Sincronizar com grupos
const manualSyncMutation = useMutation({
  mutationFn: async () => {
    setIsSyncing(true);

    let wardIds: string;

    if (viewMode === 'groups') {
      // Resolver grupos para IDs
      const resolvedIds = await Promise.all(
        selectedGroups.map(groupId =>
          wardGroupsService.resolveGroupToWardIds(groupId)
        )
      );
      // Combinar e remover duplicatas
      wardIds = [...new Set(resolvedIds.flatMap(ids => ids.split(',')))].join(',');
    } else {
      // Usar seleção individual
      wardIds = selectedWards.join(',');
    }

    return patientsService.syncManualWithAI(wardIds, false);
  },
});

// UI
<Tabs value={viewMode} onValueChange={setViewMode}>
  <TabsList>
    <TabsTrigger value="groups">📁 Por Grupos</TabsTrigger>
    <TabsTrigger value="individual">🏥 Individual</TabsTrigger>
  </TabsList>

  <TabsContent value="groups">
    {wardGroups.map(group => (
      <div key={group.id} className="flex items-center gap-2 p-2">
        <Checkbox
          checked={selectedGroups.includes(group.id)}
          onCheckedChange={(checked) => {
            if (checked) {
              setSelectedGroups([...selectedGroups, group.id]);
            } else {
              setSelectedGroups(selectedGroups.filter(id => id !== group.id));
            }
          }}
        />
        <span>{group.icon}</span>
        <span className="font-medium">{group.name}</span>
        <Badge variant="secondary">
          {group.wardCount || 0} enfermarias
        </Badge>
      </div>
    ))}
  </TabsContent>

  <TabsContent value="individual">
    {/* Seletor individual existente */}
  </TabsContent>
</Tabs>
```

#### **Passo 6: Criar Admin UI de Grupos**

```typescript
// client/src/pages/admin-ward-groups.tsx

export default function AdminWardGroupsPage() {
  const [groups, setGroups] = useState<WardGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<WardGroup | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Carregar grupos
  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    const data = await wardGroupsService.getActiveGroups();
    setGroups(data);
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>🏥 Grupos de Enfermarias</CardTitle>
          <CardDescription>
            Configure grupos virtuais de enfermarias para facilitar a passagem de plantão
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Button onClick={() => setIsEditing(true)}>
            + Novo Grupo
          </Button>

          <Table>
            <TableHeader>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Enfermarias</TableCell>
                <TableCell>Padrão</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Ações</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map(group => (
                <TableRow key={group.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{group.icon}</span>
                      <span
                        className="px-2 py-1 rounded"
                        style={{ backgroundColor: group.color }}
                      >
                        {group.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <WardGroupBadges groupId={group.id} />
                  </TableCell>
                  <TableCell>
                    {group.isDefault && <Badge>Padrão</Badge>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={group.isActive ? 'success' : 'secondary'}>
                      {group.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedGroup(group);
                        setIsEditing(true);
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteGroup(group.id)}
                    >
                      Excluir
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal de edição */}
      {isEditing && (
        <WardGroupEditModal
          group={selectedGroup}
          onClose={() => {
            setIsEditing(false);
            setSelectedGroup(null);
            loadGroups();
          }}
        />
      )}
    </div>
  );
}
```

#### **Passo 7: Migration de dados**

```typescript
// server/db/migrations/XXXX_migrate_virtual_groups_to_entities.ts

export async function up(db: Database) {
  // 1. Criar tabelas
  await db.schema.createTable('ward_groups')
    .addColumn('id', 'varchar', col => col.primaryKey())
    // ... outros campos
    .execute();

  await db.schema.createTable('ward_group_members')
    // ... definição
    .execute();

  // 2. Migrar dados existentes de virtualGroup
  const unitsWithGroups = await db
    .select()
    .from(nursingUnits)
    .where(isNotNull(nursingUnits.virtualGroup))
    .execute();

  // Agrupar por virtualGroup
  const groupMap = new Map<string, NursingUnit[]>();
  for (const unit of unitsWithGroups) {
    if (!groupMap.has(unit.virtualGroup)) {
      groupMap.set(unit.virtualGroup, []);
    }
    groupMap.get(unit.virtualGroup)!.push(unit);
  }

  // Criar grupos e membros
  for (const [groupName, units] of groupMap.entries()) {
    const [group] = await db.insert(wardGroups).values({
      name: groupName,
      icon: units[0].groupIcon || '🏥',
      color: units[0].groupColor || '#gray',
      isActive: true,
    }).returning();

    for (const unit of units) {
      await db.insert(wardGroupMembers).values({
        groupId: group.id,
        wardId: unit.id,
      });
    }
  }

  // 3. (Opcional) Remover campos antigos
  // await db.schema.alterTable('nursing_units')
  //   .dropColumn('virtual_group')
  //   .dropColumn('group_color')
  //   .dropColumn('group_icon')
  //   .execute();
}
```

---

### 🎯 Critérios de Sucesso

#### FASE 1 (Filtro Dinâmico)
- [ ] Usuário pode selecionar múltiplas enfermarias
- [ ] Apenas enfermarias ativas aparecem no seletor
- [ ] Sync manual usa enfermarias selecionadas
- [ ] N8N recebe IDs corretos
- [ ] Dados retornados estão filtrados corretamente
- [ ] Nenhum código hardcoded permanece

#### FASE 1.5 (Tags de Grupos Virtuais)
- [ ] Enfermarias mostram tags de grupo visual
- [ ] Cores e ícones diferenciados por grupo
- [ ] Admin pode editar grupo, cor e ícone
- [ ] Usuário entende visualmente quais enfermarias são do mesmo grupo
- [ ] Migração de dados existentes ("22,23" → "UTI Unificada")

#### FASE 2 (Persistência)
- [ ] Seleção salva entre sessões
- [ ] Cada usuário tem suas preferências
- [ ] Load automático ao abrir página
- [ ] Save automático ao mudar seleção

#### FASE 2.5 (Grupos como Entidade)
- [ ] Grupos podem ser criados/editados/excluídos via Admin UI
- [ ] Uma enfermaria pode pertencer a múltiplos grupos
- [ ] Usuário pode alternar entre view "por grupos" e "individual"
- [ ] Seleção de grupo resolve automaticamente para IDs de enfermarias
- [ ] Grupos padrão são carregados automaticamente
- [ ] N8N recebe IDs corretos mesmo quando filtrado por grupo
- [ ] Migration automática de tags antigas para grupos novos

---

### ⚠️ Pontos de Atenção

1. **N8N Timeout:**
   - Múltiplas enfermarias podem aumentar tempo de resposta
   - Monitorar se precisa ajustar `TIMEOUT_NORMAL`/`TIMEOUT_FORCE`

2. **Cache do N8N:**
   - `flowId` muda com cada combinação de enfermarias
   - `"22-23"` ≠ `"22-23-24"` → caches separados

3. **Auto Sync:**
   - Decidir: sincroniza todas enfermarias ativas? Ou apenas as mais usadas?
   - Pode gerar carga no IAMSPE

4. **Validação:**
   - Garantir que `externalId` existe no IAMSPE
   - Enfermarias inativas não devem ser selecionáveis

5. **Performance:**
   - Muitas enfermarias = muitos pacientes = UI lenta
   - Considerar paginação ou virtualização

---

## 📊 Impacto Estimado

### Alterações de Código

| Tipo | Arquivos | Linhas | Complexidade |
|------|----------|--------|--------------|
| **Frontend** | 4 | ~200 | Média |
| **Backend** | 5 | ~120 | Média |
| **Database** | 2 | ~40 | Baixa |
| **Testes** | 3 | ~150 | Média |
| **TOTAL** | **14** | **~510** | **Média** |

### Tempo Estimado

| Fase | Desenvolvimento | Testes | Review | Total |
|------|----------------|--------|---------|-------|
| **Fase 1** (Filtro básico) | 2 dias | 1 dia | 0.5 dias | **3.5 dias** |
| **Fase 1.5** (Tags para grupos) | 0.5 dias | 0.5 dias | 0.25 dias | **1.25 dias** |
| **Fase 2** (Persistência) | 3 dias | 1 dia | 1 dia | **5 dias** |
| **Fase 2.5** (Grupos completos) | 3 dias | 1.5 dias | 1 dia | **5.5 dias** |
| **TOTAL** | **8.5 dias** | **4 dias** | **2.75 dias** | **15.25 dias** |

**Nota:** Fases podem ser implementadas independentemente conforme prioridade do negócio.

---

## 🔗 Referências

- **N8N Webhook Spec:** `/docs/N8N_WEBHOOK_SPECIFICATION.md`
- **Database Schema:** `/shared/schema.ts`
- **Current Implementation:** `/client/src/pages/shift-handover.tsx`
- **N8N Integration:** `/server/services/n8n-integration-service.ts`
- **Auto Sync:** `/server/services/auto-sync-scheduler-gpt4o.service.ts`

---

## 📝 Notas Finais

### Decisões Arquiteturais

1. **Por que não usar Redux/Context?**
   - Estado local é suficiente para este caso
   - Menos complexidade
   - Persistência via backend já resolve

2. **Por que não WebSocket?**
   - Polling atual funciona bem
   - Sync é manual/agendado, não real-time crítico
   - Evita complexidade adicional

3. **Por que validar no backend?**
   - Segurança: frontend é manipulável
   - Consistência: garante formato correto para N8N
   - Auditoria: log de requisições inválidas

### Próximos Passos Recomendados

1. ✅ **Aprovar esta análise** com stakeholders
2. ✅ **Validar com equipe N8N** se múltiplas enfermarias têm limitações
3. ✅ **Validar caso de uso de enfermarias virtuais** com coordenadores de enfermagem
4. ✅ **Mapear todas as enfermarias virtuais existentes** (quais são tratadas como unidade única?)
5. ✅ **Testar performance** com 5-10 enfermarias simultâneas
6. ✅ **Implementar Fase 1** (filtro básico)
7. ✅ **Implementar Fase 1.5** (tags de grupos) - se validado com usuários
8. ✅ **Coletar feedback** dos usuários
9. ✅ **Decidir sobre Fase 2** (persistência) baseado no feedback
10. ✅ **Decidir sobre Fase 2.5** (grupos completos) baseado na complexidade operacional

---

## 🎯 Resumo Executivo: Enfermarias Virtuais

### **Problema Identificado**
O sistema atual hardcoda `"22,23"` porque essas enfermarias operam como uma **unidade virtual única** na prática operacional. Ao tornar o filtro dinâmico, precisamos preservar essa lógica de agrupamento.

### **Impacto no Negócio**
- **Eficiência:** Equipes que cobrem múltiplas enfermarias precisam visualizá-las conjuntamente
- **Usabilidade:** Selecionar enfermarias individualmente toda vez é ineficiente
- **Flexibilidade:** Alguns turnos cobrem grupos diferentes (diurno vs. noturno)

### **Solução Proposta em 4 Fases**
1. **Fase 1:** Filtro dinâmico básico (3.5 dias)
2. **Fase 1.5:** Tags visuais de grupos (+ 1.25 dias)
3. **Fase 2:** Persistência de preferências (+ 5 dias)
4. **Fase 2.5:** Grupos como entidade completa (+ 5.5 dias)

### **Recomendação**
- **Implementar Fase 1 + 1.5 juntas** (~5 dias total)
- **Validar com usuários** se tags visuais são suficientes
- **Evoluir para Fase 2.5** apenas se necessário

### **Perguntas a Responder**
1. Quantas enfermarias virtuais existem além de "22,23"?
2. Uma enfermaria pode pertencer a múltiplos grupos?
3. Grupos mudam com frequência ou são estáveis?
4. Apenas admins gerenciam grupos ou cada usuário cria os seus?
5. Existem regras de permissão por enfermaria/grupo?

---

**Documento gerado em:** 13/01/2026
**Versão:** 2.0 (adicionado suporte a enfermarias virtuais)
**Autor:** Claude Code Analysis
