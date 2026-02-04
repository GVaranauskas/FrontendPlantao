---
name: 11care-security-review
description: Checklist de revisão de segurança pós-implementação. Use após implementar novas funcionalidades para verificar vulnerabilidades, proteção de secrets, e conformidade LGPD.
---

# Revisão de Segurança Pós-Implementação

Execute esta skill após implementar novas funcionalidades para garantir conformidade com padrões de segurança do 11Care.

## Checklist Rápido

| Categoria | Verificação | Criticidade |
|-----------|-------------|-------------|
| 🔴 Secrets | Nenhum secret hardcoded no código | CRÍTICA |
| 🔴 .gitignore | Arquivos sensíveis protegidos | CRÍTICA |
| 🔴 LGPD | Dados pessoais criptografados | CRÍTICA |
| 🟠 Validação | Input sanitizado e validado | ALTA |
| 🟠 Autenticação | Endpoints protegidos com RBAC | ALTA |
| 🟠 Rate Limiting | Endpoints têm limitação de taxa | ALTA |
| 🟡 Auditoria | Ações críticas são logadas | MÉDIA |
| 🟡 SQL Injection | Queries usam parametrização | MÉDIA |

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

## 2. Conformidade LGPD (CRÍTICA)

### Dados Pessoais que DEVEM ser Criptografados

No 11Care, os seguintes campos são sensíveis e criptografados via `SENSITIVE_PATIENT_FIELDS`:

```typescript
// server/services/encryption.service.ts
export const SENSITIVE_PATIENT_FIELDS = [
  'nome',           // Nome do paciente
  'registro',       // Número de registro (PT)
  'dataNascimento', // Data de nascimento
  'diagnostico',    // Diagnóstico clínico
  'alergias',       // Alergias
  'observacoes',    // Observações clínicas
  'dsEvolucaoCompleta',  // Evolução completa
  'dadosBrutosJson',     // Dados brutos N8N
  'clinicalInsights',    // Insights da IA
] as const;
```

### Comandos de Verificação LGPD

```bash
# Verificar se novo campo sensível foi adicionado
grep -rn "nome\|cpf\|rg\|endereco\|telefone\|email" shared/schema.ts | grep -v "//"

# Verificar se há logs de dados sensíveis
grep -rn "console.log.*patient" server/ --include="*.ts"
grep -rn "console.log.*nome\|registro\|cpf" server/ --include="*.ts"

# Verificar se dados são expostos em respostas de erro
grep -rn "res.json.*error.*patient" server/ --include="*.ts"
```

### Endpoints LGPD Implementados

O 11Care possui os seguintes endpoints de conformidade LGPD:

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/lgpd/export/patient/:id` | GET | Exporta dados do paciente (Art. 18 - Portabilidade) |
| `/api/lgpd/anonymize/history/:codigoAtendimento` | POST | Anonimiza histórico (Art. 18 - Direito ao esquecimento) |
| `/api/lgpd/data-categories` | GET | Lista categorias de dados coletados (Art. 9 - Transparência) |

### Checklist LGPD

- [ ] Novos campos de dados pessoais estão em `SENSITIVE_PATIENT_FIELDS`?
- [ ] Dados sensíveis NÃO aparecem em logs?
- [ ] Dados sensíveis NÃO são expostos em mensagens de erro?
- [ ] Exportação de dados usa endpoint `/api/lgpd/export/patient/:id`?
- [ ] Há mecanismo de anonimização via `/api/lgpd/anonymize/history/:codigoAtendimento`?

### Padrão de Log Seguro

```typescript
// ❌ ERRADO - Expõe dados pessoais
console.log("Paciente criado:", patient);

// ✅ CORRETO - Log seguro
console.log("Paciente criado:", { id: patient.id, leito: patient.leito });
```

---

## 3. Validação de Input (ALTA)

### Comandos de Verificação

```bash
# Verificar se há parsing direto de body sem validação
grep -rn "req.body\." server/routes --include="*.ts" | grep -v "validate\|parse\|schema"

# Verificar uso de Zod para validação
grep -rn "\.parse(\|\.safeParse(" server/ --include="*.ts"

# Verificar se params são validados
grep -rn "req.params\." server/ --include="*.ts"
```

### Padrão de Validação

```typescript
// ❌ ERRADO - Sem validação
app.post("/api/patients", async (req, res) => {
  const patient = req.body;  // Perigoso!
  await storage.createPatient(patient);
});

// ✅ CORRETO - Com validação Zod
import { insertPatientSchema } from "@shared/schema";

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

// ✅ Sempre validar UUIDs de params
const { id } = req.params;
if (!isValidUUID(id)) {
  return res.status(400).json({ error: "ID inválido" });
}
```

---

## 4. SQL Injection (MÉDIA)

### Comandos de Verificação

```bash
# Buscar queries SQL raw (potencialmente perigosas)
grep -rn "db.execute\|sql\`" server/ --include="*.ts"
grep -rn "\$\{.*\}" server/ --include="*.ts" | grep -i "sql\|query\|select\|insert"

# Verificar uso seguro do Drizzle ORM
grep -rn "eq(\|and(\|or(" server/ --include="*.ts"
```

### Padrão Seguro

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

// ✅ CORRETO - Se precisar de SQL raw, usar parâmetros
const result = await db.execute(
  sql`SELECT * FROM patients WHERE nome = ${userInput}`
);
```

---

## 5. Autenticação e Autorização (ALTA)

### Comandos de Verificação

