# Roteiro de Testes — 11Care Nursing Platform

## 1. Autenticação

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 1.1 | Login válido | Acessar `/`, inserir credenciais válidas, clicar em Entrar | Redireciona para `/modules` |
| 1.2 | Login inválido | Inserir senha incorreta e clicar em Entrar | Mensagem de erro exibida, permanece na tela de login |
| 1.3 | Logout | Clicar em Sair no menu | Redireciona para `/`, token invalidado |
| 1.4 | Acesso sem autenticação | Acessar `/shift-handover` sem estar logado | Redireciona para `/` |
| 1.5 | Primeiro acesso | Logar com usuário marcado como primeiro acesso | Redireciona para `/first-access` para redefinir senha |

## 2. Passagem de Plantão (Shift Handover)

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 2.1 | Visualizar lista de pacientes | Acessar `/shift-handover` | Tabela de pacientes carregada com dados atuais |
| 2.2 | Buscar paciente | Digitar nome ou leito na barra de busca | Lista filtrada corretamente |
| 2.3 | Ver detalhes do paciente | Clicar em um paciente na tabela | Modal com dados completos (SBAR) é exibido |
| 2.4 | Imprimir relatório | Clicar no botão de impressão | Página de impressão formatada é gerada |
| 2.5 | Exportar para Excel | Clicar no botão de exportação | Arquivo `.xlsx` baixado com os dados |

## 3. Gestão de Pacientes

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 3.1 | Criar paciente | Preencher formulário e salvar | Paciente aparece na lista |
| 3.2 | Editar paciente | Alterar dados e salvar | Dados atualizados na tabela |
| 3.3 | Adicionar nota ao paciente | Abrir detalhes, escrever nota, salvar | Nota salva com registro de autor e data |
| 3.4 | Ver histórico de notas | Abrir histórico de notas do paciente | Lista de versões com autor e timestamp |
| 3.5 | Excluir paciente (admin) | Como admin, excluir paciente | Paciente removido da lista ativa |

## 4. Importação e Sincronização de Dados

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 4.1 | Importar evoluções | Acessar `/import`, selecionar unidade, clicar Importar | Dados importados com sucesso, contador atualizado |
| 4.2 | Ver status da importação | Acessar `/import-logs` | Logs exibidos em tempo real |
| 4.3 | Ver histórico de importações | Acessar `/dashboard` | Lista de importações anteriores com estatísticas |

## 5. Análise Clínica por IA

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 5.1 | Classificação de risco | Abrir detalhes de um paciente | Classificações de risco exibidas (queda, infecção, etc.) |
| 5.2 | Insights clínicos | Visualizar seção de insights no detalhe do paciente | Recomendações geradas pela IA exibidas |
| 5.3 | Score de qualidade | Verificar indicador de qualidade | Score calculado e exibido corretamente |

## 6. Administração — Usuários

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 6.1 | Listar usuários | Acessar `/admin/users` | Tabela de usuários exibida |
| 6.2 | Criar usuário | Preencher formulário de novo usuário, salvar | Usuário aparece na lista |
| 6.3 | Editar papel do usuário | Alterar role (admin/enfermagem/visualizador), salvar | Permissões atualizadas |
| 6.4 | Desativar usuário | Desativar um usuário | Usuário não consegue mais logar |

## 7. Administração — Unidades e Templates

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 7.1 | Listar unidades de enfermagem | Acessar `/admin/nursing-units` | Unidades listadas |
| 7.2 | Criar unidade | Adicionar nova unidade | Unidade aparece na lista |
| 7.3 | Configurar template | Acessar `/admin/templates`, ajustar campos visíveis | Campos exibidos conforme configuração na passagem de plantão |

## 8. Controle de Acesso (RBAC)

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 8.1 | Acesso admin a `/admin` | Logar como admin, acessar `/admin` | Acesso permitido |
| 8.2 | Acesso enfermagem a `/admin` | Logar como enfermagem, acessar `/admin` | Acesso negado ou redirecionado |
| 8.3 | Visualizador edita paciente | Logar como visualizador, tentar editar | Operação bloqueada |

## 9. Analytics

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 9.1 | Visualizar dashboard de analytics | Acessar `/analytics` | Gráficos e indicadores carregados |
| 9.2 | Histórico de pacientes | Acessar `/patients-history` | Pacientes com alta listados corretamente |

## 10. Cenários Negativos e Edge Cases

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 10.1 | Token expirado | Aguardar expiração do token (15min) e fazer requisição | Refresh automático ou redirect para login |
| 10.2 | Campos obrigatórios vazios | Tentar salvar paciente sem campos obrigatórios | Validação impede o envio |
| 10.3 | Importação com API externa indisponível | Disparar importação com N8N offline | Mensagem de erro amigável exibida |
| 10.4 | Busca sem resultados | Buscar por termo inexistente | Mensagem "nenhum resultado encontrado" |
