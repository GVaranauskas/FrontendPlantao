-- Migration para recriar tabela ai_cost_metrics
-- Data: 2026-01-12
-- Descrição: Recria tabela de métricas de custo de IA após perda de dados

-- Criar tabela de métricas de custo de IA
CREATE TABLE IF NOT EXISTS ai_cost_metrics (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  model TEXT,
  operation TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  estimated_cost TEXT,
  user_id VARCHAR REFERENCES users(id),
  metadata JSONB
);

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_ai_cost_metrics_timestamp ON ai_cost_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_cost_metrics_user_id ON ai_cost_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_cost_metrics_model ON ai_cost_metrics(model);
CREATE INDEX IF NOT EXISTS idx_ai_cost_metrics_operation ON ai_cost_metrics(operation);

-- Comentários para documentação
COMMENT ON TABLE ai_cost_metrics IS 'Métricas de custo e uso de operações de IA';
COMMENT ON COLUMN ai_cost_metrics.model IS 'Modelo de IA usado (ex: gpt-4, claude-3)';
COMMENT ON COLUMN ai_cost_metrics.operation IS 'Tipo de operação (ex: clinical_analysis, batch_analysis)';
COMMENT ON COLUMN ai_cost_metrics.input_tokens IS 'Número de tokens de entrada';
COMMENT ON COLUMN ai_cost_metrics.output_tokens IS 'Número de tokens de saída';
COMMENT ON COLUMN ai_cost_metrics.total_tokens IS 'Total de tokens usados';
COMMENT ON COLUMN ai_cost_metrics.estimated_cost IS 'Custo estimado da operação';
