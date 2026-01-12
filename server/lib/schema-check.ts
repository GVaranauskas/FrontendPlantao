import { sql } from "drizzle-orm";
import { env } from "../config/env";

const REQUIRED_TABLES = [
  "users",
  "patients", 
  "alerts",
  "import_history",
  "nursing_unit_templates",
  "nursing_units",
  "nursing_unit_changes",
  "patients_history"
];

interface SchemaCheckResult {
  success: boolean;
  missingTables: string[];
  existingTables: string[];
}

export async function checkDatabaseSchema(): Promise<SchemaCheckResult> {
  const isProduction = process.env.NODE_ENV === "production";
  
  if (!env.DATABASE_URL) {
    if (isProduction) {
      console.error("[Schema Check] ❌ ERRO: DATABASE_URL não configurado em produção!");
      console.error("O banco de dados PostgreSQL é obrigatório em produção.");
      return { 
        success: false, 
        missingTables: ["(DATABASE_URL não configurado)"], 
        existingTables: [] 
      };
    }
    console.log("[Schema Check] Usando MemStorage - verificação de schema ignorada");
    return { success: true, missingTables: [], existingTables: [] };
  }

  console.log("[Schema Check] Verificando estrutura do banco de dados...");
  
  try {
    const { db } = await import("./database");
    const result = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);
    
    const existingTables = result.rows.map((row: any) => row.table_name as string);
    const missingTables = REQUIRED_TABLES.filter(table => !existingTables.includes(table));
    
    if (missingTables.length === 0) {
      console.log("[Schema Check] ✅ Todas as tabelas necessárias existem");
      return { success: true, missingTables: [], existingTables };
    }
    
    console.error("");
    console.error("═══════════════════════════════════════════════════════════════");
    console.error("❌ ERRO: TABELAS FALTANDO NO BANCO DE DADOS");
    console.error("═══════════════════════════════════════════════════════════════");
    console.error("");
    console.error("Tabelas faltando:");
    missingTables.forEach(table => console.error(`   • ${table}`));
    console.error("");
    console.error("Tabelas existentes:");
    if (existingTables.length === 0) {
      console.error("   (nenhuma - banco vazio)");
    } else {
      existingTables.forEach(table => console.error(`   • ${table}`));
    }
    console.error("");
    console.error("═══════════════════════════════════════════════════════════════");
    console.error("COMO RESOLVER:");
    console.error("═══════════════════════════════════════════════════════════════");
    console.error("");
    console.error("OPÇÃO 1 - Copiar banco de desenvolvimento (RECOMENDADO):");
    console.error("   1. Vá em Advanced Settings > Production Database settings");
    console.error("   2. Clique em 'Copy your development database to production'");
    console.error("   3. Republique a aplicação");
    console.error("");
    console.error("OPÇÃO 2 - Executar migrações manualmente:");
    console.error("   1. Execute: npm run db:push");
    console.error("   2. Republique a aplicação");
    console.error("");
    console.error("═══════════════════════════════════════════════════════════════");
    console.error("");
    
    return { success: false, missingTables, existingTables };
  } catch (error) {
    console.error("[Schema Check] ❌ Erro ao verificar schema:", error);
    return { 
      success: false, 
      missingTables: REQUIRED_TABLES, 
      existingTables: [] 
    };
  }
}

export async function verifySchemaOrFail(): Promise<void> {
  const result = await checkDatabaseSchema();
  
  if (!result.success) {
    const isProduction = process.env.NODE_ENV === "production";
    
    if (isProduction) {
      throw new Error(
        `[FATAL] Banco de dados de produção não tem as tabelas necessárias: ${result.missingTables.join(", ")}. ` +
        `Copie o banco de desenvolvimento para produção ou execute as migrações antes de publicar.`
      );
    } else {
      console.warn("[Schema Check] ⚠️ Tabelas faltando em desenvolvimento - tentando continuar...");
    }
  }
}
