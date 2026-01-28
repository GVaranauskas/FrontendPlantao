# Roteiro de Testes — 11Care Nursing Platform

> **Público-alvo:** Analista de negócios testando diretamente na interface da aplicação.
> Todos os passos são realizados via navegador. Nenhum acesso a banco de dados, logs ou ferramentas técnicas é necessário.

---

## Pré-requisitos

Antes de iniciar os testes, certifique-se de ter:

- Acesso ao sistema rodando no navegador
- Credenciais de 3 perfis distintos:
  - **Administrador** (ex: `admin` / senha configurada)
  - **Enfermagem** (ex: `enfermeiro` / senha configurada)
  - **Visualizador** (usuário com esse perfil criado pelo admin)
- Um **usuário novo** (recém-criado pelo admin, que nunca fez login) para testes de primeiro acesso

---

## 1. Login e Autenticação

### 1.1 Fluxo Normal de Login

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 1.1.1 | Login com sucesso | 1. Abrir a página inicial do sistema. 2. Digitar usuário e senha válidos. 3. Clicar em **Entrar**. | Sistema redireciona para a tela de **Módulos**. Nome do usuário aparece no cabeçalho. |
| 1.1.2 | Senha incorreta | 1. Na tela de login, digitar o usuário correto e uma senha errada. 2. Clicar em **Entrar**. | Mensagem de erro é exibida. Sistema permanece na tela de login. A mensagem **não** deve revelar se o erro foi no usuário ou na senha. |
| 1.1.3 | Campos em branco | 1. Deixar os campos de usuário e/ou senha vazios. 2. Clicar em **Entrar**. | Sistema impede o envio e exibe mensagem pedindo o preenchimento dos campos. |
| 1.1.4 | Muitas tentativas seguidas | 1. Digitar a senha errada 6 vezes seguidas. | A partir da 6ª tentativa, o sistema exibe mensagem informando que o acesso foi temporariamente bloqueado. Aguardar 15 minutos para tentar novamente. |
| 1.1.5 | Logout | 1. Estando logado, clicar no botão **Sair** (ou ícone de logout). | Sistema volta para a tela de login. Ao tentar usar o botão "Voltar" do navegador, não deve ser possível acessar as telas internas. |

### 1.2 Sessão e Expiração

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 1.2.1 | Sessão mantida durante uso | 1. Fazer login. 2. Navegar normalmente entre as telas por vários minutos. | Sistema mantém o usuário logado sem interrupções durante o uso contínuo. |
| 1.2.2 | Sessão expira após inatividade longa | 1. Fazer login. 2. Deixar o sistema aberto sem interagir por um longo período. 3. Tentar navegar. | Sistema redireciona para a tela de login pedindo novas credenciais. |
| 1.2.3 | Acesso direto a uma página interna | 1. Sem estar logado, digitar diretamente na barra de endereços o caminho de uma tela interna (ex: a tela de Passagem de Plantão). | Sistema redireciona para a tela de login. |

