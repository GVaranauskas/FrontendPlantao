# Plano de Testes QA - Sistema 11Care Nursing Platform

**Versão:** 1.0
**Data:** 13/01/2026
**Sistema:** 11Care - Plataforma de Gestão de Enfermagem Hospitalar

---

## 1. INTRODUÇÃO

### 1.1 Objetivo do Documento
Este plano de testes define os procedimentos e casos de teste que devem ser executados pela equipe de QA para validar o sistema 11Care Nursing Platform, garantindo qualidade, segurança e conformidade com requisitos funcionais e não-funcionais.

### 1.2 Escopo do Sistema
O 11Care é uma plataforma web full-stack para gestão de enfermagem hospitalar que inclui:
- Gestão de passagem de plantão (metodologia SBAR)
- Gerenciamento de pacientes e dados clínicos
- Análise clínica com IA (Claude/OpenAI)
- Integração com N8N para sincronização de dados
- Sistema de auditoria conforme LGPD
- Gestão de usuários e unidades de internação

### 1.3 Tecnologias
- **Frontend:** React 18 + TypeScript + Vite
- **Backend:** Node.js + Express + TypeScript
- **Banco de Dados:** PostgreSQL
- **IA:** Claude Haiku 3.5 / OpenAI GPT-4o-mini
- **Integrações:** N8N API, WebSocket

---

## 2. ESTRATÉGIA DE TESTES

### 2.1 Tipos de Testes
- **Testes Funcionais:** Validação de requisitos e funcionalidades
- **Testes de Integração:** Validação de comunicação entre componentes
- **Testes de Segurança:** Validação de autenticação, autorização e LGPD
- **Testes de Performance:** Validação de tempos de resposta e escalabilidade
- **Testes de Usabilidade:** Validação da experiência do usuário
- **Testes de API:** Validação de endpoints REST
- **Testes de Regressão:** Garantir que novas alterações não quebrem funcionalidades existentes

### 2.2 Ambientes de Teste
- **Desenvolvimento:** Para testes iniciais
- **Homologação:** Para testes completos antes de produção
- **Produção:** Smoke tests pós-deploy

### 2.3 Papéis e Responsabilidades
- **QA Lead:** Coordenação dos testes e revisão do plano
- **QA Tester:** Execução dos casos de teste
- **QA Automation:** Automação de testes críticos
- **Dev Team:** Correção de bugs identificados

---

## 3. CASOS DE TESTE FUNCIONAIS

### 3.1 AUTENTICAÇÃO E AUTORIZAÇÃO

#### TC-AUTH-001: Login com Credenciais Válidas (Admin)
**Prioridade:** Alta
**Pré-condições:**
- Sistema iniciado e acessível
- Usuário admin existe no banco de dados

**Passos:**
1. Acessar a página de login (`/login`)
2. Inserir username válido de admin
3. Inserir senha válida
4. Clicar em "Entrar"

**Resultado Esperado:**
- Redirecionamento para dashboard principal
- Token JWT armazenado nos cookies
- Nome do usuário visível no header
- Menu com todas opções de admin disponíveis

**Dados de Teste:**
- Username: admin
- Senha: Admin@123

---

#### TC-AUTH-002: Login com Credenciais Válidas (Enfermagem)
**Prioridade:** Alta
**Pré-condições:**
- Usuário de enfermagem existe no banco

**Passos:**
1. Acessar `/login`
2. Inserir username de enfermagem
3. Inserir senha válida
4. Clicar em "Entrar"

**Resultado Esperado:**
- Redirecionamento para dashboard
- Menu limitado (sem opções de admin)
- Acesso apenas a funcionalidades permitidas

---

#### TC-AUTH-003: Login com Senha Inválida
**Prioridade:** Alta
**Passos:**
1. Acessar `/login`
2. Inserir username válido
3. Inserir senha incorreta
4. Clicar em "Entrar"

**Resultado Esperado:**
- Mensagem de erro: "Credenciais inválidas"
- Usuário permanece na tela de login
- Não redireciona para dashboard

---

#### TC-AUTH-004: Login com Usuário Inexistente
**Prioridade:** Média
**Passos:**
1. Acessar `/login`
2. Inserir username que não existe
3. Inserir qualquer senha
4. Clicar em "Entrar"

**Resultado Esperado:**
- Mensagem de erro genérica
- Sem revelação de existência/inexistência do usuário (segurança)

---

#### TC-AUTH-005: Logout de Usuário
**Prioridade:** Alta
**Pré-condições:**
- Usuário logado

**Passos:**
1. Clicar no botão de logout/sair
2. Confirmar logout (se aplicável)

**Resultado Esperado:**
- Redirecionamento para `/login`
- Cookies de sessão removidos
- Tentativa de acessar páginas protegidas redireciona para login

---

#### TC-AUTH-006: Refresh Token Automático
**Prioridade:** Média
**Pré-condições:**
- Usuário logado
- Token próximo da expiração

**Passos:**
1. Permanecer logado por tempo próximo à expiração do token
2. Realizar uma ação no sistema

**Resultado Esperado:**
- Token renovado automaticamente
- Usuário permanece logado sem interrupção

---

#### TC-AUTH-007: Sessão Expirada
**Prioridade:** Alta
**Pré-condições:**
- Usuário logado
- Token expirado (simular aguardar 24h)

**Passos:**
1. Tentar acessar qualquer página protegida

**Resultado Esperado:**
- Redirecionamento para login
- Mensagem: "Sessão expirada, faça login novamente"

---

#### TC-AUTH-008: Acesso a Recurso sem Permissão (Enfermagem)
**Prioridade:** Alta
**Pré-condições:**
- Usuário de enfermagem logado

