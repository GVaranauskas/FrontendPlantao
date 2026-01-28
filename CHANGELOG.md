# Changelog

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Unreleased]

### Planejado

- Sistema de testes automatizados (Vitest + Playwright)
- Módulo de gestão de escalas de trabalho
- Módulo de gestão de leitos
- PWA/Offline mode
- Internacionalização (i18n)
- Redis para cache persistente
- GraphQL como alternativa REST

## [1.5.3] - 2026-01-27

### Adicionado

- **Filtro Interativo de Pacientes Pendentes**: Card de "Pendentes" na tela de passagem de plantão agora é clicável, filtrando a tabela para mostrar apenas pacientes com status pendente. Segue o mesmo padrão visual e funcional do filtro de pacientes críticos.
  - Indicador visual com ring e sombra quando filtro está ativo
  - Ícone de filtro aparece no card quando ativado
  - Botão de limpar filtro na barra de busca
  - Card desabilitado quando não há pacientes pendentes

### Corrigido

- **Botão "Sync N8N + IA" requeria 2 cliques**: Implementado polling inteligente que aguarda a conclusão real da sincronização antes de atualizar os dados.
  - Removido refetch imediato que buscava dados antes do processamento terminar
  - Polling progressivo com intervalos de 3s, 3s, 4s, 5s, 5s, 10s (total ~30s)
  - Verifica `lastRun` do endpoint de status para detectar conclusão
  - Refetch dos dados apenas após confirmação de que a sync terminou

## [1.5.2] - 2026-01-27

### Segurança

- **Correção de Bypass de First-Access**: Criado `requireRoleWithAuth()` que combina autenticação, verificação de primeiro acesso e RBAC. Todas as rotas protegidas agora verificam se o usuário completou a troca de senha obrigatória.
- **Proteção Universal de Rotas**:
  - 31 rotas admin em `server/routes.ts` agora usam `requireRoleWithAuth('admin')`
  - 5 rotas de IA agora usam `requireRoleWithAuth('admin', 'enfermagem')`
  - 6 rotas de usuários em `server/routes/users.ts` agora usam middleware combinado
  - 3 rotas em `server/routes/sync-gpt4o.routes.ts` agora usam `requireRoleWithAuth`
- **Remoção de Arquivos Sensíveis**:
  - Removido `cookies.txt` que continha tokens JWT expostos
  - Removido diretório `logs/` com arquivos de log potencialmente sensíveis
  - Adicionado `cookies.txt` ao `.gitignore`

## [1.5.1] - 2026-01-26

### Corrigido

- **Histórico de Pacientes Permanente**: Removida deleção automática de registros de histórico durante reativação de pacientes. O histórico agora é um log permanente de todas as altas e transferências, nunca sendo apagado mesmo quando o paciente é readmitido ou reaparece no sync N8N.

## [1.5.0] - 2026-01-23

### Adicionado

- **Troca de Senha Obrigatória no Primeiro Acesso (v1.5.0)**
  - Novos usuários são obrigados a trocar a senha temporária no primeiro login
  - Campo `firstAccess` na tabela de usuários para controlar o estado
  - Endpoint `POST /api/auth/first-access-password` para troca de senha
  - Página dedicada `/first-access` com interface isolada
  - Validação de senha: mínimo 8 caracteres, pelo menos 1 letra e 1 número
  - Middleware `requireFirstAccessComplete` bloqueia acesso a rotas protegidas
  - Invalidação e refresh automático do JWT após troca de senha
  - Redirecionamento automático para `/first-access` quando `firstAccess=true`

### Segurança

- **Proteção de Rotas para Primeiro Acesso**
  - Usuários com `firstAccess=true` só podem acessar: `/api/auth/first-access-password`, `/api/auth/me`, `/api/auth/logout`, `/api/auth/refresh`
  - Middleware aplicado a 30+ rotas no backend
  - `FirstAccessGuard` no frontend redireciona automaticamente para troca de senha

## [1.4.1] - 2026-01-23

### Corrigido

- **Bug de Inconsistência de Análise Clínica**
  - Análise individual e batch sync agora usam o mesmo serviço unificado
  - Causa raiz: chaves de cache diferentes entre os fluxos (UUID vs codigoAtendimento vs leito)
  - Solução: novo `UnifiedClinicalAnalysisService` com chave primária por `codigoAtendimento`
  - Invalidação cruzada de chaves de cache legadas para evitar dados stale

