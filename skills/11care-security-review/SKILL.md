---
name: 11care-security-review
description: Checklist de revisão de segurança pós-implementação. Use após implementar novas funcionalidades para verificar vulnerabilidades, proteção de secrets, conformidade LGPD, criptografia AES-256-GCM e auditoria.
---

# Revisão de Segurança Pós-Implementação

Execute esta skill após implementar novas funcionalidades para garantir conformidade com padrões de segurança do 11Care.

## Princípios de Segurança

1. **Defense in Depth** - Múltiplas camadas de proteção
2. **Least Privilege** - Acesso mínimo necessário
3. **Zero Trust** - Nunca confie, sempre verifique
4. **Privacy by Design** - Segurança desde o início
5. **Transparency** - Auditoria completa de operações

## Checklist Rápido

| Categoria | Verificação | Criticidade |
|-----------|-------------|-------------|
| 🔴 Secrets | Nenhum secret hardcoded no código | CRÍTICA |
| 🔴 .gitignore | Arquivos sensíveis protegidos | CRÍTICA |
| 🔴 LGPD | Dados pessoais criptografados com AES-256-GCM | CRÍTICA |
| 🔴 Criptografia | ENCRYPTION_KEY configurada (32 bytes base64) | CRÍTICA |
| 🟠 Validação | Input sanitizado e validado com Zod | ALTA |
| 🟠 Autenticação | Endpoints protegidos com requireRoleWithAuth | ALTA |
| 🟠 Rate Limiting | Endpoints têm limitação de taxa por userId | ALTA |
| 🟠 Token Versioning | Tokens podem ser revogados via tokenVersion | ALTA |
| 🟡 Auditoria | Ações críticas são logadas via AuditService | MÉDIA |
| 🟡 SQL Injection | Queries usam Drizzle ORM parametrizado | MÉDIA |

---

## 1. Verificação de Secrets e Credenciais (CRÍTICA)

### Comandos de Verificação

```bash
# Buscar secrets hardcoded no código
grep -rn "password\s*=\s*['\"]" --include="*.ts" --include="*.tsx" server/ client/
grep -rn "apiKey\s*=\s*['\"]" --include="*.ts" --include="*.tsx" server/ client/
grep -rn "secret\s*=\s*['\"]" --include="*.ts" --include="*.tsx" server/ client/
grep -rn "Bearer\s" --include="*.ts" --include="*.tsx" server/ client/

# Buscar tokens ou chaves hardcoded
grep -rn "sk-[a-zA-Z0-9]" --include="*.ts" server/  # OpenAI keys
grep -rn "pk_live\|sk_live" --include="*.ts" server/  # Stripe keys

# Verificar se .env está no gitignore
grep -E "^\.env" .gitignore
```

### Padrão Correto

```typescript
// ❌ ERRADO - Secret hardcoded
const apiKey = "sk-abc123...";

// ✅ CORRETO - Usar variável de ambiente
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) throw new Error("OPENAI_API_KEY não configurado");
```

### Arquivos que DEVEM estar no .gitignore

```gitignore
# Variáveis de ambiente
.env
.env.local
.env.*.local

# Chaves e certificados
*.pem
*.key
*.crt
*.p12

# Backups de banco
*.sql
*.dump
*.bak

# Logs com dados sensíveis
logs/
*.log

# IDEs e editores
.vscode/
.idea/
```

---

## 2. Criptografia AES-256-GCM com Scrypt KDF (CRÍTICA)

### Por que AES-256-GCM + Scrypt?

| Feature | AES-256-CBC | AES-256-GCM | AES-256-GCM + Scrypt |
|---------|-------------|-------------|----------------------|
| Confidencialidade | ✅ | ✅ | ✅ |
| Integridade | ❌ | ✅ (AuthTag) | ✅ (AuthTag) |
| Resistência a Brute Force | ❌ | ❌ | ✅ (KDF) |
| Key Stretching | ❌ | ❌ | ✅ |

**Scrypt**: Key Derivation Function (KDF) que torna ataques de força bruta computacionalmente caros, protegendo mesmo contra hardware especializado.

### Especificações