**Passos:**
1. Tentar acessar `/admin-usuarios` diretamente pela URL

**Resultado Esperado:**
- Acesso negado (403 Forbidden)
- Mensagem: "Você não tem permissão para acessar este recurso"
- Redirecionamento ou página de erro

---

#### TC-AUTH-009: Setup Inicial do Sistema
**Prioridade:** Alta
**Pré-condições:**
- Sistema sem usuários cadastrados
- SETUP_KEY configurada nas variáveis de ambiente

**Passos:**
1. Acessar `/setup`
2. Inserir SETUP_KEY válida
3. Preencher dados do primeiro usuário admin
4. Submeter formulário

**Resultado Esperado:**
- Primeiro usuário admin criado
- Redirecionamento para login
- Mensagem de sucesso

---

#### TC-AUTH-010: Setup com SETUP_KEY Inválida
**Prioridade:** Média
**Passos:**
1. Acessar `/setup`
2. Inserir SETUP_KEY incorreta
3. Tentar criar usuário

**Resultado Esperado:**
- Erro de autenticação
- Usuário não criado

---

### 3.2 GESTÃO DE PACIENTES

#### TC-PAT-001: Listar Todos os Pacientes
**Prioridade:** Alta
**Pré-condições:**
- Usuário logado
- Pacientes cadastrados no sistema

**Passos:**
1. Acessar página "Passagem de Plantão" (`/shift-handover`)
2. Verificar tabela de pacientes

**Resultado Esperado:**
- Tabela com 18 colunas exibida
- Lista de todos os pacientes ativos
- Dados descriptografados e legíveis
- Colunas: Leito, Nome, Registro, Data Nasc., Sexo, Idade, Diagnóstico, etc.

---

#### TC-PAT-002: Visualizar Detalhes de um Paciente
**Prioridade:** Alta
**Pré-condições:**
- Paciente específico cadastrado

**Passos:**
1. Na tabela de pacientes, clicar em um paciente
2. Verificar modal/painel de detalhes

**Resultado Esperado:**
- Modal com todos os dados do paciente
- Informações clínicas completas
- Histórico de notas (se houver)
- Insights clínicos da IA (se disponíveis)

---

#### TC-PAT-003: Criar Novo Paciente Manualmente
**Prioridade:** Alta
**Pré-condições:**
- Usuário com permissão de escrita

**Passos:**
1. Clicar em "Adicionar Paciente" ou equivalente
2. Preencher todos os campos obrigatórios:
   - Leito (único)
   - Nome
   - Registro
   - Data de Nascimento
   - Sexo
   - Diagnóstico
3. Submeter formulário

**Resultado Esperado:**
- Paciente criado com sucesso
- Mensagem de confirmação
- Dados criptografados no banco (nome, registro, etc.)
- Paciente aparece na lista
- Registro no audit_log

---

#### TC-PAT-004: Criar Paciente com Leito Duplicado
**Prioridade:** Média
**Passos:**
1. Tentar criar paciente com número de leito já existente
2. Submeter formulário

**Resultado Esperado:**
- Erro de validação
- Mensagem: "Leito já está ocupado"
- Paciente não criado

---

#### TC-PAT-005: Editar Dados de Paciente
**Prioridade:** Alta
**Pré-condições:**
- Paciente existente

**Passos:**
1. Selecionar paciente
2. Clicar em "Editar"
3. Modificar campo (ex: diagnóstico)
4. Salvar alterações

**Resultado Esperado:**
- Dados atualizados no banco
- Mensagem de sucesso
- Alterações refletidas na tabela
- Registro de auditoria com before/after

---

#### TC-PAT-006: Deletar Paciente (Admin)
**Prioridade:** Alta
**Pré-condições:**
- Usuário admin logado
- Paciente existente

**Passos:**
1. Selecionar paciente
2. Clicar em "Deletar"
3. Confirmar deleção

**Resultado Esperado:**
- Paciente removido do banco
- Mensagem de confirmação
- Paciente não aparece mais na lista
- Registro no audit_log

---

#### TC-PAT-007: Tentar Deletar Paciente (Enfermagem)
**Prioridade:** Alta
**Pré-condições:**
- Usuário de enfermagem logado

**Passos:**
1. Tentar deletar paciente via interface ou API

**Resultado Esperado:**
- Ação bloqueada
- Mensagem: "Sem permissão para deletar pacientes"
- Paciente permanece no sistema

---

#### TC-PAT-008: Adicionar Notas ao Paciente
**Prioridade:** Alta
**Pré-condições:**
- Paciente existente
- Usuário logado

**Passos:**
1. Abrir detalhes do paciente
2. Localizar seção "Notas do Paciente"
3. Adicionar texto nas notas
4. Salvar

**Resultado Esperado:**
- Notas salvas no campo `notasPaciente`
- Campo `notasUpdatedAt` atualizado
- Campo `notasUpdatedBy` preenchido com ID do usuário
- Histórico de notas preservado (se aplicável)

---

#### TC-PAT-009: Visualizar Histórico de Notas
**Prioridade:** Média
**Pré-condições:**
- Paciente com múltiplas atualizações de notas

**Passos:**
1. Abrir detalhes do paciente
2. Acessar "Histórico de Notas"

**Resultado Esperado:**
- Lista cronológica de alterações
- Cada entrada mostra: data, hora, usuário, conteúdo anterior

---

#### TC-PAT-010: Filtrar Pacientes por Enfermaria
**Prioridade:** Média
**Pré-condições:**
- Pacientes em múltiplas enfermarias

**Passos:**
1. Na página principal, usar filtro de enfermaria
2. Selecionar enfermaria específica (ex: "10A")

