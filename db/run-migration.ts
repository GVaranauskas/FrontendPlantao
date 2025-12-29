import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  const DATABASE_URL = process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL não configurado');
    process.exit(1);
  }

  console.log('🔄 Conectando ao banco de dados...');
  const sql = neon(DATABASE_URL);

  try {
    const migrationPath = join(__dirname, 'migrations', '001_add_indexes.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📝 Executando migration: 001_add_indexes.sql');
    console.log('');

    const lines = migrationSQL.split('\n');
    let currentStatement = '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('--') || trimmed.length === 0) {
        continue;
      }
      
      currentStatement += ' ' + trimmed;
      
      if (trimmed.endsWith(';')) {
        const statement = currentStatement.trim().replace(/;$/, '');
        currentStatement = '';
        
        if (statement.length > 0) {
          try {
            await sql(statement);
            if (statement.toUpperCase().startsWith('CREATE INDEX')) {
              const match = statement.match(/idx_\w+/);
              if (match) {
                console.log(`   ✅ ${match[0]}`);
              }
            } else if (statement.toUpperCase().startsWith('ANALYZE')) {
              const tableName = statement.replace(/ANALYZE\s+/i, '').trim();
              console.log(`   📊 Analyzed: ${tableName}`);
            }
          } catch (err: any) {
            if (err.message?.includes('already exists')) {
              const match = statement.match(/idx_\w+/);
              if (match) {
                console.log(`   ⏭️  ${match[0]} (já existe)`);
              }
            } else {
              console.warn(`   ⚠️ Warning: ${err.message?.substring(0, 80)}`);
            }
          }
        }
      }
    }

    console.log('');
    console.log('✅ Migration executada com sucesso!');
    console.log('');
    console.log('📊 Verificando índices criados...');

    const indexes = await sql`
      SELECT 
        schemaname,
        tablename,
        indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname LIKE 'idx_%'
      ORDER BY tablename, indexname;
    `;

    console.log(`Total de índices customizados: ${indexes.length}`);
    console.log('');

    const byTable: Record<string, string[]> = {};
    for (const idx of indexes) {
      if (!byTable[idx.tablename]) {
        byTable[idx.tablename] = [];
      }
      byTable[idx.tablename].push(idx.indexname);
    }

    for (const [table, idxList] of Object.entries(byTable)) {
      console.log(`📋 ${table}:`);
      for (const idx of idxList) {
        console.log(`   - ${idx}`);
      }
      console.log('');
    }

    console.log('✅ Processo concluído!');
    
  } catch (error) {
    console.error('❌ Erro ao executar migration:', error);
    process.exit(1);
  }

  process.exit(0);
}

runMigration();
