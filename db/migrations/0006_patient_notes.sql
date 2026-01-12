-- Migration para adicionar funcionalidade de Notas do Paciente
-- Data: 2026-01-12
-- Descrição: Adiciona campos de notas à tabela patients e cria tabela de histórico

-- Adicionar campos de notas ao paciente na tabela existente
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS notas_paciente TEXT,
ADD COLUMN IF NOT EXISTS notas_updated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS notas_updated_by VARCHAR REFERENCES users(id),
ADD COLUMN IF NOT EXISTS notas_created_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS notas_created_by VARCHAR REFERENCES users(id);

-- Criar tabela de histórico de notas do paciente para auditoria completa
CREATE TABLE IF NOT EXISTS patient_notes_history (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id VARCHAR NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  nota_anterior TEXT,
  nota_nova TEXT,
  alterado_por_id VARCHAR NOT NULL REFERENCES users(id),
  alterado_por_nome TEXT NOT NULL,
  alterado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

-- Criar índices para melhorar performance nas buscas de histórico
CREATE INDEX IF NOT EXISTS idx_patient_notes_history_patient_id ON patient_notes_history(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_notes_history_alterado_em ON patient_notes_history(alterado_em DESC);

-- Comentários para documentação
COMMENT ON COLUMN patients.notas_paciente IS 'Campo de texto livre para notas não clínicas sobre o paciente (máximo 200 caracteres)';
COMMENT ON TABLE patient_notes_history IS 'Histórico completo de alterações nas notas dos pacientes para auditoria';
COMMENT ON COLUMN patient_notes_history.nota_anterior IS 'Valor da nota antes da alteração';
COMMENT ON COLUMN patient_notes_history.nota_nova IS 'Valor da nota após a alteração';
COMMENT ON COLUMN patient_notes_history.alterado_por_nome IS 'Nome do usuário que fez a alteração';