- **Bug de Sincronização no Frontend (React Query)**
  - Botão "Sync N8N + IA" agora atualiza dados na primeira chamada
  - Causa raiz: `staleTime: Infinity` combinado com `invalidateQueries` não forçava refetch
  - Solução: substituído `invalidateQueries` por `refetchQueries` em todos os pontos críticos
  - Arquivos corrigidos: shift-handover.tsx, use-sync-patient.ts, admin-menu.tsx, patients-history.tsx, PatientDetailsModal.tsx, ImportEvolucoes.tsx, PatientTable.tsx, use-auto-sync.ts

### Adicionado

- **Serviço Unificado de Análise Clínica**
  - `server/services/unified-clinical-analysis.service.ts`
  - Chave de cache: `unified-clinical:codigo:CODIGO_ATENDIMENTO` (fallback UUID, depois leito)
  - Prompt e modelo consistentes (GPT-4o-mini) para análise individual e batch
  - Interface `AnalysisResult` retorna `{ insights, fromCache }` para tracking correto

### Alterado

- Endpoint `/api/ai/clinical-analysis/:id` agora usa `UnifiedClinicalAnalysisService`
- `AutoSyncScheduler.processAIInBatches` agora usa `unifiedClinicalAnalysisService.analyzeBatch`
- Callbacks de mutations convertidos para async para aguardar refetch completar

## [1.4.0] - 2026-01-22

### Adicionado

- **Sistema de Analytics de Uso (v1.4.0)**
  - Rastreamento automatico de sessoes de usuarios, page views e acoes
  - Hook `useAnalytics` com batching (max 20 eventos ou 5 segundos)
  - Heartbeat de sessao a cada 60 segundos para monitorar usuarios ativos
  - 10 endpoints REST para eventos, sessoes e metricas
  - Dashboard administrativo com 4 abas: Visao Geral, Paginas, Acoes, Usuarios
  - Graficos interativos (pizza, barras) com Recharts
  - Filtro por periodo (24h, 7 dias, 30 dias, 90 dias)
  - Protecao RBAC (admin-only) para endpoints de metricas
  - Tabelas `user_sessions` e `analytics_events` com FK e cascade delete

- **Sistema de Sync Determinístico**
  - Arquivamento imediato quando paciente não está no N8N (sem proteção de 2 falhas)
  - Validação de sanidade antes de processar remoções (N8N_MIN_RECORD_RATIO)
  - Mínimo absoluto de 5 registros para permitir qualquer arquivamento
  - Tracking de último sync válido (lastValidSync) para comparação de thresholds

- **Feedback Detalhado Pós-Sync**
  - Toast mostra resumo: novos, atualizados, arquivados, reativados
  - Endpoint `/api/sync-gpt4o/detailed-status` com estatísticas do último sync

### Alterado

- **Lógica de Arquivamento Simplificada**
  - Remoção do `missingSyncTracker` - não há mais contagem de falhas
  - Determinação direta do motivo de arquivamento baseado em código ou leito
  - Contagem de registros N8N usa MAX(códigos, leitos) para evitar undercount

### Corrigido

- **Proteção contra Arquivamento em Massa**
  - Bloqueia remoções se N8N retorna menos de 5 registros (MIN_ABSOLUTE_RECORDS)
  - Bloqueia se retorna menos de 50% do último sync válido (configurável via N8N_MIN_RECORD_RATIO)
  - Estabelece baseline mesmo quando remoções são bloqueadas (evita oscilação)

## [1.3.2] - 2026-01-19

### Corrigido

- **Bug de Reativação de Pacientes Duplicado**
  - Corrigido erro "duplicate key constraint" nos leitos durante sincronização com N8N
  - Causa raiz: `reactivatePatient()` inseria paciente do histórico, depois `saveToDatabase()` tentava inserir novamente via UPSERT
  - Solução: agora `reactivatePatient()` apenas remove o registro do histórico, deixando o UPSERT (PASSO 3) ser o único ponto de inserção
  - Todos os 35 pacientes agora sincronizam corretamente sem erros de constraint

### Alterado

- **Fluxo de Sincronização Simplificado (3 Passos)**
  1. **PASSO 1** - Resolver conflito de leito: arquivar paciente antigo se leito ocupado por outro código de atendimento
  2. **PASSO 2** - Limpar histórico: apenas deletar registro do histórico (sem reinserir)
  3. **PASSO 3** - UPSERT: única operação de inserção/atualização com dados frescos do N8N

### Regras de Sincronização

- **Regra Core**: "Se paciente está no N8N, DEVE estar ativo no sistema"
- **Conflito de Leito**: Paciente antigo com código diferente é arquivado como "registro_antigo"
- **Reativação**: Paciente no histórico é apenas removido do histórico - dados do N8N são usados na inserção
- **Ponto Único de Inserção**: Somente `upsertPatientByCodigoAtendimento()` insere/atualiza pacientes

