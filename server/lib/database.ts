import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { env, isProductionEnv } from "../config/env";

function getDatabaseUrl(): string {
  const isProduction = isProductionEnv || env.APP_ENV === 'producao';
  
  if (isProduction) {
    if (!env.DATABASE_URL) {
      throw new Error("DATABASE_URL (produção) não está configurada");
    }
    console.log('🗄️  [Database] Conectando ao banco de PRODUÇÃO');
    return env.DATABASE_URL;
  } else {
    const homologUrl = env.HOMOLOG_DATABASE_URL || env.DATABASE_URL;
    if (!homologUrl) {
      throw new Error("HOMOLOG_DATABASE_URL ou DATABASE_URL não está configurada");
    }
    console.log('🧪 [Database] Conectando ao banco de HOMOLOGAÇÃO');
    return homologUrl;
  }
}

const databaseUrl = getDatabaseUrl();
const sql = neon(databaseUrl);
export const db = drizzle(sql);

export const currentEnvironment = isProductionEnv ? 'producao' : 'homologacao';