**Resultado Esperado:**
- Tabela atualizada mostrando apenas pacientes da enfermaria selecionada
- Contador de pacientes ajustado

---

#### TC-PAT-011: Buscar Paciente por Nome
**Prioridade:** Média
**Passos:**
1. Usar campo de busca
2. Digitar parte do nome do paciente

**Resultado Esperado:**
- Resultados filtrados em tempo real
- Pacientes com nome correspondente exibidos

---

#### TC-PAT-012: Buscar Paciente por Leito
**Prioridade:** Média
**Passos:**
1. Usar campo de busca
2. Digitar número do leito

**Resultado Esperado:**
- Paciente específico encontrado
- Busca case-insensitive

---

#### TC-PAT-013: Ordenar Pacientes por Coluna
**Prioridade:** Baixa
**Passos:**
1. Clicar no cabeçalho de uma coluna (ex: "Nome")
2. Verificar ordenação
3. Clicar novamente para ordem inversa

**Resultado Esperado:**
- Tabela ordenada alfabeticamente/numericamente
- Alternância entre ASC e DESC

---

#### TC-PAT-014: Validação de Campos Obrigatórios
**Prioridade:** Alta
**Passos:**
1. Tentar criar/editar paciente
2. Deixar campos obrigatórios em branco
3. Submeter formulário

**Resultado Esperado:**
- Erros de validação exibidos
- Mensagens específicas para cada campo
- Formulário não submetido

---

#### TC-PAT-015: Validação de Formato de Data
**Prioridade:** Média
**Passos:**
1. Inserir data de nascimento em formato inválido (ex: "32/13/2020")
2. Tentar salvar

**Resultado Esperado:**
- Erro de validação
- Mensagem: "Data inválida"

---

### 3.3 IMPORTAÇÃO E SINCRONIZAÇÃO DE DADOS

#### TC-IMP-001: Importação Completa de Evoluções (N8N)
**Prioridade:** Crítica
**Pré-condições:**
- N8N API acessível
- Webhook secret configurado

**Passos:**
1. Acessar página de importação (`/import`)
2. Clicar em "Importar Todas as Evoluções"
3. Aguardar processamento

**Resultado Esperado:**
- Requisição enviada para N8N
- WebSocket conectado para progresso em tempo real
- Pacientes importados/atualizados no banco
- Mensagem de sucesso com estatísticas (total, importados, erros)
- Registro em `import_history`
- Dados sensíveis criptografados

---

#### TC-IMP-002: Importação por Enfermaria Específica
**Prioridade:** Alta
**Passos:**
1. Na página de importação, selecionar enfermaria (ex: "10A")
2. Clicar em "Importar"

**Resultado Esperado:**
- Apenas pacientes da enfermaria selecionada importados
- Outros pacientes não afetados

---

#### TC-IMP-003: Importação com N8N API Indisponível
**Prioridade:** Alta
**Pré-condições:**
- Simular N8N API offline (desconectar rede ou usar mock)

**Passos:**
1. Tentar importar evoluções

**Resultado Esperado:**
- Erro de timeout após 30s
- Mensagem: "Erro ao conectar com N8N API"
- Sistema permanece funcional
- Sem corrupção de dados

---

#### TC-IMP-004: Verificar Status da API N8N
**Prioridade:** Média
**Passos:**
1. Acessar `/import`
2. Verificar indicador de status da API

**Resultado Esperado:**
- Indicador verde se API disponível
- Indicador vermelho se indisponível
- Última verificação com timestamp

---

#### TC-IMP-005: Visualizar Histórico de Importações
**Prioridade:** Média
**Pré-condições:**
- Múltiplas importações realizadas

**Passos:**
1. Acessar página de histórico de importações
2. Visualizar lista de importações anteriores

**Resultado Esperado:**
- Lista cronológica com:
  - Data/hora
  - Enfermaria
  - Total de registros
  - Importados com sucesso
  - Erros
  - Duração
- Possibilidade de expandir detalhes de cada importação

---

#### TC-IMP-006: Sincronização Individual de Paciente
**Prioridade:** Alta
**Pré-condições:**
- Paciente existe no sistema

**Passos:**
1. Abrir detalhes do paciente
2. Clicar em "Sincronizar dados" ou ícone de refresh
3. Aguardar processamento

**Resultado Esperado:**
- Dados atualizados do N8N
- Mensagem de sucesso
- Timestamp de última sincronização atualizado

---

#### TC-IMP-007: Sincronização em Lote (Múltiplos Pacientes)
**Prioridade:** Alta
**Passos:**
1. Selecionar múltiplos pacientes na tabela (checkboxes)
2. Clicar em "Sincronizar Selecionados"

**Resultado Esperado:**
- Todos pacientes selecionados sincronizados
- Progresso exibido
- Relatório final com sucessos/falhas

---

#### TC-IMP-008: Validação de Dados Importados
**Prioridade:** Alta
**Pré-condições:**
- Dados no N8N com campos obrigatórios faltando

**Passos:**
1. Importar dados com inconsistências

**Resultado Esperado:**
- Registros inválidos rejeitados
- Registros válidos importados
- Relatório de erros detalhado
- Log de validação

---

#### TC-IMP-009: Notificação em Tempo Real (WebSocket)
**Prioridade:** Média
**Passos:**
1. Iniciar importação grande
2. Observar painel de progresso

**Resultado Esperado:**
- Progresso atualizado em tempo real via WebSocket
- Barra de progresso funcional
- Mensagens de status atualizadas
- Sem necessidade de refresh manual

---

