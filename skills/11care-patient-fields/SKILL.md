---
name: 11care-patient-fields
description: Guia completo para adicionar novos campos de pacientes no 11Care. Use quando precisar criar campos no schema, histórico, mapeamento N8N, criptografia LGPD, auditoria ou storage.
---

# Adicionar Campos de Pacientes - 11Care

Este guia documenta o processo completo para adicionar novos campos à entidade Patient no sistema 11Care.

## Checklist de Arquivos

Ao adicionar um novo campo de paciente, você **DEVE** atualizar os seguintes arquivos:

| # | Arquivo | Obrigatório | Descrição |
|---|---------|-------------|-----------|
| 1 | `shared/schema.ts` | ✅ SIM | Tabela `patients` - definição do campo |
| 2 | `shared/schema.ts` | ⚠️ Se importante | Tabela `patientsHistory` - para preservar no histórico |
| 3 | `server/services/n8n-integration-service.ts` | ⚠️ Se vem do N8N | Mapeamento do campo da API |
| 4 | `server/services/encryption.service.ts` | ⚠️ Se sensível (LGPD) | Adicionar ao `SENSITIVE_PATIENT_FIELDS` |
| 5 | `server/repositories/postgres-storage.ts` | ⚠️ Se lógica especial | Métodos de CRUD se necessário |
| 6 | `server/repositories/memory-storage.ts` | ⚠️ Se lógica especial | Espelho do postgres-storage |
| 7 | Frontend components | ⚠️ Se exibir | Componentes que exibem o campo |

## 1. Adicionar Campo no Schema (OBRIGATÓRIO)

### Localização: `shared/schema.ts`

```typescript
// Encontre a tabela patients (linha ~23)
export const patients = pgTable("patients", {
  // ... campos existentes ...
  
  // ADICIONE SEU CAMPO AQUI
  // Padrão: nome em camelCase, coluna em snake_case
  novoNomeCampo: text("novo_nome_campo"),
  
  // Se for campo obrigatório:
  campoObrigatorio: text("campo_obrigatorio").notNull(),
  
  // Se tiver valor padrão:
  campoComDefault: text("campo_com_default").default("valor"),
  
  // Se for número:
  campoNumerico: integer("campo_numerico"),
  
  // Se for booleano:
  campoBooleano: boolean("campo_booleano").default(false),
  
  // Se for JSON complexo:
  campoJson: jsonb("campo_json"),
  
  // Se for timestamp:
  campoData: timestamp("campo_data"),
  
  // Se for referência a usuário:
  campoUserId: varchar("campo_user_id").references(() => users.id),
});
```

### Tipos Automáticos

Os tipos `Patient` e `InsertPatient` são inferidos automaticamente do schema:
```typescript
export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;
```

## 2. Adicionar ao Histórico (SE IMPORTANTE)

### Quando Adicionar ao Histórico?
- Dados clínicos importantes
- Informações de identificação
- Dados que precisam ser preservados após alta/transferência

### Localização: `shared/schema.ts` - tabela `patientsHistory`

```typescript
// Encontre a tabela patientsHistory (linha ~423)
export const patientsHistory = pgTable("patients_history", {
  // ... campos existentes ...
  
  // ADICIONE SE O CAMPO FOR IMPORTANTE PARA HISTÓRICO
  novoNomeCampo: text("novo_nome_campo"),
});
```

**NOTA:** O campo `dadosCompletos` (JSONB) já armazena snapshot completo do paciente. Adicione campos explícitos apenas se precisar fazer queries diretas neles.

## 3. Mapeamento N8N (SE CAMPO VEM DA API)

### Localização: `server/services/n8n-integration-service.ts`

O mapeamento acontece no método `processEvolucao()` (linha ~130):

> **ATENÇÃO**: Campos N8N podem chegar como **arrays** em vez de strings (ex: `["valor1", "valor2"]`).
> O fallback `|| ""` NÃO detecta arrays (são truthy) e causa exceção ao chamar `.trim()`.
> **SEMPRE** use `ensureString()` em vez de `|| ""` para campos vindos do N8N.

```typescript
// Helper disponível em n8n-integration-service.ts
function ensureString(value: any): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.filter(Boolean).join("; ");
  return String(value);
}

// Dentro do método processEvolucao(dadosBrutos: N8NRawData)
// Encontre o objeto dadosProcessados (~linha 140)
let dadosProcessados: InsertPatient = {
  // ... campos existentes ...
  
  // ADICIONE O MAPEAMENTO
  // Use ensureString() para campos N8N (NUNCA use || "")
  novoNomeCampo: ensureString(dadosBrutos.nomeCampoN8N),
  
  // Se precisar de transformação:
  campoTransformado: this.transformarCampo(dadosBrutos.campoOriginal),
};
```

### Campos Disponíveis do N8N