```typescript
Algoritmo:    AES-256-GCM
KDF:          scryptSync
Key Size:     256 bits (32 bytes)
Salt Size:    512 bits (64 bytes) - para derivação de chave
IV Size:      128 bits (16 bytes)
AuthTag:      128 bits (16 bytes)

Formato do Ciphertext (base64):
[SALT (64 bytes)][IV (16 bytes)][AUTH_TAG (16 bytes)][ENCRYPTED...]
```

### Verificação da Chave

```bash
# ENCRYPTION_KEY deve ser 32 bytes em BASE64 (44 caracteres)
echo $ENCRYPTION_KEY | wc -c  # Deve ser ~44 caracteres

# Gerar nova chave (32 bytes = 256 bits)
openssl rand -base64 32
```

### Implementação Real no 11Care

```typescript
// server/services/encryption.service.ts
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

class EncryptionService {
  private masterKey: Buffer;

  constructor() {
    // Chave em base64, não hex
    const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'base64');
    if (key.length !== KEY_LENGTH) {
      throw new Error(`ENCRYPTION_KEY must be exactly ${KEY_LENGTH} bytes`);
    }
    this.masterKey = key;
  }

  encrypt(plaintext: string): string {
    // 1. Gera salt único para esta criptografia
    const salt = randomBytes(SALT_LENGTH);
    
    // 2. Deriva chave única usando scrypt (key stretching)
    const key = scryptSync(this.masterKey, salt, KEY_LENGTH);
    
    // 3. Gera IV aleatório
    const iv = randomBytes(IV_LENGTH);
    
    // 4. Criptografa com AES-256-GCM
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final()
    ]);
    
    // 5. Obtém authentication tag
    const authTag = cipher.getAuthTag();
    
    // 6. Concatena: salt + iv + authTag + encrypted
    const result = Buffer.concat([salt, iv, authTag, encrypted]);
    
    return result.toString('base64');
  }

  decrypt(ciphertext: string): string {
    const buffer = Buffer.from(ciphertext, 'base64');
    
    // Extrai componentes
    const salt = buffer.subarray(0, SALT_LENGTH);
    const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = buffer.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = buffer.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    
    // Deriva mesma chave usando salt armazenado
    const key = scryptSync(this.masterKey, salt, KEY_LENGTH);
    
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]).toString('utf8');
  }
}
```

**Por que Salt + Scrypt?**
- Cada criptografia deriva uma chave única via `scryptSync(masterKey, salt, KEY_LENGTH)`
- Mesmo texto criptografado múltiplas vezes produz ciphertexts diferentes
- Salt armazenado junto com ciphertext permite decriptação
- Protege contra rainbow tables e ataques de pré-computação

---

## 3. Conformidade LGPD (CRÍTICA)

### Artigos Implementados

| Artigo | Descrição | Implementação |
|--------|-----------|---------------|
| Art. 7º, VIII | Tutela da saúde | Finalidade específica para enfermagem |
| Art. 9º | Dados sensíveis de saúde | Criptografia AES-256-GCM |
| Art. 18 | Direitos do titular | Endpoints LGPD |
| Art. 37 | Registro de operações | Audit log completo |
| Art. 46 | Medidas de segurança | Múltiplas camadas |
| Art. 48 | Notificação de incidentes | Processo documentado |

### Campos Criptografados (SENSITIVE_PATIENT_FIELDS)

```typescript
// server/services/encryption.service.ts
export const SENSITIVE_PATIENT_FIELDS = [
  'nome',              // Nome do paciente
  'registro',          // Número de registro (PT)
  'dataNascimento',    // Data de nascimento
  'diagnostico',       // Diagnóstico clínico
  'alergias',          // Alergias
  'observacoes',       // Observações clínicas
  'dsEvolucaoCompleta', // Evolução completa
  'dadosBrutosJson',   // Dados brutos N8N
  'clinicalInsights',  // Insights da IA
] as const;
```

### Endpoints LGPD Implementados

| Endpoint | Método | Descrição | Role |
|----------|--------|-----------|------|
| `/api/lgpd/export/patient/:id` | GET | Exporta dados do paciente (Portabilidade) | admin |
| `/api/lgpd/anonymize/history/:codigoAtendimento` | POST | Anonimiza histórico | admin |
| `/api/lgpd/data-categories` | GET | Lista categorias de dados | admin |

