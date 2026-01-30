# Arquitetura do Sistema

Documentação completa da arquitetura do **11Care Nursing Platform**.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Arquitetura Frontend](#arquitetura-frontend)
- [Arquitetura Backend](#arquitetura-backend)
- [Banco de Dados](#banco-de-dados)
- [Fluxo de Dados](#fluxo-de-dados)
- [Integração N8N](#integração-n8n)
- [Sistema de IA](#sistema-de-ia)
- [Segurança](#segurança)
- [Decisões Arquiteturais](#decisões-arquiteturais)
- [Sistema de Analytics de Uso](#sistema-de-analytics-de-uso)

## 🎯 Visão Geral

### Propósito

Sistema de gestão hospitalar focado em **passagem de plantão de enfermagem** utilizando metodologia SBAR (Situation, Background, Assessment, Recommendation), com análise clínica assistida por IA.

### Stack Tecnológico

```
┌─────────────────────────────────────────────┐
│              Frontend (React)                │
│  React 18 + TypeScript + Tailwind + Vite   │
└─────────────────┬───────────────────────────┘
                  │ HTTP/REST + WebSocket
┌─────────────────▼───────────────────────────┐
│              Backend (Express)               │
│    Node.js + TypeScript + Express.js        │
└─────────────────┬───────────────────────────┘
                  │
      ┌───────────┼───────────┐
      │           │           │
┌─────▼─────┐ ┌──▼───┐ ┌────▼─────┐
│PostgreSQL │ │  IA  │ │   N8N    │
│ (Neon DB) │ │ APIs │ │ Webhook  │
└───────────┘ └──────┘ └──────────┘
```

### Características

- **Monorepo** com código compartilhado
- **TypeScript fullstack** com ESM modules
- **RESTful API** com autenticação JWT
- **Real-time** via WebSocket
- **LGPD compliant** (criptografia + auditoria)
- **IA multi-camada** (economia 99.8%)

## 📁 Estrutura do Projeto

```
FrontendPlantao/
│
├── client/                      # Frontend React
│   ├── public/                 # Assets estáticos
│   │   ├── 11care-logo.svg
│   │   └── ...
│   │
│   └── src/
│       ├── components/         # Componentes React
│       │   ├── ui/            # Componentes base (Radix UI)
│       │   ├── layout/        # Layouts
│       │   └── shift-handover/ # Componentes de domínio
│       │
│       ├── hooks/             # Custom hooks
│       │   ├── use-auto-sync.ts
│       │   ├── use-search-filter.ts
│       │   └── ...
│       │
│       ├── lib/               # Utilitários
│       │   ├── queryClient.ts
│       │   └── utils.ts
│       │
│       ├── pages/             # Páginas da aplicação
│       │   ├── login.tsx
│       │   ├── shift-handover.tsx
│       │   └── ...
│       │
│       ├── services/          # Camada de serviços
│       │   ├── api.service.ts
│       │   ├── patients.service.ts
│       │   └── ...
│       │
│       ├── types/             # TypeScript types
│       │   └── index.ts
│       │
│       ├── App.tsx            # Componente raiz
│       ├── main.tsx           # Entry point
│       └── index.css          # Estilos globais
│
├── server/                      # Backend Node.js
│   ├── config/                 # Configurações
│   │   └── env.ts             # Validação de env vars
│   │
│   ├── lib/                   # Bibliotecas core
│   │   ├── database.ts        # Cliente Drizzle
│   │   └── logger.ts          # Winston logger
│   │
│   ├── middleware/            # Middlewares Express
│   │   ├── auth.ts           # Autenticação JWT
│   │   ├── rbac.ts           # Controle de acesso
│   │   ├── csrf.ts           # Proteção CSRF
│   │   └── audit.ts          # Auditoria LGPD
│   │
│   ├── repositories/          # Camada de dados
│   │   ├── postgres-storage.ts
│   │   └── memory-storage.ts
│   │
│   ├── routes/                # Rotas da API
│   │   ├── auth.ts
│   │   ├── users.ts
│   │   └── ...
│   │
│   ├── scripts/               # Scripts utilitários
│   │   └── seed.ts
│   │
│   ├── security/              # Segurança
│   │   └── jwt.ts
│   │
│   ├── services/              # Lógica de negócio
│   │   ├── ai-service-gpt4o-mini.ts
│   │   ├── encryption.service.ts
│   │   ├── n8n-integration-service.ts
│   │   └── ...
│   │
│   └── index.ts               # Entry point
│
├── shared/                      # Código compartilhado
│   └── schema.ts               # Schema Drizzle + Zod
│
├── docs/                        # Documentação
│   ├── N8N_WEBHOOK_SPECIFICATION.md
│   └── ...
│
├── CONTRIBUTING.md             # Guia de contribuição
├── ARCHITECTURE.md             # Este arquivo
├── SECURITY.md                 # Segurança e LGPD
├── API.md                      # Documentação da API
├── DEVELOPMENT.md              # Setup local
├── AI_INTEGRATION.md           # Sistema de IA
├── TESTING.md                  # Estratégia de testes
└── CHANGELOG.md                # Histórico de versões
```

## ⚛️ Arquitetura Frontend

### Camadas

```
┌─────────────────────────────────────┐
│           Pages (Rotas)             │  ← Páginas da aplicação
├─────────────────────────────────────┤
│     Components (UI + Domain)        │  ← Componentes reutilizáveis
├─────────────────────────────────────┤
│          Custom Hooks               │  ← Lógica de estado
├─────────────────────────────────────┤
│         Services Layer              │  ← Comunicação com API
├─────────────────────────────────────┤
│    TanStack Query (Cache)           │  ← Gerenciamento de estado servidor
└─────────────────────────────────────┘
```

### Roteamento

**Wouter** (alternativa leve ao React Router):

```typescript
// App.tsx
<Route path="/login" component={LoginPage} />
<Route path="/dashboard" component={DashboardPage} />
<Route path="/shift-handover" component={ShiftHandoverPage} />
<Route path="/admin/*" component={AdminRoutes} />
```

### Gerenciamento de Estado

#### Estado do Servidor (TanStack Query)

```typescript
// Exemplo: hooks/use-patients.ts
export function usePatients() {
  return useQuery({
    queryKey: ['patients'],
    queryFn: () => patientsService.getAll(),
    refetchInterval: 60000, // Auto-sync a cada 1 min
  });
}
```

**Vantagens**:
- Cache automático
- Refetch strategies
- Optimistic updates
- Loading/error states

#### Estado Local (React Hooks)

```typescript
// Exemplo: Formulários com React Hook Form
const form = useForm<FormData>({
  resolver: zodResolver(formSchema),
});
```

### Services Layer

Abstração para comunicação com API:

```typescript
// services/api.service.ts
export class ApiService<T> {
  async getAll(): Promise<T[]> { ... }
  async getById(id: number): Promise<T> { ... }
  async create(data: Partial<T>): Promise<T> { ... }
  async update(id: number, data: Partial<T>): Promise<T> { ... }
  async delete(id: number): Promise<void> { ... }
}

// services/patients.service.ts
export const patientsService = new ApiService<Patient>('/api/patients');
```

### Componentes

#### Atomic Design Pattern

```
Atoms (ui/)
  ├── Button, Input, Label
  └── Badge, Tooltip, Skeleton

Molecules (components/)
  ├── SearchFilterBar
  └── StatsCards

Organisms (components/)
  ├── PatientTable
  └── PatientDetailsModal

Pages (pages/)
  └── ShiftHandoverPage
```

#### Design System

Baseado em **Radix UI** + **Tailwind CSS**:

- Componentes acessíveis (ARIA)
- Não estilizados (customizáveis)
- Composição via primitivos
- Variantes com `class-variance-authority`

```typescript
// Exemplo: components/ui/button.tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md",
  {
    variants: {
      variant: {
        default: "bg-primary text-white",
        outline: "border border-primary",
      },
      size: {
        sm: "h-9 px-3",
        lg: "h-11 px-8",
      },
    },
  }
);
```

## 🔧 Arquitetura Backend

### Layered Architecture

```
┌─────────────────────────────────────┐
│        Routes (Endpoints)           │  ← Definição de rotas
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│     Middleware (Validação)          │  ← Auth, RBAC, CSRF, Audit
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│     Services (Lógica Negócio)       │  ← Business logic
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│  Repositories (Persistência)        │  ← Acesso a dados
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│         Database (Drizzle)          │  ← PostgreSQL
└─────────────────────────────────────┘
```

### Fluxo de Requisição

```
1. Request → Express
2. Rate Limiter → Bloqueia ataques brute-force (v1.5.7)
3. CSRF Middleware → Valida token
4. Auth Middleware → Valida JWT + tokenVersion + isActive (v1.5.7)
5. RBAC Middleware → Verifica permissões
6. Input Validation → Valida payload (Zod)
7. Route Handler → Chama service
8. Service → Lógica de negócio
9. Repository → Acessa banco
10. Response ← Retorna dados
11. Audit Middleware → Registra log (LGPD)
```

### Middleware Stack

```typescript
// server/index.ts
app.use(helmet());                    // Headers de segurança
app.use(rateLimiter);                 // Rate limiting
app.use(cookieParser());              // Parse cookies
app.use(csrf());                      // CSRF protection
app.use(authenticateJWT);             // Autenticação
app.use(auditMiddleware);             // Auditoria LGPD
```

### Services

Isolam lógica de negócio:

```typescript
// services/patient-notes.service.ts
export class PatientNotesService {
  async createNote(userId: number, patientId: number, note: string) {
    // 1. Validação
    // 2. Cria nota
    // 3. Registra evento de auditoria
    // 4. Envia notificação
    // 5. Retorna resultado
  }
}
```

**Serviços principais**:
- `ai-service-gpt4o-mini.ts` - Análise clínica IA
- `encryption.service.ts` - Criptografia AES-256-GCM
- `n8n-integration-service.ts` - Integração webhook
- `audit.service.ts` - Auditoria LGPD
- `change-detection.service.ts` - Detecção de mudanças
- `intelligent-cache.service.ts` - Cache de IA

### Repositories

Abstração de persistência:

```typescript
// repositories/postgres-storage.ts
export class PostgresStorage {
  async createPatient(data: Patient): Promise<Patient> {
    return db.insert(patients).values(data).returning();
  }
}
```

**Vantagens**:
- Fácil trocar implementação (PostgreSQL → MongoDB)
- Testável (mock do repository)
- Separação de responsabilidades

## 🗄️ Banco de Dados

### Schema (Drizzle ORM)

```typescript
// shared/schema.ts

// Usuários
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  role: text('role').notNull(),
  email: text('email').unique(),
  isActive: boolean('is_active').default(true),
  tokenVersion: integer('token_version').default(1), // v1.5.7 - Token versioning
  firstAccess: boolean('first_access').default(true),
});

// Pacientes (dados criptografados)
export const patients = pgTable('patients', {
  id: serial('id').primaryKey(),
  // Dados criptografados (LGPD)
  nome: text('nome').notNull(),              // encrypted
  registro: text('registro').notNull(),      // encrypted
  dataNascimento: text('data_nascimento'),   // encrypted
  diagnostico: text('diagnostico'),          // encrypted
  alergias: text('alergias'),               // encrypted

  // Metadados de criptografia
  salt: text('salt').notNull(),
  iv: text('iv').notNull(),
  authTag: text('auth_tag').notNull(),

  // Dados não criptografados
  leito: text('leito'),
  idade: integer('idade'),
  unidadeInternacao: text('unidade_internacao'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Auditoria (LGPD Art. 37)
export const auditLog = pgTable('audit_log', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  userName: text('user_name'),
  userRole: text('user_role'),
  action: text('action').notNull(), // CREATE, READ, UPDATE, DELETE
  resource: text('resource').notNull(),
  resourceId: integer('resource_id'),
  changes: text('changes'), // JSON before/after
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  endpoint: text('endpoint'),
  statusCode: integer('status_code'),
  timestamp: timestamp('timestamp').defaultNow(),
});
```

### Relacionamentos

```
users (1) ──── (N) patientNoteEvents
users (1) ──── (N) auditLog

patients (1) ──── (N) patientNotesHistory
patients (1) ──── (N) alerts
patients (1) ──── (1) patientsHistory (archived)

nursingUnits (1) ──── (N) nursingUnitTemplates
nursingUnits (1) ──── (N) nursingUnitChanges
```

### Migrations

```bash
# Gerar migration
npm run db:generate

# Aplicar migration
npm run db:migrate

# Push schema direto (dev)
npm run db:push
```

## 🔄 Fluxo de Dados

### 1. Autenticação

```
┌──────┐    POST /api/auth/login    ┌────────┐
│Client│──────────────────────────→│ Server │
└──────┘                            └────┬───┘
    ↑                                    │
    │     JWT + Refresh Token            ↓
    │     (httpOnly cookie)         Valida senha
    └────────────────────────────────────┘
```

### 1.1. Primeiro Acesso (Troca de Senha Obrigatória)

```
┌──────┐  Login (senha temporária)  ┌────────┐
│Client│───────────────────────────→│ Server │
└──────┘                             └────┬───┘
    │                                     │
    │     JWT com firstAccess=true        │
    ├←────────────────────────────────────┘
    │
    ↓
┌──────────────────────────────────────────────┐
│ Frontend detecta firstAccess=true             │
│ → Redireciona para /first-access             │
│ → Bloqueia acesso a outras rotas             │
└──────────────────────┬───────────────────────┘
                       │
                       ↓
┌──────┐  POST /api/auth/first-access-password  ┌────────┐
│Client│───────────────────────────────────────→│ Server │
└──────┘  { currentPassword, newPassword }      └────┬───┘
    ↑                                                 │
    │     1. Valida senha atual                      │
    │     2. Valida nova senha (8+ chars, letra+num) │
    │     3. Hash e salva nova senha                 │
    │     4. firstAccess = false                     │
    │     5. Novo JWT + Refresh Token                │
    │                                                │
    │     Novo JWT com firstAccess=false             │
    └←───────────────────────────────────────────────┘
                       │
                       ↓
┌──────────────────────────────────────────────┐
│ Frontend detecta firstAccess=false            │
│ → Redireciona para /modules                  │
│ → Acesso liberado ao sistema                 │
└──────────────────────────────────────────────┘
```

**Rotas protegidas durante primeiro acesso**:
- Apenas `/api/auth/first-access-password`, `/api/auth/me`, `/api/auth/logout`, `/api/auth/refresh` são permitidas
- Todas as outras 30+ rotas retornam 403 Forbidden

### 2. Requisição Autenticada

```
┌──────┐    GET /api/patients      ┌────────┐
│Client│──────────────────────────→│ Server │
│      │  Headers:                 │        │
│      │   Authorization: Bearer    │        │
│      │   X-CSRF-Token: xxx       │        │
└──────┘                            └────┬───┘
    ↑                                    │
    │                                    ↓
    │         JSON Response         1. Valida JWT
    │                               2. Valida CSRF
    │                               3. Verifica RBAC
    │                               4. Busca dados
    │                               5. Descriptografa
    └───────────────────────────────6. Audita
```

### 3. Sincronização com N8N

```
┌─────┐  Webhook POST    ┌────────┐    Valida     ┌──────────┐
│ N8N │────────────────→│ Server │──────────────→│ Database │
└─────┘  /webhook/       └────────┘    Secret     └──────────┘
         evolucoes            │
                              │
                          Criptografa
                          Dados LGPD
```

### 4. Análise de IA

```
┌──────┐  Solicita análise  ┌────────┐
│Client│──────────────────→│ Server │
└──────┘                    └────┬───┘
    ↑                            │
    │                            ↓
    │                      1. Change Detection
    │                         (95% economia)
    │                            │
    │                            ↓
    │                      2. Intelligent Cache
    │                         (60-80% economia)
    │                            │
    │                            ↓
    │                      3. GPT-4o-mini API
    │                         (50% economia)
    │                            │
    │      Insights Clínicos     ↓
    └────────────────────────Cache resultado
                                 Economia total: 99.8%
```

## 🔗 Integração N8N

### Webhooks

#### 1. Webhook de Evolução

**Endpoint**: `POST /webhook/evolucoes`

```
N8N Workflow
    │
    ├─→ Extrai dados do sistema hospitalar
    ├─→ Normaliza formato
    ├─→ POST para webhook
    │
    ↓
Server valida secret → Criptografa → Salva DB
```

**Payload**:
```json
{
  "leito": "101A",
  "nome": "João Silva",
  "registro": "12345",
  "idade": 65,
  "diagnostico": "Pneumonia",
  "alergias": "Penicilina",
  "unidadeInternacao": "UTI Adulto"
}
```

#### 2. Webhook de Unidades

**Endpoint**: `POST /webhook/unidades-internacao`

```
N8N Workflow (Cron diário 6h)
    │
    ├─→ Busca unidades do sistema hospitalar
    ├─→ POST para webhook
    │
    ↓
Server compara → Detecta mudanças → Cria pending changes
    │
    ↓
Admin aprova → Sincroniza
```

### Segurança

- **Secret token** validado em header `x-n8n-secret`
- **IP whitelist** configurável via `N8N_ALLOWED_IPS`
- **Retry logic** com exponential backoff no N8N

### Reativação Automática de Pacientes

Durante a sincronização com N8N, o sistema verifica automaticamente se pacientes que aparecem nos dados do N8N estão arquivados no histórico. Se estiverem, são reativados automaticamente.

```
┌─────────────────────────────────────────────────────┐
│  Dados N8N chegam durante Auto Sync                 │
└──────────────────┬──────────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────────┐
│  Para cada paciente (saveToDatabase) - 3 PASSOS:     │
│                                                      │
│  PASSO 1 - Resolver conflito de leito:               │
│  └─ Se leito ocupado por código diferente            │
│     → Arquiva paciente antigo como "registro_antigo" │
│                                                      │
│  PASSO 2 - Marcar reativação (histórico preservado): │
│  └─ Busca por codigoAtendimento ou leito (fallback)  │
│  └─ Se encontrar → MARCA como reativado              │
│     (histórico NUNCA é deletado - log permanente)    │
│                                                      │
│  PASSO 3 - UPSERT (único ponto de inserção):         │
│  └─ Insere/atualiza com dados frescos do N8N         │
└──────────────────────────────────────────────────────┘
```

**Regra Core**: Se um paciente aparece nos dados do N8N, ele **DEVE** estar ativo no sistema.

**Ponto Único de Inserção**: Somente `upsertPatientByCodigoAtendimento()` insere/atualiza pacientes. O histórico **NUNCA é deletado** - serve como log permanente de todas as altas e transferências. Os dados do N8N são sempre usados na inserção final.

### Resolução de Conflito de Leito

Antes de inserir ou reativar um paciente, o sistema verifica se o leito alvo está ocupado por outro paciente com código de atendimento diferente. Se estiver, o paciente antigo é automaticamente arquivado como "registro_antigo".

**Problema Resolvido**: Em ambientes DEV, dados manuais/testes acumulam pacientes com leitos que são posteriormente reutilizados por novos pacientes com códigos diferentes, causando erro de "duplicate key constraint" no leito.

**Estratégia de Busca Dual**:
- **Primária**: Busca por `codigoAtendimento` (identificador único do atendimento)
- **Fallback**: Busca por `leito` (quando código ausente ou alterado)

**Deduplicação**: Usa `Set` de IDs já reativados para evitar reativações repetidas no mesmo ciclo de sync.

**Métodos de Storage**:
```typescript
// Verifica se leito está ocupado por paciente com código diferente
getPatientOccupyingLeitoWithDifferentCodigo(leito: string, codigo: string): Promise<Patient | undefined>

// Arquiva e remove paciente (para liberar leito)
archiveAndRemovePatient(patientId: string, motivo: ArchiveReason, leitoDestino?: string): Promise<boolean>

// Busca paciente arquivado por código de atendimento
getPatientHistoryByCodigoAtendimento(codigo: string): Promise<PatientsHistory | undefined>

// Busca paciente arquivado por leito (fallback)
getPatientHistoryByLeito(leito: string): Promise<PatientsHistory | undefined>
```

## 🤖 Sistema de IA

### Arquitetura Multi-Camada

```
┌─────────────────────────────────────────────┐
│  Camada 1: Change Detection (95% economia)  │
│  └─ Detecta se houve mudanças nos dados     │
└──────────────────┬──────────────────────────┘
                   │ Mudança detectada
┌──────────────────▼──────────────────────────┐
│  Camada 2: Intelligent Cache (60-80%)       │
│  └─ Verifica se análise já existe em cache  │
└──────────────────┬──────────────────────────┘
                   │ Cache miss
┌──────────────────▼──────────────────────────┐
│  Camada 3: GPT-4o-mini (50% vs GPT-4)       │
│  └─ Gera análise clínica                    │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  Camada 4: Auto Sync Scheduler (95%)        │
│  └─ Sincronização a cada 1h (não real-time) │
│  └─ Arquivamento determinístico             │
│  └─ Validação de sanidade anti-mass-delete  │
└─────────────────────────────────────────────┘

Economia Total Estimada: 99.8%
```

### Arquivamento Determinístico

O sistema usa arquivamento imediato quando paciente não está mais no N8N:

```
┌─────────────────────────────────────────────┐
│  Paciente no N8N?                           │
├─────────────────────────────────────────────┤
│  SIM → UPSERT (inserir/atualizar)           │
│  NÃO → Arquivar imediatamente               │
│        ├─ código ausente = alta_hospitalar  │
│        └─ leito ausente = transferencia     │
└─────────────────────────────────────────────┘
```

### Validação de Sanidade

Protege contra arquivamento em massa de dados incompletos do N8N:

```typescript
// Configuração
N8N_MIN_RECORD_RATIO = 0.5  // 50% do último sync válido
MIN_ABSOLUTE_RECORDS = 5    // Mínimo absoluto sempre

// Lógica
if (n8nRecords < MIN_ABSOLUTE_RECORDS) {
  // BLOQUEIA remoções - N8N parece vazio/incompleto
}

if (n8nRecords < lastValidSync * MIN_RECORD_RATIO) {
  // BLOQUEIA remoções - N8N retornou dados parciais
}
```

### Batch Real (v1.5.4)

Múltiplos pacientes são analisados em **UMA ÚNICA chamada à API**:

```
ANTES: 35 pacientes = 35 chamadas = ~105 segundos
DEPOIS: 35 pacientes = 4 chamadas = ~12 segundos

Redução: ~90% no tempo de sincronização
```

Implementação via `callGPT4oMiniBatch()`:
- Até 10 pacientes por chamada API
- Prompt de sistema específico para batch
- Resposta em array JSON ordenado
- Cache individual por paciente

### Prompts

Prompts ultra-comprimidos para reduzir custos:

```typescript
const prompt = `
Paciente: ${nome}, ${idade}a
Dx: ${diagnostico}
Alergia: ${alergias}
Braden: ${escoreBraden}

Análise SBAR + riscos
`;
```

### Análises Disponíveis

1. **Individual**: Insights por paciente
2. **Batch**: Análise geral do plantão
3. **Classificação de Riscos**:
   - Risco de queda
   - Risco de lesão por pressão
   - Risco de infecção
   - Risco de broncoaspiração
   - Risco nutricional
   - Risco respiratório

## 🔒 Segurança

### Criptografia (LGPD Art. 46)

**Algoritmo**: AES-256-GCM

```typescript
// Criptografia
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
const encrypted = Buffer.concat([
  cipher.update(plaintext, 'utf8'),
  cipher.final(),
]);
const authTag = cipher.getAuthTag();

// Descriptografia
const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
decipher.setAuthTag(authTag);
const decrypted = Buffer.concat([
  decipher.update(encrypted),
  decipher.final(),
]);
```

**Campos criptografados**:
- nome, registro, dataNascimento
- diagnostico, alergias, observacoes
- dsEvolucaoCompleta

### Autenticação

**JWT** com refresh tokens:

```typescript
// Access Token (15min)
const accessToken = jwt.sign(
  { userId, role },
  JWT_SECRET,
  { expiresIn: '15m' }
);

// Refresh Token (7d, httpOnly cookie)
const refreshToken = jwt.sign(
  { userId },
  REFRESH_SECRET,
  { expiresIn: '7d' }
);
```

### Autorização (RBAC)

```typescript
const rolePermissions = {
  admin: ['*'], // Todas permissões
  enfermagem: ['read:patients', 'update:patients', 'create:notes'],
  visualizador: ['read:patients'],
};
```

### Middleware de Proteção (v1.5.2)

O sistema usa middleware combinado para garantir que todas as rotas protegidas validem:
1. **Autenticação**: JWT válido
2. **First-Access**: Troca de senha obrigatória completada
3. **RBAC**: Papel do usuário autorizado

```typescript
// requireRoleWithAuth combina os 3 middlewares em um só
export const requireRoleWithAuth = (...allowedRoles: UserRole[]) => [
  authMiddleware,           // Valida JWT
  requireFirstAccessComplete, // Bloqueia firstAccess=true
  requireRole(...allowedRoles) // Verifica papel
];

// Uso em rotas
router.get('/admin-only', ...requireRoleWithAuth('admin'), handler);
router.post('/sync', ...requireRoleWithAuth('admin', 'enfermagem'), handler);
```

**Rotas protegidas**: 45+ endpoints usam `requireRoleWithAuth` para prevenir bypass de first-access.

### Headers de Segurança (Helmet)

- Content-Security-Policy (restritivo em produção, relaxado em dev - v1.5.8)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Strict-Transport-Security

### Melhorias de Segurança v1.5.8

- **JWT 15 min**: Expiração reduzida para menor janela de ataque
- **Cookies SameSite=strict**: Proteção CSRF adicional
- **Senhas Hardcoded Removidas**: Configuração via env vars obrigatória
- **Password Hashes Filtrados**: Não expostos na API
- **CSP Endurecido**: unsafe-inline/unsafe-eval removidos em produção
- **Criptografia Obrigatória**: AES-256-GCM em todos os ambientes
- **Endpoints LGPD**: Exportação, anonimização e transparência de dados

### Rate Limiting

```typescript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requests por IP
});
```

## 🎯 Decisões Arquiteturais

### 1. Por que Monorepo?

**Decisão**: Código compartilhado em `/shared/`

**Prós**:
- Schema Drizzle compartilhado (DRY)
- Types sincronizados entre frontend/backend
- Refatorações atômicas

**Contras**:
- Build mais complexo
- Pode crescer muito

### 2. Por que Wouter ao invés de React Router?

**Decisão**: Wouter para roteamento

**Prós**:
- Leve (1.5KB vs 15KB)
- API simples
- Suficiente para este projeto

**Contras**:
- Menos features (sem nested routes)
- Comunidade menor

### 3. Por que Drizzle ao invés de Prisma?

**Decisão**: Drizzle ORM

**Prós**:
- TypeScript-first (tipos perfeitos)
- SQL-like (mais controle)
- Lightweight
- Migrations simples

**Contras**:
- Menos mature que Prisma
- Documentação menor

### 4. Por que GPT-4o-mini ao invés de Claude/GPT-4?

**Decisão**: GPT-4o-mini para análises

**Prós**:
- 50% mais barato
- Suficientemente bom para análises estruturadas
- Prompts comprimidos reduzem custo
- Sistema de cache otimiza ainda mais

**Contras**:
- Menos capabilities que GPT-4
- Pode gerar respostas menos refinadas

### 5. Por que Criptografia AES-256-GCM?

**Decisão**: AES-256-GCM ao invés de AES-256-CBC

**Prós**:
- Garante integridade + confidencialidade
- AuthTag previne manipulação
- LGPD Art. 46 compliance
- Padrão da indústria

**Contras**:
- Ligeiramente mais lento que CBC
- Mais complexo de implementar

### 6. Por que N8N para integração?

**Decisão**: Webhook N8N ao invés de integração direta

**Prós**:
- Desacopla sistemas
- N8N orquestra complexidade
- Fácil adicionar novos webhooks
- Retry e error handling no N8N

**Contras**:
- Dependência externa
- Latência adicional

### 7. Por que TanStack Query?

**Decisão**: TanStack Query para estado do servidor

**Prós**:
- Cache automático
- Refetch strategies
- Optimistic updates
- Reduz boilerplate

**Contras**:
- Curva de aprendizado
- Overhead para queries simples

## 📈 Sistema de Analytics de Uso

### Proposito

Rastrear comportamento de usuarios para analise de UX e Customer Success, permitindo entender como o sistema e utilizado e identificar areas de melhoria.

### Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
│  useAnalytics hook → Batching → POST /api/analytics/*       │
└─────────────────────────────────┬───────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────┐
│                     Backend (Express)                        │
│  Routes → Storage Interface → PostgreSQL                    │
└─────────────────────────────────┬───────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────┐
│                    PostgreSQL Tables                         │
│  user_sessions (FK → users) ← analytics_events (FK → sessions)│
└─────────────────────────────────────────────────────────────┘
```

### Hook useAnalytics

```typescript
// Inicializacao automatica ao autenticar
const { trackAction, trackPageView } = useAnalytics();

// Tracking automatico de page views via useEffect
// Batching: max 20 eventos ou 5 segundos
// Heartbeat: 60 segundos para manter sessao ativa
// Cleanup: beforeunload + unmount
```

### Modelo de Dados

**user_sessions**:
- `id`, `userId`, `userName`, `userRole`
- `userAgent`, `screenResolution`, `language`
- `startedAt`, `endedAt`, `lastActivityAt`
- `isActive` (boolean)

**analytics_events**:
- `id`, `sessionId` (FK), `userId` (FK)
- `eventType`: `page_view` | `action`
- `eventName`, `pagePath`, `pageTitle`
- `metadata` (JSONB)
- `createdAt`

### Endpoints

| Metodo | Endpoint | Descricao | Roles |
|--------|----------|-----------|-------|
| POST | /api/analytics/events | Registra evento | Todos |
| POST | /api/analytics/events/batch | Registra lote | Todos |
| POST | /api/analytics/sessions | Cria sessao | Todos |
| POST | /api/analytics/sessions/:id/end | Encerra sessao | Todos |
| POST | /api/analytics/sessions/:id/heartbeat | Atualiza heartbeat | Todos |
| GET | /api/admin/analytics/metrics | Metricas gerais | Admin |
| GET | /api/admin/analytics/sessions | Lista sessoes | Admin |
| GET | /api/admin/analytics/top-pages | Paginas mais visitadas | Admin |
| GET | /api/admin/analytics/top-actions | Acoes mais realizadas | Admin |
| GET | /api/admin/analytics/users/:userId | Stats do usuario | Admin |

### Dashboard Administrativo

Pagina `/admin/usage-analytics` com 4 abas:

1. **Visao Geral**: Cards de metricas (sessoes, page views, acoes, usuarios unicos)
2. **Paginas**: Ranking de paginas mais visitadas com grafico de barras
3. **Acoes**: Ranking de acoes mais realizadas com grafico pizza
4. **Usuarios**: Tabela com atividade individual de cada usuario

### Otimizacoes

- **Batching**: Reduz requests enviando ate 20 eventos por vez
- **Heartbeat**: Evita sessoes orfas com ping a cada 60s
- **Cleanup**: Envia eventos pendentes ao fechar aba/navegador
- **sessionStorage**: Persiste sessionId entre reloads da pagina

## 📊 Métricas e Performance

### Sync N8N + IA (v1.5.5)

| Operação | Tempo |
|----------|-------|
| N8N Fetch | ~700ms |
| IA Batch (4 paralelos) | ~14s |
| Database UPSERT (10 paralelos) | ~10s |
| **Total** | **~30s** |

**Otimizações aplicadas:**
- 4 batches de IA processados em paralelo via `Promise.all()`
- 10 operações de banco simultâneas com `CONCURRENCY_LIMIT`
- Redução de ~62% vs versão anterior (78s → 30s)

### Bundle Sizes

- **Client**: ~487KB (antes de code splitting)
- **Server**: ~382KB
- **Shared**: ~20KB

### Database

- **Conexões**: Pool de 10 conexões (Neon DB)
- **Queries**: Indexadas por leito, registro, unidadeInternacao
- **UPSERT Paralelo**: 10 operações simultâneas

### API

- **Latência média**: <200ms
- **Rate limit**: 100 req/15min por IP
- **Cache**: Redis (planejado)

## 🔮 Roadmap Arquitetural

### Curto Prazo

- [ ] Implementar testes automatizados
- [ ] Code splitting no frontend
- [ ] Redis para cache de sessões
- [ ] WebSocket para notificações real-time

### Médio Prazo

- [ ] Microservices para IA (se escalar)
- [ ] Event sourcing para auditoria
- [ ] GraphQL como alternativa REST
- [ ] PWA/Offline mode

### Longo Prazo

- [ ] Kubernetes deployment
- [ ] Multi-tenancy
- [ ] Módulo de escalas de trabalho
- [ ] Gestão de leitos

## 📚 Recursos

- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Radix UI](https://www.radix-ui.com/)
- [LGPD - Lei 13.709/2018](http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)

---

**Última atualização**: 2026-01-30 (v1.5.8)
