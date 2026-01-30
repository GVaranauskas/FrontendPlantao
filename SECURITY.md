# Política de Segurança

Documentação de segurança e compliance LGPD do **11Care Nursing Platform**.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Compliance LGPD](#compliance-lgpd)
- [Criptografia de Dados](#criptografia-de-dados)
- [Autenticação e Autorização](#autenticação-e-autorização)
- [Proteção de Dados](#proteção-de-dados)
- [Auditoria e Logs](#auditoria-e-logs)
- [Segurança da API](#segurança-da-api)
- [Gestão de Secrets](#gestão-de-secrets)
- [Reportar Vulnerabilidades](#reportar-vulnerabilidades)
- [Checklist de Segurança](#checklist-de-segurança)

## 🎯 Visão Geral

O **11Care Nursing Platform** lida com **dados sensíveis de saúde**, classificados como **dados pessoais sensíveis** pela LGPD (Lei 13.709/2018). Implementamos múltiplas camadas de segurança para garantir conformidade legal e proteção dos dados.

### Princípios de Segurança

1. **Defense in Depth** - Múltiplas camadas de proteção
2. **Least Privilege** - Acesso mínimo necessário
3. **Zero Trust** - Nunca confie, sempre verifique
4. **Privacy by Design** - Segurança desde o início
5. **Transparency** - Auditoria completa de operações

## ⚖️ Compliance LGPD

### Lei 13.709/2018 - LGPD

O sistema está em conformidade com:

#### Art. 7º - Base Legal

**Tutela da saúde** (Art. 7º, VIII):
- Dados coletados para prestação de serviços de saúde
- Finalidade específica: passagem de plantão de enfermagem
- Acesso restrito a profissionais de saúde autorizados

#### Art. 9º - Dados Sensíveis de Saúde

Todos os dados clínicos são:
- ✅ Criptografados em repouso (AES-256-GCM)
- ✅ Transmitidos via HTTPS (TLS 1.3)
- ✅ Acesso controlado por RBAC
- ✅ Auditados (quem acessou, quando, o quê)

#### Art. 37 - Relatório de Impacto

Implementamos auditoria completa:
- ✅ Registro de todas operações (CREATE, READ, UPDATE, DELETE)
- ✅ Identificação de usuário, IP, User Agent
- ✅ Timestamp de cada operação
- ✅ Valores antes/depois (changes)
- ✅ Retenção de logs por 5 anos

#### Art. 46 - Medidas de Segurança

- ✅ Criptografia AES-256-GCM (confidencialidade + integridade)
- ✅ Controles de acesso (autenticação + autorização)
- ✅ Logs de auditoria
- ✅ Backup de dados
- ✅ Proteção contra acessos não autorizados

#### Art. 48 - Notificação de Incidentes

Em caso de incidente de segurança:
1. Comunicação à ANPD em até **2 dias úteis**
2. Notificação aos titulares afetados
3. Medidas para reverter/mitigar o dano

#### Direitos dos Titulares

Sistema permite exercício dos direitos:
- ✅ **Acesso** - Usuários podem visualizar seus dados
- ✅ **Correção** - Dados podem ser atualizados
- ✅ **Eliminação** - Dados podem ser excluídos (com retenção legal)
- ✅ **Portabilidade** - Exportação em formato estruturado (Excel)
- ✅ **Informação** - Transparência sobre uso dos dados

### HIPAA Considerations (Futuro)

Para expansão internacional (EUA):
- [ ] Business Associate Agreement (BAA)
- [ ] Minimum necessary rule
- [ ] Patient rights (access, amendment)
- [ ] Security Rule (administrative, physical, technical safeguards)

## 🔐 Criptografia de Dados

### Algoritmo: AES-256-GCM

**Advanced Encryption Standard** com **Galois/Counter Mode**:

```typescript
// Características
Algoritmo:   AES-256-GCM
Key Size:    256 bits (32 bytes)
IV Size:     128 bits (16 bytes)
Salt Size:   512 bits (64 bytes)
AuthTag:     128 bits (16 bytes)
```

### Por que AES-256-GCM?

| Feature | AES-256-CBC | AES-256-GCM |
|---------|-------------|-------------|
| Confidencialidade | ✅ | ✅ |
| Integridade | ❌ | ✅ (AuthTag) |
| Autenticação | ❌ | ✅ |
| Performance | Rápido | Muito rápido |
| Paralelizável | ❌ | ✅ |
| LGPD Compliant | ✅ | ✅✅ |

**GCM previne**:
- Bit-flipping attacks
- Padding oracle attacks
- Manipulação de dados criptografados

### Campos Criptografados

#### Dados de Pacientes

```typescript
// Criptografados em repouso
const encryptedFields = [
  'nome',                    // Nome completo
  'registro',                // Número de registro hospitalar
  'dataNascimento',          // Data de nascimento
  'diagnostico',             // Diagnóstico médico
  'alergias',                // Alergias conhecidas
  'observacoes',             // Observações clínicas
  'dsEvolucaoCompleta',      // Evolução completa do paciente
];

// NÃO criptografados (metadados para busca)
const plaintextFields = [
  'leito',                   // Número do leito
  'idade',                   // Idade (derivada)
  'unidadeInternacao',       // Unidade de internação
  'createdAt', 'updatedAt',  // Timestamps
];
```

### Implementação

```typescript
// server/services/encryption.service.ts

export class EncryptionService {
  private key: Buffer;

  constructor() {
    const keyHex = env.ENCRYPTION_KEY; // 64 caracteres hex = 32 bytes
    this.key = Buffer.from(keyHex, 'hex');
  }

  /**
   * Criptografa dados com AES-256-GCM
   */
  encrypt(plaintext: string): EncryptedData {
    // 1. Gerar salt único (64 bytes)
    const salt = crypto.randomBytes(64);

    // 2. Gerar IV único (16 bytes)
    const iv = crypto.randomBytes(16);

    // 3. Criar cipher
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);

    // 4. Criptografar
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    // 5. Obter AuthTag (integridade)
    const authTag = cipher.getAuthTag();

    return {
      encrypted: encrypted.toString('base64'),
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
    };
  }

  /**
   * Descriptografa dados
   */
  decrypt(data: EncryptedData): string {
    const iv = Buffer.from(data.iv, 'base64');
    const encrypted = Buffer.from(data.encrypted, 'base64');
    const authTag = Buffer.from(data.authTag, 'base64');

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(), // Valida AuthTag aqui
    ]);

    return decrypted.toString('utf8');
  }
}
```

### Rotação de Chaves

**Atualmente**: Chave única em `ENCRYPTION_KEY`

**Roadmap** (futuro):
1. Múltiplas chaves com versionamento
2. Rotação automática a cada 90 dias
3. Re-criptografia em background
4. Key Management Service (KMS)

## 🔑 Autenticação e Autorização

### Autenticação (JWT)

#### Access Tokens

```typescript
// Geração
const accessToken = jwt.sign(
  {
    userId: user.id,
    username: user.username,
    role: user.role,
  },
  JWT_SECRET,
  { expiresIn: '15m' } // 15 minutos
);

// Envio
res.json({ accessToken });
```

**Características**:
- Curta duração (15 minutos)
- Enviado no body da resposta
- Armazenado no localStorage do cliente
- Enviado em header `Authorization: Bearer <token>`

#### Refresh Tokens

```typescript
// Geração
const refreshToken = jwt.sign(
  { userId: user.id },
  REFRESH_SECRET,
  { expiresIn: '7d' } // 7 dias
);

// Envio em cookie httpOnly
res.cookie('refreshToken', refreshToken, {
  httpOnly: true,      // Não acessível por JavaScript
  secure: true,        // Apenas HTTPS
  sameSite: 'strict',  // CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
});
```

**Características**:
- Longa duração (7 dias)
- HttpOnly cookie (XSS protection)
- Usado para obter novo access token
- Invalidado no logout

#### Fluxo de Autenticação

```
1. Login
   ├─→ POST /api/auth/login (username, password)
   ├─→ Valida credenciais
   ├─→ Gera accessToken + refreshToken
   └─→ Retorna accessToken + cookie(refreshToken)

2. Request Autenticado
   ├─→ GET /api/patients
   ├─→ Header: Authorization: Bearer <accessToken>
   ├─→ Middleware valida token
   ├─→ Extrai userId, role do token
   └─→ Processa request

3. Token Expirado
   ├─→ GET /api/patients → 401 Unauthorized
   ├─→ POST /api/auth/refresh (com cookie refreshToken)
   ├─→ Valida refreshToken
   ├─→ Gera novo accessToken
   └─→ Retorna novo accessToken

4. Logout
   ├─→ POST /api/auth/logout
   ├─→ Invalida refreshToken no DB
   └─→ Limpa cookie
```

### Troca de Senha Obrigatória no Primeiro Acesso

Novos usuários são obrigados a trocar a senha temporária antes de acessar o sistema:

```typescript
// Campo no banco de dados
firstAccess: boolean // true = precisa trocar senha

// Endpoint dedicado
POST /api/auth/first-access-password
Body: { currentPassword, newPassword }

// Validação de senha
- Mínimo 8 caracteres
- Pelo menos 1 letra (a-z ou A-Z)
- Pelo menos 1 número (0-9)
```

**Fluxo de Primeiro Acesso**:
```
1. Admin cria usuário com senha temporária
   └─→ firstAccess = true

2. Usuário faz login
   └─→ Recebe JWT com firstAccess = true

3. Frontend redireciona para /first-access
   └─→ Página isolada para troca de senha

4. Usuário troca senha
   └─→ POST /api/auth/first-access-password
   └─→ firstAccess = false
   └─→ Novo JWT gerado

5. Acesso liberado ao sistema
   └─→ Redirecionado para /modules
```

**Rotas Permitidas Durante Primeiro Acesso**:
- `POST /api/auth/first-access-password` - Troca de senha
- `GET /api/auth/me` - Dados do usuário
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Refresh token

**Proteção de Middleware**:
```typescript
// server/middleware/auth.ts
export function requireFirstAccessComplete(req, res, next) {
  if (req.user?.firstAccess) {
    return res.status(403).json({
      error: 'Primeiro acesso: troca de senha obrigatória'
    });
  }
  next();
}
```

### Token Versioning e Revogação (v1.5.7)

Sistema de versionamento de tokens para invalidação em massa:

```typescript
// Campo no banco de dados
tokenVersion: integer // Versão do token, incrementa para invalidar

// JWT Payload inclui versão
{
  userId: 1,
  username: "admin",
  role: "admin",
  tokenVersion: 1,  // Versão no momento da geração
  iat: 1234567890,
  exp: 1234568790
}

// Validação em cada request
if (payload.tokenVersion !== user.tokenVersion) {
  throw new AppError(401, 'Token invalidado. Faça login novamente.');
}
```

**Endpoint de Invalidação**:
```
POST /api/auth/invalidate-all-sessions
```
- Incrementa tokenVersion do usuário
- Invalida TODOS os tokens existentes
- Útil para logout remoto ou reset de segurança
- Limpa cookies de refresh token

**Casos de Uso**:
- Logout de todas as sessões (dispositivos roubados)
- Mudança de senha pelo admin
- Detecção de comprometimento de conta
- Reset de segurança

### Rate Limiting (v1.5.7)

Proteção contra ataques de força bruta:

```typescript
// Login: 5 tentativas por 15 minutos por IP
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5,
  message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
});

// Refresh Token: 10 tentativas por minuto
const refreshRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10,
  message: 'Muitas tentativas. Aguarde um momento.',
});

// API Geral: 100 requests por minuto
const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
});
```

**Comportamento**:
- Retorna HTTP 429 (Too Many Requests)
- Log de segurança para tentativas bloqueadas
- Headers padrão de rate limit incluídos

### Validação de Conta Ativa (v1.5.7)

Contas desativadas são bloqueadas em 3 níveis:

```typescript
// 1. No login
if (!user.isActive) {
  throw new AppError(403, 'Conta desativada. Contate o administrador.');
}

// 2. No refresh token
if (!user.isActive) {
  throw new AppError(403, 'Conta desativada. Contate o administrador.');
}

// 3. No middleware de autenticação (cada request)
if (!user.isActive) {
  throw new AppError(403, 'Conta desativada. Contate o administrador.');
}
```

**Benefícios**:
- Desativação imediata de contas comprometidas
- Nenhum acesso mesmo com tokens válidos
- Erro 403 claro para o usuário

### Autorização (RBAC)

**Role-Based Access Control**:

```typescript
enum UserRole {
  Admin = 'admin',
  Enfermagem = 'enfermagem',
  Visualizador = 'visualizador',
}

const permissions = {
  admin: ['*'], // Todas permissões

  enfermagem: [
    'patients:read',
    'patients:update',
    'patients:export',
    'notes:create',
    'notes:update',
    'notes:read',
    'sync:trigger',
  ],

  visualizador: [
    'patients:read',
    'notes:read',
  ],
};
```

#### Middleware RBAC

```typescript
// server/middleware/rbac.ts

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user.role;

    if (allowedRoles.includes(userRole)) {
      next();
    } else {
      throw new AppError('Acesso negado', 403);
    }
  };
}
```

#### Middleware Combinado (v1.5.2)

Para prevenir bypass de first-access, todas as rotas protegidas usam `requireRoleWithAuth`:

```typescript
// Combina autenticação + verificação first-access + RBAC
export const requireRoleWithAuth = (...allowedRoles: UserRole[]) => [
  authMiddleware,           // Valida JWT
  requireFirstAccessComplete, // Bloqueia firstAccess=true
  requireRole(...allowedRoles) // Verifica papel do usuário
];

// Uso em rotas - spread operator para aplicar todos os middlewares
router.delete('/patients/:id', ...requireRoleWithAuth('admin'), deletePatient);
router.post('/notes', ...requireRoleWithAuth('admin', 'enfermagem'), createNote);
```

**Importante**: 45+ endpoints usam `requireRoleWithAuth` para garantir que usuários com `firstAccess=true` não acessem rotas privilegiadas antes de completar a troca de senha obrigatória.

### Senha Forte

**Requisitos**:
- Mínimo 8 caracteres
- Pelo menos 1 letra maiúscula
- Pelo menos 1 letra minúscula
- Pelo menos 1 número
- Pelo menos 1 caractere especial

```typescript
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
```

**Hash**: bcrypt com salt rounds = 10

```typescript
const hashedPassword = await bcrypt.hash(password, 10);
```

## 🛡️ Proteção de Dados

### HTTPS/TLS

- ✅ **Todas** comunicações via HTTPS
- ✅ TLS 1.2+ (prefira TLS 1.3)
- ✅ Certificado SSL válido
- ✅ HSTS (HTTP Strict Transport Security)

```typescript
// Helmet middleware
app.use(helmet({
  hsts: {
    maxAge: 31536000, // 1 ano
    includeSubDomains: true,
    preload: true,
  },
}));
```

### CSRF Protection

**Cross-Site Request Forgery** protection:

```typescript
// server/middleware/csrf.ts
import csrf from 'csurf';

const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
  },
});

// Cliente deve incluir token
// Header: X-CSRF-Token: <token>
```

### XSS Protection

**Cross-Site Scripting** prevention:

1. **Input Sanitization**
```typescript
import { z } from 'zod';

const schema = z.object({
  nome: z.string().max(200),
  observacoes: z.string().max(5000),
});
```

2. **Output Encoding**
- React automaticamente escapa HTML
- Evite `dangerouslySetInnerHTML`

3. **Content Security Policy**
```typescript
helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind
    imgSrc: ["'self'", "data:", "https:"],
  },
});
```

### SQL Injection

**Proteção via Drizzle ORM**:

```typescript
// ✅ Seguro - Prepared statement
db.select().from(patients).where(eq(patients.id, patientId));

// ❌ NUNCA faça isso
db.execute(`SELECT * FROM patients WHERE id = ${patientId}`);
```

Drizzle usa **prepared statements** automaticamente, prevenindo SQL injection.

### Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requests por IP
  message: 'Muitas requisições. Tente novamente em 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Rate limit específico para login (brute force protection)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 tentativas de login
  skipSuccessfulRequests: true,
});

app.post('/api/auth/login', loginLimiter, loginHandler);
```

## 📊 Auditoria e Logs

### Audit Log (LGPD Art. 37)

Todas as operações são auditadas:

```typescript
// shared/schema.ts
export const auditLog = pgTable('audit_log', {
  id: serial('id').primaryKey(),

  // Quem
  userId: integer('user_id').references(() => users.id),
  userName: text('user_name'),
  userRole: text('user_role'),

  // O quê
  action: text('action').notNull(), // CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT, EXPORT, IMPORT
  resource: text('resource').notNull(), // patients, users, notes, etc.
  resourceId: integer('resource_id'),
  changes: text('changes'), // JSON: { before: {...}, after: {...} }

  // Onde
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  endpoint: text('endpoint'),

  // Resultado
  statusCode: integer('status_code'),
  errorMessage: text('error_message'),
  duration: integer('duration'), // ms

  // Quando
  timestamp: timestamp('timestamp').defaultNow(),
});
```

### Eventos Auditados

```typescript
// CREATE
auditLog.create({
  action: 'CREATE',
  resource: 'patients',
  resourceId: patient.id,
  changes: JSON.stringify({ after: patient }),
});

// READ
auditLog.create({
  action: 'READ',
  resource: 'patients',
  resourceId: patient.id,
});

// UPDATE
auditLog.create({
  action: 'UPDATE',
  resource: 'patients',
  resourceId: patient.id,
  changes: JSON.stringify({ before: oldData, after: newData }),
});

// DELETE (com motivo)
auditLog.create({
  action: 'DELETE',
  resource: 'notes',
  resourceId: note.id,
  changes: JSON.stringify({ before: note, reason: 'Solicitado por usuário' }),
});
```

### Logs de Sistema (Winston)

```typescript
// server/lib/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    // Logs diários rotacionados
    new winston.transports.DailyRotateFile({
      filename: 'logs/app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d', // Retenção 14 dias
    }),
    // Erros em arquivo separado
    new winston.transports.DailyRotateFile({
      level: 'error',
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '90d', // Retenção 90 dias
    }),
  ],
});
```

**Níveis de log**:
- `error` - Erros críticos
- `warn` - Avisos importantes
- `info` - Informações gerais
- `debug` - Debug detalhado

### Retenção de Logs

| Tipo | Retenção | Motivo |
|------|----------|--------|
| Audit Log (DB) | 5 anos | LGPD Art. 37 |
| Application Logs | 14 dias | Troubleshooting |
| Error Logs | 90 dias | Análise de padrões |
| Access Logs | 30 dias | Segurança |

## 🔒 Segurança da API

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
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
  frameguard: { action: 'deny' }, // X-Frame-Options: DENY
  noSniff: true, // X-Content-Type-Options: nosniff
  xssFilter: true, // X-XSS-Protection: 1; mode=block
}));
```

### Input Validation

**Todas** entradas são validadas com Zod:

```typescript
// Exemplo: Criar paciente
const createPatientSchema = z.object({
  nome: z.string().min(3).max(200),
  registro: z.string().min(1).max(50),
  leito: z.string().max(20).optional(),
  idade: z.number().int().min(0).max(150).optional(),
});

app.post('/api/patients', async (req, res) => {
  // Valida input
  const data = createPatientSchema.parse(req.body); // Throws se inválido

  // Processa
  const patient = await patientsService.create(data);

  res.json(patient);
});
```

### N8N Webhook Security

```typescript
// server/middleware/n8n-validation.ts

export function validateN8NWebhook(req: Request, res: Response, next: NextFunction) {
  const secret = req.headers['x-n8n-secret'];

  // 1. Valida secret
  if (secret !== env.N8N_WEBHOOK_SECRET) {
    throw new AppError('Unauthorized webhook', 401);
  }

  // 2. Valida IP (opcional)
  if (env.N8N_ALLOWED_IPS) {
    const allowedIPs = env.N8N_ALLOWED_IPS.split(',');
    const clientIP = req.ip;

    if (!allowedIPs.includes(clientIP)) {
      throw new AppError('IP not allowed', 403);
    }
  }

  next();
}
```

### CORS

```typescript
import cors from 'cors';

app.use(cors({
  origin: env.CLIENT_URL, // Apenas origem confiável
  credentials: true, // Permite cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
}));
```

## 🔐 Gestão de Secrets

### Environment Variables

**NUNCA** commitar secrets:

```bash
# ❌ NÃO commitar
.env
.env.local
.env.production

# ✅ Commitar (template)
.env.example
```

### Variáveis Críticas

```bash
# .env.example (template público)
NODE_ENV=development
PORT=3000
DATABASE_URL=your-database-url-here
SESSION_SECRET=generate-strong-secret-here
ENCRYPTION_KEY=generate-64-char-hex-string-here
JWT_SECRET=generate-strong-secret-here
REFRESH_SECRET=generate-strong-secret-here
ANTHROPIC_API_KEY=your-key-here
OPENAI_API_KEY=your-key-here
N8N_WEBHOOK_SECRET=generate-strong-secret-here
```

### Geração de Secrets

```bash
# 32 bytes random (64 caracteres hex)
openssl rand -hex 32

# 256 bits base64
openssl rand -base64 32

# UUID v4
uuidgen
```

### Rotação de Secrets

**Frequência recomendada**:
- `SESSION_SECRET`: 90 dias
- `JWT_SECRET`: 180 dias
- `ENCRYPTION_KEY`: 180 dias (requer re-criptografia)
- `API_KEYS`: Conforme política do provider

**Processo**:
1. Gerar novo secret
2. Adicionar ao sistema (suporte dual)
3. Migrar gradualmente
4. Remover secret antigo

### Backup de Secrets

- ✅ Use secret manager (AWS Secrets Manager, HashiCorp Vault)
- ✅ Backup criptografado offline
- ✅ Acesso restrito (apenas DevOps/SRE)
- ❌ NUNCA em repositório Git
- ❌ NUNCA em logs

## 🐛 Reportar Vulnerabilidades

### Responsible Disclosure

Se você descobrir uma vulnerabilidade de segurança:

1. **NÃO** abra issue pública no GitHub
2. **Envie email** para: security@11care.com (ou contato apropriado)
3. **Inclua**:
   - Descrição da vulnerabilidade
   - Passos para reproduzir
   - Impacto potencial
   - Sugestão de correção (se houver)

### Bug Bounty

Atualmente: **Não disponível**

Futuro: Considerar programa de bug bounty para pesquisadores de segurança.

### Resposta

- **Confirmação**: Resposta em até **48 horas**
- **Avaliação**: Análise em até **7 dias**
- **Correção**: Deploy da correção conforme severidade:
  - Crítico: 24-48 horas
  - Alto: 7 dias
  - Médio: 30 dias
  - Baixo: 90 dias

### Créditos

Pesquisadores de segurança que reportarem vulnerabilidades receberão crédito público (com permissão) no CHANGELOG.md.

## ✅ Checklist de Segurança

### Desenvolvimento

- [ ] Todas senhas hasheadas com bcrypt
- [ ] Dados sensíveis criptografados (AES-256-GCM)
- [ ] Input validation com Zod
- [ ] Output encoding (React faz automaticamente)
- [ ] SQL injection prevention (Drizzle ORM)
- [ ] XSS prevention (CSP + React)
- [ ] CSRF protection habilitado
- [ ] Rate limiting configurado
- [ ] Audit log implementado
- [ ] Error handling sem expor stack traces

### Deploy

- [ ] HTTPS configurado com certificado válido
- [ ] Environment variables configuradas
- [ ] Secrets não commitados
- [ ] CORS configurado corretamente
- [ ] Helmet headers habilitados
- [ ] Database backups automatizados
- [ ] Logs rotacionados automaticamente
- [ ] Monitoring e alertas configurados

### Operação

- [ ] Review de logs de auditoria regularmente
- [ ] Review de logs de erro regularmente
- [ ] Atualizar dependências (npm audit)
- [ ] Rotação de secrets conforme política
- [ ] Testes de penetração anuais
- [ ] Review de acessos de usuários (least privilege)
- [ ] Backups testados (restore test)
- [ ] Incident response plan documentado

### Compliance LGPD

- [ ] Dados sensíveis criptografados
- [ ] Auditoria completa implementada
- [ ] Retenção de logs por 5 anos
- [ ] Direitos dos titulares implementados
- [ ] Base legal definida (tutela da saúde)
- [ ] DPO (Data Protection Officer) designado
- [ ] Política de privacidade publicada
- [ ] Consentimento coletado quando aplicável
- [ ] Processo de resposta a incidentes definido

## 📚 Recursos

### Compliance

- [LGPD - Lei 13.709/2018](http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- [ANPD - Autoridade Nacional de Proteção de Dados](https://www.gov.br/anpd/pt-br)
- [HIPAA Compliance](https://www.hhs.gov/hipaa/index.html) (futuro)

### Segurança

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

### Ferramentas

- [npm audit](https://docs.npmjs.com/cli/v8/commands/npm-audit) - Vulnerabilidades em dependências
- [Snyk](https://snyk.io/) - Security scanning
- [OWASP ZAP](https://www.zaproxy.org/) - Penetration testing

---

**Última atualização**: 2026-01-15

**Contato de Segurança**: security@11care.com

**PGP Key Fingerprint**: [se aplicável]
