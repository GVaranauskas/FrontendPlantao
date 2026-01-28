# Roteiro de Testes — 11Care Nursing Platform

> Roteiro refinado com cobertura de regras de negócio, baseado na documentação do sistema (CHANGELOG, ARCHITECTURE, SECURITY, API, AI_INTEGRATION, VALIDACAO, N8N_WEBHOOK_SPECIFICATION).

---

## 1. Autenticação e Fluxo JWT

### 1.1 Login e Tokens

| # | Cenário | Passos | Resultado Esperado | Regra de Negócio |
|---|---------|--------|--------------------|------------------|
| 1.1.1 | Login válido | POST `/api/auth/login` com credenciais corretas | 200: `accessToken` no body + `refreshToken` em cookie httpOnly Secure SameSite=Strict | Access token expira em 15min; refresh em 7 dias |
| 1.1.2 | Login inválido | POST `/api/auth/login` com senha errada | 401: mensagem de erro | Não revelar se é username ou senha inválida |
| 1.1.3 | Login sem campos | POST `/api/auth/login` sem username ou password | 400: campos obrigatórios | Validação Zod no body |
| 1.1.4 | Brute force | Enviar 6 tentativas de login em < 15min | 429: rate limit atingido a partir da 6ª tentativa | Limite de 5 tentativas/15min por IP |
| 1.1.5 | Refresh token | POST `/api/auth/refresh` com cookie válido | 200: novo accessToken | Cookie httpOnly não acessível por JS |
| 1.1.6 | Refresh token expirado | POST `/api/auth/refresh` com cookie expirado (>7d) | 401 | Redirecionar para login |
| 1.1.7 | Logout | POST `/api/auth/logout` | 200: cookie refreshToken limpo, token invalidado | Sessão invalidada no servidor |
| 1.1.8 | Acesso sem token | GET `/api/patients` sem header Authorization | 401 | Middleware bloqueia |
| 1.1.9 | Token expirado com refresh | Fazer request com access token expirado, depois refresh | Novo access token funcional | Frontend deve fazer refresh automático |

### 1.2 Primeiro Acesso — Troca de Senha Obrigatória (v1.5.0)

| # | Cenário | Passos | Resultado Esperado | Regra de Negócio |
|---|---------|--------|--------------------|------------------|
| 1.2.1 | Redirect ao primeiro login | Login com usuário `firstAccess=true` | JWT contém `firstAccess=true`; frontend redireciona para `/first-access` | Campo `firstAccess` na tabela users |
| 1.2.2 | Bloqueio de rotas com firstAccess | Com `firstAccess=true`, acessar GET `/api/patients` | 403: "Primeiro acesso: troca de senha obrigatória" | Middleware `requireFirstAccessComplete` bloqueia 30+ rotas |
| 1.2.3 | Rotas permitidas durante firstAccess | Com `firstAccess=true`, acessar `/api/auth/me`, `/api/auth/logout`, `/api/auth/refresh` | 200: acesso permitido | Apenas 4 rotas liberadas |
| 1.2.4 | Troca de senha com sucesso | POST `/api/auth/first-access-password` com `{ currentPassword, newPassword }` (8+ chars, 1 letra, 1 número) | 200: novo JWT com `firstAccess=false`, novo refreshToken | Senha hashada com bcrypt; JWT regenerado |
| 1.2.5 | Senha nova fraca (< 8 chars) | POST com `newPassword` = "abc1" | 400: "pelo menos 8 caracteres" | Validação: min 8 chars |
| 1.2.6 | Senha nova sem número | POST com `newPassword` = "abcdefgh" | 400: "pelo menos uma letra e um número" | Validação: 1 letra + 1 número |
| 1.2.7 | Senha nova sem letra | POST com `newPassword` = "12345678" | 400: "pelo menos uma letra e um número" | Validação: 1 letra + 1 número |
| 1.2.8 | Senha atual incorreta | POST com `currentPassword` errado | 401: "Senha atual incorreta" | Verifica bcrypt do password atual |
| 1.2.9 | Usuário não está em firstAccess | POST first-access-password com `firstAccess=false` | 403: "Usuário não está em primeiro acesso" | Apenas para firstAccess=true |

### 1.3 Bypass de First-Access (v1.5.2 — Correção de Segurança)

