# Arquitetura do FrontendPlantao

## Visão Geral

FrontendPlantao é uma aplicação web para gerenciamento de passagem de plantão hospitalar, com análise clínica baseada em IA e sincronização com sistemas externos.

## Stack Tecnológico

### Frontend
- **Framework**: React 18.3 + TypeScript 5.6
- **Build**: Vite
- **Roteamento**: Wouter (lightweight router)
- **Estado Global**: TanStack React Query v5 + Context API
- **UI Components**: Radix UI + Tailwind CSS
- **Ícones**: Lucide React
- **Formulários**: React Hook Form + Zod validation

### Backend
- **Runtime**: Node.js + Express.js
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Autenticação**: JWT + Cookie sessions

## Estrutura de Pastas

```
FrontendPlantao/
├── client/src/
│   ├── components/        # Componentes React
│   │   ├── ui/           # Componentes Radix UI (Button, Card, etc)
│   │   └── [outros]      # Componentes específicos do domínio
│   ├── hooks/            # Custom Hooks reutilizáveis
│   │   ├── use-crud-mutation.ts    # Hook genérico para CRUD
│   │   ├── use-sync-data.ts        # Hook unificado de sincronização
│   │   ├── use-search.ts           # Hook de busca com memoização
│   │   ├── use-auto-sync.ts        # (DEPRECATED - usar use-sync-data)
│   │   └── use-sync-patient.ts     # (DEPRECATED - usar use-sync-data)
│   ├── lib/              # Utilitários e configurações
│   │   ├── queryClient.ts          # Configuração React Query
│   │   ├── auth-context.tsx        # Context de autenticação
│   │   └── utils.ts                # Funções utilitárias
│   ├── pages/            # Páginas da aplicação
│   ├── types/            # Tipos TypeScript compartilhados
│   │   └── index.ts                # Tipos centralizados
│   └── main.tsx
├── server/               # Backend Express.js
├── shared/
│   └── schema.ts         # Schemas Drizzle ORM
└── package.json
```

## Padrões de Código

### 1. Gerenciamento de Estado (React Query)

#### Tipos de Cache

Utilizamos três estratégias de cache baseadas na natureza dos dados:

```typescript
import { getQueryOptions } from "@/lib/queryClient";

// STATIC: Dados que raramente mudam (cache: 1 hora)
const { data: templates } = useQuery({
  queryKey: ["/api/templates"],
  ...getQueryOptions("static"),
});

// DYNAMIC: Dados que mudam, mas não em tempo real (cache: 30 segundos)
const { data: patients } = useQuery({
  queryKey: ["/api/patients"],
  ...getQueryOptions("dynamic"),
});

// REAL-TIME: Dados que precisam ser atualizados constantemente (refetch: 5s)
const { data: importStatus } = useQuery({
  queryKey: ["/api/import/status"],
  ...getQueryOptions("real-time"),
});
```

#### Queries por Tipo de Dado

| Endpoint | Tipo de Cache | Motivo |
|----------|---------------|--------|
| `/api/templates` | static | Templates raramente mudam |
| `/api/enfermarias` | static | Lista de enfermarias é estável |
| `/api/users` | static | Usuários não mudam frequentemente |
| `/api/patients` | dynamic | Pacientes são atualizados periodicamente |
| `/api/nursing-units` | dynamic | Unidades podem ser atualizadas |
| `/api/import/history` | dynamic | Histórico cresce mas não muda |
| `/api/import/status` | real-time | Status muda durante importação |
| `/api/nursing-unit-changes/count` | real-time | Contador de mudanças pendentes |

### 2. Mutações CRUD

**ANTES** (código duplicado em 9 arquivos):
```typescript
const createUserMutation = useMutation({
  mutationFn: async (data) => {
    return apiRequest("POST", "/api/users", data);
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    setIsDialogOpen(false);
    toast({ title: "Usuário criado!" });
  },
  onError: (error) => {
    toast({ title: "Erro", description: error.message, variant: "destructive" });
  },
});
```

