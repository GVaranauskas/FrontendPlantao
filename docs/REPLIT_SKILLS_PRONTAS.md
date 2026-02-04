# Skills Prontas para o 11Care no Replit

## Visao Geral

Este documento lista todas as ferramentas, skills e integrações **já disponíveis** no Replit que fazem sentido para o projeto 11Care, organizadas por categoria. Diferente do documento `SKILLS_ANALYSIS.md` (que propõe skills customizadas a serem criadas), este foca no que já existe e pode ser ativado/configurado imediatamente.

---

## Índice

1. [Ferramentas Nativas do Replit](#1-ferramentas-nativas-do-replit)
2. [Skills de Segurança Prontas](#2-skills-de-segurança-prontas)
3. [Skills de Banco de Dados](#3-skills-de-banco-de-dados)
4. [Skills de Deploy e Infraestrutura](#4-skills-de-deploy-e-infraestrutura)
5. [Skills de Automação e Workflows](#5-skills-de-automação-e-workflows)
6. [Integrações MCP (Model Context Protocol)](#6-integrações-mcp-model-context-protocol)
7. [Skills do Agent (IA)](#7-skills-do-agent-ia)
8. [Ferramentas Externas Compatíveis](#8-ferramentas-externas-compatíveis)
9. [Configuração Recomendada para .replit](#9-configuração-recomendada-para-replit)
10. [Checklist de Ativação](#10-checklist-de-ativação)

---

## 1. Ferramentas Nativas do Replit

### 1.1 Secrets Manager (Gerenciador de Segredos)

**Status:** Disponível | **Relevância:** CRÍTICA

O Secrets Manager do Replit armazena e criptografa variáveis sensíveis com AES-256 em repouso e TLS em trânsito, backed pelo Google Cloud Secure Secrets.

**O que usar para o 11Care:**

| Secret | Variável | Propósito |
|--------|----------|-----------|
| Chave JWT | `JWT_SECRET` | Assinatura de tokens |
| Chave Refresh | `REFRESH_SECRET` | Refresh tokens |
| Chave Criptografia | `ENCRYPTION_KEY` | AES-256-GCM dos dados |
| Sessão | `SESSION_SECRET` | Express sessions |
| OpenAI | `OPENAI_API_KEY` | Análise clínica IA |
| Anthropic | `ANTHROPIC_API_KEY` | Fallback IA |
| N8N | `N8N_WEBHOOK_SECRET` | Webhooks hospital |
| Banco | `DATABASE_URL` | Conexão PostgreSQL |
| Setup | `SETUP_KEY` | Configuração inicial |
| Admin | `DEFAULT_ADMIN_PASSWORD` | Senha admin inicial |

**Como configurar:**
1. Abrir a aba **Tools** no workspace
2. Clicar em **Secrets**
3. Adicionar cada variável (nunca colocar no código!)

**Boas práticas para LGPD:**
- NUNCA usar arquivo `.env` no Replit (não é protegido)
- NUNCA printar secrets nos logs
- NUNCA colar secrets no chat com o Agent
- Usar Secrets de nível de conta para variáveis compartilhadas entre ambientes

---

### 1.2 SQL Runner

**Status:** Disponível | **Relevância:** ALTA

Ferramenta integrada para executar queries SQL diretamente no workspace.

**Uso no 11Care:**
- Consultas de auditoria LGPD
- Verificação de dados criptografados
- Debug de dados de pacientes (em dev)
- Análise de performance de queries

**Acesso:** Tools > Database > My Data > SQL Runner

---

### 1.3 Drizzle Studio

**Status:** Disponível | **Relevância:** ALTA

Visualizador e editor de dados integrado com Drizzle ORM.

**Uso no 11Care:**
- Navegar tabelas (patients, users, audit_logs)
- Verificar integridade de dados
- Editar registros manualmente (em dev)
- Inspecionar histórico de pacientes

---

### 1.4 Shell / Console

**Status:** Disponível | **Relevância:** ALTA

Terminal integrado no workspace.

**Comandos úteis para o 11Care:**
```bash
# Verificar tipos TypeScript
npm run check

# Aplicar mudanças de schema
npm run db:push

# Verificar variáveis de ambiente carregadas
printenv | grep -E "DATABASE|JWT|ENCRYPTION"

# Verificar logs
ls -la ./logs/
```

---

### 1.5 Version Control (Git)

**Status:** Disponível | **Relevância:** ALTA

Integração Git nativa com histórico de versões automático.

**Recursos:**
- Commits automáticos a cada passo do Agent
- Viagem no tempo (rollback para qualquer ponto)
- Integração com GitHub para push/pull
- Histórico visual de mudanças

---

### 1.6 Vite Dev Banner

**Status:** Já configurado | **Relevância:** MÉDIA

Plugin Replit que mostra banner visual indicando que o app está em modo de desenvolvimento.

**Arquivo:** `package.json` - `@replit/vite-plugin-dev-banner`

**Benefício:** Impede que usuários confundam ambiente de dev com produção (proteção contra erros).

---

### 1.7 Runtime Error Modal

**Status:** Já configurado | **Relevância:** MÉDIA

Plugin que exibe erros de runtime de forma visual e clara.

**Arquivo:** `package.json` - `@replit/vite-plugin-runtime-error-modal`

**Benefício:** Ajuda desenvolvedores inexperientes a identificar e entender erros rapidamente.

---

### 1.8 Cartographer

**Status:** Já configurado | **Relevância:** BAIXA

Plugin de mapeamento de código do Replit.

**Arquivo:** `package.json` - `@replit/vite-plugin-cartographer`

**Benefício:** Indexa o código para navegação e busca mais rápida no workspace.

---

## 2. Skills de Segurança Prontas

### 2.1 Semgrep Security Scanner (Pre-Deploy)

**Status:** Disponível (ativar) | **Relevância:** CRÍTICA

Scanner de segurança integrado no Replit, powered by Semgrep Community Edition, com ~200 regras curadas para JavaScript/TypeScript.

**O que detecta:**
- Padrões de código inseguro
- Secrets expostos no código
- Dependências desatualizadas/vulneráveis
- SQL Injection patterns
- XSS vulnerabilities

**Como ativar:**
1. Nas configurações de deploy, ativar "Pre-deployment scanning"
2. O Agent pode corrigir issues encontrados automaticamente com um clique

**Relevância para LGPD:**
- Art. 46: Garante medidas técnicas de proteção
- Detecta vazamento de dados pessoais em código

---

### 2.2 HTTPS Padrão

**Status:** Ativo automaticamente | **Relevância:** CRÍTICA

Todo app no Replit usa HTTPS por padrão.

**Benefício para o 11Care:**
- Dados de pacientes sempre criptografados em trânsito
- Conformidade com LGPD Art. 46 (segurança da informação)
- Sem necessidade de configurar certificados SSL

---

### 2.3 DDoS Protection

**Status:** Ativo automaticamente | **Relevância:** ALTA

Proteção contra ataques DDoS incluída na infraestrutura Replit.

**Benefício para o 11Care:**
- Disponibilidade do sistema de plantão
- Proteção contra ataques de negação de serviço
- Complementa o rate limiting já implementado

---

### 2.4 Security Center (Enterprise)

**Status:** Disponível (Enterprise) | **Relevância:** CRÍTICA

Centro de segurança com CVE detection, SBOM export e scanning automatizado.

**Recursos:**
- Detecção de CVE por severidade
- Identificação de apps afetados
- Exportação de SBOM (Software Bill of Materials)
- Compliance SOC 2 Type II
- Bloqueio automático de deploys inseguros

**Relevância para LGPD:**
- Art. 46: Segurança e boas práticas
- Art. 50: Governança e compliance
- SBOM: Rastreabilidade de componentes

---

### 2.5 Isolamento de Containers

**Status:** Ativo automaticamente | **Relevância:** ALTA

Cada Repl roda em container Docker isolado.

**Benefício para o 11Care:**
- Dados de pacientes isolados de outros apps
- Sem compartilhamento de memória entre projetos
- Proteção contra ataques laterais

---

## 3. Skills de Banco de Dados

### 3.1 PostgreSQL Managed

**Status:** Configurado | **Relevância:** CRÍTICA

Banco PostgreSQL 16 gerenciado, atualmente na infraestrutura Replit (anteriormente Neon).

**Recursos:**
- Provisionamento com um clique
- Credenciais automáticas via Secrets
- Serverless (paga por uso)
- Suporte a Row-Level Security (RLS)

**Configuração atual do 11Care:**
```toml
# .replit
modules = ["nodejs-20", "web", "postgresql-16"]
```

---

### 3.2 Point-in-Time Restore

**Status:** Disponível (dependendo do plano) | **Relevância:** CRÍTICA

Restauração do banco de dados para qualquer ponto no tempo dentro do período de retenção.

**Uso no 11Care:**
- Recuperar dados de pacientes em caso de erro
- Rollback após migration problemática
- Auditoria LGPD (reconstituição de dados)

---

### 3.3 Ambientes Separados (Dev/Prod)

**Status:** Disponível | **Relevância:** ALTA

Bancos de dados separados para desenvolvimento e produção.

**Benefício para o 11Care:**
- Desenvolvedores trabalham com dados de teste (não reais!)
- Mudanças de schema testadas antes de produção
- Proteção contra erros de usuários inexperientes
- Conformidade LGPD (dados reais apenas em prod)

**Como usar:**
- Dev: Dados mocados, pode destruir à vontade
- Prod: Dados reais, protegido por deploy

---

### 3.4 Schema Management (My Data)

**Status:** Disponível | **Relevância:** MÉDIA

Gerenciamento visual de schema via interface.

**Uso no 11Care:**
- Visualizar tabelas, views, enums
- Verificar constraints e indexes
- Gerenciar RLS policies
- Criar funções e triggers

**Acesso:** Tools > Database > My Data

---

### 3.5 Backup Manual via pg_dump

**Status:** Disponível via shell | **Relevância:** ALTA

Backup manual usando ferramentas PostgreSQL padrão.

**Comandos:**
```bash
# Backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore
psql $DATABASE_URL < backup_20240115.sql
```

**Recomendação:** Criar workflow automático de backup diário.

---

## 4. Skills de Deploy e Infraestrutura

### 4.1 Autoscale Deployment

**Status:** Configurado | **Relevância:** ALTA

Deploy com auto-scaling baseado em demanda.

**Configuração atual:**
```toml
[deployment]
deploymentTarget = "autoscale"
build = ["npm", "run", "build"]
run = ["npm", "run", "start"]
```

**Benefício para o 11Care:**
- Escala automaticamente durante picos de plantão
- Reduz custos fora do horário
- Alta disponibilidade

---

### 4.2 Custom Domains

**Status:** Disponível (plano pago) | **Relevância:** MÉDIA

Domínio personalizado para o app.

**Uso:** `11care.hospital.com.br` em vez de `*.replit.app`

---

### 4.3 Health Checks Automáticos

**Status:** Disponível | **Relevância:** ALTA

Monitoramento de saúde do app pelo Replit.

**Benefício:** Restart automático se o app cair durante plantão.

---

### 4.4 Logs de Deploy

**Status:** Disponível | **Relevância:** MÉDIA

Logs de build e runtime acessíveis no workspace.

**Uso:** Debug de problemas em produção.

---

## 5. Skills de Automação e Workflows

### 5.1 Workflows Personalizados

**Status:** Parcialmente configurado | **Relevância:** ALTA

O Replit permite criar workflows customizados no `.replit`.

**Workflows recomendados para o 11Care:**

```toml
# Workflow: Start application (já existe)
[[workflows.workflow]]
name = "Start application"
author = "agent"

[[workflows.workflow.tasks]]
task = "shell.exec"
args = "npm run dev"
waitForPort = 5000

# Workflow: TypeScript Check
[[workflows.workflow]]
name = "TypeScript Check"
author = "agent"

[[workflows.workflow.tasks]]
task = "shell.exec"
args = "npm run check"

# Workflow: Database Push
[[workflows.workflow]]
name = "Database Sync"
author = "agent"

[[workflows.workflow.tasks]]
task = "shell.exec"
args = "npm run db:push"

# Workflow: Build Production
[[workflows.workflow]]
name = "Build Production"
author = "agent"

[[workflows.workflow.tasks]]
task = "shell.exec"
args = "npm run build"

# Workflow: Security Audit
[[workflows.workflow]]
name = "Security Audit"
author = "agent"

[[workflows.workflow.tasks]]
task = "shell.exec"
args = "npm audit"

# Workflow: Full Validation
[[workflows.workflow]]
name = "Full Validation"
mode = "sequential"
author = "agent"

[[workflows.workflow.tasks]]
task = "shell.exec"
args = "npm run check"

[[workflows.workflow.tasks]]
task = "shell.exec"
args = "npm run build"

[[workflows.workflow.tasks]]
task = "shell.exec"
args = "npm audit"
```

---

### 5.2 Timed Automations

**Status:** Disponível | **Relevância:** ALTA

Automações agendadas que rodam em horários definidos.

**Uso no 11Care:**
- Backup diário do banco de dados
- Limpeza de logs antigos
- Sync automático com sistema hospitalar (N8N)
- Relatório LGPD semanal
- Verificação de sessões expiradas

---

### 5.3 Agent Browser Testing

**Status:** Disponível (Agent 3) | **Relevância:** ALTA

O Agent testa automaticamente o app usando um browser real.

**Como funciona:**
- Agent navega pelo app como um usuário real
- Clica em botões, preenche formulários
- Identifica problemas automaticamente
- Corrige e testa novamente

**Uso no 11Care:**
- Testar fluxo de login
- Testar cadastro de pacientes
- Testar exportação de dados (LGPD)
- Testar SBAR handover
- Testar permissões por role (admin vs enfermeiro vs viewer)

---

### 5.4 Slack/Telegram Agents

**Status:** Disponível | **Relevância:** MÉDIA

Bots inteligentes para Slack ou Telegram.

**Uso no 11Care:**
- Alertas de segurança em tempo real
- Notificações de mudança de plantão
- Alertas de pacientes críticos
- Notificações de compliance LGPD

---

## 6. Integrações MCP (Model Context Protocol)

### 6.1 O que é MCP no Replit

O Agent pode se conectar a servidores MCP externos para acessar centenas de ferramentas adicionais.

**Como configurar:** Integrations > MCP Servers > Add MCP server

### 6.2 MCP Servers Recomendados para o 11Care

| MCP Server | Uso no 11Care | Prioridade |
|------------|---------------|------------|
| **Notion** | Documentação de procedimentos, runbooks | ALTA |
| **GitHub** | Code review, PR management, issues | ALTA |
| **Figma** | Design de interfaces do app | MÉDIA |
| **Stripe** | Futuro: faturamento de serviços | BAIXA |
| **BigQuery** | Analytics avançados de uso | BAIXA |
| **Miro** | Brainstorming de features, wireframes | BAIXA |
| **Linear** | Gerenciamento de tarefas/sprints | MÉDIA |

### 6.3 MCP de File Operations

**Uso:** Gerenciamento avançado de arquivos do projeto.

**Operações:**
- Leitura e escrita de arquivos
- Busca em arquivos
- Gerenciamento de variáveis de ambiente
- Operações de deploy

### 6.4 MCP de Code Generation (Gemini)

**Uso:** Geração e análise de código complementar.

**Operações:**
- Geração de código dentro do Replit
- Análise de código com modelo alternativo
- Review automatizado

---

## 7. Skills do Agent (IA)

### 7.1 Replit Agent 3

**Status:** Disponível | **Relevância:** ALTA

O Agent 3 é o assistente IA mais avançado do Replit.

**Capacidades relevantes para o 11Care:**

| Skill do Agent | Uso |
|---------------|-----|
| Full-Stack Generation | Gerar endpoints, componentes, services |
| Self-Testing | Testar automaticamente o código gerado |
| Extended Autonomy | Trabalhar até 200 min sem supervisão |
| Web Search | Buscar documentação LGPD, referências médicas |
| Debugging | Identificar e corrigir bugs automaticamente |
| Plan Mode | Planejar features antes de implementar |
| Design Mode | Criar/ajustar interfaces visuais |

---

### 7.2 Custom Agent Instructions (replit.md)

**Status:** Configurado | **Relevância:** CRÍTICA

O arquivo `replit.md` configura o comportamento do Agent.

**Instruções recomendadas para adicionar:**

```markdown
## Regras de Segurança para o Agent

### NUNCA FAZER:
- Nunca remover criptografia de campos sensíveis
- Nunca desabilitar autenticação ou autorização
- Nunca commitar secrets ou senhas
- Nunca usar console.log com dados de pacientes
- Nunca desabilitar CSRF protection
- Nunca desabilitar rate limiting
- Nunca usar 'any' em tipos TypeScript para dados de pacientes
- Nunca fazer DELETE em massa sem confirmação
- Nunca expor dados de pacientes em logs
- Nunca alterar audit_logs (tabela imutável)

### SEMPRE FAZER:
- Sempre usar Zod para validação de inputs
- Sempre criptografar campos sensíveis (nome, diagnostico, etc.)
- Sempre adicionar audit logging em novos endpoints
- Sempre usar asyncHandler para rotas async
- Sempre verificar autenticação em novos endpoints
- Sempre verificar RBAC (roles) em novos endpoints
- Sempre usar tipos TypeScript fortes
- Sempre usar o logger (winston) em vez de console.log
- Sempre testar com npm run check antes de deploy

### LGPD:
- Dados de pacientes são dados sensíveis (Art. 9)
- Toda operação de leitura/escrita deve gerar audit log
- Endpoints de direitos do titular devem ser mantidos
- Base legal: Art. 7, VIII (tutela da saúde)

### Padrões de Código:
- Backend: Route > Middleware > Service > Repository
- Frontend: Page > Component > Hook > Service
- Validação: Zod schemas em shared/schema.ts
- ORM: Drizzle (nunca raw SQL sem sanitização)
- Autenticação: JWT (15min access, 7d refresh)
- Criptografia: AES-256-GCM para dados sensíveis
```

---

### 7.3 Fast Build Mode vs Full Build Mode

**Status:** Disponível | **Relevância:** MÉDIA

| Modo | Uso no 11Care |
|------|---------------|
| Fast Build (rapido) | Prototipar features novas rapidamente |
| Full Build (completo) | Features que tocam segurança ou dados de pacientes |

**Recomendação:** Sempre usar **Full Build** para qualquer mudança que envolva:
- Dados de pacientes
- Autenticação/autorização
- Criptografia
- Endpoints de API
- Schema do banco

---

### 7.4 Max Autonomy Mode

**Status:** Disponível (Beta) | **Relevância:** MÉDIA

Permite que o Agent trabalhe por até 200 minutos autonomamente.

**Quando usar no 11Care:**
- Refatorações grandes com escopo bem definido
- Migração de schema complexa
- Implementação de features completas com testes

**Quando NÃO usar:**
- Mudanças em lógica de segurança
- Alterações em criptografia
- Mudanças no fluxo de autenticação
- Qualquer coisa que toque dados reais de pacientes

---

## 8. Ferramentas Externas Compatíveis

### 8.1 npm audit

**Status:** Disponível via shell | **Relevância:** ALTA

```bash
# Verificar vulnerabilidades em dependências
npm audit

# Corrigir automaticamente quando possível
npm audit fix
```

---

### 8.2 TypeScript Strict Mode

**Status:** Configurado | **Relevância:** ALTA

O projeto já usa TypeScript com verificação de tipos.

```bash
npm run check
```

**Proteção:** Impede erros de tipo que poderiam causar bugs em dados de pacientes.

---

### 8.3 Drizzle Kit

**Status:** Configurado | **Relevância:** ALTA

Ferramenta de migração do banco de dados.

```bash
npm run db:push
```

**Proteção:** Migrations tipadas previnem erros de schema.

---

### 8.4 ESBuild

**Status:** Configurado | **Relevância:** MÉDIA

Bundler rápido para o servidor em produção.

```bash
npm run build
```

---

### 8.5 GitHub Integration

**Status:** Disponível | **Relevância:** ALTA

Integração direta com GitHub.

**Recursos:**
- Import de repositórios
- Push/Pull
- Sincronização bidirecional
- SSH connectivity para IDEs locais

---

## 9. Configuração Recomendada para .replit

Aqui está a configuração `.replit` otimizada com todas as skills e workflows ativados:

```toml
modules = ["nodejs-20", "web", "postgresql-16"]
run = "npm run dev"
hidden = [".config", ".git", "generated-icon.png", "node_modules", "dist"]

[nix]
channel = "stable-24_05"

[deployment]
deploymentTarget = "autoscale"
build = ["npm", "run", "build"]
run = ["npm", "run", "start"]

[[ports]]
localPort = 5000
externalPort = 80

[env]
PORT = "5000"

# ============================================
# WORKFLOWS
# ============================================
[workflows]
runButton = "Project"

# --- Workflow Principal ---
[[workflows.workflow]]
name = "Project"
mode = "parallel"
author = "agent"

[[workflows.workflow.tasks]]
task = "workflow.run"
args = "Start application"

# --- Start Application ---
[[workflows.workflow]]
name = "Start application"
author = "agent"

[[workflows.workflow.tasks]]
task = "shell.exec"
args = "npm run dev"
waitForPort = 5000

# --- TypeScript Check ---
[[workflows.workflow]]
name = "TypeScript Check"
author = "agent"

[[workflows.workflow.tasks]]
task = "shell.exec"
args = "npm run check"

# --- Database Sync ---
[[workflows.workflow]]
name = "Database Sync"
author = "agent"

[[workflows.workflow.tasks]]
task = "shell.exec"
args = "npm run db:push"

# --- Build Production ---
[[workflows.workflow]]
name = "Build Production"
author = "agent"

[[workflows.workflow.tasks]]
task = "shell.exec"
args = "npm run build"

# --- Security Audit ---
[[workflows.workflow]]
name = "Security Audit"
author = "agent"

[[workflows.workflow.tasks]]
task = "shell.exec"
args = "npm audit"

# --- Full Validation (pre-deploy) ---
[[workflows.workflow]]
name = "Full Validation"
author = "agent"

[[workflows.workflow.tasks]]
task = "shell.exec"
args = "npm run check && npm run build && npm audit"

# ============================================
# AGENT CONFIGURATION
# ============================================
[agent]
integrations = ["javascript_mem_db:1.0.0"]

# ============================================
# ENVIRONMENT VARIABLES (não sensíveis)
# ============================================
[userenv]

[userenv.shared]
LOG_DIR = "./logs"
OPENAI_MODEL = "gpt-4o-mini"
ANTHROPIC_MODEL = "claude-3-5-haiku-20241022"
AUTO_SYNC_ENABLED = "true"
ENABLE_AI_ANALYSIS = "true"
MONTHLY_BUDGET = "1000"
N8N_MIN_RECORD_RATIO = "0.5"

[userenv.development]
VITE_HMR_PORT = "443"
VITE_HMR_PROTOCOL = "wss"
NODE_ENV = "development"
```

---

## 10. Checklist de Ativação

### Imediato (fazer agora)

- [ ] **Secrets Manager**: Migrar todas as variáveis sensíveis para Secrets (não .env)
- [ ] **Semgrep Scanner**: Ativar pre-deployment scanning
- [ ] **replit.md**: Adicionar instruções de segurança para o Agent
- [ ] **Workflows**: Adicionar workflows de TypeScript Check, Build e Security Audit
- [ ] **Dev/Prod Databases**: Confirmar separação de ambientes

### Curto Prazo (esta semana)

- [ ] **Agent Instructions**: Atualizar replit.md com regras LGPD
- [ ] **Full Validation Workflow**: Ativar validação completa pré-deploy
- [ ] **npm audit**: Executar e corrigir vulnerabilidades pendentes
- [ ] **Browser Testing**: Usar Agent 3 para testar fluxos críticos
- [ ] **Git Integration**: Configurar push automático para GitHub

### Médio Prazo (próximas semanas)

- [ ] **MCP Integrations**: Conectar Notion/Linear para gerenciamento
- [ ] **Timed Automations**: Configurar backup diário e limpeza de logs
- [ ] **Slack/Telegram Bot**: Alertas de segurança e mudança de plantão
- [ ] **Security Center**: Avaliar plano Enterprise para compliance

### Longo Prazo (próximo mês)

- [ ] **Custom Domain**: Configurar domínio institucional
- [ ] **SBOM Export**: Gerar inventário de software para compliance
- [ ] **Full CI/CD**: Pipeline completo com testes automáticos
- [ ] **Multi-environment**: Staging environment separado

---

## 11. Resumo Executivo - Skills por Objetivo

### Para Otimizar o Trabalho
| # | Skill Pronta | Como Ativar |
|---|-------------|-------------|
| 1 | Workflows Customizados | Adicionar no `.replit` |
| 2 | Agent 3 Full-Stack Generation | Usar no chat do Replit |
| 3 | Plan Mode | Ativar antes de features complexas |
| 4 | Fast/Full Build Modes | Selecionar no Agent |
| 5 | Drizzle Studio | Tools > Database |
| 6 | SQL Runner | Tools > Database > SQL Runner |
| 7 | MCP Integrations (Notion, Linear) | Integrations > MCP Servers |
| 8 | Max Autonomy | Ativar para tasks bem definidas |
| 9 | Figma Import | Import de designs |
| 10 | Web Search do Agent | Automático no Agent 3 |

### Para Garantir Segurança
| # | Skill Pronta | Como Ativar |
|---|-------------|-------------|
| 1 | Semgrep Pre-Deploy Scanner | Configurações de deploy |
| 2 | HTTPS Automático | Já ativo |
| 3 | DDoS Protection | Já ativo |
| 4 | Secrets Manager | Tools > Secrets |
| 5 | Container Isolation | Já ativo |
| 6 | npm audit | Shell: `npm audit` |
| 7 | TypeScript Strict | `npm run check` |
| 8 | Security Center (Enterprise) | Upgrade de plano |
| 9 | Git Version Control | Já ativo (rollback) |
| 10 | Agent Browser Testing | Agent 3 |

### Para Garantir LGPD
| # | Skill Pronta | Como Ativar |
|---|-------------|-------------|
| 1 | Secrets Manager (Art. 46) | Tools > Secrets |
| 2 | HTTPS (Art. 46) | Já ativo |
| 3 | Dev/Prod DB Separation (Art. 46) | Configurar ambientes |
| 4 | Point-in-Time Restore (Art. 18) | Verificar plano |
| 5 | SBOM Export (Art. 50) | Security Center |
| 6 | Audit via SQL Runner (Art. 37) | Tools > Database |
| 7 | Semgrep Leak Detection (Art. 46) | Pre-deploy scan |
| 8 | Container Isolation (Art. 46) | Já ativo |
| 9 | Custom Agent LGPD Rules | replit.md |
| 10 | Backup/Restore (Art. 46) | pg_dump + automação |

### Para Proteger contra Erros de Inexperientes
| # | Skill Pronta | Como Ativar |
|---|-------------|-------------|
| 1 | replit.md (regras do Agent) | Editar arquivo |
| 2 | Dev Banner (ambiente visual) | Já configurado |
| 3 | Runtime Error Modal | Já configurado |
| 4 | Full Build Mode (testa tudo) | Selecionar no Agent |
| 5 | TypeScript Check | Workflow |
| 6 | Dev/Prod DB Separados | Configurar |
| 7 | Git Rollback | Automático |
| 8 | Agent Self-Testing | Agent 3 |
| 9 | Plan Mode (revisar antes) | Ativar |
| 10 | Workflows de Validação | Adicionar no `.replit` |

---

## 12. Relação com Skills Customizadas

Este documento complementa o `SKILLS_ANALYSIS.md`. A estratégia recomendada é:

1. **Primeiro:** Ativar todas as skills prontas deste documento (custo zero de desenvolvimento)
2. **Depois:** Implementar as skills customizadas do `SKILLS_ANALYSIS.md` para preencher lacunas

**Skills prontas que substituem skills customizadas:**

| Skill Customizada | Substituída por Skill Pronta |
|-------------------|------------------------------|
| Scanner de Vulnerabilidades | Semgrep Pre-Deploy |
| Validador de Dependências | npm audit + Security Center |
| Backup/Restore | Point-in-Time Restore + pg_dump |
| Validador de Deploy | Workflows Full Validation |
| Testes Automatizados | Agent Browser Testing |

**Skills customizadas ainda necessárias (sem equivalente pronto):**

| Skill | Motivo |
|-------|--------|
| Validador LGPD completo | Específico para legislação brasileira |
| Rotação de Chaves | Sem equivalente nativo |
| Monitor de Acessos Suspeitos | Específico para healthcare |
| Gerador RIPD | Específico para LGPD |
| Detector de Breaking Changes | Específico para o projeto |
| Guia Interativo | Específico para onboarding |

---

*Documento gerado em: Fevereiro 2026*
*Versão: 1.0.0*
*Projeto: 11Care (FrontendPlantao)*
*Plataforma: Replit*