| # | Cenário | Passos | Resultado Esperado | Regra de Negócio |
|---|---------|--------|--------------------|------------------|
| 1.3.1 | Admin routes bloqueadas | Com `firstAccess=true`, GET `/api/users` | 403 | 31 rotas admin usam `requireRoleWithAuth('admin')` |
| 1.3.2 | IA routes bloqueadas | Com `firstAccess=true`, POST `/api/sync/patient/1` | 403 | 5 rotas de IA usam `requireRoleWithAuth('admin', 'enfermagem')` |
| 1.3.3 | Sync routes bloqueadas | Com `firstAccess=true`, POST `/api/sync-gpt4o/manual` | 403 | 3 rotas sync usam `requireRoleWithAuth` |
| 1.3.4 | 45+ endpoints protegidos | Testar amostra de endpoints com firstAccess=true | Todos retornam 403 | `requireRoleWithAuth` combina auth + firstAccess + RBAC |

---

## 2. Controle de Acesso RBAC

| # | Cenário | Passos | Resultado Esperado | Regra de Negócio |
|---|---------|--------|--------------------|------------------|
| 2.1 | Admin acessa tudo | Logar como `admin`, acessar `/api/users`, `/api/admin/*`, `/api/patients` | 200 em todos | Role admin: `['*']` |
| 2.2 | Enfermagem — leitura de pacientes | Logar como `enfermagem`, GET `/api/patients` | 200 | Permissão: `patients:read` |
| 2.3 | Enfermagem — criar nota | POST `/api/notes` | 201 | Permissão: `notes:create` |
| 2.4 | Enfermagem — trigger sync | POST `/api/sync/patient/:id` | 200 | Permissão: `sync:trigger` |
| 2.5 | Enfermagem — acessar admin | GET `/api/users` | 403 | Sem permissão admin |
| 2.6 | Enfermagem — deletar paciente | DELETE `/api/patients/:id` | 403 | Apenas admin pode deletar |
| 2.7 | Visualizador — apenas leitura | GET `/api/patients` | 200; POST `/api/patients` | 403 | Permissão: `patients:read`, `notes:read` apenas |
| 2.8 | Visualizador — criar nota | POST `/api/notes` | 403 | Sem permissão `notes:create` |
| 2.9 | Enfermagem — deletar nota | DELETE `/api/notes/:id` com role enfermagem | 403 | Deleção de nota: admin only com motivo obrigatório |
| 2.10 | Admin deleta nota sem motivo | DELETE `/api/notes/:id` sem campo `reason` | 400 | Motivo é obrigatório para exclusão |

---

## 3. Sincronização N8N e Regras de Dados

### 3.1 Fluxo de Sync (3 Passos — v1.3.2)

| # | Cenário | Passos | Resultado Esperado | Regra de Negócio |
|---|---------|--------|--------------------|------------------|
| 3.1.1 | UPSERT paciente novo | Sync com paciente que não existe no sistema | Paciente inserido via `upsertPatientByCodigoAtendimento` | Ponto único de inserção: somente UPSERT insere/atualiza |
| 3.1.2 | UPSERT paciente existente | Sync com paciente já existente + dados alterados | Dados atualizados com informações frescas do N8N | UPSERT por codigoAtendimento |
| 3.1.3 | Conflito de leito | Paciente A no leito 101, N8N traz paciente B (código diferente) para leito 101 | Paciente A arquivado como `registro_antigo`; Paciente B inserido no leito 101 | PASSO 1: `getPatientOccupyingLeitoWithDifferentCodigo` → `archiveAndRemovePatient` |
| 3.1.4 | Reativação de paciente | Paciente arquivado aparece no N8N novamente | Registro de histórico NÃO é deletado; paciente reaparece na lista ativa via UPSERT | PASSO 2: Histórico é log permanente, nunca deletado (v1.5.1) |
| 3.1.5 | Busca dual para reativação | Paciente no histórico sem codigoAtendimento | Busca por leito como fallback | Estratégia: primário `codigoAtendimento`, fallback `leito` |
| 3.1.6 | Deduplicação de reativações | Mesmo paciente aparece 2x no lote N8N | Reativado apenas 1x no ciclo | Set de IDs já reativados evita duplicidade |