#### TC-IMP-010: Cleanup de Logs Antigos (Admin)
**Prioridade:** Baixa
**Pré-condições:**
- Admin logado
- Logs de importação com mais de 90 dias

**Passos:**
1. Acessar painel de admin
2. Executar "Limpar logs antigos"

**Resultado Esperado:**
- Logs antigos removidos
- Logs recentes preservados
- Mensagem de confirmação com quantidade removida

---

### 3.4 ANÁLISE CLÍNICA COM IA

#### TC-AI-001: Análise Clínica Individual (Claude)
**Prioridade:** Alta
**Pré-condições:**
- ANTHROPIC_API_KEY configurada
- Paciente com dados clínicos completos

**Passos:**
1. Abrir detalhes do paciente
2. Clicar em "Analisar com IA" ou similar
3. Aguardar processamento

**Resultado Esperado:**
- Insights clínicos gerados
- Exibição de:
  - Resumo do estado clínico
  - Pontos de atenção
  - Recomendações de cuidados
- Dados cacheados em `clinicalInsights`
- Timestamp atualizado

---

#### TC-AI-002: Análise Clínica em Lote
**Prioridade:** Alta
**Passos:**
1. Selecionar múltiplos pacientes
2. Clicar em "Analisar Todos"

**Resultado Esperado:**
- Análises processadas em paralelo (com rate limiting)
- Progresso exibido
- Insights salvos para cada paciente

---

#### TC-AI-003: Fallback para OpenAI (Claude Indisponível)
**Prioridade:** Alta
**Pré-condições:**
- ANTHROPIC_API_KEY inválida ou API offline
- OPENAI_API_KEY válida

**Passos:**
1. Tentar análise clínica

**Resultado Esperado:**
- Sistema usa GPT-4o-mini automaticamente
- Mensagem informando uso de modelo alternativo
- Análise completa com sucesso

---

#### TC-AI-004: Cache de Insights Clínicos
**Prioridade:** Média
**Pré-condições:**
- Paciente já analisado recentemente

**Passos:**
1. Solicitar análise clínica de paciente já analisado
2. Verificar timestamp de `clinicalInsightsUpdatedAt`

**Resultado Esperado:**
- Insights em cache retornados imediatamente
- Sem nova chamada à API de IA
- Economia de custos

---

#### TC-AI-005: Invalidação de Cache por Mudança de Dados
**Prioridade:** Alta
**Passos:**
1. Analisar paciente
2. Editar dados clínicos do paciente (ex: diagnóstico)
3. Solicitar análise novamente

**Resultado Esperado:**
- Cache invalidado
- Nova análise realizada com dados atualizados
- Insights refletem mudanças

---

#### TC-AI-006: Detecção de Mudanças (Change Detection)
**Prioridade:** Média
**Passos:**
1. Executar auto-sync em paciente sem mudanças de dados

**Resultado Esperado:**
- Sistema detecta que dados não mudaram
- Análise não executada
- Log indica "no changes detected"
- Economia de 85-90% em custos

---

#### TC-AI-007: Auto-Sync Agendado (Hourly)
**Prioridade:** Alta
**Pré-condições:**
- AUTO_SYNC_CRON configurado (ex: "0 * * * *")
- Sistema rodando

**Passos:**
1. Aguardar execução do cron job (hora cheia)
2. Verificar logs

**Resultado Esperado:**
- Sincronização automática executada
- Pacientes críticos (VERMELHO) priorizados
- GPT-4o-mini usado para otimizar custos
- Logs de execução gerados

---

#### TC-AI-008: Intelligent Cache por Criticidade
**Prioridade:** Média
**Passos:**
1. Analisar paciente VERMELHO (crítico)
2. Analisar paciente VERDE (normal)
3. Verificar tempos de cache

**Resultado Esperado:**
- VERMELHO: cache de 24h
- AMARELO: cache de 6h
- VERDE: cache de 2h
- Pacientes críticos têm cache mais longo

---

#### TC-AI-009: Monitoramento de Custos de IA
**Prioridade:** Baixa
**Pré-condições:**
- Admin logado

**Passos:**
1. Acessar dashboard de custos
2. Visualizar métricas

**Resultado Esperado:**
- Estatísticas de uso de API
- Custos estimados por período
- Gráficos de uso por modelo (Claude vs OpenAI)
- Economia gerada por cache/change detection

---

#### TC-AI-010: Erro na API de IA
**Prioridade:** Alta
**Pré-condições:**
- Ambas APIs (Claude e OpenAI) indisponíveis ou com erro

**Passos:**
1. Tentar análise clínica

**Resultado Esperado:**
- Mensagem de erro amigável
- Sugestão para tentar novamente mais tarde
- Sistema permanece funcional (outras features disponíveis)
- Erro logado para debugging

---

### 3.5 GESTÃO DE USUÁRIOS

#### TC-USER-001: Criar Novo Usuário Admin (por Admin)
**Prioridade:** Alta
**Pré-condições:**
- Admin logado

**Passos:**
1. Acessar `/admin-usuarios`
2. Clicar em "Adicionar Usuário"
3. Preencher:
   - Username (único)
   - Email
   - Nome
   - Senha (mínimo 8 chars, complexidade)
   - Role: Admin
4. Salvar

**Resultado Esperado:**
- Usuário criado
- Senha hasheada com bcrypt
- Aparece na lista de usuários
- Registro no audit_log

---

#### TC-USER-002: Criar Usuário de Enfermagem
**Prioridade:** Alta
**Passos:**
1. Acessar gestão de usuários
2. Criar usuário com role "enfermagem"

**Resultado Esperado:**
- Usuário criado com permissões limitadas
- Pode fazer login
- Acesso restrito a funcionalidades de enfermagem