### 1.3 Primeiro Acesso — Troca de Senha Obrigatória

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 1.3.1 | Novo usuário é redirecionado | 1. Como admin, criar um novo usuário. 2. Em outra aba/navegador, fazer login com esse novo usuário. | Sistema redireciona automaticamente para a tela de **Troca de Senha**, não permitindo acessar nenhuma outra funcionalidade. |
| 1.3.2 | Navegação bloqueada antes da troca | 1. Logado como novo usuário (antes de trocar a senha), tentar acessar diretamente a Passagem de Plantão pela barra de endereços. | Sistema continua na tela de troca de senha ou redireciona de volta. Nenhuma tela interna é acessível. |
| 1.3.3 | Troca de senha com sucesso | 1. Na tela de primeiro acesso, preencher a senha atual (temporária). 2. Digitar uma nova senha que atenda os requisitos (8+ caracteres, com letra maiúscula, minúscula, número e caractere especial). 3. Confirmar. | Sistema exibe mensagem de sucesso e redireciona para a tela de **Módulos**. A partir deste momento, todas as funcionalidades do perfil ficam disponíveis. |
| 1.3.4 | Senha nova muito curta | 1. Na troca de senha, digitar uma nova senha com menos de 8 caracteres (ex: "Ab@1"). | Sistema exibe mensagem de erro indicando o requisito mínimo de caracteres. |
| 1.3.5 | Senha nova sem número | 1. Digitar nova senha sem nenhum número (ex: "Abcdefg@"). | Sistema exibe mensagem de erro. |
| 1.3.6 | Senha nova sem caractere especial | 1. Digitar nova senha sem caractere especial (ex: "Abcdefg1"). | Sistema exibe mensagem de erro. |
| 1.3.7 | Senha nova sem maiúscula | 1. Digitar nova senha sem letra maiúscula (ex: "abcdefg@1"). | Sistema exibe mensagem de erro. |
| 1.3.8 | Senha atual incorreta | 1. Digitar a senha atual (temporária) de forma errada. 2. Preencher nova senha válida. 3. Confirmar. | Sistema exibe mensagem de erro informando que a senha atual está incorreta. |

---

## 2. Permissões por Perfil de Usuário

### 2.1 Perfil Administrador

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 2.1.1 | Acesso total ao sistema | 1. Logar como administrador. 2. Navegar por todas as telas: Módulos, Passagem de Plantão, Admin (Usuários, Unidades, Templates, Analytics de Uso), Ferramentas, Analytics, Histórico de Pacientes. | Todas as telas são acessíveis sem restrição. |
| 2.1.2 | Menu Admin visível | 1. Logar como admin. 2. Verificar o menu ou tela de módulos. | Opções administrativas (Gerenciar Usuários, Unidades, Templates, Analytics de Uso, Ferramentas) estão visíveis. |
| 2.1.3 | Deletar paciente | 1. Na Passagem de Plantão, localizar um paciente. 2. Tentar excluí-lo. | Opção de exclusão disponível e funcional. |
| 2.1.4 | Deletar nota de paciente | 1. Abrir detalhes de um paciente com notas. 2. Tentar excluir uma nota. | Sistema pede um **motivo** para a exclusão. Após informar o motivo, a nota é removida. |
| 2.1.5 | Deletar nota sem motivo | 1. Tentar excluir uma nota sem preencher o motivo. | Sistema impede a exclusão e exige o preenchimento do campo de motivo. |

### 2.2 Perfil Enfermagem

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 2.2.1 | Acesso às funcionalidades clínicas | 1. Logar como enfermagem. 2. Acessar Passagem de Plantão. | Tela carrega normalmente. É possível visualizar pacientes, buscar, filtrar. |
| 2.2.2 | Criar e editar notas | 1. Abrir detalhes de um paciente. 2. Adicionar uma nota. 3. Editar a nota que acabou de criar. | Nota criada com sucesso. Edição da própria nota funciona. |
| 2.2.3 | Não pode editar nota de outro | 1. Abrir um paciente que tenha uma nota criada por outro profissional. 2. Tentar editar essa nota. | Opção de edição não aparece ou sistema bloqueia com mensagem de erro. |
| 2.2.4 | Não pode excluir paciente | 1. Na Passagem de Plantão, tentar excluir um paciente. | Opção de exclusão **não** está disponível para este perfil. |
| 2.2.5 | Não pode excluir notas | 1. Tentar excluir qualquer nota de paciente. | Opção de exclusão **não** está disponível para este perfil. |
| 2.2.6 | Menu Admin oculto | 1. Verificar o menu ou tela de módulos. | Opções administrativas (Gerenciar Usuários, Unidades, Templates, Ferramentas) **não** aparecem. |
| 2.2.7 | Acesso direto ao painel Admin | 1. Digitar o caminho da área administrativa diretamente na barra de endereços. | Sistema bloqueia o acesso ou redireciona para outra tela. |