### 3.2 Arquivamento Determinístico (v1.4.0)

| # | Cenário | Passos | Resultado Esperado | Regra de Negócio |
|---|---------|--------|--------------------|------------------|
| 3.2.1 | Paciente ausente no N8N | Paciente ativo não aparece nos dados N8N | Arquivado imediatamente | Sem contagem de falhas; remoção imediata |
| 3.2.2 | Motivo de arquivamento — código ausente | Paciente com código de atendimento não encontrado no N8N | Motivo: `alta_hospitalar` | Determinado pelo tipo de ausência |
| 3.2.3 | Motivo de arquivamento — leito ausente | Paciente com leito não encontrado no N8N | Motivo: `transferencia` | Determinado pelo tipo de ausência |
| 3.2.4 | Histórico permanente | Reativar paciente que já foi arquivado | Registro anterior de histórico permanece; novo UPSERT cria/atualiza paciente ativo | Log permanente de altas e transferências (v1.5.1) |

### 3.3 Proteção contra Arquivamento em Massa (Validação de Sanidade)

| # | Cenário | Passos | Resultado Esperado | Regra de Negócio |
|---|---------|--------|--------------------|------------------|
| 3.3.1 | N8N retorna < 5 registros | Sync com apenas 3 pacientes do N8N | Remoções BLOQUEADAS | `MIN_ABSOLUTE_RECORDS = 5` |
| 3.3.2 | N8N retorna < 50% do último sync | Último sync: 35 registros; N8N retorna 15 | Remoções BLOQUEADAS | `N8N_MIN_RECORD_RATIO = 0.5` |
| 3.3.3 | Baseline atualizado mesmo com bloqueio | Remoções bloqueadas pela validação | Baseline do lastValidSync é estabelecido para evitar oscilação | Previne loops de bloqueio/desbloqueio |
| 3.3.4 | N8N retorna dados completos | Sync com número adequado de registros (>5 e >50% do último) | Arquivamentos processados normalmente | Validação de sanidade passa |

### 3.4 Botão Sync N8N + IA (v1.5.3 — Correção 2 cliques)

| # | Cenário | Passos | Resultado Esperado | Regra de Negócio |
|---|---------|--------|--------------------|------------------|
| 3.4.1 | Sync manual em 1 clique | Clicar botão "Sync N8N + IA" | Dados atualizados na tabela após 1 clique | Polling com syncId a cada 2s por até 60s |
| 3.4.2 | Status de sync por syncId | Verificar GET `/api/sync-gpt4o/status/:syncId` | Status progride: `started → fetching_n8n → processing_ai → complete` | Rastreamento por ID único |
| 3.4.3 | Refetch após conclusão | Frontend verifica status `complete` | Dados da tabela são recarregados via `refetchQueries` | Usa `refetchQueries` ao invés de `invalidateQueries` (v1.4.1) |
| 3.4.4 | Feedback detalhado pós-sync | Após sync, verificar GET `/api/sync-gpt4o/detailed-status` | Toast com resumo: novos, atualizados, arquivados, reativados | Estatísticas do último sync |
| 3.4.5 | Limpeza de status antigos | Status com > 1 hora | Status removido automaticamente | Cleanup automático |

---

## 4. Análise Clínica por IA

### 4.1 Serviço Unificado de Análise (v1.4.1)

| # | Cenário | Passos | Resultado Esperado | Regra de Negócio |
|---|---------|--------|--------------------|------------------|
| 4.1.1 | Análise individual | POST `/api/sync/patient/:id` | Retorna `clinicalInsights` com `riskLevel`, `risks`, `sbarAnalysis`, `recommendations`, `protocols` | Usa `UnifiedClinicalAnalysisService` |
| 4.1.2 | Chave de cache por codigoAtendimento | Analisar paciente com código de atendimento | Cache key: `unified-clinical:codigo:CODIGO` | Chave primária por codigoAtendimento |
| 4.1.3 | Fallback cache — UUID | Paciente sem codigoAtendimento | Cache key: `unified-clinical:uuid:UUID` | Fallback hierárquico |
| 4.1.4 | Fallback cache — leito | Paciente sem código e sem UUID | Cache key: `unified-clinical:leito:LEITO` | Último fallback |
| 4.1.5 | Consistência individual vs batch | Analisar mesmo paciente individualmente e via batch | Mesmos resultados (ou cache hit) | Serviço unificado elimina divergências (v1.4.1) |
| 4.1.6 | Invalidação cruzada de cache | Cache legado com chave antiga (UUID) + nova análise por código | Cache antigo invalidado | Previne dados stale |

