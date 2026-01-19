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

**Última atualização**: 2026-01-16