### 2.3 Perfil Visualizador

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 2.3.1 | Apenas leitura | 1. Logar como visualizador. 2. Acessar Passagem de Plantão. | Tela carrega normalmente. Dados dos pacientes são visíveis. |
| 2.3.2 | Não pode criar notas | 1. Abrir detalhes de um paciente. 2. Tentar adicionar uma nota. | Opção de criar nota **não** está disponível ou o botão está desabilitado. |
| 2.3.3 | Não pode editar dados | 1. Tentar editar qualquer dado de paciente. | Campos de edição não são exibidos ou estão bloqueados. |
| 2.3.4 | Menu Admin oculto | 1. Verificar o menu ou tela de módulos. | Opções administrativas não aparecem. |

---

## 3. Passagem de Plantão — Tela Principal

### 3.1 Visualização de Pacientes

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 3.1.1 | Tabela carregada | 1. Acessar a tela de Passagem de Plantão. | Tabela exibe a lista de pacientes com as colunas configuradas (leito, nome, diagnóstico, etc.). Cards de resumo aparecem no topo (total, críticos, pendentes, etc.). |
| 3.1.2 | Busca por nome | 1. Digitar o nome (ou parte do nome) de um paciente na barra de busca. | Tabela filtra em tempo real mostrando apenas os pacientes que correspondem à busca. |
| 3.1.3 | Busca por leito | 1. Digitar o número de um leito na barra de busca. | Tabela filtra mostrando apenas o paciente do leito informado. |
| 3.1.4 | Busca sem resultado | 1. Digitar um texto que não corresponde a nenhum paciente. | Tabela fica vazia com mensagem indicando que nenhum resultado foi encontrado. |
| 3.1.5 | Detalhes do paciente | 1. Clicar em um paciente na tabela. | Modal ou painel lateral abre com os dados completos do paciente: diagnóstico, alergias, dieta, mobilidade, dispositivos, antibióticos, curativos, aporte/saturação, exames, cirurgia, observações, previsão de alta. |

### 3.2 Filtros por Cards de Resumo

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 3.2.1 | Filtrar pacientes pendentes | 1. Clicar no card de **Pendentes** no topo da tela. | Tabela mostra apenas pacientes com status pendente. O card fica destacado visualmente (borda, sombra ou ícone de filtro). |
| 3.2.2 | Filtrar pacientes críticos | 1. Clicar no card de **Críticos** no topo da tela. | Tabela mostra apenas pacientes classificados como críticos. |
| 3.2.3 | Limpar filtro do card | 1. Com um filtro de card ativo, clicar no botão de limpar filtro (na barra de busca ou no próprio card). | Tabela volta a exibir todos os pacientes. Destaque visual do card é removido. |
| 3.2.4 | Card desabilitado quando vazio | 1. Observar os cards quando não há pacientes de determinado tipo (ex: nenhum pendente). | O card correspondente aparece desabilitado (acinzentado, não clicável). |
| 3.2.5 | Filtro de card + busca por texto | 1. Clicar no card de Pendentes. 2. Digitar o nome de um paciente na busca. | A tabela aplica ambos os filtros simultaneamente: mostra apenas pacientes pendentes cujo nome corresponde à busca. |

### 3.3 Sincronização de Dados (Botão Sync)

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 3.3.1 | Sync com 1 clique | 1. Na Passagem de Plantão, clicar no botão **Sync N8N + IA** (ou equivalente). | Botão entra em estado de carregamento. Após a conclusão, a tabela é atualizada automaticamente com os dados mais recentes. |
| 3.3.2 | Feedback de progresso | 1. Clicar no botão de sync e observar a interface. | Sistema mostra indicação visual de progresso (spinner, barra, mensagem de status). |
| 3.3.3 | Resumo pós-sync | 1. Após a conclusão da sincronização, observar a notificação. | Toast ou notificação exibe o resumo: quantos pacientes novos, atualizados, arquivados e reativados. |
| 3.3.4 | Novos pacientes aparecem | 1. Solicitar a um colega (ou via sistema externo) que um novo paciente seja adicionado no sistema hospitalar. 2. Clicar em Sync. | Novo paciente aparece na tabela após a sincronização. |
| 3.3.5 | Paciente com alta desaparece | 1. Um paciente que recebeu alta no sistema hospitalar. 2. Clicar em Sync. | Paciente não aparece mais na lista ativa da Passagem de Plantão. |
| 3.3.6 | Troca de leito | 1. No sistema hospitalar, transferir um paciente de leito. 2. Clicar em Sync. | Paciente aparece com o novo número de leito na tabela. Se havia outro paciente no leito antigo, este é tratado corretamente. |