**DEPOIS** (usando hook genérico):
```typescript
import { useCrudMutation } from "@/hooks/use-crud-mutation";

const createUser = useCrudMutation({
  endpoint: "/api/users",
  method: "POST",
  action: "criar",
  resourceName: "usuário",
  onSuccess: () => setIsDialogOpen(false),
});

// Uso: createUser.mutate(formData)
```

#### Variações de useCrudMutation

```typescript
// CREATE
const createItem = useCreateMutation({
  endpoint: "/api/items",
  resourceName: "item",
  onSuccess: () => setIsDialogOpen(false),
});

// UPDATE
const updateItem = useUpdateMutation({
  endpoint: "/api/items",
  resourceName: "item",
  invalidateQueries: ["/api/items", "/api/items/stats"],
});

// DELETE
const deleteItem = useDeleteMutation({
  endpoint: "/api/items",
  resourceName: "item",
  messages: {
    success: "Item removido permanentemente",
  },
});

// TOGGLE (ativar/desativar)
const toggleItem = useToggleMutation({
  endpoint: "/api/items/toggle",
  resourceName: "item",
  isActivating: true,
});
```

### 3. Sincronização de Dados

**ANTES** (3 implementações diferentes):
- `useAutoSync` - sincronização automática de todas unidades
- `useSyncPatient` - sincronização de paciente individual
- Lógica manual no `shift-handover.tsx`

**DEPOIS** (hook unificado):
```typescript
import { useSyncData } from "@/hooks/use-sync-data";

// Sincronização automática de todas unidades
const { isSyncing, triggerSync, lastSyncTimeAgo } = useSyncData({
  endpoint: "/api/sync/evolucoes",
  scope: "all",
  autoSync: true,
  syncInterval: 900000, // 15 minutos
  runOnMount: true,
});

// Sincronização manual de um paciente
const { syncSingle } = useSyncData({
  endpoint: "/api/sync/patient",
  scope: "single",
  messages: { success: "Paciente sincronizado" },
});

// Uso: syncSingle?.mutate("123")

// Sincronização de múltiplos pacientes
const { syncMultiple } = useSyncData({
  endpoint: "/api/sync/patients",
  scope: "multiple",
});

// Uso: syncMultiple?.mutate(["123", "456"])
```

### 4. Busca e Filtragem

**ANTES** (sem memoização - re-calcula a cada render):
```typescript
const filteredPatients = patients?.filter(p =>
  p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
  p.leito.includes(searchTerm)
).sort((a, b) => a.leito.localeCompare(b.leito)) || [];
```

**DEPOIS** (com memoização):
```typescript
import { useSearchWithSort } from "@/hooks/use-search";

const {
  filtered: filteredPatients,
  searchTerm,
  setSearchTerm,
  sortBy,
  toggleSort,
} = useSearchWithSort({
  items: patients || [],
  searchFields: ["nome", "leito", "diagnostico"],
  initialSortBy: "leito",
  initialSortDirection: "asc",
});
```

#### Variações de useSearch

```typescript
// Busca simples
const { filtered, searchTerm, setSearchTerm } = useSearch({
  items: patients,
  searchFields: ["nome", "leito"],
});

// Busca normalizada (remove acentos automaticamente)
const { filtered } = useNormalizedSearch({
  items: patients,
  searchFields: ["nome", "diagnostico"],
});
// "jose" encontra "José"

// Busca com múltiplos filtros
const { filtered, setFilter, clearAllFilters } = useMultiFilter({
  items: patients,
  searchFields: ["nome", "leito"],
  filters: { status: "ativo", nivel_alerta: "VERMELHO" },
});
```

### 5. Tipos Compartilhados

Todos os tipos estão centralizados em `client/src/types/index.ts`:

```typescript
import type {
  Patient,
  Alert,
  ClinicalInsights,
  ImportResponse,
  Enfermaria,
  NursingTemplate,
  // ... e mais
} from "@/types";
```

**Benefícios**:
- Elimina duplicação de interfaces
- Mantém consistência de tipos
- Facilita refatoração
- Autocomplete melhorado

## Otimizações de Performance

### 1. Memoização com useMemo

Use `useMemo` para cálculos pesados que dependem de props/state:

