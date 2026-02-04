---
name: 11care-development-setup
description: Guia de configuração do ambiente de desenvolvimento e troubleshooting. Use quando precisar configurar o projeto, resolver erros ou entender os scripts disponíveis.
---

# Development Setup - 11Care

Guia para configurar o ambiente de desenvolvimento e resolver problemas comuns.

## Pré-requisitos

### Obrigatório

- **Node.js**: v18+ (recomendado v20 LTS)
- **npm**: v9+ (vem com Node.js)
- **PostgreSQL**: v14+ (ou Neon DB no Replit)

### Verificar Instalação

```bash
node --version  # v20.x.x
npm --version   # v9.x.x
```

---

## Setup Inicial

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

```bash
# Arquivo .env (já configurado no Replit via Secrets)
```

### 3. Setup do Banco de Dados

```bash
# Push schema para o banco (desenvolvimento e produção)
npm run db:push
```

### 4. Executar Aplicação

```bash
npm run dev
```

### 5. Setup Inicial da Aplicação

1. Abra `http://localhost:5000/setup`
2. Insira o `SETUP_KEY` configurado
3. Usuários padrão serão criados

---

## Variáveis de Ambiente

### Obrigatórias

```bash
# Banco de Dados
DATABASE_URL=postgresql://...

# Segurança (chave em base64, 32 bytes)
ENCRYPTION_KEY=<base64-32-bytes>   # openssl rand -base64 32
JWT_SECRET=<secret>
REFRESH_SECRET=<secret>
SESSION_SECRET=<secret>

# Setup
SETUP_KEY=<secret>
```

### Opcionais

```bash
# IA
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# N8N
N8N_WEBHOOK_SECRET=<secret>

# Auto Sync
AUTO_SYNC_CRON=0 * * * *         # Cron expression

# Ambiente
NODE_ENV=development
PORT=5000
LOG_LEVEL=info
```

### Gerar Secrets

```bash
# 32 bytes base64 (ENCRYPTION_KEY - obrigatório)
openssl rand -base64 32

# 32 bytes base64 (outros secrets)
openssl rand -base64 32

# UUID v4
uuidgen
```

---

## Scripts Disponíveis

### Desenvolvimento

```bash
npm run dev          # Inicia dev server (frontend + backend via tsx)
```

### Build

```bash
npm run build        # Build completo (Vite + esbuild)
```

### Banco de Dados

```bash
npm run db:push      # Push schema para o banco (desenvolvimento)
```

### Produção

```bash
npm run start        # Inicia servidor em produção (após build)
```

### Type Checking

```bash
npm run check        # Verifica tipos TypeScript
```

---

## Estrutura do Projeto

```
FrontendPlantao/
├── client/                    # Frontend React
│   └── src/
│       ├── components/        # Componentes React
│       │   ├── ui/           # Base (Radix UI)
│       │   └── shift-handover/ # Domínio
│       ├── hooks/            # Custom hooks
│       ├── lib/              # Utilitários
│       ├── pages/            # Páginas
│       ├── services/         # Camada de serviços
│       └── types/            # TypeScript types
│
├── server/                    # Backend Node.js
│   ├── config/               # Configurações
│   ├── lib/                  # Bibliotecas core
│   ├── middleware/           # Middlewares Express
│   ├── repositories/         # Camada de dados
│   ├── routes/               # Rotas da API
│   ├── services/             # Lógica de negócio
│   └── index.ts              # Entry point
│
├── shared/                    # Código compartilhado
│   └── schema.ts             # Schema Drizzle + Zod
│
├── skills/                    # Skills do Agent
│
└── docs/                      # Documentação
```

---

## Hot Reload

### Frontend (Vite HMR)

- ✅ Preserva estado do React
- ✅ Atualização instantânea (< 100ms)
- ✅ Funciona para: `.tsx`, `.ts`, `.css`

### Backend (tsx watch)

- ⚠️ Reinicia servidor completo
- ⚠️ ~1-2s de downtime
- ⚠️ Conexões WebSocket reiniciam

---

## Troubleshooting

### Erro: "EADDRINUSE: address already in use"

**Causa**: Porta 5000 já em uso

```bash
# Encontrar processo
lsof -i :5000

# Matar processo
kill -9 <PID>

# Ou usar porta diferente
PORT=3000 npm run dev
```

### Erro: "DATABASE_URL not configured"

**Causa**: Variável de ambiente não configurada

```bash
# Verificar .env existe
ls -la .env

# Verificar conteúdo
cat .env | grep DATABASE_URL
```

### Erro: "relation 'users' does not exist"

**Causa**: Tabelas não criadas no banco

```bash
# Push schema para criar as tabelas
npm run db:push
```

### Erro: "Invalid ENCRYPTION_KEY"

**Causa**: `ENCRYPTION_KEY` inválida (não é 32 bytes em base64)

```bash
# Gerar nova chave (32 bytes em base64)
openssl rand -base64 32

# Atualizar em Secrets no Replit
```

