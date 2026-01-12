import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";

// Usar a mesma lógica de conexão do servidor
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const connection = neon(databaseUrl);
const db = drizzle(connection);

async function recreateAiCostMetrics() {
  console.log("🔧 Recriando tabela ai_cost_metrics...\n");

  try {
    // Criar tabela
    await connection`
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
    `;
    console.log("✅ Tabela ai_cost_metrics criada");

    // Criar índices
    await connection`CREATE INDEX IF NOT EXISTS idx_ai_cost_metrics_timestamp ON ai_cost_metrics(timestamp DESC);`;
    await connection`CREATE INDEX IF NOT EXISTS idx_ai_cost_metrics_user_id ON ai_cost_metrics(user_id);`;
    await connection`CREATE INDEX IF NOT EXISTS idx_ai_cost_metrics_model ON ai_cost_metrics(model);`;
    await connection`CREATE INDEX IF NOT EXISTS idx_ai_cost_metrics_operation ON ai_cost_metrics(operation);`;
    console.log("✅ Índices criados");

    // Adicionar comentários
    await connection`COMMENT ON TABLE ai_cost_metrics IS 'Métricas de custo e uso de operações de IA';`;
    await connection`COMMENT ON COLUMN ai_cost_metrics.model IS 'Modelo de IA usado (ex: gpt-4, claude-3)';`;
    await connection`COMMENT ON COLUMN ai_cost_metrics.operation IS 'Tipo de operação (ex: clinical_analysis, batch_analysis)';`;
    console.log("✅ Comentários adicionados");

    // Verificar se a tabela existe
    const result = await connection`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'ai_cost_metrics';
    `;

    if (result.length > 0) {
      console.log("\n🎉 Sucesso! Tabela ai_cost_metrics está pronta para uso.");
      console.log("📊 A partir de agora, todas as operações de IA serão registradas.\n");
    } else {
      console.log("\n⚠️  Aviso: Não foi possível confirmar a criação da tabela.");
    }

  } catch (error: any) {
    console.error("❌ Erro ao recriar tabela:", error.message);
    process.exit(1);
  }

  process.exit(0);
}

recreateAiCostMetrics();
