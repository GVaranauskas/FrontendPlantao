import bcryptjs from 'bcryptjs';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function seedUsers() {
  const targetEnv = process.argv[2] || 'development';
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  console.log(`🌱 Seeding users for ${targetEnv.toUpperCase()} environment...`);
  console.log(`📊 Database: ${databaseUrl.substring(0, 30)}...`);
  
  const sql = neon(databaseUrl);
  const db = drizzle(sql);

  const adminPassword = await bcryptjs.hash('admin123', 10);
  const enfermeiroPassword = await bcryptjs.hash('enf123', 10);

  const existingAdmin = await db.select().from(users).where(eq(users.username, 'admin')).limit(1);
  if (existingAdmin.length === 0) {
    await db.insert(users).values({
      username: 'admin',
      email: 'admin@11care.com.br',
      password: adminPassword,
      name: 'Administrador',
      role: 'admin',
      isActive: true,
    });
    console.log('✅ Admin user created: admin / admin123');
  } else {
    console.log('⏭️ Admin user already exists');
  }

  const existingEnfermeiro = await db.select().from(users).where(eq(users.username, 'enfermeiro')).limit(1);
  if (existingEnfermeiro.length === 0) {
    await db.insert(users).values({
      username: 'enfermeiro',
      email: 'enfermagem@11care.com.br',
      password: enfermeiroPassword,
      name: 'Enfermeiro(a)',
      role: 'enfermagem',
      isActive: true,
    });
    console.log('✅ Enfermeiro user created: enfermeiro / enf123');
  } else {
    console.log('⏭️ Enfermeiro user already exists');
  }

  console.log('🎉 Seeding complete!');
  process.exit(0);
}

seedUsers().catch((error) => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});