### 4.2 Otimização em 4 Camadas

| # | Cenário | Passos | Resultado Esperado | Regra de Negócio |
|---|---------|--------|--------------------|------------------|
| 4.2.1 | Camada 1 — Change Detection | Sync paciente sem alterações de dados | Análise de IA NÃO é chamada; retorno instantâneo | Hash SHA-256 dos campos relevantes; 85-90% economia |
| 4.2.2 | Camada 2 — Cache hit | Sync paciente com dados alterados mas cache válido (<1h) | Retorna `fromCache: true` | TTL padrão 1 hora |
| 4.2.3 | Camada 2 — Cache miss | Cache expirado (>1h) ou inexistente | Nova chamada à API GPT-4o-mini | Cache em memória limpo ao reiniciar |
| 4.2.4 | Camada 3 — GPT-4o-mini | Nova análise sem cache | Chamada com `temperature: 0.3`, `max_tokens: 800`, `response_format: json_object` | Modelo mais barato; temperature baixa para determinismo |
| 4.2.5 | Camada 3 — Fallback Claude | GPT-4o-mini falha (timeout/rate limit) | Fallback automático para Claude Haiku 3.5 | Try/catch com fallback |
| 4.2.6 | Camada 4 — Auto Sync Scheduler | Aguardar 1 hora | Cron job `0 * * * *` executa sync de todos pacientes | Cron configurável via `AUTO_SYNC_CRON` |

### 4.3 Batch Real (v1.5.4)

| # | Cenário | Passos | Resultado Esperado | Regra de Negócio |
|---|---------|--------|--------------------|------------------|
| 4.3.1 | Batch de 10 pacientes | Sync batch com 10 pacientes sem cache | 1 chamada API (não 10) | `callGPT4oMiniBatch` processa até 10 por chamada |
| 4.3.2 | Batch de 35 pacientes | Sync batch com 35 pacientes sem cache | 4 chamadas API (~12s, não 35 chamadas/~105s) | Agrupamento em lotes de 10 |
| 4.3.3 | Batch misto (cache + não-cache) | 35 pacientes: 30 em cache, 5 não-cache | 30 retornados do cache; 1 chamada API para os 5 restantes | Separação cache vs não-cache antes do batch |
| 4.3.4 | Cache individual após batch | Batch processa 10 pacientes | Cada resultado salvo individualmente no cache | Cache por paciente, não por batch |
| 4.3.5 | Ordem dos resultados | Batch com pacientes [A, B, C] | Resultados retornados na ordem [A, B, C] | Prompt de sistema exige array JSON ordenado |

### 4.4 Classificação de Riscos

| # | Cenário | Passos | Resultado Esperado | Regra de Negócio |
|---|---------|--------|--------------------|------------------|
| 4.4.1 | 6 categorias de risco | Abrir detalhes de paciente com análise | Riscos exibidos: quedas, lesão por pressão, infecção, broncoaspiração, nutricional, respiratório | Cada risco: `low`, `medium`, `high` |
| 4.4.2 | Análise SBAR completa | Verificar insights do paciente | Campos: `situation`, `background`, `assessment`, `recommendation` | Metodologia SBAR |
| 4.4.3 | Protocolos assistenciais | Paciente com risco alto de queda | Protocolo "Prevenção de Quedas" listado | IA gera protocolos baseados nos riscos |

---

## 5. Gestão de Pacientes

### 5.1 CRUD e Validação