---

#### TC-USER-003: Editar Dados de Usuário
**Prioridade:** Alta
**Passos:**
1. Selecionar usuário existente
2. Editar nome ou email
3. Salvar

**Resultado Esperado:**
- Dados atualizados
- Mensagem de sucesso
- Auditoria registrada

---

#### TC-USER-004: Alterar Senha de Usuário
**Prioridade:** Alta
**Passos:**
1. Editar usuário
2. Fornecer nova senha
3. Salvar

**Resultado Esperado:**
- Senha atualizada e re-hasheada
- Usuário pode fazer login com nova senha
- Senha antiga não funciona mais

---

#### TC-USER-005: Deletar Usuário
**Prioridade:** Média
**Passos:**
1. Selecionar usuário
2. Clicar em "Deletar"
3. Confirmar

**Resultado Esperado:**
- Usuário removido
- Não pode mais fazer login
- Registros de auditoria preservados

---

#### TC-USER-006: Desativar Usuário (isActive = false)
**Prioridade:** Alta
**Passos:**
1. Editar usuário
2. Marcar como inativo
3. Salvar

**Resultado Esperado:**
- Usuário desativado
- Login bloqueado
- Usuário não deletado (histórico preservado)

---

#### TC-USER-007: Tentar Criar Usuário com Username Duplicado
**Prioridade:** Média
**Passos:**
1. Tentar criar usuário com username já existente

**Resultado Esperado:**
- Erro de validação
- Mensagem: "Username já está em uso"

---

#### TC-USER-008: Validação de Política de Senha
**Prioridade:** Alta
**Passos:**
1. Tentar criar usuário com senha fraca (ex: "123")

**Resultado Esperado:**
- Erro de validação
- Mensagem: "Senha deve ter no mínimo 8 caracteres, incluir maiúsculas, minúsculas, números e caracteres especiais"

---

#### TC-USER-009: Listar Todos os Usuários
**Prioridade:** Média
**Passos:**
1. Acessar `/admin-usuarios`

**Resultado Esperado:**
- Tabela com todos os usuários
- Colunas: Username, Nome, Email, Role, Status, Último Login
- Opções de ações (editar, deletar)

---

#### TC-USER-010: Filtrar Usuários por Role
**Prioridade:** Baixa
**Passos:**
1. Na lista de usuários, aplicar filtro de role

**Resultado Esperado:**
- Apenas usuários do role selecionado exibidos

---

### 3.6 GESTÃO DE UNIDADES DE INTERNAÇÃO

#### TC-UNIT-001: Listar Unidades de Internação
**Prioridade:** Alta
**Passos:**
1. Acessar página de unidades de internação

**Resultado Esperado:**
- Lista de todas as unidades
- Informações: código, nome, localização, ramal, status (ativo/inativo)

---

#### TC-UNIT-002: Sincronização de Unidades (N8N)
**Prioridade:** Alta
**Pré-condições:**
- Admin logado

**Passos:**
1. Clicar em "Sincronizar Unidades"
2. Aguardar processamento

**Resultado Esperado:**
- Requisição enviada para N8N
- Novas unidades detectadas e registradas em `nursing_unit_changes`
- Status: "pending"
- Notificação de mudanças pendentes

---

#### TC-UNIT-003: Aprovar Criação de Nova Unidade
**Prioridade:** Alta
**Pré-condições:**
- Mudança pendente de tipo "create"

**Passos:**
1. Acessar "Mudanças Pendentes"
2. Visualizar detalhes da nova unidade
3. Clicar em "Aprovar"

**Resultado Esperado:**
- Nova unidade criada em `nursing_units`
- Status da mudança: "approved"
- Campo `reviewedBy` preenchido
- Unidade disponível no sistema

---

#### TC-UNIT-004: Rejeitar Criação de Nova Unidade
**Prioridade:** Média
**Passos:**
1. Visualizar mudança pendente
2. Clicar em "Rejeitar"

**Resultado Esperado:**
- Status: "rejected"
- Unidade NÃO criada
- Registro preservado para auditoria

---

#### TC-UNIT-005: Aprovar Atualização de Unidade Existente
**Prioridade:** Alta
**Pré-condições:**
- Mudança pendente de tipo "update"

**Passos:**
1. Visualizar mudança
2. Ver antes/depois (oldValue vs newValue)
3. Aprovar

**Resultado Esperado:**
- Unidade atualizada
- Campo específico modificado
- Histórico de mudanças preservado

---

#### TC-UNIT-006: Aprovar Todas as Mudanças em Lote
**Prioridade:** Média
**Pré-condições:**
- Múltiplas mudanças pendentes

**Passos:**
1. Clicar em "Aprovar Todas"
2. Confirmar ação

**Resultado Esperado:**
- Todas as mudanças aprovadas
- Unidades criadas/atualizadas em massa
- Confirmação de operação em lote

---

#### TC-UNIT-007: Contador de Mudanças Pendentes
**Prioridade:** Baixa
**Passos:**
1. Verificar notificação/badge no menu

**Resultado Esperado:**
- Número de mudanças pendentes exibido
- Badge atualizado em tempo real

---

#### TC-UNIT-008: Criar Unidade Manualmente (Admin)
**Prioridade:** Média
**Passos:**
1. Clicar em "Adicionar Unidade"
2. Preencher dados
3. Salvar

**Resultado Esperado:**
- Unidade criada diretamente
- Sem necessidade de aprovação
- Disponível imediatamente

---

#### TC-UNIT-009: Editar Unidade Existente
**Prioridade:** Média
**Passos:**
1. Selecionar unidade
2. Editar campos (ex: ramal)
3. Salvar