## [1.3.1] - 2026-01-19

### Corrigido

- **Resolução de Conflito de Leito na Sincronização**
  - Novo sistema de detecção de conflito: antes de inserir/reativar um paciente, verifica se o leito está ocupado por outro paciente com código de atendimento diferente
  - Arquivamento automático do paciente antigo (registro obsoleto) quando há conflito de leito
  - Previne erros de "duplicate key constraint" no leito durante sincronização N8N
  - Problema afetava principalmente ambiente DEV onde dados manuais/testes acumulavam registros desatualizados
  - Novos métodos de storage: `getPatientOccupyingLeitoWithDifferentCodigo`, `archiveAndRemovePatient`

### Melhorado

- Lógica do `saveToDatabase` agora opera em 3 passos ordenados:
  1. Verificar e resolver conflito de leito (arquivar paciente antigo se necessário)
  2. Verificar e reativar paciente arquivado se existir no histórico
  3. Fazer UPSERT com dados atualizados do N8N
- Logs detalhados para conflitos de leito detectados e resolvidos

## [1.3.0] - 2026-01-16

### Adicionado

- **Reativação Automática de Pacientes**
  - Pacientes arquivados que aparecem nos dados do N8N são automaticamente reativados
  - Estratégia de busca dual: primário por `codigoAtendimento`, fallback por `leito`
  - Deduplicação para evitar reativações repetidas no mesmo ciclo de sync
  - Regra core: "Se paciente está no N8N, DEVE estar ativo no sistema"
  - Novos métodos de storage: `getPatientHistoryByCodigoAtendimento`, `getPatientHistoryByLeito`

- **Métricas de Reativação (Interno)**
  - Novo campo `reactivatedRecords` nas estatísticas internas do sync
  - Log detalhado de pacientes reativados automaticamente no console

### Melhorado

- Auto Sync Scheduler agora preserva dados de pacientes que retornam após arquivamento
- Lógica de UPSERT atualiza dados do paciente reativado com informações mais recentes do N8N

## [1.2.0] - 2026-01-15

### Adicionado

- **Documentação Completa**
  - CONTRIBUTING.md - Guia de contribuição
  - ARCHITECTURE.md - Arquitetura do sistema
  - SECURITY.md - Política de segurança e LGPD
  - API.md - Documentação completa da API
  - DEVELOPMENT.md - Guia de desenvolvimento
  - AI_INTEGRATION.md - Sistema de IA
  - TESTING.md - Estratégia de testes
  - CHANGELOG.md - Este arquivo

### Melhorado

- Configurações de impressão de PDF para exibir mais informações por página
- Estabilidade de carregamento de página para todos navegadores

### Removido

- Módulo de relatórios diários da interface (temporariamente)

## [1.1.0] - 2026-01-10

### Adicionado

- **Sistema de Otimização de IA (4 Camadas)**
  - Camada 1: Change Detection Service (85-90% economia)
  - Camada 2: Intelligent Cache (60-80% economia)
  - Camada 3: GPT-4o-mini (50% economia vs GPT-4)
  - Camada 4: Auto Sync Scheduler (95%+ economia)
  - Economia total: ~99.8%
  - Dashboard de custos em tempo real

- **Análise Clínica Assistida por IA**
  - Análise SBAR automatizada
  - Classificação de riscos (quedas, lesão por pressão, infecção, etc.)
  - Recomendações de enfermagem
  - Protocolos assistenciais
  - Indicadores do plantão

### Melhorado

- Redução de custos de IA de R$ 1,50 para R$ 0,003 por análise
- Performance geral do sistema

## [1.0.0] - 2026-01-01

### Adicionado

- **Sistema de Passagem de Plantão SBAR**
  - Tabela de pacientes com 18 colunas de dados clínicos
  - Busca e filtros avançados
  - Cards de estatísticas
  - Exportação para Excel
  - Impressão de relatórios formatados
  - Status de API com indicador de latência

- **Integração N8N**
  - Webhook para importação de evoluções de pacientes
  - Webhook para sincronização de unidades de internação
  - Mapeamento automático de campos
  - Validação de secret e IP whitelist
  - Retry logic com exponential backoff

- **Sistema de Segurança LGPD-Compliant**
  - Criptografia AES-256-GCM para dados sensíveis
  - Autenticação JWT com refresh tokens
  - Autorização RBAC (admin, enfermagem, visualizador)
  - Proteção CSRF
  - Rate limiting
  - Headers de segurança (Helmet)
  - Validação de entrada (SQL injection, XSS)

