import { z } from 'zod';

const isProduction = process.env.NODE_ENV === 'production';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000').transform(Number),
  
  DATABASE_URL: z.string().optional(),
  
  SESSION_SECRET: isProduction 
    ? z.string().min(32, 'SESSION_SECRET must be at least 32 characters in production')
    : z.string().default('dev-secret-change-in-production'),
  
  ENCRYPTION_KEY: isProduction
    ? z.string().refine(
        (val) => {
          try {
            const buffer = Buffer.from(val, 'base64');
            return buffer.length === 32;
          } catch {
            return false;
          }
        },
        'ENCRYPTION_KEY must be a valid base64-encoded 32-byte key in production'
      )
    : z.string().optional(),
  
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default('claude-3-5-haiku-20241022'),
  
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  
  N8N_WEBHOOK_SECRET: isProduction
    ? z.string().min(16, 'N8N_WEBHOOK_SECRET must be at least 16 characters in production')
    : z.string().default('dev-secret'),
  N8N_ALLOWED_IPS: z.string().optional(),
  
  LOG_DIR: z.string().default('./logs'),
});

type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  
  if (!result.success) {
    const errors = result.error.issues.map(issue => 
      `  - ${issue.path.join('.')}: ${issue.message}`
    ).join('\n');
    
    console.error('❌ Environment validation failed:');
    console.error(errors);
    
    if (isProduction) {
      throw new Error(`Invalid environment configuration:\n${errors}`);
    } else {
      console.warn('⚠️  Running in development mode with invalid env vars - some features may be disabled');
    }
  }
  
  return result.success ? result.data : (envSchema.parse({}) as Env);
}

export const env = validateEnv();

export const isProductionEnv = env.NODE_ENV === 'production';
export const isDevelopmentEnv = env.NODE_ENV === 'development';

export function requireSecret(name: keyof Env, value: string | undefined): string {
  if (!value) {
    if (isProduction) {
      throw new Error(`Required secret ${name} is not set`);
    }
    console.warn(`⚠️  Secret ${name} not set - using fallback in development`);
    return '';
  }
  return value;
}

export function getN8NAllowedIPs(): string[] {
  if (env.N8N_ALLOWED_IPS) {
    return env.N8N_ALLOWED_IPS.split(',').map(ip => ip.trim());
  }
  return ['127.0.0.1', 'localhost'];
}