Campos já mapeados que vêm da API:
- `dadosBrutos.id` → idEvolucao
- `dadosBrutos.nomePaciente` → nome, registro (PT), codigoAtendimento (AT)
- `dadosBrutos.dsLeito` → leito, dsLeitoCompleto
- `dadosBrutos.dsEnfermaria` → dsEnfermaria
- `dadosBrutos.dsEpecialid` → especialidadeRamal, dsEspecialidade
- `dadosBrutos.dataNascimento` → dataNascimento, idade (calculado)
- `dadosBrutos.sexo` → sexo
- `dadosBrutos.dataInternacao` → dataInternacao
- `dadosBrutos.dhCriacao` → dhCriacaoEvolucao
- Campos clínicos: braden, diagnostico, alergias, mobilidade, dieta, eliminacoes, dispositivos, atb, curativos, aporteSaturacao, exames, cirurgia, observacoes, previsaoAlta

Para adicionar novo campo da API, você também pode precisar atualizar o `formJsonObject` no método `fetchEvolucoes()` para solicitar o campo ao N8N.

## 4. Criptografia LGPD (SE CAMPO SENSÍVEL)

### IMPORTANTE: Campos com dados pessoais ou clínicos DEVEM ser criptografados!

### Localização: `server/services/encryption.service.ts`

```typescript
// Encontre o array SENSITIVE_PATIENT_FIELDS (linha ~143)
export const SENSITIVE_PATIENT_FIELDS = [
  'nome',
  'registro', 
  'dataNascimento',
  'diagnostico',
  'alergias',
  'observacoes',
  'dsEvolucaoCompleta',
  'dadosBrutosJson',
  'clinicalInsights',
  
  // ADICIONE AQUI SE O CAMPO FOR SENSÍVEL
  'novoNomeCampo',  // ← Adicionar se contém dados pessoais/clínicos
] as const;
```

### Quando um campo é considerado sensível (LGPD)?
- Dados pessoais identificáveis (nome, CPF, registro)
- Dados de saúde (diagnóstico, alergias, procedimentos)
- Dados biométricos ou genéticos
- Informações clínicas em geral

**NOTA:** A criptografia/descriptografia é automática no `postgres-storage.ts` para todos os campos listados em `SENSITIVE_PATIENT_FIELDS`.

## 5. Auditoria (QUANDO NECESSÁRIO)

### Campos de Notas - Auditoria Completa Automática

O sistema já possui auditoria completa para notas de pacientes via `patientNoteEvents`:
- CREATE, UPDATE, DELETE são rastreados automaticamente
- Valores são criptografados com AES-256-GCM
- Performer/target user são registrados

### Outros Campos - Auditoria Manual

Campos regulares **NÃO** têm auditoria automática. Se precisar auditar mudanças, use o `AuditService`:

```typescript
import { auditService } from '../services/audit.service';

// Registrar mudança de campo via API
await auditService.log({
  user: { id: user.id, name: user.name, role: user.role },
  action: 'UPDATE',
  resource: 'patients',
  resourceId: patient.id,
  changes: {
    before: { novoNomeCampo: valorAntigo },
    after: { novoNomeCampo: valorNovo }
  },
  metadata: { reason: 'Atualização manual' },
  req: req,  // Request do Express
  statusCode: 200,
  startTime: Date.now()
});

// Para eventos de sistema (sem usuário)
await auditService.logSystem({
  action: 'SYNC_COMPLETED',
  resource: 'patients',
  resourceId: patient.id,
  changes: { field: 'novoNomeCampo', oldValue, newValue },
  metadata: { source: 'N8N' }
});
```

### Actions de Audit Válidas

```typescript
type AuditAction = 
  | 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' 
  | 'LOGIN' | 'LOGOUT' 
  | 'EXPORT' | 'IMPORT'
  | 'PATIENT_ARCHIVED' | 'PATIENT_REACTIVATED' | 'BED_CONFLICT'
  | 'SHIFT_HANDOVER_VIEW' | 'SHIFT_HANDOVER_PRINT'
  | 'SYNC_STARTED' | 'SYNC_COMPLETED';
```

## 6. Migração do Banco de Dados

### Opção A: Drizzle Push (Desenvolvimento)
```bash
npm run db:push
```

### Opção B: Migração Manual (Produção)
```sql
-- Adicionar coluna
ALTER TABLE patients ADD COLUMN novo_nome_campo TEXT;

-- Se for obrigatório, adicione valor default primeiro
ALTER TABLE patients ADD COLUMN campo_obrigatorio TEXT DEFAULT '';
UPDATE patients SET campo_obrigatorio = 'valor' WHERE campo_obrigatorio IS NULL;
ALTER TABLE patients ALTER COLUMN campo_obrigatorio SET NOT NULL;

-- Se precisar no histórico também
ALTER TABLE patients_history ADD COLUMN novo_nome_campo TEXT;
```

## 7. Frontend (SE EXIBIR)

### Componentes Principais