---

## 4. Análise Clínica por IA

### 4.1 Riscos e Insights

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 4.1.1 | Classificação de riscos exibida | 1. Abrir os detalhes de um paciente na Passagem de Plantão. 2. Localizar a seção de riscos clínicos. | São exibidas até 6 categorias de risco: quedas, lesão por pressão, infecção, broncoaspiração, nutricional e respiratório. Cada risco tem classificação (baixo, médio, alto). |
| 4.1.2 | Análise SBAR | 1. Nos detalhes do paciente, verificar a seção de análise SBAR. | São exibidos 4 blocos: Situação, Histórico, Avaliação e Recomendação — correspondentes à metodologia SBAR usada na enfermagem. |
| 4.1.3 | Protocolos assistenciais | 1. Abrir paciente com risco alto em alguma categoria. | Sistema sugere protocolos assistenciais adequados (ex: "Prevenção de Quedas" para risco alto de queda). |
| 4.1.4 | Dados atualizados após sync | 1. Clicar em Sync. 2. Reabrir os detalhes de um paciente cujos dados mudaram. | Análise clínica é atualizada conforme os novos dados do paciente. |
| 4.1.5 | Resposta rápida para dados sem alteração | 1. Fazer sync. 2. Sem alterações nos dados, fazer sync novamente. 3. Abrir detalhes de um paciente. | Análise é exibida rapidamente (os dados não mudaram, então o sistema usa informações já processadas). |

---

## 5. Notas de Pacientes

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 5.1 | Adicionar nota (enfermagem) | 1. Logar como enfermagem. 2. Abrir detalhes de um paciente. 3. Escrever um texto no campo de notas. 4. Salvar. | Nota aparece na lista com o nome do autor e a data/hora de criação. |
| 5.2 | Adicionar nota (admin) | 1. Logar como admin. 2. Repetir o mesmo processo. | Nota criada com sucesso com o nome do admin como autor. |
| 5.3 | Editar nota própria | 1. Logar como enfermagem. 2. Localizar uma nota que você criou. 3. Clicar para editar. 4. Alterar o texto e salvar. | Nota é atualizada. |
| 5.4 | Tentar editar nota de outro profissional | 1. Logar como enfermagem. 2. Localizar uma nota criada por outro profissional. | O botão de edição não está disponível ou está bloqueado para notas de terceiros. |
| 5.5 | Histórico de versões | 1. Abrir o histórico de notas de um paciente que teve notas editadas. | É possível ver as versões anteriores, com autor e data de cada alteração. |
| 5.6 | Visualizador não pode adicionar nota | 1. Logar como visualizador. 2. Abrir detalhes de um paciente. | Campo de adição de notas não está disponível ou está desabilitado. |

---

## 6. Gestão de Pacientes