```typescript
const filteredData = useMemo(() => {
  return data.filter(/* ... */).sort(/* ... */);
}, [data, filters, sortBy]);
```

**Quando usar**:
- Filtragem/ordenação de arrays grandes (>100 itens)
- Cálculos complexos (estatísticas, agregações)
- Transformações de dados

**Quando NÃO usar**:
- Operações triviais (ler uma propriedade)
- Arrays pequenos (<20 itens)
- Valores primitivos

### 2. Evitar Re-renders

```typescript
// ❌ RUIM: Re-cria função a cada render
<Button onClick={() => handleClick(id)}>

// ✅ BOM: Usa useCallback
const handleClick = useCallback((id: string) => {
  // ...
}, [dependencies]);

<Button onClick={handleClick}>
```

### 3. Code Splitting

Para componentes grandes, use lazy loading:

```typescript
import { lazy, Suspense } from "react";

const AdminPanel = lazy(() => import("./pages/admin-panel"));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <AdminPanel />
    </Suspense>
  );
}
```

## Padrões de Componentes

### 1. Componentes de Página

Localização: `client/src/pages/`

**Responsabilidades**:
- Carregar dados (useQuery)
- Gerenciar estado da página
- Coordenar componentes filhos
- **NÃO** conter lógica de negócio complexa

**Tamanho máximo recomendado**: 400 linhas

### 2. Componentes de Domínio

Localização: `client/src/components/`

**Responsabilidades**:
- Lógica de negócio específica
- Interações complexas
- Podem ter estado interno

**Exemplo**: `ImportEvolucoes.tsx`, `print-shift-handover.tsx`

### 3. Componentes UI

Localização: `client/src/components/ui/`

**Responsabilidades**:
- Componentes visuais reutilizáveis
- Baseados em Radix UI
- **NÃO** devem ter lógica de negócio

## Guia de Migração

### Migrar para useCrudMutation

**Antes**:
```typescript
const createMutation = useMutation({
  mutationFn: async (data) => apiRequest("POST", "/api/items", data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["/api/items"] });
    toast({ title: "Criado!" });
  },
});
```

**Depois**:
```typescript
import { useCreateMutation } from "@/hooks/use-crud-mutation";

const createItem = useCreateMutation({
  endpoint: "/api/items",
  resourceName: "item",
});
```

### Migrar para useSyncData

**Antes**:
```typescript
const { syncSinglePatient } = useSyncPatient();
```

**Depois**:
```typescript
const { syncSingle } = useSyncData({
  endpoint: "/api/sync/patient",
  scope: "single",
});

// Uso: syncSingle?.mutate(leito)
```

### Aplicar getQueryOptions

**Antes**:
```typescript
const { data: templates } = useQuery({
  queryKey: ["/api/templates"],
  refetchInterval: 30000, // ❌ Hardcoded
});
```

**Depois**:
```typescript
import { getQueryOptions } from "@/lib/queryClient";

const { data: templates } = useQuery({
  queryKey: ["/api/templates"],
  ...getQueryOptions("static"), // ✅ Configuração contextual
});
```

## Convenções de Nomenclatura

### Arquivos
- Componentes: `PascalCase.tsx` (ex: `ImportEvolucoes.tsx`)
- Hooks: `kebab-case.ts` (ex: `use-crud-mutation.ts`)
- Utilitários: `kebab-case.ts` (ex: `export-to-excel.ts`)
- Páginas: `kebab-case.tsx` (ex: `shift-handover.tsx`)

### Código
- Componentes: `PascalCase` (ex: `PatientList`)
- Hooks: `camelCase` com prefixo `use` (ex: `useCrudMutation`)
- Funções: `camelCase` (ex: `handleSubmit`)
- Constantes: `UPPER_SNAKE_CASE` (ex: `API_BASE_URL`)
- Tipos/Interfaces: `PascalCase` (ex: `ClinicalInsights`)

### React Query
- Query keys: array de strings (ex: `["/api/patients"]`)
- Mutations: sufixo `Mutation` ou usar hook genérico
- Invalidate: sempre usar `queryClient.invalidateQueries`

## Tratamento de Erros