- **Auditoria Completa (LGPD Art. 37)**
  - Log de todas operações (CREATE, READ, UPDATE, DELETE)
  - Identificação de usuário, IP, User Agent
  - Registro de mudanças (before/after)
  - Retenção de logs por 5 anos

- **Gestão de Usuários**
  - CRUD completo
  - Roles e permissões
  - Validação de senha forte
  - Status ativo/inativo

- **Gestão de Enfermarias**
  - CRUD de unidades de internação
  - Sincronização automática diária (6h AM)
  - Detecção de mudanças com workflow de aprovação
  - Templates customizáveis por enfermaria

- **Sistema de Notas de Pacientes**
  - Notas não clínicas editáveis
  - Auditoria completa de mudanças
  - Notificações para usuários afetados
  - Deleção apenas por admin com motivo obrigatório

- **Histórico de Pacientes**
  - Arquivamento com motivo (alta, transferência, óbito, registro antigo)
  - Snapshot completo preservado
  - Clinical insights preservados
  - Busca e visualização de histórico

- **Interface Profissional**
  - Design system baseado em Radix UI + Tailwind CSS
  - Cores e identidade visual 11Care
  - Responsivo (mobile + desktop)
  - Acessibilidade (ARIA)

### Técnico

- **Frontend**
  - React 18.3.1
  - TypeScript 5.6.3
  - Vite 5.4.20
  - TanStack Query 5.60.5
  - Wouter 3.3.5 (routing)
  - Tailwind CSS 3.4.17
  - Radix UI
  - React Hook Form + Zod

- **Backend**
  - Node.js + Express 4.21.2
  - TypeScript (ESM)
  - Drizzle ORM 0.39.1
  - PostgreSQL (Neon DB)
  - Winston logging
  - bcryptjs para hash de senhas
  - jsonwebtoken para JWT

- **IA**
  - OpenAI GPT-4o-mini
  - Anthropic Claude Haiku 3.5 (fallback)

- **Segurança**
  - Helmet 8.1.0
  - csurf 1.11.0
  - express-rate-limit 8.2.1
  - Criptografia AES-256-GCM

## Tipos de Mudanças

Este changelog usa os seguintes tipos de mudanças:

- **Adicionado** - Novas funcionalidades
- **Alterado** - Mudanças em funcionalidades existentes
- **Descontinuado** - Funcionalidades que serão removidas em breve
- **Removido** - Funcionalidades removidas
- **Corrigido** - Correção de bugs
- **Segurança** - Vulnerabilidades de segurança corrigidas
- **Melhorado** - Melhorias de performance ou UX
- **Técnico** - Mudanças técnicas (refatoração, dependências, etc.)

## Versionamento

Este projeto usa **Versionamento Semântico**: MAJOR.MINOR.PATCH

- **MAJOR**: Mudanças incompatíveis com versões anteriores (breaking changes)
- **MINOR**: Novas funcionalidades compatíveis com versões anteriores
- **PATCH**: Correções de bugs compatíveis com versões anteriores

### Exemplo

- `1.0.0` → `2.0.0` - Breaking change (ex: mudança na estrutura da API)
- `1.0.0` → `1.1.0` - Nova funcionalidade (ex: novo módulo)
- `1.0.0` → `1.0.1` - Correção de bug (ex: fix de validação)

## Breaking Changes

Quando uma versão contém breaking changes, elas são destacadas no topo da seção:

```markdown
## [2.0.0] - 2026-06-01

### ⚠️ BREAKING CHANGES

- Estrutura da resposta da API `/api/patients` foi alterada
  - **Antes**: Retornava array direto
  - **Agora**: Retorna objeto com propriedade `patients`
  - **Migração**: Atualizar código para acessar `response.patients` ao invés de `response`

### Alterado
- ...
```

## Como Contribuir

Ao fazer um pull request, adicione suas mudanças na seção `[Unreleased]` no topo do arquivo:

```markdown
## [Unreleased]

### Adicionado
- Sua nova funcionalidade aqui
```

Ao fazer um release, mova o conteúdo de `[Unreleased]` para uma nova seção de versão.

---

## Versões Anteriores

### Pré-lançamento

Versões anteriores a 1.0.0 foram desenvolvidas internamente e não possuem changelog público.

---

**Formato**: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/)

**Versionamento**: [Semantic Versioning](https://semver.org/lang/pt-BR/)

**Última atualização**: 2026-01-23