### 6.1 Dados Clínicos

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 6.1.1 | Todos os campos clínicos presentes | 1. Abrir detalhes de um paciente sincronizado. | São exibidos: diagnóstico, alergias, dieta, mobilidade, eliminações, dispositivos, antibióticos (ATB), curativos, aporte/saturação, exames, cirurgia, observações, previsão de alta, especialidade, escala de Braden. |
| 6.1.2 | Dados do leito e internação | 1. Verificar as informações do cabeçalho do paciente. | Exibe: número do leito, nome completo, número de registro (prontuário), data de internação, data da última evolução. |
| 6.1.3 | Criar paciente manualmente | 1. Logar como admin ou enfermagem. 2. Usar a opção de adicionar paciente (se disponível). 3. Preencher nome (mín. 3 caracteres) e registro. 4. Salvar. | Paciente é criado e aparece na lista. |
| 6.1.4 | Nome muito curto | 1. Tentar criar paciente com nome de 1 ou 2 caracteres. | Sistema rejeita com mensagem de erro. |
| 6.1.5 | Idade inválida | 1. Tentar criar paciente com idade negativa ou acima de 150 anos. | Sistema rejeita com mensagem de erro. |

### 6.2 Arquivamento de Pacientes

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 6.2.1 | Paciente que recebeu alta | 1. Após um sync onde um paciente não está mais nos dados externos. | Paciente desaparece da lista ativa e vai para o Histórico. |
| 6.2.2 | Conflito de leito resolvido | 1. Após um sync onde um novo paciente ocupa o leito de um paciente anterior. | Paciente anterior é arquivado automaticamente. Novo paciente aparece no leito. |
| 6.2.3 | Proteção contra remoção em massa | 1. Se o sistema externo retornar pouquíssimos dados (falha temporária). 2. Clicar em sync. | Sistema **não** remove todos os pacientes de uma vez. A lista permanece estável e um aviso pode ser exibido. |

---

## 7. Histórico de Pacientes

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 7.1 | Acessar tela de histórico | 1. No menu, clicar em **Histórico de Pacientes**. | Tela exibe lista de pacientes que já tiveram alta, transferência ou óbito. |
| 7.2 | Detalhes preservados | 1. Clicar em um paciente do histórico. | Todos os dados clínicos do momento do arquivamento são exibidos (diagnóstico, alergias, notas, análise de risco, etc.). São dados "congelados" no momento da saída. |
| 7.3 | Motivo do arquivamento | 1. Verificar as informações do paciente no histórico. | O motivo é exibido: alta hospitalar, transferência, óbito ou registro antigo. |
| 7.4 | Buscar no histórico | 1. Usar a barra de busca na tela de histórico. 2. Digitar o nome de um paciente. | Paciente encontrado na lista. |
| 7.5 | Paciente reativado mantém histórico | 1. Um paciente que teve alta volta a ser internado. 2. Após sync, o paciente reaparece na lista ativa. 3. Verificar o histórico. | O registro anterior de alta permanece no histórico como um log permanente. O paciente aparece tanto na lista ativa quanto no histórico (com datas diferentes). |

---

## 8. Administração de Usuários

### 8.1 Gerenciamento (apenas Admin)

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 8.1.1 | Listar usuários | 1. Logar como admin. 2. Acessar **Admin > Gerenciar Usuários**. | Lista com todos os usuários do sistema, incluindo nome, login, perfil (role) e status (ativo/inativo). |
| 8.1.2 | Criar novo usuário | 1. Clicar em **Criar Usuário**. 2. Preencher: nome, login, email, senha e perfil. 3. Salvar. | Usuário criado aparece na lista. Senha deve atender os requisitos (8+ chars, maiúscula, minúscula, número, especial). |
| 8.1.3 | Senha fraca rejeitada | 1. Tentar criar usuário com senha "123456" (sem maiúscula, sem especial). | Sistema rejeita e exibe mensagem sobre os requisitos de senha. |
| 8.1.4 | Login duplicado rejeitado | 1. Tentar criar um usuário com um login que já existe. | Sistema rejeita e informa que o login já está em uso. |
| 8.1.5 | Alterar perfil do usuário | 1. Editar um usuário existente. 2. Mudar o perfil de "enfermagem" para "visualizador". 3. Salvar. | Perfil alterado. No próximo login desse usuário, ele terá apenas permissão de leitura. |
| 8.1.6 | Desativar usuário | 1. Desativar um usuário na lista. | Usuário marcado como inativo. Ao tentar fazer login com esse usuário, o acesso é negado. |
| 8.1.7 | Novo usuário obrigado a trocar senha | 1. Criar um novo usuário. 2. Em outra aba, fazer login com ele. | O sistema obriga a troca de senha antes de qualquer outra ação (conforme testado na seção 1.3). |