### API Requests

```typescript
try {
  const response = await apiRequest("POST", "/api/endpoint", data);
  const result = await response.json();
  // ...
} catch (error) {
  toast({
    title: "Erro",
    description: error instanceof Error ? error.message : "Erro desconhecido",
    variant: "destructive",
  });
}
```

### Mutations

Use o hook genérico que já trata erros:

```typescript
const createItem = useCrudMutation({
  endpoint: "/api/items",
  resourceName: "item",
  onError: (error) => {
    // Tratamento adicional se necessário
    console.error("Erro customizado:", error);
  },
});
```

## Autenticação

### Context de Autenticação

```typescript
import { useAuth } from "@/lib/auth-context";

function MyComponent() {
  const { user, isLoading, logout } = useAuth();

  if (isLoading) return <Loading />;
  if (!user) return <Login />;

  return <div>Olá, {user.name}</div>;
}
```

### Rotas Protegidas

```typescript
import { ProtectedRoute } from "@/lib/auth-context";

<Route path="/admin">
  <ProtectedRoute requiredRole="admin">
    <AdminPage />
  </ProtectedRoute>
</Route>
```

## Boas Práticas

### 1. ✅ DOs

- Use hooks genéricos para evitar duplicação
- Aplique memoização em filtros/ordenações
- Centralize tipos em `types/index.ts`
- Use `getQueryOptions()` para configurar cache
- Mantenha componentes <400 linhas
- Escreva comentários em português
- Extraia lógica complexa em custom hooks

### 2. ❌ DON'Ts

- Não hardcode `refetchInterval` ou `staleTime`
- Não duplique interfaces entre arquivos
- Não crie mutações manualmente (use `useCrudMutation`)
- Não use `any` sem motivo (prefira tipos específicos)
- Não use timeouts aninhados para polling
- Não faça fetch manual (use `apiRequest` ou React Query)

## Estrutura de Dados (Database)

### Tabelas Principais

- `users` - Usuários do sistema
- `patients` - Pacientes e evoluções
- `nursing_units` - Enfermarias/Unidades de Internação
- `nursing_unit_templates` - Templates de campos personalizados
- `import_history` - Histórico de importações
- `audit_log` - Log de auditoria

### Campos JSONB

Alguns campos usam JSONB para flexibilidade:

```typescript
// patients.clinical_insights
interface ClinicalInsights {
  timestamp: string;
  nivel_alerta: "VERMELHO" | "AMARELO" | "VERDE";
  principais_alertas: ClinicalAlert[];
  recomendacoes_enfermagem: string[];
  // ...
}

// patients.dados_brutos_json
// Armazena resposta completa da API externa N8N
```

## Roadmap e Evoluções Futuras

### Planejado para Implementação

1. **Sistema de Comentários/Evoluções**
   - Nova tabela `patient_comments`
   - Campos: `patient_id`, `comment_text`, `created_by`, `created_at`, `edited_by`, `edited_at`
   - Auditoria completa de quem criou/editou

2. **Sistema de Alertas Configuráveis**
   - Tabela `alert_configurations`
   - Permitir configurar alertas por:
     - Tipo de risco (queda, lesão, infecção)
     - Níveis de Braden
     - Dias de internação
     - Dispositivos específicos

3. **Relatórios e Analytics Avançados**
   - Dashboard com gráficos de tendência
   - Indicadores de qualidade por período
   - Comparação entre enfermarias

4. **Notificações em Tempo Real**
   - WebSocket ou Server-Sent Events
   - Alertas push quando paciente crítico

## Recursos Adicionais

### Documentação de Bibliotecas

- [React Query](https://tanstack.com/query/latest/docs/react/overview)
- [Radix UI](https://www.radix-ui.com/primitives/docs/overview/introduction)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Drizzle ORM](https://orm.drizzle.team/docs/overview)
- [Wouter](https://github.com/molefrog/wouter)

### Análise de Performance

Use React DevTools Profiler para identificar:
- Componentes que re-renderizam frequentemente
- Renders caros
- Oportunidades de memoização

---

**Última atualização**: 2026-01-07
**Versão**: 1.0.0