| Componente | Caminho | Descrição |
|------------|---------|-----------|
| PatientDetailsModal | `client/src/components/shift-handover/PatientDetailsModal.tsx` | Modal de detalhes |
| PatientTable | `client/src/components/shift-handover/PatientTable.tsx` | Tabela de pacientes |
| PrintableHandover | `client/src/components/shift-handover/PrintableHandover.tsx` | Versão impressa |

### Exemplo de Exibição
```tsx
// No PatientDetailsModal.tsx
<div className="space-y-2">
  <Label>Novo Campo</Label>
  <p className="text-sm text-muted-foreground break-all">
    {patient.novoNomeCampo || "Não informado"}
  </p>
</div>
```

## Padrões de Nomenclatura

| Contexto | Padrão | Exemplo |
|----------|--------|---------|
| TypeScript | camelCase | `novoNomeCampo` |
| Coluna DB | snake_case | `novo_nome_campo` |
| API N8N | camelCase (geralmente) | `novoCampo` |
| Label UI | Texto normal | "Novo Campo" |

## Exemplo Completo: Adicionar Campo "Tipo Sanguíneo"

### 1. Schema (`shared/schema.ts`)
```typescript
export const patients = pgTable("patients", {
  // ... outros campos ...
  tipoSanguineo: text("tipo_sanguineo"),
});
```

### 2. Histórico (se importante)
```typescript
export const patientsHistory = pgTable("patients_history", {
  // ... outros campos ...
  tipoSanguineo: text("tipo_sanguineo"),
});
```

### 3. Criptografia (se sensível - dados de saúde)
```typescript
// server/services/encryption.service.ts
export const SENSITIVE_PATIENT_FIELDS = [
  // ... outros campos ...
  'tipoSanguineo',  // Dado de saúde = sensível
] as const;
```

### 4. N8N Mapping (se vem da API)
```typescript
// server/services/n8n-integration-service.ts - método processEvolucao()
let dadosProcessados: InsertPatient = {
  // ... outros campos ...
  tipoSanguineo: dadosBrutos.tipoSanguineo || "",
};
```

### 5. Frontend
```tsx
<div className="space-y-2">
  <Label>Tipo Sanguíneo</Label>
  <Badge variant="outline">{patient.tipoSanguineo || "Não informado"}</Badge>
</div>
```

### 6. Migração
```bash
npm run db:push
```

## Campos Existentes para Referência

### Campos de Identificação
- `id` (UUID, PK)
- `leito` (único)
- `nome` 🔒
- `registro` (PT) 🔒
- `codigoAtendimento` (AT, único)

### Campos Clínicos 🔒
- `braden`, `diagnostico`, `alergias`, `mobilidade`, `dieta`
- `eliminacoes`, `dispositivos`, `atb`, `curativos`
- `aporteSaturacao`, `exames`, `cirurgia`, `observacoes`
- `previsaoAlta`, `alerta`, `status`

### Campos N8N
- `idEvolucao`, `dsEnfermaria`, `dsLeitoCompleto`
- `dsEspecialidade`, `dsEvolucaoCompleta` 🔒, `dhCriacaoEvolucao`
- `fonteDados`, `dadosBrutosJson` 🔒, `importedAt`

### Campos de IA
- `clinicalInsights` 🔒 (JSONB)
- `clinicalInsightsUpdatedAt`

### Campos de Notas
- `notasPaciente`, `notasUpdatedAt`, `notasUpdatedBy`
- `notasCreatedAt`, `notasCreatedBy`

🔒 = Campo criptografado (presente em SENSITIVE_PATIENT_FIELDS)

## Troubleshooting

### Erro: "column does not exist"
- Execute `npm run db:push` para sincronizar schema
- Ou execute migração SQL manualmente

### Erro: "null value in column X violates not-null constraint"
- Adicione `.default("")` ou `.notNull()` com valor default
- Ou não use `.notNull()` para campos opcionais

### Campo não aparece no histórico
- Verifique se o campo existe em `patientsHistory`
- O snapshot em `dadosCompletos` captura todos os campos automaticamente

### Campo não vem do N8N
- Verifique o mapeamento em `n8n-integration-service.ts` método `processEvolucao()`
- Confirme o nome exato do campo na resposta da API
- Adicione log para debugar: `console.log(dadosBrutos)`

### Campo sensível não está sendo criptografado
- Adicione o nome do campo ao array `SENSITIVE_PATIENT_FIELDS` em `encryption.service.ts`
- A criptografia é automática após adicionar ao array

### Campo N8N vem como array em vez de string
- **Sintoma**: Paciente é excluído silenciosamente do sync (0 chaves no objeto processado)
- **Causa**: N8N envia campo como array (ex: `["valor1", "valor2"]`) em vez de string
- **Diagnóstico**: Adicione log antes do processamento: `console.log(typeof dadosBrutos.nomeCampo, dadosBrutos.nomeCampo)`
- **Solução**: Use `ensureString(dadosBrutos.nomeCampo)` em vez de `dadosBrutos.nomeCampo || ""`
- **Referência**: Bug corrigido em v1.5.9.5 - ver `ensureString()` em `n8n-integration-service.ts`