**Resultado Esperado:**
- Dados atualizados
- Histórico preservado

---

#### TC-UNIT-010: Desativar Unidade
**Prioridade:** Média
**Passos:**
1. Marcar unidade como inativa
2. Salvar

**Resultado Esperado:**
- Campo `ativo` = false
- Unidade não aparece em listas de seleção ativas
- Dados históricos preservados

---

### 3.7 AUDITORIA E SEGURANÇA (LGPD)

#### TC-AUDIT-001: Listar Logs de Auditoria (Admin)
**Prioridade:** Alta
**Pré-condições:**
- Admin logado
- Ações registradas no sistema

**Passos:**
1. Acessar painel de auditoria
2. Visualizar logs

**Resultado Esperado:**
- Lista de todas as ações auditadas
- Informações: timestamp, usuário, ação, recurso, mudanças, IP, user agent
- Possibilidade de filtrar por usuário, ação, data

---

#### TC-AUDIT-002: Registro de Criação de Paciente
**Prioridade:** Alta
**Passos:**
1. Criar paciente
2. Verificar audit_log

**Resultado Esperado:**
- Entrada com action="CREATE"
- Resource="patients"
- Changes contém todos os dados do paciente (valores iniciais)

---

#### TC-AUDIT-003: Registro de Atualização de Paciente
**Prioridade:** Alta
**Passos:**
1. Editar paciente (ex: mudar diagnóstico)
2. Verificar audit_log

**Resultado Esperado:**
- Entrada com action="UPDATE"
- Changes contém before/after para campo modificado
- Outros campos não aparecem nas mudanças

---

#### TC-AUDIT-004: Registro de Deleção de Paciente
**Prioridade:** Alta
**Passos:**
1. Deletar paciente
2. Verificar audit_log

**Resultado Esperado:**
- Entrada com action="DELETE"
- Todos os dados do paciente preservados no log (para conformidade LGPD)

---

#### TC-SEC-001: Criptografia de Dados Sensíveis
**Prioridade:** Crítica
**Passos:**
1. Criar paciente com dados pessoais
2. Verificar dados diretamente no banco PostgreSQL

**Resultado Esperado:**
- Campos sensíveis (nome, registro, dataNascimento, etc.) criptografados
- Formato: `<IV>:<encrypted_data>:<auth_tag>:<salt>`
- Algoritmo: AES-256-GCM

---

#### TC-SEC-002: Descriptografia no Frontend
**Prioridade:** Crítica
**Passos:**
1. Visualizar paciente no frontend

**Resultado Esperado:**
- Dados descriptografados automaticamente
- Exibição legível para usuário

---

#### TC-SEC-003: Proteção CSRF
**Prioridade:** Alta
**Passos:**
1. Tentar fazer requisição POST sem CSRF token

**Resultado Esperado:**
- Requisição bloqueada
- Erro 403 Forbidden

---

#### TC-SEC-004: Rate Limiting
**Prioridade:** Média
**Passos:**
1. Fazer múltiplas requisições rápidas (ex: 100 em 1 segundo)

**Resultado Esperado:**
- Após limite, requisições bloqueadas
- HTTP 429 Too Many Requests

---

#### TC-SEC-005: Proteção contra SQL Injection
**Prioridade:** Crítica
**Passos:**
1. Tentar input malicioso: `' OR '1'='1`
2. Submeter em campo de busca ou formulário

**Resultado Esperado:**
- Input sanitizado
- Nenhum acesso não autorizado
- Possível erro de validação

---

#### TC-SEC-006: Proteção contra XSS
**Prioridade:** Crítica
**Passos:**
1. Tentar inserir script: `<script>alert('XSS')</script>`
2. Submeter em campo de texto

**Resultado Esperado:**
- Script não executado
- Texto escapado ou sanitizado
- Exibido como texto puro

---

### 3.8 EXPORTAÇÃO E IMPRESSÃO

#### TC-EXP-001: Exportar Tabela de Pacientes para Excel
**Prioridade:** Alta
**Pré-condições:**
- Pacientes cadastrados

**Passos:**
1. Na página de passagem de plantão, clicar em "Exportar para Excel"
2. Aguardar download

**Resultado Esperado:**
- Arquivo .xlsx gerado
- Todas as 18 colunas incluídas
- Dados descriptografados e legíveis
- Formatação adequada (datas, números)

---

#### TC-EXP-002: Imprimir Tabela de Pacientes
**Prioridade:** Média
**Passos:**
1. Clicar em "Imprimir"
2. Verificar preview de impressão

**Resultado Esperado:**
- Layout otimizado para impressão
- Todas as colunas visíveis
- Cabeçalho e rodapé com informações (data, hora, usuário)

---

#### TC-EXP-003: Exportar Dados com Filtros Aplicados
**Prioridade:** Média
**Passos:**
1. Aplicar filtro (ex: enfermaria "10A")
2. Exportar

**Resultado Esperado:**
- Apenas dados filtrados exportados
- Respeita seleção do usuário

---

## 4. TESTES DE API

### 4.1 AUTENTICAÇÃO API

#### TC-API-AUTH-001: POST /api/auth/login (Sucesso)
**Método:** POST
**Endpoint:** `/api/auth/login`
**Body:**
```json
{
  "username": "admin",
  "password": "Admin@123"
}
```

**Resultado Esperado:**
- Status: 200 OK
- Body contém: token (JWT), refreshToken, user (id, username, role)
- Cookies setados

---

#### TC-API-AUTH-002: POST /api/auth/login (Credenciais Inválidas)
**Método:** POST
**Endpoint:** `/api/auth/login`
**Body:**
```json
{
  "username": "admin",
  "password": "senhaerrada"
}
```