---

## 9. Administração de Unidades de Enfermagem

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 9.1 | Listar unidades | 1. Logar como admin. 2. Acessar **Admin > Unidades de Enfermagem**. | Lista com todas as unidades cadastradas: código, nome, localização, ramal e status (ativa/inativa). |
| 9.2 | Criar nova unidade | 1. Clicar em **Criar Unidade**. 2. Preencher os campos obrigatórios. 3. Salvar. | Unidade aparece na lista. |
| 9.3 | Editar unidade | 1. Editar uma unidade existente. 2. Alterar o nome ou localização. 3. Salvar. | Dados atualizados na lista. |

---

## 10. Templates de Passagem de Plantão

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 10.1 | Acessar configuração de templates | 1. Logar como admin. 2. Acessar **Admin > Templates**. | Tela exibe os campos configuráveis por unidade de enfermagem. |
| 10.2 | Ocultar campo no template | 1. Desmarcar o campo "Cirurgia" para uma determinada unidade. 2. Salvar. 3. Acessar a Passagem de Plantão daquela unidade. | O campo "Cirurgia" **não** aparece na visualização da passagem de plantão. |
| 10.3 | Reativar campo no template | 1. Marcar novamente o campo "Cirurgia". 2. Salvar. 3. Acessar a Passagem de Plantão. | O campo "Cirurgia" volta a ser exibido com os dados do paciente (os dados nunca foram removidos, apenas a exibição). |

---

## 11. Exportação e Impressão

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 11.1 | Exportar planilha Excel | 1. Na Passagem de Plantão, clicar no botão de **Exportar**. | Um arquivo `.xlsx` é baixado no computador contendo os dados dos pacientes da tabela. |
| 11.2 | Dados legíveis no Excel | 1. Abrir o arquivo exportado. | Todos os dados aparecem em texto legível: nomes, diagnósticos, alergias, etc. Nenhum dado aparece como texto cifrado ou ilegível. |
| 11.3 | Imprimir relatório | 1. Na Passagem de Plantão, clicar no botão de **Imprimir**. | Uma visualização de impressão é gerada com layout adequado para papel, contendo os dados clínicos dos pacientes. |

---

## 12. Analytics de Uso (Admin)

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 12.1 | Acessar dashboard de uso | 1. Logar como admin. 2. Acessar **Admin > Analytics de Uso**. | Dashboard com 4 abas: Visão Geral, Páginas, Ações e Usuários. |
| 12.2 | Visão geral | 1. Na aba **Visão Geral**, verificar as métricas. | Exibe: total de sessões, sessões ativas, total de visualizações de página, total de ações e usuários únicos. Gráficos carregados. |
| 12.3 | Top páginas | 1. Na aba **Páginas**. | Ranking das páginas mais acessadas com contagem. |
| 12.4 | Top ações | 1. Na aba **Ações**. | Ranking das ações mais realizadas (gráfico pizza ou equivalente). |
| 12.5 | Stats por usuário | 1. Na aba **Usuários**, selecionar um usuário. | Exibe sessões, visualizações, ações e última atividade daquele usuário. |
| 12.6 | Filtro por período | 1. Alterar o filtro de período (últimas 24h, 7 dias, 30 dias, 90 dias). | Os dados e gráficos são atualizados conforme o período selecionado. |
| 12.7 | Enfermagem não acessa | 1. Logar como enfermagem. 2. Tentar acessar a tela de Analytics de Uso (via menu ou URL direto). | Acesso negado ou tela não disponível. |

---