```bash
# Verificar se novos endpoints têm proteção
grep -rn "app.get\|app.post\|app.put\|app.delete\|app.patch" server/routes --include="*.ts"

# Verificar uso de middleware de auth
grep -rn "requireRoleWithAuth\|requireAuth\|authenticateToken" server/routes --include="*.ts"

# Listar endpoints que podem estar desprotegidos
grep -rn "app\.\(get\|post\|put\|delete\)" server/routes --include="*.ts" | grep -v "authenticate\|requireRole\|public"
```

### Padrão de Proteção

```typescript
import { requireRoleWithAuth } from "../middleware/rbac";

// ❌ ERRADO - Endpoint sem proteção
app.get("/api/patients", async (req, res) => { ... });

// ✅ CORRETO - Com autenticação e RBAC
app.get("/api/patients", 
  requireRoleWithAuth(["admin", "enfermagem"]),
  async (req, res) => { ... }
);

// ✅ CORRETO - Admin only
app.delete("/api/patients/:id",
  requireRoleWithAuth(["admin"]),
  async (req, res) => { ... }
);
```

### Níveis de Acesso (RBAC) - 11Care

| Role | Nível | Permissões |
|------|-------|------------|
| `admin` | 2 | Todas as operações, gerenciamento de usuários, LGPD, auditoria |
| `enfermagem` | 1 | CRUD de pacientes, notas, visualização, sync |

**NOTA:** Apenas `admin` e `enfermagem` são roles válidas no sistema.

---

## 6. Rate Limiting (ALTA)

### Comandos de Verificação

```bash
# Verificar se rate limiters estão aplicados
grep -rn "rateLimiter\|rateLimit" server/ --include="*.ts"

# Verificar configuração de limites
grep -rn "windowMs\|max:" server/middleware/rate-limiter.ts
```

### Limites Configurados no 11Care

| Endpoint | Limite | Janela | Key |
|----------|--------|--------|-----|
| Login/Registro | 10 req | 15 min | IP |
| API Geral | 300 req | 1 min | userId |
| Sync/Import | 30 req | 1 min | userId |
| IA (OpenAI) | 20 req | 1 min | userId |
| Refresh Token | 30 req | 1 min | userId |

### Verificar Novo Endpoint

Se criou endpoint que:
- Consome recursos externos (API, IA) → Precisa rate limit específico
- É público ou de autenticação → Precisa rate limit por IP
- É crítico (sync, import) → Precisa rate limit restritivo

---

## 7. Auditoria (MÉDIA)

### Comandos de Verificação

```bash
# Verificar se ações críticas são auditadas
grep -rn "auditService.log\|auditService.logSystem" server/ --include="*.ts"

# Listar ações que deveriam ser auditadas
grep -rn "delete\|update\|create" server/routes --include="*.ts" -i
```

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

### Ações que DEVEM ser Auditadas

- [ ] Criação/edição/exclusão de pacientes (CREATE, UPDATE, DELETE)
- [ ] Mudanças em notas de pacientes (UPDATE)
- [ ] Login/logout de usuários (LOGIN, LOGOUT)
- [ ] Arquivamento de pacientes (PATIENT_ARCHIVED)
- [ ] Sincronização com N8N (SYNC_STARTED, SYNC_COMPLETED)
- [ ] Exportação de dados LGPD (EXPORT)

### Padrão de Auditoria

```typescript
import { auditService } from '../services/audit.service';

// Auditar ação de usuário
await auditService.log({
  user: { id: user.id, name: user.name, role: user.role },
  action: 'UPDATE',  // Usar AuditAction válida
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

// Auditar ação de sistema
await auditService.logSystem({
  action: 'SYNC_COMPLETED',
  resource: 'sync',
  resourceId: syncId,
  changes: { patientsUpdated: 10, patientsArchived: 2 },
  metadata: { duration: '15s' }
});
```

---

## 8. Outras Verificações

### XSS (Cross-Site Scripting)

```bash
# Verificar se há dangerouslySetInnerHTML
grep -rn "dangerouslySetInnerHTML" client/ --include="*.tsx"

# Verificar se há innerHTML
grep -rn "innerHTML" client/ --include="*.tsx"
```

### CSRF

O 11Care usa CSRF protection via middleware. Verificar:
- [ ] Requisições POST/PUT/DELETE incluem CSRF token
- [ ] Cookies estão configurados com `SameSite=strict`

### Headers de Segurança

Verificar CSP (Content Security Policy):
```bash
grep -rn "Content-Security-Policy\|helmet" server/ --include="*.ts"
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
```

### Passo 2: Revisão Manual
1. Abrir arquivos modificados no último commit
2. Verificar cada endpoint novo contra checklist
3. Verificar se dados sensíveis estão protegidos

### Passo 3: Testes
1. Tentar acessar endpoint sem autenticação
2. Tentar injetar SQL em campos de texto
3. Verificar se rate limiting funciona
4. Verificar se logs não expõem dados

### Passo 4: Documentação
1. Atualizar CHANGELOG.md com mudanças de segurança
2. Atualizar replit.md se houver novos padrões

---

## Conclusão

Após executar todos os passos:

- [ ] Nenhum secret hardcoded encontrado
- [ ] .gitignore protege todos os arquivos sensíveis
- [ ] Novos campos sensíveis estão em SENSITIVE_PATIENT_FIELDS
- [ ] Todos os inputs são validados com Zod
- [ ] Queries usam ORM parametrizado
- [ ] Endpoints têm autenticação e RBAC corretos (admin/enfermagem)
- [ ] Rate limiting aplicado onde necessário
- [ ] Ações críticas são auditadas com AuditActions válidas
- [ ] Logs não expõem dados pessoais

**Se todas as verificações passaram, a implementação está segura!**