**Resultado Esperado:**
- Status: 401 Unauthorized
- Body: `{ "error": "Credenciais inválidas" }`

---

#### TC-API-AUTH-003: GET /api/auth/me
**Método:** GET
**Endpoint:** `/api/auth/me`
**Headers:** Authorization: Bearer <token>

**Resultado Esperado:**
- Status: 200 OK
- Body: dados do usuário atual

---

### 4.2 PACIENTES API

#### TC-API-PAT-001: GET /api/patients (Listar)
**Método:** GET
**Endpoint:** `/api/patients`
**Headers:** Authorization: Bearer <token>

**Resultado Esperado:**
- Status: 200 OK
- Body: array de pacientes
- Dados descriptografados

---

#### TC-API-PAT-002: POST /api/patients (Criar)
**Método:** POST
**Endpoint:** `/api/patients`
**Body:**
```json
{
  "leito": "101A",
  "nome": "João Silva",
  "registro": "12345",
  "dataNascimento": "1980-05-15",
  "sexo": "M",
  "diagnostico": "Pneumonia"
}
```

**Resultado Esperado:**
- Status: 201 Created
- Body: paciente criado com ID
- Dados criptografados no banco

---

#### TC-API-PAT-003: PATCH /api/patients/:id (Atualizar)
**Método:** PATCH
**Endpoint:** `/api/patients/{id}`
**Body:**
```json
{
  "diagnostico": "Pneumonia controlada"
}
```

**Resultado Esperado:**
- Status: 200 OK
- Body: paciente atualizado
- Auditoria registrada

---

#### TC-API-PAT-004: DELETE /api/patients/:id (Admin apenas)
**Método:** DELETE
**Endpoint:** `/api/patients/{id}`
**Headers:** Authorization: Bearer <admin_token>

**Resultado Esperado:**
- Status: 200 OK
- Paciente removido

---

#### TC-API-PAT-005: DELETE /api/patients/:id (Enfermagem - Sem Permissão)
**Método:** DELETE
**Endpoint:** `/api/patients/{id}`
**Headers:** Authorization: Bearer <enfermagem_token>

**Resultado Esperado:**
- Status: 403 Forbidden
- Body: `{ "error": "Sem permissão" }`

---

### 4.3 IMPORTAÇÃO API

#### TC-API-IMP-001: POST /api/import/evolucoes
**Método:** POST
**Endpoint:** `/api/import/evolucoes`

**Resultado Esperado:**
- Status: 200 OK
- Body: estatísticas de importação (total, importados, erros)

---

#### TC-API-IMP-002: GET /api/import/history
**Método:** GET
**Endpoint:** `/api/import/history`

**Resultado Esperado:**
- Status: 200 OK
- Body: array de histórico de importações

---

### 4.4 IA API

#### TC-API-AI-001: POST /api/ai/analyze-patient/:id
**Método:** POST
**Endpoint:** `/api/ai/analyze-patient/{id}`

**Resultado Esperado:**
- Status: 200 OK
- Body: insights clínicos

---

## 5. TESTES DE PERFORMANCE

### 5.1 CARGA DE DADOS

#### TC-PERF-001: Importação de 1000 Pacientes
**Objetivo:** Verificar tempo de importação em lote

**Critério de Sucesso:**
- Importação completa em < 5 minutos
- Sem erros de timeout
- Sistema permanece responsivo

---

#### TC-PERF-002: Listagem de Pacientes (Grande Volume)
**Objetivo:** Verificar performance de consulta com 5000+ pacientes

**Critério de Sucesso:**
- Carregamento em < 2 segundos
- Paginação eficiente

---

#### TC-PERF-003: Análise IA em Lote (50 Pacientes)
**Objetivo:** Verificar performance de análise em massa

**Critério de Sucesso:**
- Análise completa em < 3 minutos
- Rate limiting respeitado

---

### 5.2 CONCORRÊNCIA

#### TC-PERF-004: Múltiplos Usuários Simultâneos
**Objetivo:** Testar carga com 10 usuários simultâneos

**Critério de Sucesso:**
- Tempos de resposta < 3s para operações normais
- Sem erros 500
- Sem deadlocks no banco

---

## 6. TESTES DE USABILIDADE

### 6.1 RESPONSIVIDADE

#### TC-UX-001: Menu de Navegação Responsivo
**Passos:**
1. Testar em mobile (375px), tablet (768px), desktop (1920px)

**Resultado Esperado:**
- Menu adapta-se a cada tamanho
- Hamburger menu em mobile
- Todos os links acessíveis

---

#### TC-UX-002: Tabela de Pacientes em Mobile
**Passos:**
1. Acessar shift-handover em mobile

**Resultado Esperado:**
- Tabela responsiva (scroll horizontal ou cards)
- Informações críticas visíveis
- Usabilidade mantida

---

### 6.2 ACESSIBILIDADE

#### TC-UX-003: Navegação por Teclado
**Passos:**
1. Usar apenas Tab, Enter, Esc para navegar

**Resultado Esperado:**
- Todos os elementos acessíveis
- Ordem lógica de foco
- Modais fecham com Esc

---

#### TC-UX-004: Contraste de Cores
**Passos:**
1. Usar ferramenta de análise de contraste (Lighthouse)

**Resultado Esperado:**
- Contraste mínimo de 4.5:1 para texto normal
- Conformidade WCAG AA

---

## 7. TESTES DE COMPATIBILIDADE

### 7.1 NAVEGADORES

#### TC-COMP-001: Chrome (Última Versão)
**Resultado Esperado:** Funcionalidade completa

