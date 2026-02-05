#!/bin/bash
# ================================================================
#  DEPLOY SELETIVO - Publique só as features que você quer
# ================================================================
#
#  USO:  bash deploy-seletivo.sh
#
#  Este script permite escolher quais funcionalidades recentes
#  serão publicadas no Replit, sem precisar subir tudo de uma vez.
#
# ================================================================

set -euo pipefail

# --- Cores ---
VERDE='\033[0;32m'
AMARELO='\033[1;33m'
VERMELHO='\033[0;31m'
AZUL='\033[0;34m'
CIANO='\033[0;36m'
NEGRITO='\033[1m'
DIM='\033[2m'
RESET='\033[0m'

# --- Variáveis globais ---
BRANCH_DEPLOY=""
BRANCH_ORIGINAL=$(git branch --show-current)
DEPLOY_CRIADO=false

# --- Funções de output ---
msg_info()   { echo -e "${AZUL}  i${RESET} $1"; }
msg_ok()     { echo -e "${VERDE}  ✓${RESET} $1"; }
msg_warn()   { echo -e "${AMARELO}  !${RESET} $1"; }
msg_erro()   { echo -e "${VERMELHO}  ✗${RESET} $1"; }
msg_titulo() {
    echo ""
    echo -e "${NEGRITO}  ══════════════════════════════════════════${RESET}"
    echo -e "${NEGRITO}    $1${RESET}"
    echo -e "${NEGRITO}  ══════════════════════════════════════════${RESET}"
}
linha() { echo -e "${DIM}  ──────────────────────────────────────────${RESET}"; }

# --- Cleanup seguro em caso de erro ---
cleanup() {
    local exit_code=$?
    if [ "$DEPLOY_CRIADO" = true ] && [ $exit_code -ne 0 ]; then
        echo ""
        msg_warn "Operação cancelada. Limpando..."
        git cherry-pick --abort 2>/dev/null || true
        git checkout "$BRANCH_ORIGINAL" --quiet 2>/dev/null || true
        git branch -D "$BRANCH_DEPLOY" 2>/dev/null || true
        msg_ok "Tudo limpo. Você está de volta na branch ${BRANCH_ORIGINAL}."
    fi
}
trap cleanup EXIT

# ================================================================
#  TELA INICIAL
# ================================================================
clear 2>/dev/null || true
msg_titulo "DEPLOY SELETIVO - Replit"
echo ""
echo -e "  Esse script ajuda você a ${NEGRITO}publicar apenas algumas${RESET}"
echo -e "  ${NEGRITO}funcionalidades${RESET} no Replit, sem subir tudo."
echo ""
echo -e "  ${DIM}Como funciona:${RESET}"
echo -e "  ${DIM}  1. Você indica o que já está no Replit${RESET}"
echo -e "  ${DIM}  2. Escolhe quais novidades quer publicar${RESET}"
echo -e "  ${DIM}  3. O script prepara tudo pra você${RESET}"
echo ""
linha

# ================================================================
#  PASSO 1: Escolher o ponto de partida (último deploy)
# ================================================================
msg_titulo "PASSO 1 de 4: O que já está no Replit?"
echo ""
echo -e "  Abaixo estão os commits recentes do projeto."
echo -e "  ${NEGRITO}Escolha o número do último commit que JÁ ESTÁ publicado${RESET}"
echo -e "  ${NEGRITO}no Replit atualmente.${RESET}"
echo ""
echo -e "  ${DIM}Dica: se não sabe qual é, escolha um mais antigo para garantir.${RESET}"
echo ""

# Carregar commits, filtrando ruído
mapfile -t ALL_COMMITS < <(
    git log --oneline -80 \
    | grep -v "Transitioned from Plan" \
    | grep -v "Saved progress at the end" \
    | grep -v "Restored to" \
    | head -30
)