| # | Cenário | Passos | Resultado Esperado | Regra de Negócio |
|---|---------|--------|--------------------|------------------|
| 5.1.1 | Criar paciente (admin/enfermagem) | POST `/api/patients` com dados válidos | 201: paciente criado | Roles: admin, enfermagem |
| 5.1.2 | Criar paciente (visualizador) | POST `/api/patients` como visualizador | 403 | Visualizador: read-only |
| 5.1.3 | Campos obrigatórios | POST sem `nome` ou `registro` | 400: erro de validação | Validação Zod: `nome` min 3, max 200; `registro` min 1, max 50 |
| 5.1.4 | Idade válida | POST com `idade: -5` ou `idade: 200` | 400 | Validação: `z.number().int().min(0).max(150)` |
| 5.1.5 | Arquivar paciente | POST `/api/patients/:id/archive` com motivo | 200: snapshot completo salvo no histórico | Motivos: `alta`, `transferencia`, `obito`, `registro_antigo` |
| 5.1.6 | Arquivamento sem motivo | POST `/api/patients/:id/archive` sem `reason` | 400 | Motivo é obrigatório |
| 5.1.7 | Deletar (admin only) | DELETE `/api/patients/:id` como admin | 200 | Soft delete (arquiva) |
| 5.1.8 | Deletar (enfermagem) | DELETE `/api/patients/:id` como enfermagem | 403 | Admin only |

### 5.2 Notas de Pacientes

| # | Cenário | Passos | Resultado Esperado | Regra de Negócio |
|---|---------|--------|--------------------|------------------|
| 5.2.1 | Criar nota | POST `/api/notes` com patientId e note | 201: nota com userId, userName, createdAt | Audit trail completo |
| 5.2.2 | Editar nota própria (enfermagem) | PUT `/api/notes/:id` da própria nota | 200 | Enfermagem edita apenas suas notas |
| 5.2.3 | Editar nota de outro (enfermagem) | PUT `/api/notes/:id` de outro enfermeiro | 403 | Não pode editar nota alheia |
| 5.2.4 | Histórico de versões | GET `/api/patients/:id/notes-history` | Lista com versões, autor e timestamp | Versionamento completo |
| 5.2.5 | Deletar nota (admin com motivo) | DELETE `/api/notes/:id` com `reason` | 200 | Admin only; motivo obrigatório |

### 5.3 Criptografia de Dados (LGPD Art. 46)

| # | Cenário | Passos | Resultado Esperado | Regra de Negócio |
|---|---------|--------|--------------------|------------------|
| 5.3.1 | Dados criptografados no DB | Consultar campo `nome` direto no PostgreSQL | Dado ilegível (base64 criptografado) | AES-256-GCM: salt 64B, IV 16B, authTag 16B |
| 5.3.2 | Descriptografia na API | GET `/api/patients/:id` | Dados legíveis na response | Descriptografia transparente no repository |
| 5.3.3 | Campos criptografados | Verificar no DB: nome, registro, dataNascimento, diagnostico, alergias, observacoes, dsEvolucaoCompleta | Todos criptografados | 7 campos sensíveis |
| 5.3.4 | Campos não criptografados | Verificar no DB: leito, idade, unidadeInternacao | Em texto plano (metadados para busca) | Necessários para queries SQL |
| 5.3.5 | Compatibilidade com dados legados | Paciente antigo com dados em texto plano | Retornado sem erro | Fallback para texto plano se descriptografia falhar |
| 5.3.6 | IV único por registro | Criar 2 pacientes com mesmo nome | IVs e encrypted diferentes | IV gerado aleatoriamente a cada criptografia |

---

## 6. Filtros Interativos na Passagem de Plantão

### 6.1 Filtro de Pacientes Pendentes (v1.5.3)

| # | Cenário | Passos | Resultado Esperado | Regra de Negócio |
|---|---------|--------|--------------------|------------------|
| 6.1.1 | Clicar no card Pendentes | Clicar no card de "Pendentes" na tela de passagem | Tabela filtra para mostrar apenas pacientes com status pendente | Card é interativo (clicável) |
| 6.1.2 | Indicador visual de filtro ativo | Filtro de pendentes ativado | Ring, sombra e ícone de filtro visíveis no card | Feedback visual consistente |
| 6.1.3 | Limpar filtro | Clicar botão de limpar filtro na barra de busca | Tabela volta a mostrar todos os pacientes | Botão de limpar na SearchFilterBar |
| 6.1.4 | Card desabilitado sem pendentes | Não há pacientes pendentes | Card de "Pendentes" aparece desabilitado (não clicável) | Previne filtro vazio |
| 6.1.5 | Filtro de pacientes críticos | Clicar no card de "Críticos" | Tabela filtra para pacientes críticos | Mesmo padrão visual do filtro de pendentes |
| 6.1.6 | Busca + filtro combinados | Ativar filtro de pendentes + digitar nome | Lista filtra por ambos critérios | Filtros se acumulam |