#### TC-COMP-002: Firefox (Última Versão)
**Resultado Esperado:** Funcionalidade completa

#### TC-COMP-003: Safari (macOS/iOS)
**Resultado Esperado:** Funcionalidade completa

#### TC-COMP-004: Edge (Última Versão)
**Resultado Esperado:** Funcionalidade completa

---

## 8. AMBIENTE E PRÉ-REQUISITOS

### 8.1 CONFIGURAÇÃO DE AMBIENTE DE TESTE

**Variáveis de Ambiente:**
```env
NODE_ENV=test
DATABASE_URL=postgresql://test_db
SESSION_SECRET=test_secret_32_chars_min
ENCRYPTION_KEY=base64_encoded_test_key
SETUP_KEY=test_setup_key
ANTHROPIC_API_KEY=test_anthropic_key
OPENAI_API_KEY=test_openai_key
N8N_API_URL=https://test-n8n.example.com
N8N_WEBHOOK_SECRET=test_webhook_secret
```

**Dados de Teste:**
- Usuário Admin: admin / Admin@123
- Usuário Enfermagem: enfermagem / Enfermagem@123
- 50+ pacientes de teste
- 5+ enfermarias de teste

---

### 8.2 FERRAMENTAS RECOMENDADAS

**Automação:**
- Playwright ou Cypress (E2E)
- Jest (Unit/Integration)
- Postman/Newman (API)

**Performance:**
- k6 ou Artillery (Load Testing)
- Lighthouse (Performance Web)

**Segurança:**
- OWASP ZAP
- Burp Suite (opcional)

**Acessibilidade:**
- axe DevTools
- Lighthouse Accessibility Audit

---

## 9. CRITÉRIOS DE ACEITE

### 9.1 CRITÉRIOS GERAIS

- **Cobertura:** 100% dos casos críticos executados
- **Taxa de Sucesso:** ≥ 95% dos testes passando
- **Bugs Críticos:** 0 bugs bloqueadores
- **Bugs Altos:** ≤ 3 bugs de alta prioridade não resolvidos
- **Performance:** Todos os testes de performance dentro dos critérios
- **Segurança:** Todos os testes de segurança passando

---

### 9.2 DEFINIÇÃO DE PRIORIDADES

**Crítica:**
- Autenticação e autorização
- CRUD de pacientes
- Criptografia de dados
- Importação N8N
- Auditoria LGPD

**Alta:**
- Análise com IA
- Gestão de usuários
- Sincronização de unidades
- Exportação de dados

**Média:**
- Templates
- Histórico de pacientes
- Notificações WebSocket

**Baixa:**
- Filtros avançados
- Estatísticas
- Personalização de UI

---

## 10. CRONOGRAMA SUGERIDO

| Fase | Duração | Atividades |
|------|---------|------------|
| **Preparação** | 2 dias | Setup de ambiente, massa de dados, revisão do plano |
| **Testes Funcionais** | 5 dias | Execução de casos TC-AUTH, TC-PAT, TC-IMP, TC-AI, TC-USER, TC-UNIT |
| **Testes de API** | 2 dias | Execução de TC-API-* |
| **Testes de Segurança** | 3 dias | TC-SEC-*, TC-AUDIT-* |
| **Testes de Performance** | 2 dias | TC-PERF-* |
| **Testes de Usabilidade** | 2 dias | TC-UX-*, TC-COMP-* |
| **Regressão** | 1 dia | Verificação geral |
| **Documentação** | 1 dia | Compilação de resultados |

**Total:** ~18 dias úteis (~3-4 semanas)

---

## 11. REPORT DE BUGS

### 11.1 TEMPLATE DE BUG

**Título:** [Componente] Descrição curta

**Prioridade:** Crítica / Alta / Média / Baixa

**Severidade:** Blocker / Major / Minor / Trivial

**Ambiente:**
- Navegador:
- OS:
- Versão do Sistema:

**Passos para Reproduzir:**
1.
2.
3.

**Resultado Esperado:**

**Resultado Atual:**

**Screenshots/Logs:**

**Caso de Teste Relacionado:**

---

## 12. MÉTRICAS E KPIs

### 12.1 MÉTRICAS DE QUALIDADE

- **Cobertura de Testes:** % de requisitos testados
- **Taxa de Defeitos:** Bugs encontrados / Total de testes
- **Densidade de Defeitos:** Bugs / 1000 linhas de código
- **Taxa de Rejeição:** % de builds rejeitados em QA

### 12.2 MÉTRICAS DE EXECUÇÃO

- **Tempo Médio de Execução:** Por caso de teste
- **Automação:** % de testes automatizados
- **Progresso:** Testes executados vs planejados

---

## 13. APROVAÇÃO E SIGN-OFF

**QA Lead:**
Nome: ___________________
Assinatura: ___________________
Data: ___________________

**Product Owner:**
Nome: ___________________
Assinatura: ___________________
Data: ___________________

**Tech Lead:**
Nome: ___________________
Assinatura: ___________________
Data: ___________________

---

## 14. GLOSSÁRIO

- **SBAR:** Situation, Background, Assessment, Recommendation (metodologia de passagem de plantão)
- **LGPD:** Lei Geral de Proteção de Dados (Brasil)
- **CRUD:** Create, Read, Update, Delete
- **JWT:** JSON Web Token
- **N8N:** Plataforma de automação de workflow
- **AES-256-GCM:** Advanced Encryption Standard - Galois/Counter Mode

---

**Última Atualização:** 13/01/2026
**Versão do Sistema Testado:** v1.0
**Responsável pelo Plano:** Equipe de QA

---

**FIM DO PLANO DE TESTES**