for i in "${!ALL_COMMITS[@]}"; do
    num=$((i + 1))
    hash=$(echo "${ALL_COMMITS[$i]}" | awk '{print $1}')
    msg=$(echo "${ALL_COMMITS[$i]}" | cut -d' ' -f2-)
    printf "  ${CIANO}%2d)${RESET} ${DIM}%s${RESET} %s\n" "$num" "$hash" "$msg"
done

echo ""
while true; do
    read -rp "$(echo -e "  ${AMARELO}Número do commit base (que já está no Replit): ${RESET}")" BASE_NUM
    if [[ "$BASE_NUM" =~ ^[0-9]+$ ]] && [ "$BASE_NUM" -ge 1 ] && [ "$BASE_NUM" -le "${#ALL_COMMITS[@]}" ]; then
        break
    fi
    msg_erro "Digite um número entre 1 e ${#ALL_COMMITS[@]}"
done

BASE_COMMIT=$(echo "${ALL_COMMITS[$((BASE_NUM - 1))]}" | awk '{print $1}')
BASE_MSG=$(echo "${ALL_COMMITS[$((BASE_NUM - 1))]}" | cut -d' ' -f2-)
echo ""
msg_ok "Base: ${NEGRITO}${BASE_MSG}${RESET}"

# ================================================================
#  PASSO 2: Agrupar e mostrar features disponíveis
# ================================================================
msg_titulo "PASSO 2 de 4: Escolha as features"
echo ""
echo -e "  Estas são as funcionalidades ${NEGRITO}novas${RESET} (que ainda NÃO"
echo -e "  estão no Replit):"
echo ""

# Pegar commits entre base e HEAD, filtrar ruído, ordem cronológica (antigo→novo)
mapfile -t RAW_COMMITS < <(
    git log --oneline --reverse "${BASE_COMMIT}..HEAD" \
    | grep -v "Transitioned from Plan" \
    | grep -v "Saved progress at the end" \
    | grep -v "Restored to"
)