---

## 7. Administração de Usuários

### 7.1 CRUD de Usuários

| # | Cenário | Passos | Resultado Esperado | Regra de Negócio |
|---|---------|--------|--------------------|------------------|
| 7.1.1 | Criar usuário com senha forte | POST `/api/users` com senha `Senh@123` | 201: usuário criado com `firstAccess=true` | Senha: 8+ chars, 1 maiúsc, 1 minúsc, 1 número, 1 especial |
| 7.1.2 | Senha sem maiúscula | POST com senha `senh@123` | 400 | Regex: `(?=.*[A-Z])` |
| 7.1.3 | Senha sem especial | POST com senha `Senha123` | 400 | Regex: `(?=.*[@$!%*?&])` |
| 7.1.4 | Username duplicado | POST com username já existente | 409: "Username já existe" | Unique constraint no DB |
| 7.1.5 | Email duplicado | POST com email já existente | 409 | Unique constraint |
| 7.1.6 | Desativar usuário | PUT `/api/users/:id` com `isActive: false` | Usuário não consegue mais fazer login | Verificação `isActive` no login |
| 7.1.7 | Novo usuário faz primeiro login | Login com usuário recém-criado | Redireciona para `/first-access` | `firstAccess=true` por padrão |
| 7.1.8 | Atribuir roles | PUT com `role: 'enfermagem'` ou `role: 'visualizador'` | Permissões atualizadas imediatamente | 3 roles: admin, enfermagem, visualizador |

---

## 8. Administração de Unidades e Templates

### 8.1 Unidades de Enfermagem

| # | Cenário | Passos | Resultado Esperado | Regra de Negócio |
|---|---------|--------|--------------------|------------------|
| 8.1.1 | Listar unidades | GET `/api/nursing-units` | Lista com codigo, nome, localizacao, ramal, ativa | Acessível por todos os roles |
| 8.1.2 | Criar unidade (admin) | POST `/api/nursing-units` | 201 | Admin only |
| 8.1.3 | Mudanças pendentes de aprovação | Webhook N8N detecta mudança em unidade | Registro em `nursing_unit_changes` com status `pending` | Admin deve aprovar mudanças |
| 8.1.4 | Aprovar mudança | POST `/api/nursing-units/changes/:id/approve` | Mudança aplicada à unidade | Admin only |
| 8.1.5 | Rejeitar mudança | POST `/api/nursing-units/changes/:id/reject` | Mudança descartada | Admin only |
| 8.1.6 | Sincronização diária | Verificar cron de sync de unidades | Executa às 6h AM UTC diariamente | `nursing-units-scheduler.ts` |

### 8.2 Templates por Enfermaria

| # | Cenário | Passos | Resultado Esperado | Regra de Negócio |
|---|---------|--------|--------------------|------------------|
| 8.2.1 | Configurar campos visíveis | Acessar `/admin/templates`, marcar/desmarcar campos | Apenas campos marcados aparecem na passagem de plantão | Template customizável por unidade |
| 8.2.2 | Template não afeta dados | Desmarcar campo "diagnostico" no template | Dado continua salvo no DB, apenas não exibido | Template controla display, não persistência |

---

## 9. Analytics de Uso (v1.4.0)

### 9.1 Sessões e Eventos

| # | Cenário | Passos | Resultado Esperado | Regra de Negócio |
|---|---------|--------|--------------------|------------------|
| 9.1.1 | Criação de sessão | POST `/api/analytics/sessions` | 201: sessionId retornado | sessionStorage persiste entre reloads |
| 9.1.2 | Batching de eventos | Navegar entre 25 páginas | Eventos enviados em lotes de 20 + 5 | Max 20 eventos ou 5 segundos (o que vier primeiro) |
| 9.1.3 | Heartbeat | Manter sessão aberta por 3 minutos | 3 heartbeats registrados | Ping a cada 60 segundos |
| 9.1.4 | Encerrar sessão | Fechar aba do navegador | POST `/api/analytics/sessions/:id/end` via `beforeunload` | Cleanup automático |