## 13. Importação Manual de Dados

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 13.1 | Importar evoluções | 1. Logar como admin. 2. Acessar a tela de **Importação**. 3. Selecionar a unidade de enfermagem desejada. 4. Clicar em **Importar**. | Sistema inicia a importação. Exibe progresso e, ao final, mostra quantos registros foram importados/atualizados. |
| 13.2 | Ver status da importação | 1. Acessar **Logs de Importação**. | Exibe logs em tempo real da última importação com status de cada etapa. |
| 13.3 | Ver histórico de importações | 1. Acessar o **Dashboard** de importação. | Lista de importações anteriores com data, unidade e estatísticas (total importado, novos, atualizados). |

---

## 14. Segurança — Testes pela Interface

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 14.1 | Texto com HTML em campo de nota | 1. Criar uma nota de paciente com o texto: `<b>teste</b> <script>alerta</script>`. 2. Salvar e reabrir os detalhes. | O texto é exibido como texto puro, sem formatar HTML nem executar scripts. As tags aparecem literalmente. |
| 14.2 | Texto com SQL em campo de busca | 1. Na barra de busca, digitar: `'; DROP TABLE --`. 2. Pressionar Enter. | A busca retorna "nenhum resultado". O sistema continua funcionando normalmente. |
| 14.3 | Campo com texto muito longo | 1. Em um campo de observações, colar um texto com mais de 5.000 caracteres. 2. Salvar. | Sistema aceita (se dentro do limite) ou rejeita com mensagem de erro sobre o tamanho máximo. |

---

## 15. Setup Inicial do Sistema

> **Nota:** Este teste só pode ser executado antes do primeiro uso do sistema ou em ambiente limpo.

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 15.1 | Configuração inicial | 1. Acessar a página de setup do sistema. 2. Informar a chave de configuração fornecida pelo time técnico. 3. Confirmar. | Sistema cria os usuários padrão (admin e enfermeiro) e exibe as credenciais iniciais. |
| 15.2 | Chave inválida | 1. Na página de setup, digitar uma chave incorreta. 2. Confirmar. | Sistema rejeita com mensagem de erro, informando que a chave é inválida. |
| 15.3 | Setup já realizado | 1. Após o setup inicial, tentar acessar a página de setup novamente. | Sistema informa que a configuração já foi realizada ou redireciona para o login. |

---

## 16. Responsividade e Usabilidade

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 16.1 | Tela no celular | 1. Acessar o sistema pelo navegador do celular (ou simular no desktop com F12 > modo mobile). | Telas são legíveis. Menu se adapta (hamburger). Tabelas rolam horizontalmente. Botões são tocáveis. |
| 16.2 | Tela em tablet | 1. Acessar em resolução de tablet. | Layout se adapta sem quebras visuais. |
| 16.3 | Navegação por teclado | 1. Navegar pelos campos de login usando Tab. 2. Pressionar Enter no botão. | Todos os campos interativos são acessíveis por teclado. O foco é visualmente identificável. |

---

## Resumo de Cobertura

| Seção | Qtd. Testes | Perfis Envolvidos |
|-------|-------------|-------------------|
| 1. Login e Autenticação | 13 | Todos |
| 2. Permissões por Perfil | 16 | Admin, Enfermagem, Visualizador |
| 3. Passagem de Plantão | 11 | Todos |
| 4. Análise Clínica por IA | 5 | Todos |
| 5. Notas de Pacientes | 6 | Admin, Enfermagem, Visualizador |
| 6. Gestão de Pacientes | 8 | Admin, Enfermagem |
| 7. Histórico de Pacientes | 5 | Todos |
| 8. Administração de Usuários | 7 | Admin |
| 9. Unidades de Enfermagem | 3 | Admin |
| 10. Templates | 3 | Admin |
| 11. Exportação e Impressão | 3 | Todos |
| 12. Analytics de Uso | 7 | Admin, Enfermagem |
| 13. Importação de Dados | 3 | Admin |
| 14. Segurança | 3 | Todos |
| 15. Setup Inicial | 3 | Admin |
| 16. Responsividade | 3 | Todos |
| **Total** | **99** | |