if [ ${#RAW_COMMITS[@]} -eq 0 ]; then
    echo ""
    msg_warn "Não há features novas desde o ponto selecionado."
    msg_info "Tudo que existe já está publicado!"
    exit 0
fi

# --- Agrupar commits em features por palavras-chave ---
# Cada grupo: NOME|DESCRICAO|COMMIT1,COMMIT2,...
declare -a GRUPO_NOMES=()
declare -a GRUPO_DESCS=()
declare -a GRUPO_COMMITS=()

# Padrões de agrupamento em ORDEM DE PRIORIDADE (mais específico primeiro)
# Formato: "REGEX|NOME_DO_GRUPO|DESCRIÇÃO"
PADROES_ORDENADOS=(
    "audit|audit trail|Trilha de Auditoria|Registro de ações dos administradores no sistema"
    "medical evolution|nursing note|evolucao|anotacao|enfermagem|collapsible.*medical|collapsible.*nursing|Evolução Médica e Anotações|Campos de evolução médica e anotações de enfermagem"
    "rate limit|Controle de Requisições (Rate Limiting)|Limite de requisições por usuário (resolve problema de NAT corporativo)"
    "auto-refresh|token refresh|session management|Sessão Auto-Refresh|Renovação automática de sessão do usuário"
    "analytics|metrics|tracking|usage|Painel de Analytics|Dashboard de métricas de uso do sistema"
    "sync|archiv|conflict resolution|idempotency|duplicate|patient.*listing|Sincronização de Pacientes|Melhorias na sincronização e resolução de conflitos"
    "nursing unit|approval|Aprovação Unidade|Correção na aprovação de unidades de enfermagem"
    "false positive|clinical|Validação Clínica|Ajuste na validação de segurança para textos clínicos"
    "security|LGPD|encrypt|helmet|password|Segurança e LGPD|Melhorias de segurança e conformidade LGPD"
    "modal|display|long text|Melhorias de Interface|Melhorias visuais nos modais de pacientes"
    "print|report|Relatório Imprimível|Página de relatório para impressão"
    "guide|field.*system|patient field|Guia de Campos|Guia para criação de novos campos de pacientes"
    "documentation|doc |skill|checklist|workflow rule|Documentação|Atualizações de documentação do projeto"
)

# Função para classificar um commit (respeita prioridade)
classificar_commit() {
    local msg_lower
    msg_lower=$(echo "$1" | tr '[:upper:]' '[:lower:]')
    for entrada in "${PADROES_ORDENADOS[@]}"; do
        # Extrair os campos: último campo = descrição, penúltimo = nome, resto = regex
        local desc nome regex
        desc="${entrada##*|}"
        local sem_desc="${entrada%|*}"
        nome="${sem_desc##*|}"
        regex="${sem_desc%|*}"
        if echo "$msg_lower" | grep -qiE "$regex"; then
            echo "${nome}|${desc}"
            return
        fi
    done
    echo ""
}

# Agrupar commits
for i in "${!RAW_COMMITS[@]}"; do
    commit_msg=$(echo "${RAW_COMMITS[$i]}" | cut -d' ' -f2-)
    commit_hash=$(echo "${RAW_COMMITS[$i]}" | awk '{print $1}')

    grupo_info=$(classificar_commit "$commit_msg")

    if [ -z "$grupo_info" ]; then
        # Commit sem grupo - fica como item individual
        GRUPO_NOMES+=("$commit_msg")
        GRUPO_DESCS+=("")
        GRUPO_COMMITS+=("$commit_hash")
        COMMITS_AGRUPADOS+=("$i")
    else
        grupo_nome=$(echo "$grupo_info" | cut -d'|' -f1)
        grupo_desc=$(echo "$grupo_info" | cut -d'|' -f2)

        # Verificar se grupo já existe
        grupo_existe=false
        for g in "${!GRUPO_NOMES[@]}"; do
            if [ "${GRUPO_NOMES[$g]}" = "$grupo_nome" ]; then
                # Adicionar commit ao grupo existente
                GRUPO_COMMITS[$g]="${GRUPO_COMMITS[$g]},$commit_hash"
                grupo_existe=true
                break
            fi
        done

        if ! $grupo_existe; then
            GRUPO_NOMES+=("$grupo_nome")
            GRUPO_DESCS+=("$grupo_desc")
            GRUPO_COMMITS+=("$commit_hash")
        fi
    fi
done

# Mostrar features agrupadas
for i in "${!GRUPO_NOMES[@]}"; do
    num=$((i + 1))
    nome="${GRUPO_NOMES[$i]}"
    desc="${GRUPO_DESCS[$i]}"
    commits="${GRUPO_COMMITS[$i]}"

    # Contar commits no grupo
    n_commits=$(echo "$commits" | tr ',' '\n' | wc -l)

    if [ -n "$desc" ]; then
        printf "  ${VERDE}%2d)${RESET} ${NEGRITO}%s${RESET} ${DIM}(%d commits)${RESET}\n" "$num" "$nome" "$n_commits"
        printf "      ${DIM}%s${RESET}\n" "$desc"
    else
        printf "  ${VERDE}%2d)${RESET} %s\n" "$num" "$nome"
    fi
done

echo ""
linha
echo ""
echo -e "  ${NEGRITO}Como escolher:${RESET}"
echo -e "    - Digite os números separados por espaço: ${DIM}1 3 5${RESET}"
echo -e "    - Para selecionar todas, digite: ${DIM}todas${RESET}"
echo ""

while true; do
    read -rp "$(echo -e "  ${AMARELO}Features para publicar: ${RESET}")" SELECTION

    if [ "$SELECTION" = "todas" ] || [ "$SELECTION" = "all" ] || [ "$SELECTION" = "t" ]; then
        declare -a SELECTED=()
        for i in "${!GRUPO_NOMES[@]}"; do
            SELECTED+=("$i")
        done
        break
    fi

    declare -a SELECTED=()
    valid=true
    for num in $SELECTION; do
        if [[ "$num" =~ ^[0-9]+$ ]] && [ "$num" -ge 1 ] && [ "$num" -le "${#GRUPO_NOMES[@]}" ]; then
            SELECTED+=("$((num - 1))")
        else
            msg_erro "Número inválido: $num (use 1 a ${#GRUPO_NOMES[@]})"
            valid=false
            break
        fi
    done

    if $valid && [ ${#SELECTED[@]} -gt 0 ]; then
        break
    fi

    if $valid; then
        msg_erro "Selecione pelo menos uma feature!"
    fi
done

# ================================================================
#  PASSO 3: Confirmar seleção
# ================================================================
msg_titulo "PASSO 3 de 4: Confirmar"
echo ""
echo -e "  ${VERDE}Será publicado:${RESET}"

for idx in "${SELECTED[@]}"; do
    echo -e "    ${VERDE}✓${RESET} ${GRUPO_NOMES[$idx]}"
done

echo ""
echo -e "  ${VERMELHO}NÃO será publicado:${RESET}"

tem_excluido=false
for i in "${!GRUPO_NOMES[@]}"; do
    is_selected=false
    for idx in "${SELECTED[@]}"; do
        if [ "$i" -eq "$idx" ]; then
            is_selected=true
            break
        fi
    done
    if ! $is_selected; then
        echo -e "    ${VERMELHO}✗${RESET} ${DIM}${GRUPO_NOMES[$i]}${RESET}"
        tem_excluido=true
    fi
done

if ! $tem_excluido; then
    echo -e "    ${DIM}(nada excluído - tudo será publicado)${RESET}"
fi

echo ""
while true; do
    read -rp "$(echo -e "  ${AMARELO}Confirma? (s/n): ${RESET}")" CONFIRM
    case "$CONFIRM" in
        s|S|sim|SIM|Sim) break ;;
        n|N|nao|NAO|Nao|não)
            echo ""
            msg_warn "Operação cancelada. Nenhuma alteração foi feita."
            exit 0
            ;;
        *) msg_erro "Digite 's' para sim ou 'n' para não" ;;
    esac
done

# ================================================================
#  PASSO 4: Criar branch e aplicar features
# ================================================================
msg_titulo "PASSO 4 de 4: Preparando deploy"
echo ""

BRANCH_DEPLOY="deploy/seletivo-$(date +%Y%m%d-%H%M%S)"
msg_info "Criando branch ${NEGRITO}${BRANCH_DEPLOY}${RESET}..."
git checkout -b "$BRANCH_DEPLOY" "$BASE_COMMIT" --quiet
DEPLOY_CRIADO=true

echo ""
SUCESSOS=0
FALHAS=0
declare -a FALHAS_NOMES=()

# Aplicar features selecionadas (em ordem cronológica)
for idx in "${SELECTED[@]}"; do
    nome="${GRUPO_NOMES[$idx]}"
    commits_str="${GRUPO_COMMITS[$idx]}"

    echo -ne "  Aplicando: ${NEGRITO}${nome}${RESET}... "

    # Aplicar cada commit do grupo em ordem
    IFS=',' read -ra commit_list <<< "$commits_str"
    grupo_ok=true

    for commit_hash in "${commit_list[@]}"; do
        if ! git cherry-pick "$commit_hash" --quiet 2>/dev/null; then
            git cherry-pick --abort 2>/dev/null || true
            grupo_ok=false
            break
        fi
    done

    if $grupo_ok; then
        echo -e "${VERDE}OK${RESET}"
        ((SUCESSOS++))
    else
        echo -e "${VERMELHO}CONFLITO${RESET}"
        msg_warn "    Esta feature depende de outra que não foi selecionada."
        msg_warn "    Tente incluí-la junto com as features anteriores."
        FALHAS_NOMES+=("$nome")
        ((FALHAS++))
    fi
done

# ================================================================
#  RESULTADO
# ================================================================
echo ""
linha
msg_titulo "RESULTADO"
echo ""

if [ $SUCESSOS -gt 0 ]; then
    msg_ok "${VERDE}${SUCESSOS} feature(s) aplicada(s) com sucesso!${RESET}"
fi

if [ $FALHAS -gt 0 ]; then
    msg_warn "${FALHAS} feature(s) com conflito (ignoradas):"
    for nome in "${FALHAS_NOMES[@]}"; do
        echo -e "      ${DIM}- ${nome}${RESET}"
    done
fi

if [ $SUCESSOS -eq 0 ]; then
    echo ""
    msg_erro "Nenhuma feature pôde ser aplicada."
    msg_info "Isso geralmente acontece quando as features dependem umas das outras."
    msg_info "Tente selecionar as features em ordem, incluindo as anteriores."
    echo ""
    git checkout "$BRANCH_ORIGINAL" --quiet
    git branch -D "$BRANCH_DEPLOY" --quiet 2>/dev/null || true
    DEPLOY_CRIADO=false
    exit 1
fi

echo ""
linha
echo ""
echo -e "  ${NEGRITO}Branch criada:${RESET} ${VERDE}${BRANCH_DEPLOY}${RESET}"
echo ""
echo -e "  ${NEGRITO}PRÓXIMOS PASSOS:${RESET}"
echo ""
echo -e "  ${CIANO}1.${RESET} No ${NEGRITO}Replit${RESET}, abra o ${NEGRITO}Shell${RESET} (aba ao lado do Console)"
echo ""
echo -e "  ${CIANO}2.${RESET} Execute estes comandos:"
echo -e "     ${DIM}git fetch origin ${BRANCH_DEPLOY}${RESET}"
echo -e "     ${DIM}git checkout ${BRANCH_DEPLOY}${RESET}"
echo ""
echo -e "  ${CIANO}3.${RESET} Clique no botão ${NEGRITO}Deploy${RESET} no Replit"
echo ""
echo -e "  ${CIANO}4.${RESET} Para voltar ao normal depois:"
echo -e "     ${DIM}git checkout main${RESET}"
echo ""
linha
echo ""

# Perguntar se quer enviar para o GitHub
while true; do
    read -rp "$(echo -e "  ${AMARELO}Enviar branch para o GitHub agora? (s/n): ${RESET}")" PUSH_CONFIRM
    case "$PUSH_CONFIRM" in
        s|S|sim|SIM|Sim)
            echo ""
            msg_info "Enviando para GitHub..."
            tentativa=0
            max_tentativas=4
            enviado=false

            while [ $tentativa -lt $max_tentativas ]; do
                if git push -u origin "$BRANCH_DEPLOY" 2>/dev/null; then
                    enviado=true
                    break
                fi
                ((tentativa++))
                if [ $tentativa -lt $max_tentativas ]; then
                    espera=$((2 ** tentativa))
                    msg_warn "Falha na rede. Tentando novamente em ${espera}s... (tentativa $((tentativa+1))/$max_tentativas)"
                    sleep $espera
                fi
            done

            if $enviado; then
                msg_ok "Branch enviada para o GitHub!"
                echo ""
                echo -e "  Agora no Replit, execute:"
                echo -e "  ${DIM}  git fetch origin${RESET}"
                echo -e "  ${DIM}  git checkout ${BRANCH_DEPLOY}${RESET}"
            else
                msg_erro "Não foi possível enviar. Tente manualmente:"
                echo -e "  ${DIM}  git push -u origin ${BRANCH_DEPLOY}${RESET}"
            fi
            break
            ;;
        n|N|nao|NAO|Nao|não)
            echo ""
            msg_info "OK. Para enviar depois, execute:"
            echo -e "  ${DIM}  git checkout ${BRANCH_DEPLOY}${RESET}"
            echo -e "  ${DIM}  git push -u origin ${BRANCH_DEPLOY}${RESET}"
            break
            ;;
        *) msg_erro "Digite 's' para sim ou 'n' para não" ;;
    esac
done

# Voltar para branch original
echo ""
git checkout "$BRANCH_ORIGINAL" --quiet
DEPLOY_CRIADO=false
msg_ok "Você está de volta na branch ${NEGRITO}${BRANCH_ORIGINAL}${RESET}"
echo ""
msg_ok "Pronto! Agora é só fazer o deploy no Replit."
echo ""