### 9.2 Dashboard Administrativo (Admin Only)

| # | Cenário | Passos | Resultado Esperado | Regra de Negócio |
|---|---------|--------|--------------------|------------------|
| 9.2.1 | Métricas gerais | GET `/api/admin/analytics/metrics?days=30` | totalSessions, activeSessions, totalPageViews, totalActions, uniqueUsers | Admin only |
| 9.2.2 | Top páginas | GET `/api/admin/analytics/top-pages` | Ranking de páginas + contagem | Filtro por período (24h, 7d, 30d, 90d) |
| 9.2.3 | Top ações | GET `/api/admin/analytics/top-actions` | Ranking de ações + contagem | Gráfico pizza |
| 9.2.4 | Stats por usuário | GET `/api/admin/analytics/users/:userId` | Sessões, page views, ações, última atividade | Admin only |
| 9.2.5 | Enfermagem acessa dashboard | GET `/api/admin/analytics/metrics` como enfermagem | 403 | RBAC: admin-only |
| 9.2.6 | 4 abas do dashboard | Acessar `/admin/usage-analytics` | Abas: Visão Geral, Páginas, Ações, Usuários | Gráficos com Recharts |

---

## 10. Webhook N8N

| # | Cenário | Passos | Resultado Esperado | Regra de Negócio |
|---|---------|--------|--------------------|------------------|
| 10.1 | Webhook com secret válido | POST `/webhook/evolucoes` com header `x-n8n-secret` correto | 200: dados processados | Validação no middleware `n8n-validation.ts` |
| 10.2 | Webhook sem secret | POST sem header `x-n8n-secret` | 401 | Bloqueado pelo middleware |
| 10.3 | Webhook com secret inválido | POST com secret errado | 401 | Comparação exata com env |
| 10.4 | IP whitelist (se configurado) | POST de IP não permitido | 403: "IP not allowed" | `N8N_ALLOWED_IPS` (opcional) |
| 10.5 | Parsing de nomePaciente | Webhook com `"nomePaciente": "JOAO SILVA   PT: 3198597 AT: 10114118"` | `nome`: "JOAO SILVA", `registro`: "3198597", `codigoAtendimento`: "10114118" | Extração de PT: e AT: do campo |
| 10.6 | Mapeamento de campos | Verificar todos os 20+ campos do payload | Mapeados corretamente conforme `N8N_WEBHOOK_SPECIFICATION.md` | De `dsLeito` → `dsLeitoCompleto`, etc. |
| 10.7 | Dados criptografados após import | Após webhook, verificar DB | Campos sensíveis criptografados | Criptografia aplicada no `postgres-storage.ts` |

---

## 11. Auditoria LGPD (Art. 37)

| # | Cenário | Passos | Resultado Esperado | Regra de Negócio |
|---|---------|--------|--------------------|------------------|
| 11.1 | Log de CREATE | Criar paciente | Registro em `audit_log`: action=CREATE, resource=patients, changes=after | userId, userName, userRole, ipAddress, userAgent registrados |
| 11.2 | Log de READ | GET `/api/patients/:id` | Registro em `audit_log`: action=READ, resource=patients, resourceId | Rastreamento de quem visualizou |
| 11.3 | Log de UPDATE | Atualizar dados de paciente | Registro: action=UPDATE, changes=`{before: ..., after: ...}` | Valores antes/depois preservados |
| 11.4 | Log de DELETE | Deletar nota com motivo | Registro: action=DELETE, changes=`{before: nota, reason: "motivo"}` | Motivo registrado |
| 11.5 | Log de LOGIN/LOGOUT | Login e logout | Registros com action=LOGIN e LOGOUT | IP e User Agent capturados |
| 11.6 | Log de EXPORT | Exportar dados para Excel | Registro: action=EXPORT | Rastreamento de exportações |
| 11.7 | Retenção de 5 anos | Consultar logs antigos | Logs mantidos por 5 anos | LGPD Art. 37 compliance |
| 11.8 | Acesso a auditoria (admin) | GET `/api/security/audit` | 200: lista de logs | Admin only |

---

## 12. Segurança Adicional

### 12.1 Headers e Proteções

