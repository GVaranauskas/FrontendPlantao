import { db } from "../lib/database";
import { patients } from "../../shared/schema";
import { eq, like } from "drizzle-orm";

async function cleanupPlaceholders() {
  console.log('🧹 Iniciando limpeza de pacientes com placeholders...');
  
  // Buscar pacientes com placeholder no nome
  const placeholderPatients = await db.select()
    .from(patients)
    .where(like(patients.nome, '%Dados não recuperáveis%'));
  
  console.log(`📊 Encontrados ${placeholderPatients.length} pacientes com placeholders`);
  
  if (placeholderPatients.length === 0) {
    console.log('✅ Nenhum paciente com placeholder encontrado!');
    return;
  }
  
  // Listar os pacientes que serão removidos
  console.log('\n📋 Pacientes a serem removidos:');
  for (const patient of placeholderPatients) {
    console.log(`   - Leito ${patient.leito}: ${patient.nome} (código: ${patient.codigoAtendimento?.substring(0, 20)}...)`);
  }
  
  // Remover os pacientes com placeholders
  let removed = 0;
  for (const patient of placeholderPatients) {
    await db.delete(patients).where(eq(patients.id, patient.id));
    removed++;
  }
  
  console.log(`\n✅ ${removed} pacientes com placeholders removidos!`);
  
  // Verificar quantos pacientes restaram
  const remaining = await db.select().from(patients);
  console.log(`📊 Total de pacientes restantes: ${remaining.length}`);
}

cleanupPlaceholders()
  .then(() => {
    console.log('\n✅ Limpeza concluída!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Erro:', err);
    process.exit(1);
  });
