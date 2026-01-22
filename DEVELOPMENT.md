# Guia de Desenvolvimento

Guia completo para configurar e desenvolver localmente o **11Care Nursing Platform**.

## 📋 Índice

- [Pré-requisitos](#pré-requisitos)
- [Setup Inicial](#setup-inicial)
- [Configuração](#configuração)
- [Executando Localmente](#executando-localmente)
- [Estrutura de Desenvolvimento](#estrutura-de-desenvolvimento)
- [Scripts Disponíveis](#scripts-disponíveis)
- [Banco de Dados](#banco-de-dados)
- [Debugging](#debugging)
- [Hot Reload](#hot-reload)
- [Build para Produção](#build-para-produção)
- [Troubleshooting](#troubleshooting)

## 🔧 Pré-requisitos

### Obrigatório

- **Node.js**: v18+ (recomendado v20 LTS)
- **npm**: v9+ (vem com Node.js)
- **PostgreSQL**: v14+ (ou conta Neon DB)
- **Git**: Para controle de versão

### Opcional

- **Docker**: Para executar PostgreSQL localmente
- **VSCode**: Editor recomendado
- **PostgreSQL Client**: DBeaver, pgAdmin, TablePlus

### Verificar Instalação

```bash
node --version  # v20.x.x
npm --version   # v9.x.x
git --version   # v2.x.x
psql --version  # v14.x ou superior
```

## 🚀 Setup Inicial

### 1. Clonar Repositório

```bash
git clone https://github.com/seu-usuario/FrontendPlantao.git
cd FrontendPlantao
```

### 2. Instalar Dependências

```bash
npm install
```

Este comando instala:
- Dependências do cliente (React, Vite, Tailwind)
- Dependências do servidor (Express, Drizzle, Winston)
- Dependências compartilhadas (Zod, TypeScript)

**Tempo estimado**: 2-3 minutos

### 3. Configurar PostgreSQL

#### Opção A: PostgreSQL Local (Docker)

```bash
# Criar e iniciar container PostgreSQL
docker run --name postgres-11care \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=frontendplantao \
  -p 5432:5432 \
  -d postgres:14

# Verificar se está rodando
docker ps | grep postgres-11care
```

**Connection String**:
```
postgresql://postgres:postgres@localhost:5432/frontendplantao
```

#### Opção B: Neon DB (Cloud)

1. Criar conta gratuita em [neon.tech](https://neon.tech)
2. Criar novo projeto
3. Copiar connection string
4. Usar no `.env`

### 4. Configurar Variáveis de Ambiente

```bash
cp .env.example .env
```

Edite `.env` com suas configurações (ver seção [Configuração](#configuração)).

### 5. Setup do Banco de Dados

```bash
# Gera tabelas no banco
npm run db:push

# Ou rodar migrations (recomendado para produção)
npm run db:generate  # Gera migration
npm run db:migrate   # Aplica migration
```

### 6. Executar Aplicação

```bash
npm run dev
```

Acesse: `http://localhost:5000`

### 7. Setup Inicial da Aplicação

1. Abra `http://localhost:5000/setup`
2. Insira o `SETUP_KEY` configurado no `.env`
3. Usuários padrão serão criados:
   - **Admin**: `admin` / `admin123` (ou conforme `DEFAULT_ADMIN_PASSWORD`)
   - **Enfermeiro**: `enfermeiro` / `enf123` (ou conforme `DEFAULT_ENFERMEIRO_PASSWORD`)

🎉 **Pronto! Aplicação rodando localmente.**

## ⚙️ Configuração

### Arquivo .env

```bash
# ============================================
# AMBIENTE
# ============================================
NODE_ENV=development
PORT=5000

# ============================================
# BANCO DE DADOS
# ============================================
# PostgreSQL connection string
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/frontendplantao

# ============================================
# SEGURANÇA
# ============================================
# Gere com: openssl rand -hex 32
SESSION_SECRET=your-32-byte-secret-here
ENCRYPTION_KEY=your-64-char-hex-string-here
JWT_SECRET=your-jwt-secret-here
REFRESH_SECRET=your-refresh-secret-here

# ============================================
# SETUP INICIAL
# ============================================
SETUP_KEY=your-setup-key-here
DEFAULT_ADMIN_PASSWORD=Admin@123
DEFAULT_ENFERMEIRO_PASSWORD=Enf@123

# ============================================
# APIs DE IA
# ============================================
# OpenAI (GPT-4o-mini)
OPENAI_API_KEY=sk-your-openai-key-here

# Anthropic (Claude Haiku - fallback)
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here

# ============================================
# N8N WEBHOOK
# ============================================
N8N_WEBHOOK_SECRET=your-n8n-secret-here
N8N_ALLOWED_IPS=127.0.0.1,::1  # Opcional: whitelist de IPs

# ============================================
# AUTO SYNC (SCHEDULER)
# ============================================
# Cron para auto-sync (padrão: a cada 1 hora)
AUTO_SYNC_CRON=0 * * * *
# Mínimo de registros N8N para permitir arquivamentos (% do último sync válido)
N8N_MIN_RECORD_RATIO=0.5

# ============================================
# LOGS
# ============================================
LOG_DIR=logs
LOG_LEVEL=info  # error, warn, info, debug
```

### Gerando Secrets

```bash
# 32 bytes (64 caracteres hex) - Para ENCRYPTION_KEY
openssl rand -hex 32

# 32 bytes base64 - Para outros secrets
openssl rand -base64 32

# UUID v4
uuidgen
```

### URLs de Conexão PostgreSQL

**Local**:
```
postgresql://postgres:postgres@localhost:5432/frontendplantao
```

**Neon DB**:
```
postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require
```

**Docker Compose**:
```
postgresql://postgres:postgres@db:5432/frontendplantao
```

## 🏃 Executando Localmente

### Modo Desenvolvimento (Recomendado)

```bash
npm run dev
```

**O que faz**:
- Inicia servidor Express na porta 5000
- Inicia Vite dev server (hot reload)
- Ativa hot reload para backend (via `tsx watch`)
- Habilita logs detalhados
- Aplica CSP relaxado para development

**Acesso**:
- Frontend: `http://localhost:5000`
- API: `http://localhost:5000/api`

### Modo Produção (Local)

```bash
# Build do cliente
npm run build

# Inicia servidor
npm run start
```

**Diferenças**:
- Cliente servido como arquivos estáticos (build otimizado)
- Sem hot reload
- Logs menos verbosos
- CSP mais restritivo

## 📂 Estrutura de Desenvolvimento

### Fluxo de Dados

```
┌─────────────────────────────────────────────┐
│  Browser (http://localhost:5000)            │
└──────────────────┬──────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────┐
│  Express Server (Port 5000)                  │
│  ├─ /api/* → Backend routes                  │
│  └─ /* → Vite dev server (proxy)             │
└──────────────────┬───────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ↓                     ↓
┌──────────────┐    ┌─────────────────┐
│  Vite Dev    │    │  PostgreSQL     │
│  (HMR)       │    │  (localhost)    │
└──────────────┘    └─────────────────┘
```

### Hot Reload

#### Frontend (Vite HMR)

- **Automático** para arquivos `.tsx`, `.ts`, `.css`
- **Instantâneo** (< 100ms)
- **Preserva estado** do React

#### Backend (tsx watch)

- **Automático** para arquivos `.ts` em `/server`
- **Restart rápido** (~1-2s)
- **Não preserva estado** (conexões WebSocket reiniciam)

## 📜 Scripts Disponíveis

### Desenvolvimento

```bash
# Inicia dev server (frontend + backend)
npm run dev

# Apenas backend (útil para testar API)
npm run server:dev

# Apenas frontend (requer backend rodando separadamente)
npm run client:dev
```

### Build

```bash
# Build completo (cliente + servidor)
npm run build

# Apenas cliente
npm run build:client

# Apenas servidor
npm run build:server
```

### Banco de Dados

```bash
# Push schema (dev) - aplica mudanças direto
npm run db:push

# Gera migration a partir do schema
npm run db:generate

# Aplica migrations pendentes
npm run db:migrate

# Abre Drizzle Studio (UI para explorar DB)
npm run db:studio
```

### Produção

```bash
# Inicia servidor (após build)
npm run start
```

### Type Checking

```bash
# Verifica tipos TypeScript
npm run typecheck
```

### Linting (Futuro)

```bash
# Verifica código com ESLint
npm run lint

# Corrige automaticamente
npm run lint:fix
```

## 🗄️ Banco de Dados

### Drizzle ORM

O projeto usa **Drizzle ORM** para interação com PostgreSQL.

#### Schema

Definido em `/shared/schema.ts`:

```typescript
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  // ...
});
```

#### Migrations

```bash
# 1. Editar schema.ts
# 2. Gerar migration
npm run db:generate

# 3. Revisar migration em /drizzle
ls drizzle/*.sql

# 4. Aplicar migration
npm run db:migrate
```

#### Drizzle Studio

Interface visual para explorar banco:

```bash
npm run db:studio
```

Acesse: `https://local.drizzle.studio`

### Conexão com DB

```typescript
// server/lib/database.ts
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';

const pool = new Pool({ connectionString: env.DATABASE_URL });
export const db = drizzle(pool);
```

### Queries

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

## 🐛 Debugging

### VSCode

Crie `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Server",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "server:dev"],
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
# Inicia servidor com inspector
node --inspect server/index.ts
```

Abra: `chrome://inspect`

### React DevTools

Instale extensão:
- [Chrome](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)
- [Firefox](https://addons.mozilla.org/en-US/firefox/addon/react-devtools/)

## 🔥 Hot Reload

### Frontend

**Vite HMR** (Hot Module Replacement):

- ✅ Preserva estado do React
- ✅ Atualização instantânea (< 100ms)
- ✅ Funciona para:
  - Componentes React (.tsx)
  - Hooks (.ts)
  - Estilos (.css)
  - Imports

### Backend

**tsx watch**:

- ⚠️ Reinicia servidor completo
- ⚠️ Perde conexões WebSocket
- ⚠️ ~1-2s de downtime
- ✅ Funciona para:
  - Routes (.ts)
  - Services (.ts)
  - Middleware (.ts)
  - Config (.ts)

### Shared

Mudanças em `/shared/schema.ts`:

1. **Frontend**: Hot reload automático
2. **Backend**: Restart automático
3. **DB**: Requer `npm run db:push`

## 📦 Build para Produção

### 1. Build

```bash
npm run build
```

**Saída**:
```
dist/
├── client/          # Frontend build (Vite)
│   ├── index.html
│   └── assets/
│       ├── index-[hash].js
│       └── index-[hash].css
└── server/          # Backend build (esbuild)
    └── index.js
```

### 2. Teste Local

```bash
NODE_ENV=production npm run start
```

### 3. Deploy

Ver seção de deploy no `README.md`.

## 🔧 Troubleshooting

### Erro: "EADDRINUSE: address already in use"

**Causa**: Porta 5000 já em uso

**Solução**:
```bash
# Encontrar processo
lsof -i :5000

# Matar processo
kill -9 <PID>

# Ou usar porta diferente
PORT=3000 npm run dev
```

---

### Erro: "DATABASE_URL not configured"

**Causa**: Variável de ambiente não configurada

**Solução**:
```bash
# Verificar .env existe
ls -la .env

# Verificar conteúdo
cat .env | grep DATABASE_URL

# Se não existir, copiar do exemplo
cp .env.example .env
```

---

### Erro: "relation 'users' does not exist"

**Causa**: Tabelas não criadas no banco

**Solução**:
```bash
# Push schema
npm run db:push

# Ou aplicar migrations
npm run db:migrate
```

---

### Erro: "Invalid ENCRYPTION_KEY"

**Causa**: `ENCRYPTION_KEY` inválida (não é hex de 64 chars)

**Solução**:
```bash
# Gerar nova chave
openssl rand -hex 32

# Atualizar .env
ENCRYPTION_KEY=nova-chave-aqui
```

---

### Build Frontend Falha

**Causa**: Erro de TypeScript ou falta de memória

**Solução**:
```bash
# Aumentar memória Node.js
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# Verificar erros TypeScript
npm run typecheck
```

---

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

---

### PostgreSQL Connection Failed

**Verificar**:
```bash
# Testar conexão
psql "postgresql://postgres:postgres@localhost:5432/frontendplantao"

# Verificar container Docker (se usando)
docker ps | grep postgres
docker logs postgres-11care
```

**Solução**:
```bash
# Reiniciar container
docker restart postgres-11care

# Ou recriar
docker rm -f postgres-11care
# [rodar comando docker run novamente]
```

---

### CSRF Token Invalid

**Causa**: Cookie não sendo enviado ou token inválido

**Solução**:
```bash
# 1. Limpar cookies do browser
# 2. Verificar `credentials: 'include'` em fetch/axios
# 3. Verificar header X-CSRF-Token está sendo enviado
```

---

### IA API Não Responde

**Verificar**:
```bash
# Checar API keys no .env
cat .env | grep API_KEY

# Checar logs
tail -f logs/app-*.log | grep -i "api"
```

**Solução**:
1. Verificar API key válida
2. Verificar créditos/quota da API
3. Testar API key manualmente (curl)

---

### Dependency Conflicts

```bash
# Limpar tudo e reinstalar
rm -rf node_modules package-lock.json
npm install

# Se persistir, usar npm ci (clean install)
npm ci
```

---

## 📚 Recursos

### Documentação

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitetura do sistema
- [API.md](./API.md) - Documentação da API
- [SECURITY.md](./SECURITY.md) - Segurança e LGPD
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Como contribuir

### Stack

- [React](https://react.dev/) - UI library
- [Vite](https://vitejs.dev/) - Build tool
- [Express](https://expressjs.com/) - Backend framework
- [Drizzle ORM](https://orm.drizzle.team/) - Database ORM
- [TanStack Query](https://tanstack.com/query/latest) - Data fetching
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Radix UI](https://www.radix-ui.com/) - UI primitives

### Comunidade

- **Issues**: [GitHub Issues](https://github.com/seu-usuario/FrontendPlantao/issues)
- **Discussions**: [GitHub Discussions](https://github.com/seu-usuario/FrontendPlantao/discussions)

---

## ✅ Checklist de Setup

Antes de começar a desenvolver, verifique:

- [ ] Node.js v18+ instalado
- [ ] PostgreSQL rodando (local ou Neon)
- [ ] `.env` configurado com todas variáveis
- [ ] Dependências instaladas (`npm install`)
- [ ] Schema aplicado (`npm run db:push`)
- [ ] Setup inicial executado (`/setup`)
- [ ] Aplicação rodando (`npm run dev`)
- [ ] Login funciona (admin/admin123)
- [ ] Hot reload funcionando (edite arquivo e veja mudança)

🎉 **Tudo certo? Comece a desenvolver!**

---

**Última atualização**: 2026-01-15

**Dúvidas?** Abra uma issue no GitHub ou consulte a documentação.
