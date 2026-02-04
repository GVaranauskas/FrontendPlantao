---
name: 11care-patient-fields
description: Guia completo para adicionar novos campos de pacientes no 11Care. Use quando precisar criar campos no schema, histórico, mapeamento N8N, auditoria ou storage.
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
| 4 | `server/repositories/postgres-storage.ts` | ⚠️ Se lógica especial | Métodos de CRUD se necessário |
| 5 | `server/repositories/memory-storage.ts` | ⚠️ Se lógica especial | Espelho do postgres-storage |
| 6 | Frontend components | ⚠️ Se exibir | Componentes que exibem o campo |

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

O mapeamento acontece no método `processEvolucoesData()`:

```typescript
// Encontre o objeto dadosProcessados (~linha 140)
let dadosProcessados: InsertPatient = {
  // ... campos existentes ...
  
  // ADICIONE O MAPEAMENTO
  // Use o nome do campo como vem do N8N (dadosBrutos.nomeCampoN8N)
  novoNomeCampo: dadosBrutos.nomeCampoN8N || "",
  
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

## 4. Auditoria (AUTOMÁTICA)

### Campos de Notas - Auditoria Completa

O sistema já possui auditoria completa para notas de pacientes via `patientNoteEvents`:
- CREATE, UPDATE, DELETE são rastreados automaticamente
- Valores são criptografados com AES-256-GCM
- Performer/target user são registrados

### Outros Campos - Sem Auditoria Automática

Campos regulares **NÃO** têm auditoria automática. Se precisar auditar mudanças:

1. Use o `AuditService` para registrar eventos:
```typescript
import { auditService } from './services/audit.service';

// Registrar mudança de campo
await auditService.logEvent({
  action: 'PATIENT_FIELD_UPDATED',
  resource: 'patients',
  resourceId: patient.id,
  userId: user.id,
  userName: user.name,
  userRole: user.role,
  details: {
    field: 'novoNomeCampo',
    oldValue: valorAntigo,
    newValue: valorNovo
  }
});
```

## 5. Migração do Banco de Dados

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

## 6. Frontend (SE EXIBIR)

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

### 3. N8N Mapping (se vem da API)
```typescript
let dadosProcessados: InsertPatient = {
  // ... outros campos ...
  tipoSanguineo: dadosBrutos.tipoSanguineo || "",
};
```

### 4. Frontend
```tsx
<div className="space-y-2">
  <Label>Tipo Sanguíneo</Label>
  <Badge variant="outline">{patient.tipoSanguineo || "Não informado"}</Badge>
</div>
```

### 5. Migração
```bash
npm run db:push
```

## Campos Existentes para Referência

### Campos de Identificação
- `id` (UUID, PK)
- `leito` (único)
- `nome`
- `registro` (PT)
- `codigoAtendimento` (AT, único)

### Campos Clínicos
- `braden`, `diagnostico`, `alergias`, `mobilidade`, `dieta`
- `eliminacoes`, `dispositivos`, `atb`, `curativos`
- `aporteSaturacao`, `exames`, `cirurgia`, `observacoes`
- `previsaoAlta`, `alerta`, `status`

### Campos N8N
- `idEvolucao`, `dsEnfermaria`, `dsLeitoCompleto`
- `dsEspecialidade`, `dsEvolucaoCompleta`, `dhCriacaoEvolucao`
- `fonteDados`, `dadosBrutosJson`, `importedAt`

### Campos de IA
- `clinicalInsights` (JSONB)
- `clinicalInsightsUpdatedAt`

### Campos de Notas
- `notasPaciente`, `notasUpdatedAt`, `notasUpdatedBy`
- `notasCreatedAt`, `notasCreatedBy`

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
- Verifique o mapeamento em `n8n-integration-service.ts`
- Confirme o nome exato do campo na resposta da API
- Adicione log para debugar: `console.log(dadosBrutos)`