### Comandos de Verificação LGPD

```bash
# Verificar se novo campo sensível foi adicionado ao schema
grep -rn "text\|varchar\|jsonb" shared/schema.ts | grep -v "//"

# Verificar se campo está em SENSITIVE_PATIENT_FIELDS
grep -rn "SENSITIVE_PATIENT_FIELDS" server/services/encryption.service.ts

# Verificar se há logs de dados sensíveis
grep -rn "console.log.*patient" server/ --include="*.ts"
grep -rn "console.log.*nome\|registro\|cpf" server/ --include="*.ts"
```

### Checklist LGPD

- [ ] Novos campos de dados pessoais estão em `SENSITIVE_PATIENT_FIELDS`?
- [ ] Dados sensíveis NÃO aparecem em logs?
- [ ] Dados sensíveis NÃO são expostos em mensagens de erro?
- [ ] Criptografia AES-256-GCM está funcionando?
- [ ] Endpoints LGPD estão protegidos com role admin?

### Padrão de Log Seguro

```typescript
// ❌ ERRADO - Expõe dados pessoais
console.log("Paciente criado:", patient);
logger.info("Dados:", { nome: patient.nome });

// ✅ CORRETO - Log seguro
console.log("Paciente criado:", { id: patient.id, leito: patient.leito });
logger.info("Operação concluída", { patientId: patient.id });
```

---

## 4. Autenticação e Autorização (ALTA)

### JWT Token Structure

```typescript
// Access Token Payload (15 minutos)
{
  userId: number,
  username: string,
  role: 'admin' | 'enfermagem',
  tokenVersion: number,  // Para invalidação em massa
  iat: number,
  exp: number
}

// Refresh Token (7 dias) - httpOnly cookie
{
  userId: number,
  iat: number,
  exp: number
}
```

### Token Versioning (v1.5.7)

```typescript
// Validação em cada request
if (payload.tokenVersion !== user.tokenVersion) {
  throw new AppError(401, 'Token invalidado. Faça login novamente.');
}

// Invalidar todos os tokens do usuário
POST /api/auth/invalidate-all-sessions
// Incrementa tokenVersion no banco
```

### Middleware Combinado (requireRoleWithAuth)

```typescript
import { requireRoleWithAuth } from "../middleware/rbac";

// ❌ ERRADO - Endpoint sem proteção
app.get("/api/patients", async (req, res) => { ... });

// ❌ ERRADO - Sem verificação de firstAccess
app.get("/api/patients", requireAuth, requireRole("admin"), async (req, res) => { ... });

// ✅ CORRETO - Com autenticação + firstAccess + RBAC
app.get("/api/patients", 
  ...requireRoleWithAuth(["admin", "enfermagem"]),
  async (req, res) => { ... }
);
```

### Níveis de Acesso (RBAC) - 11Care

| Role | Permissões |
|------|------------|
| `admin` | Todas as operações, gerenciamento de usuários, LGPD, auditoria, deletar notas |
| `enfermagem` | CRUD de pacientes, criar/editar notas próprias, visualização, sync |

**IMPORTANTE:** Apenas `admin` e `enfermagem` são roles válidas no sistema.

### Validação de Conta Ativa (v1.5.7)

```typescript
// Verificado em 3 níveis:
// 1. No login
// 2. No refresh token
// 3. No middleware de autenticação

if (!user.isActive) {
  throw new AppError(403, 'Conta desativada. Contate o administrador.');
}
```

### Primeiro Acesso Obrigatório

```typescript
// Usuários novos têm firstAccess = true
// Devem trocar senha antes de acessar sistema

POST /api/auth/first-access-password
Body: { currentPassword, newPassword }

// Validação de nova senha:
// - Mínimo 8 caracteres
// - Pelo menos 1 letra (a-z ou A-Z)
// - Pelo menos 1 número (0-9)
```

---

## 5. Rate Limiting v2 (ALTA)

### Limites Configurados