| # | Cenário | Passos | Resultado Esperado | Regra de Negócio |
|---|---------|--------|--------------------|------------------|
| 12.1.1 | CSRF Token | Request POST sem X-CSRF-Token | 403 (se CSRF habilitado) | Proteção CSRF via csurf |
| 12.1.2 | Rate limit geral | Enviar 101 requests em < 15min | 429 a partir do 101º | 100 req/15min por IP |
| 12.1.3 | Helmet headers | Verificar response headers | `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security` | Helmet middleware |
| 12.1.4 | SQL Injection via Drizzle | Input: `'; DROP TABLE users; --` em campo de busca | Query executada como prepared statement, sem efeito | Drizzle ORM usa prepared statements |
| 12.1.5 | XSS no input | Input: `<script>alert('XSS')</script>` | React escapa automaticamente; CSP bloqueia inline scripts | React + Helmet CSP |

### 12.2 Validação de Senha (Criação de Usuário)

| # | Cenário | Passos | Resultado Esperado | Regra de Negócio |
|---|---------|--------|--------------------|------------------|
| 12.2.1 | Senha forte válida | `Admin@123` | Aceita | 8+ chars, maiúsc, minúsc, número, especial |
| 12.2.2 | Sem caractere especial | `Admin1234` | 400 | `(?=.*[@$!%*?&])` |
| 12.2.3 | Sem número | `Admin@abc` | 400 | `(?=.*\d)` |
| 12.2.4 | Sem maiúscula | `admin@123` | 400 | `(?=.*[A-Z])` |
| 12.2.5 | Sem minúscula | `ADMIN@123` | 400 | `(?=.*[a-z])` |
| 12.2.6 | Menos de 8 chars | `Ad@1` | 400 | Min 8 caracteres |

---

## 13. Histórico de Pacientes

| # | Cenário | Passos | Resultado Esperado | Regra de Negócio |
|---|---------|--------|--------------------|------------------|
| 13.1 | Visualizar histórico | Acessar `/patients-history` | Lista de pacientes com alta/transferência/óbito | Snapshot completo preservado |
| 13.2 | Snapshot preservado | Abrir detalhe de paciente arquivado | Todos os dados clínicos do momento do arquivamento | Clinical insights preservados |
| 13.3 | Histórico nunca deletado | Reativar paciente e verificar histórico | Registro anterior permanece no histórico | Log permanente (v1.5.1) |
| 13.4 | Motivos de arquivamento | Verificar motivos nos registros | `alta_hospitalar`, `transferencia`, `obito`, `registro_antigo` | 4 tipos de motivo |
| 13.5 | Busca no histórico | Buscar por nome de paciente arquivado | Paciente encontrado | Busca funcional no histórico |

---

## 14. Exportação e Impressão

| # | Cenário | Passos | Resultado Esperado | Regra de Negócio |
|---|---------|--------|--------------------|------------------|
| 14.1 | Exportar Excel (.xlsx) | Clicar botão exportar na passagem de plantão | Arquivo `.xlsx` baixado com todos os dados da tabela | ExcelJS para geração |
| 14.2 | Dados descriptografados no Excel | Abrir Excel exportado | Nome, diagnóstico, etc. legíveis | Descriptografia antes da exportação |
| 14.3 | Auditoria de exportação | Exportar dados | Log de EXPORT registrado na auditoria | LGPD: rastreamento de exportações |
| 14.4 | Imprimir relatório | Clicar botão de impressão | Layout formatado para impressão com dados clínicos | `print-shift-handover.tsx` |

---

## 15. Setup Inicial do Sistema

| # | Cenário | Passos | Resultado Esperado | Regra de Negócio |
|---|---------|--------|--------------------|------------------|
| 15.1 | Setup com chave válida | POST `/api/auth/setup` com `setupKey` correto | 200: credenciais do admin e enfermeiro criados | Apenas primeira execução |
| 15.2 | Setup com chave inválida | POST com `setupKey` errado | 403: "Invalid setup key" | Protegido por env `SETUP_KEY` |
| 15.3 | Setup sem SETUP_KEY configurado | POST quando env não tem SETUP_KEY | 503: "SETUP_KEY not configured" | Validação de ambiente |
| 15.4 | Setup já executado | POST setup quando usuários já existem | 409 ou mensagem de "already setup" | Previne recriação |