### Build Frontend Falha

**Causa**: Erro de TypeScript ou falta de memória

```bash
# Aumentar memória Node.js
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# Verificar erros TypeScript
npm run check
```

### Hot Reload Não Funciona

**Frontend**:
```bash
# Limpar cache Vite
rm -rf node_modules/.vite
npm run dev
```

**Backend**:
```bash
# Restart manual
Ctrl+C
npm run dev
```

### PostgreSQL Connection Failed

```bash
# Verificar se DATABASE_URL está correto
echo $DATABASE_URL

# Testar conexão (se tiver psql)
psql "$DATABASE_URL"
```

### CSRF Token Invalid

**Causa**: Cookie não sendo enviado

1. Limpar cookies do browser
2. Verificar `credentials: 'include'` em fetch
3. Verificar se cookies estão habilitados no browser

### IA API Não Responde

```bash
# Verificar API keys
echo $OPENAI_API_KEY | head -c 10
echo $ANTHROPIC_API_KEY | head -c 10

# Verificar logs
grep -i "openai\|gpt\|claude" logs/app-*.log | tail -20
```

### Dependency Conflicts

```bash
# Limpar e reinstalar
rm -rf node_modules package-lock.json
npm install

# Se persistir
npm ci
```

---

## Banco de Dados

### Drizzle ORM

```typescript
// shared/schema.ts
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  // ...
});
```

### Queries Comuns

```typescript
import { db } from './lib/database';
import { patients } from '../shared/schema';
import { eq } from 'drizzle-orm';

// SELECT
const allPatients = await db.select().from(patients);

// WHERE
const patient = await db
  .select()
  .from(patients)
  .where(eq(patients.id, 1));

// INSERT
const newPatient = await db
  .insert(patients)
  .values({ nome: 'João', ... })
  .returning();

// UPDATE
await db
  .update(patients)
  .set({ nome: 'João Silva' })
  .where(eq(patients.id, 1));

// DELETE
await db
  .delete(patients)
  .where(eq(patients.id, 1));
```

### Drizzle Studio

Para explorar o banco visualmente, use:

```bash
npx drizzle-kit studio
```

Abre interface visual para explorar o banco.

---

## Debugging

### VSCode Launch Config

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Server",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "skipFiles": ["<node_internals>/**"],
      "console": "integratedTerminal"
    }
  ]
}
```

### Logs

```typescript
import { logger } from './lib/logger';

logger.error('Erro crítico', error);
logger.warn('Aviso');
logger.info('Informação');
logger.debug('Debug detalhado');
```

Logs salvos em `/logs/`:
- `app-YYYY-MM-DD.log` - Logs gerais
- `error-YYYY-MM-DD.log` - Apenas erros

### Chrome DevTools (Backend)

```bash
node --inspect server/index.ts
```

Abra: `chrome://inspect`

---

## Checklist de Setup

- [ ] Node.js v18+ instalado
- [ ] PostgreSQL rodando (ou Neon DB)
- [ ] Variáveis de ambiente configuradas (Secrets no Replit)
- [ ] Dependências instaladas (`npm install`)
- [ ] Schema aplicado (`npm run db:push`)
- [ ] Setup inicial executado (`/setup`)
- [ ] Aplicação rodando (`npm run dev`)
- [ ] Login funciona (admin/senha configurada)
- [ ] Hot reload funcionando

---

## Convenções de Código

### Arquivos

- **Componentes React**: `PascalCase.tsx`
- **Hooks**: `use-kebab-case.ts`
- **Services**: `kebab-case.service.ts`
- **Types**: `types.ts` ou `name.types.ts`

### Código

```typescript
// Variáveis e funções: camelCase
const patientData = ...;
function fetchPatients() { ... }

// Componentes e Classes: PascalCase
class ApiService { ... }
function PatientCard() { ... }

// Constantes: UPPER_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;

// Enums: PascalCase
enum UserRole {
  Admin = 'admin',
  Enfermagem = 'enfermagem',
}
```

### Commits (Conventional Commits)

```bash
feat(shift-handover): adiciona filtro por enfermaria
fix(auth): corrige validação de token JWT
docs: atualiza guia de contribuição
refactor(api): simplifica serviço de pacientes
security(encryption): atualiza algoritmo AES para GCM
```

---

## Recursos

### Documentação do Projeto

- `ARCHITECTURE.md` - Arquitetura do sistema
- `API.md` - Documentação da API
- `SECURITY.md` - Segurança e LGPD
- `AI_INTEGRATION.md` - Sistema de IA
- `CHANGELOG.md` - Histórico de versões

### Stack

- [React](https://react.dev/) - UI library
- [Vite](https://vitejs.dev/) - Build tool
- [Express](https://expressjs.com/) - Backend framework
- [Drizzle ORM](https://orm.drizzle.team/) - Database ORM
- [TanStack Query](https://tanstack.com/query/latest) - Data fetching
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Radix UI](https://www.radix-ui.com/) - UI primitives