| Endpoint | Limite | Janela | Key |
|----------|--------|--------|-----|
| Login/Registro | 10 req | 15 min | IP normalizado |
| API Geral | 300 req | 1 min | userId |
| Sync/Import | 30 req | 1 min | userId |
| IA (OpenAI) | 20 req | 1 min | userId |
| Refresh Token | 30 req | 1 min | userId (do token) |

### Key Generator Híbrido

```typescript
// server/middleware/rate-limiter.ts
const hybridKeyGenerator = (req: Request): string => {
  // Autenticado: usa userId
  if (req.rateLimitUser?.userId) {
    return `user:${req.rateLimitUser.userId}`;
  }
  // Não autenticado: usa IP normalizado
  return `ip:${normalizeIP(req.ip)}`;
};

// Normalização IPv6 (agrupa por /64 subnet)
const normalizeIP = (ip: string): string => {
  if (ip.includes(':')) {
    const parts = ip.split(':').slice(0, 4);
    return parts.join(':') + '::/64';
  }
  return ip;
};
```

### Middleware de Extração

```typescript
// Aplicado globalmente antes dos rate limiters
app.use('/api/', extractUserForRateLimit);

// Extrai userId do JWT e popula req.rateLimitUser
```

### Verificar Novo Endpoint

Se criou endpoint que:
- Consome recursos externos (API, IA) → Precisa rate limit específico (aiRateLimiter)
- É público ou de autenticação → Precisa rate limit por IP (loginRateLimiter)
- É crítico (sync, import) → Precisa rate limit restritivo (syncRateLimiter)

---

## 6. Validação de Input (ALTA)

### Comandos de Verificação

```bash
# Verificar se há parsing direto de body sem validação
grep -rn "req.body\." server/routes --include="*.ts" | grep -v "validate\|parse\|schema"

# Verificar uso de Zod para validação
grep -rn "\.parse(\|\.safeParse(" server/ --include="*.ts"
```

### Padrão de Validação

```typescript
import { insertPatientSchema } from "@shared/schema";

// ❌ ERRADO - Sem validação
app.post("/api/patients", async (req, res) => {
  const patient = req.body;  // Perigoso!
  await storage.createPatient(patient);
});

// ✅ CORRETO - Com validação Zod
app.post("/api/patients", async (req, res) => {
  const result = insertPatientSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.issues });
  }
  await storage.createPatient(result.data);
});
```

### Validação de UUID

```typescript
import { isValidUUID } from "../validation";

const { id } = req.params;
if (!isValidUUID(id)) {
  return res.status(400).json({ error: "ID inválido" });
}
```

---

## 7. Auditoria (MÉDIA)

### Actions de Audit Válidas

```typescript
type AuditAction = 
  | 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' 
  | 'LOGIN' | 'LOGOUT' 
  | 'EXPORT' | 'IMPORT'
  | 'PATIENT_ARCHIVED' | 'PATIENT_REACTIVATED' | 'BED_CONFLICT'
  | 'SHIFT_HANDOVER_VIEW' | 'SHIFT_HANDOVER_PRINT'
  | 'SYNC_STARTED' | 'SYNC_COMPLETED';
```

### Padrão de Auditoria

```typescript
import { auditService } from '../services/audit.service';

// Auditar ação de usuário
await auditService.log({
  user: { id: user.id, name: user.name, role: user.role },
  action: 'UPDATE',
  resource: 'patients',
  resourceId: patient.id,
  changes: { 
    before: { diagnostico: oldValue },
    after: { diagnostico: newValue }
  },
  metadata: { reason: 'Atualização via interface' },
  req,
  statusCode: 200,
  startTime
});

// Auditar ação de sistema (sem usuário)
await auditService.logSystem({
  action: 'SYNC_COMPLETED',
  resource: 'sync',
  resourceId: syncId,
  changes: { patientsUpdated: 10, patientsArchived: 2 },
  metadata: { duration: '15s' }
});
```

### Ações que DEVEM ser Auditadas

