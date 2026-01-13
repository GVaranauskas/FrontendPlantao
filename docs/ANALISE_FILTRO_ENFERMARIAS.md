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

### Abordagem Recomendada

#### **Opção 1: Seletor Simples (Implementação Rápida)** ⭐ RECOMENDADO

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

### 🎯 Critérios de Sucesso

#### FASE 1 (Filtro Dinâmico)
- [ ] Usuário pode selecionar múltiplas enfermarias
- [ ] Apenas enfermarias ativas aparecem no seletor
- [ ] Sync manual usa enfermarias selecionadas
- [ ] N8N recebe IDs corretos
- [ ] Dados retornados estão filtrados corretamente
- [ ] Nenhum código hardcoded permanece

#### FASE 2 (Persistência)
- [ ] Seleção salva entre sessões
- [ ] Cada usuário tem suas preferências
- [ ] Load automático ao abrir página
- [ ] Save automático ao mudar seleção

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
| **Frontend** | 3 | ~150 | Média |
| **Backend** | 4 | ~80 | Baixa |
| **Database** | 1 | ~20 | Baixa |
| **Testes** | 2 | ~100 | Média |
| **TOTAL** | **10** | **~350** | **Média** |

### Tempo Estimado

| Fase | Desenvolvimento | Testes | Review | Total |
|------|----------------|--------|---------|-------|
| **Fase 1** | 2 dias | 1 dia | 0.5 dias | **3.5 dias** |
| **Fase 2** | 3 dias | 1 dia | 1 dia | **5 dias** |
| **TOTAL** | **5 dias** | **2 dias** | **1.5 dias** | **8.5 dias** |

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
3. ✅ **Testar performance** com 5-10 enfermarias simultâneas
4. ✅ **Implementar Fase 1** (filtro básico)
5. ✅ **Coletar feedback** dos usuários
6. ✅ **Decidir sobre Fase 2** (persistência) baseado no feedback

---

**Documento gerado em:** 13/01/2026
**Versão:** 1.0
**Autor:** Claude Code Analysis
