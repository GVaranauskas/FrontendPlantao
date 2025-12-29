-- Migration: Adicionar índices para otimização de performance
-- Data: 2024
-- Descrição: Índices estratégicos para queries comuns

-- ========================================
-- TABELA: patients
-- ========================================

-- Índice para busca por leito (muito usado)
CREATE INDEX IF NOT EXISTS idx_patients_leito 
ON patients(leito);

-- Índice para busca por enfermaria (filtro comum)
CREATE INDEX IF NOT EXISTS idx_patients_enfermaria 
ON patients(ds_enfermaria);

-- Índice para busca por status (pending/complete)
CREATE INDEX IF NOT EXISTS idx_patients_status 
ON patients(status);

-- Índice composto para busca por leito + enfermaria (combo comum)
CREATE INDEX IF NOT EXISTS idx_patients_leito_enfermaria 
ON patients(leito, ds_enfermaria);

-- Índice para busca por data de internação (para ordenação)
CREATE INDEX IF NOT EXISTS idx_patients_data_internacao 
ON patients(data_internacao);

-- Índice para busca por fonte de dados (N8N_IAMSPE, etc)
CREATE INDEX IF NOT EXISTS idx_patients_fonte_dados 
ON patients(fonte_dados);

-- Índice para buscas por data de importação (relatórios)
CREATE INDEX IF NOT EXISTS idx_patients_imported_at 
ON patients(imported_at DESC);

-- ========================================
-- TABELA: import_history
-- ========================================

-- Índice para busca por enfermaria
CREATE INDEX IF NOT EXISTS idx_import_history_enfermaria 
ON import_history(enfermaria);

-- Índice para busca por timestamp (relatórios temporais)
CREATE INDEX IF NOT EXISTS idx_import_history_timestamp 
ON import_history(timestamp DESC);

-- Índice composto para relatórios por enfermaria + data
CREATE INDEX IF NOT EXISTS idx_import_history_enfermaria_timestamp 
ON import_history(enfermaria, timestamp DESC);

-- ========================================
-- TABELA: audit_log
-- ========================================

-- Índice para busca por usuário (auditoria)
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id 
ON audit_log(user_id);

-- Índice para busca por timestamp (queries temporais)
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp 
ON audit_log(timestamp DESC);

-- Índice para busca por ação (filtro comum)
CREATE INDEX IF NOT EXISTS idx_audit_log_action 
ON audit_log(action);

-- Índice para busca por recurso
CREATE INDEX IF NOT EXISTS idx_audit_log_resource 
ON audit_log(resource);

-- Índice para busca por status code (erros)
CREATE INDEX IF NOT EXISTS idx_audit_log_status_code 
ON audit_log(status_code);

-- ========================================
-- TABELA: nursing_units
-- ========================================

-- Índice para busca por código (muito usado)
CREATE INDEX IF NOT EXISTS idx_nursing_units_codigo 
ON nursing_units(codigo);

-- Índice para busca por external_id
CREATE INDEX IF NOT EXISTS idx_nursing_units_external_id 
ON nursing_units(external_id);

-- Índice para filtrar apenas ativos
CREATE INDEX IF NOT EXISTS idx_nursing_units_ativo 
ON nursing_units(ativo);

-- ========================================
-- TABELA: nursing_unit_changes
-- ========================================

-- Índice para busca por status (pending/approved/rejected)
CREATE INDEX IF NOT EXISTS idx_nursing_unit_changes_status 
ON nursing_unit_changes(status);

-- Índice para busca por external_id
CREATE INDEX IF NOT EXISTS idx_nursing_unit_changes_external_id 
ON nursing_unit_changes(external_id);

-- Índice composto para filtrar pendentes por tipo
CREATE INDEX IF NOT EXISTS idx_nursing_unit_changes_status_type 
ON nursing_unit_changes(status, change_type);

-- ========================================
-- TABELA: users
-- ========================================

-- Índice para busca por username (login frequente)
CREATE INDEX IF NOT EXISTS idx_users_username 
ON users(username);

-- Índice para busca por role (controle de acesso)
CREATE INDEX IF NOT EXISTS idx_users_role 
ON users(role);

-- Índice para filtrar apenas ativos
CREATE INDEX IF NOT EXISTS idx_users_is_active 
ON users(is_active);

-- ========================================
-- ANÁLISE DE PERFORMANCE
-- ========================================

-- Analisar tabelas para atualizar estatísticas do PostgreSQL
ANALYZE patients;
ANALYZE import_history;
ANALYZE audit_log;
ANALYZE nursing_units;
ANALYZE nursing_unit_changes;
ANALYZE users;