- [ ] Login/logout de usuários (LOGIN, LOGOUT)
- [ ] Criação/edição/exclusão de pacientes (CREATE, UPDATE, DELETE)
- [ ] Mudanças em notas de pacientes (CREATE, UPDATE, DELETE)
- [ ] Arquivamento de pacientes (PATIENT_ARCHIVED)
- [ ] Reativação de pacientes (PATIENT_REACTIVATED)
- [ ] Sincronização com N8N (SYNC_STARTED, SYNC_COMPLETED)
- [ ] Exportação de dados LGPD (EXPORT)
- [ ] Visualização de passagem de plantão (SHIFT_HANDOVER_VIEW)
- [ ] Impressão de passagem de plantão (SHIFT_HANDOVER_PRINT)

---

## 8. SQL Injection (MÉDIA)

### Padrão Seguro com Drizzle

```typescript
// ❌ ERRADO - Vulnerável a SQL injection
const result = await db.execute(
  sql`SELECT * FROM patients WHERE nome = '${userInput}'`
);

// ✅ CORRETO - Usar ORM parametrizado
const result = await db
  .select()
  .from(patients)
  .where(eq(patients.nome, userInput));

// ✅ CORRETO - SQL raw com parâmetros
const result = await db.execute(
  sql`SELECT * FROM patients WHERE nome = ${userInput}`
);
```

---

## 9. Proteções Adicionais

### HTTPS/TLS

- ✅ Todas comunicações via HTTPS
- ✅ TLS 1.2+ (prefira TLS 1.3)
- ✅ HSTS habilitado

### CSRF Protection

```typescript
// Cookies configurados com:
{
  httpOnly: true,
  secure: true,        // Apenas HTTPS
  sameSite: 'strict',  // Proteção CSRF
}
```

### Headers de Segurança (Helmet)

```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  frameguard: { action: 'deny' },
  noSniff: true,
}));
```

### XSS Prevention

```bash
# Verificar se há dangerouslySetInnerHTML
grep -rn "dangerouslySetInnerHTML" client/ --include="*.tsx"
grep -rn "innerHTML" client/ --include="*.tsx"
```

---

## Roteiro de Execução

### Passo 1: Verificação Automatizada
```bash
# Buscar secrets hardcoded
grep -rn "password\s*=\s*['\"]" --include="*.ts" server/ client/

# Verificar campos sensíveis
grep -rn "SENSITIVE_PATIENT_FIELDS" server/services/encryption.service.ts

# Verificar endpoints sem proteção
grep -rn "app\.\(get\|post\|put\|delete\)" server/routes.ts | grep -v "requireRole"

# Verificar rate limiting
grep -rn "rateLimiter\|rateLimit" server/middleware/rate-limiter.ts
```

### Passo 2: Revisão Manual
1. Abrir arquivos modificados no último commit
2. Verificar cada endpoint novo contra checklist
3. Verificar se dados sensíveis estão protegidos
4. Confirmar que novos campos sensíveis estão em SENSITIVE_PATIENT_FIELDS

### Passo 3: Testes
1. Tentar acessar endpoint sem autenticação → Deve retornar 401
2. Tentar acessar endpoint com role errada → Deve retornar 403
3. Tentar injetar SQL em campos de texto → Deve ser bloqueado
4. Verificar se rate limiting funciona → Deve retornar 429 após limite
5. Verificar se logs não expõem dados pessoais

### Passo 4: Documentação
1. Atualizar CHANGELOG.md com mudanças de segurança
2. Atualizar replit.md se houver novos padrões

---

## Conclusão

Após executar todos os passos:

- [ ] Nenhum secret hardcoded encontrado
- [ ] .gitignore protege todos os arquivos sensíveis
- [ ] ENCRYPTION_KEY configurada (32 bytes em base64)
- [ ] Novos campos sensíveis estão em SENSITIVE_PATIENT_FIELDS
- [ ] Criptografia AES-256-GCM + Scrypt funcionando
- [ ] Todos os inputs são validados com Zod
- [ ] Queries usam Drizzle ORM parametrizado
- [ ] Endpoints têm requireRoleWithAuth (admin/enfermagem)
- [ ] Rate limiting aplicado com key híbrido (userId/IP)
- [ ] Token versioning permite revogação
- [ ] Ações críticas são auditadas com AuditActions válidas
- [ ] Logs não expõem dados pessoais
- [ ] Headers de segurança configurados

**Se todas as verificações passaram, a implementação está segura!**
