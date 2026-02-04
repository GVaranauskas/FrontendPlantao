---
name: 11care-api-endpoints
description: Referência rápida para criar e modificar endpoints da API REST do 11Care. Inclui padrões de autenticação, RBAC, validação e estrutura de resposta.
---

# API Endpoints - 11Care

Referência para criar e modificar endpoints da API REST.

## Configuração Base

### Base URL

```
Development: http://localhost:5000/api
Production:  https://your-domain.com/api
```

### Content Type

```
Content-Type: application/json
```

### Headers Obrigatórios

```http
Authorization: Bearer <accessToken>
```

**Nota**: CSRF protection é feito via cookies httpOnly com `sameSite: strict` (não via header X-CSRF-Token).

---

## Padrão de Endpoint Protegido

### Estrutura Básica

```typescript
// server/routes.ts
import { requireRoleWithAuth } from "./middleware/rbac";
import { z } from "zod";

// Endpoint protegido com RBAC
app.get("/api/resource",
  ...requireRoleWithAuth(["admin", "enfermagem"]),
  async (req, res) => {
    try {
      const data = await storage.getResource();
      res.json({ data });
    } catch (error) {
      logger.error("Error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Endpoint com validação de body
app.post("/api/resource",
  ...requireRoleWithAuth(["admin"]),
  async (req, res) => {
    const schema = z.object({
      name: z.string().min(1).max(200),
      value: z.number().optional(),
    });
    
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.issues });
    }
    
    const created = await storage.createResource(result.data);
    res.status(201).json({ data: created });
  }
);

// Endpoint com validação de params
app.get("/api/resource/:id",
  ...requireRoleWithAuth(["admin", "enfermagem"]),
  async (req, res) => {
    const { id } = req.params;
    
    // Validar UUID
    if (!isValidUUID(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }
    
    const data = await storage.getResourceById(id);
    if (!data) {
      return res.status(404).json({ error: "Resource not found" });
    }
    
    res.json({ data });
  }
);
```

---

## RBAC (Role-Based Access Control)

### Roles Disponíveis

| Role | Descrição |
|------|-----------|
| `admin` | Acesso total, gerenciamento de usuários, LGPD, auditoria |
| `enfermagem` | CRUD de pacientes, notas, sync |

**IMPORTANTE:** Apenas `admin` e `enfermagem` são roles válidas.

### Middleware requireRoleWithAuth

```typescript
import { requireRoleWithAuth } from "./middleware/rbac";

// Admin only
app.delete("/api/users/:id", ...requireRoleWithAuth(["admin"]), handler);

// Admin ou enfermagem
app.get("/api/patients", ...requireRoleWithAuth(["admin", "enfermagem"]), handler);

// ERRADO - não use requireRole sozinho (não verifica firstAccess)
app.get("/api/patients", requireRole(["admin"]), handler); // ❌
```

### O que requireRoleWithAuth faz

1. Valida JWT token
2. Verifica tokenVersion (para invalidação)
3. Verifica se conta está ativa (isActive)
4. Verifica se firstAccess foi completado
5. Verifica se role tem permissão

---

## Validação com Zod

### Schemas Existentes

```typescript
// shared/schema.ts
import { insertPatientSchema, insertUserSchema } from "@shared/schema";

// Usar schema existente
const result = insertPatientSchema.safeParse(req.body);

// Ou criar schema customizado
const customSchema = z.object({
  patientId: z.string().uuid(),
  note: z.string().min(1).max(5000),
  reason: z.enum(["alta", "transferencia", "obito"]).optional(),
});
```

### Validação de Parâmetros

```typescript
import { isValidUUID, sanitizeInput } from "./validation";

// UUID
const { id } = req.params;
if (!isValidUUID(id)) {
  return res.status(400).json({ error: "ID inválido" });
}

// Query params
const { search, limit } = req.query;
const sanitizedSearch = sanitizeInput(search as string);
const parsedLimit = Math.min(parseInt(limit as string) || 50, 100);
```

---

## Estrutura de Resposta

### Sucesso

```typescript
// GET (lista)
res.json({
  data: [...],
  total: 25,
  page: 1,
  limit: 50
});

// GET (item)
res.json({
  data: { id: "uuid", ... }
});

// POST (criação)
res.status(201).json({
  data: { id: "uuid", ... },
  message: "Created successfully"
});

// PUT/PATCH (atualização)
res.json({
  data: { id: "uuid", ... },
  message: "Updated successfully"
});

// DELETE
res.json({
  success: true,
  message: "Deleted successfully"
});
```

### Erros

```typescript
// 400 - Bad Request (validação)
res.status(400).json({
  error: "Validation error",
  details: result.error.issues
});

// 401 - Unauthorized (sem token)
res.status(401).json({
  error: "Authentication required"
});

// 403 - Forbidden (sem permissão)
res.status(403).json({
  error: "Access denied"
});

// 404 - Not Found
res.status(404).json({
  error: "Resource not found"
});

// 409 - Conflict
res.status(409).json({
  error: "Resource already exists"
});

// 429 - Rate Limited
res.status(429).json({
  error: "Too many requests. Try again later."
});

// 500 - Internal Error
res.status(500).json({
  error: "Internal server error"
});
```

---

## Endpoints Existentes

### Auth

| Método | Endpoint | Roles | Descrição |
|--------|----------|-------|-----------|
| POST | `/api/auth/setup` | - | Setup inicial |
| POST | `/api/auth/login` | - | Login |
| POST | `/api/auth/logout` | * | Logout |
| POST | `/api/auth/refresh` | * | Refresh token |
| GET | `/api/auth/me` | * | Dados do usuário |
| POST | `/api/auth/first-access-password` | * | Trocar senha primeiro acesso |
| POST | `/api/auth/invalidate-all-sessions` | * | Invalidar todos tokens |

### Patients

| Método | Endpoint | Roles | Descrição |
|--------|----------|-------|-----------|
| GET | `/api/patients` | admin, enfermagem | Listar pacientes |
| GET | `/api/patients/:id` | admin, enfermagem | Obter paciente |
| POST | `/api/patients` | admin, enfermagem | Criar paciente |
| PUT | `/api/patients/:id` | admin, enfermagem | Atualizar paciente |
| DELETE | `/api/patients/:id` | admin | Deletar paciente |
| POST | `/api/patients/:id/archive` | admin, enfermagem | Arquivar paciente |

### Users

| Método | Endpoint | Roles | Descrição |
|--------|----------|-------|-----------|
| GET | `/api/users` | admin | Listar usuários |
| POST | `/api/users` | admin | Criar usuário |
| PUT | `/api/users/:id` | admin | Atualizar usuário |
| DELETE | `/api/users/:id` | admin | Deletar usuário |

### Notes

| Método | Endpoint | Roles | Descrição |
|--------|----------|-------|-----------|
| GET | `/api/notes/:patientId` | admin, enfermagem | Listar notas |
| POST | `/api/notes` | admin, enfermagem | Criar nota |
| PUT | `/api/notes/:id` | admin, enfermagem | Editar nota (própria) |
| DELETE | `/api/notes/:id` | admin | Deletar nota |

### LGPD

| Método | Endpoint | Roles | Descrição |
|--------|----------|-------|-----------|
| GET | `/api/lgpd/export/patient/:id` | admin | Exportar dados paciente |
| POST | `/api/lgpd/anonymize/history/:codigoAtendimento` | admin | Anonimizar histórico |
| GET | `/api/lgpd/data-categories` | admin | Listar categorias de dados |

### Sync

| Método | Endpoint | Roles | Descrição |
|--------|----------|-------|-----------|
| POST | `/api/sync/n8n` | admin, enfermagem | Sincronizar com N8N |
| GET | `/api/sync/status` | admin, enfermagem | Status da sync |

### Analytics

| Método | Endpoint | Roles | Descrição |
|--------|----------|-------|-----------|
| POST | `/api/analytics/events` | * | Registrar evento |
| POST | `/api/analytics/events/batch` | * | Registrar eventos em batch |
| POST | `/api/analytics/sessions` | * | Criar sessão |
| GET | `/api/admin/analytics/metrics` | admin | Métricas gerais |
| GET | `/api/admin/analytics/sessions` | admin | Listar sessões |

---

## Rate Limiting

### Limites por Endpoint

| Tipo | Limite | Janela | Key |
|------|--------|--------|-----|
| Login | 10 req | 15 min | IP |
| API Geral | 300 req | 1 min | userId |
| Sync | 30 req | 1 min | userId |
| IA | 20 req | 1 min | userId |
| Refresh | 30 req | 1 min | userId |

### Aplicar Rate Limiter

```typescript
import { 
  apiRateLimiter, 
  loginRateLimiter, 
  syncRateLimiter, 
  aiRateLimiter 
} from "./middleware/rate-limiter";

// Já aplicado globalmente:
app.use('/api/', apiRateLimiter);

// Para endpoints específicos:
app.post('/api/auth/login', loginRateLimiter, handler);
app.post('/api/sync/n8n', syncRateLimiter, handler);
app.post('/api/ai/analyze', aiRateLimiter, handler);
```

---

## Auditoria

### Quando Auditar

- ✅ CREATE, UPDATE, DELETE de recursos
- ✅ LOGIN, LOGOUT
- ✅ Exportação de dados (LGPD)
- ✅ Sincronização
- ❌ GET de listas (desnecessário)

### Como Auditar

```typescript
import { auditService } from './services/audit.service';

// Em um endpoint
app.post("/api/patients/:id/archive",
  ...requireRoleWithAuth(["admin", "enfermagem"]),
  async (req, res) => {
    const startTime = Date.now();
    const { id } = req.params;
    const { reason } = req.body;
    
    const patient = await storage.getPatient(id);
    const archived = await storage.archivePatient(id, reason);
    
    // Auditar
    await auditService.log({
      user: { 
        id: req.user.userId, 
        name: req.user.username, 
        role: req.user.role 
      },
      action: 'PATIENT_ARCHIVED',
      resource: 'patients',
      resourceId: id,
      changes: { 
        before: patient,
        after: archived 
      },
      metadata: { reason },
      req,
      statusCode: 200,
      startTime
    });
    
    res.json({ success: true, data: archived });
  }
);
```

### AuditActions Válidas

```typescript
type AuditAction = 
  | 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' 
  | 'LOGIN' | 'LOGOUT' 
  | 'EXPORT' | 'IMPORT'
  | 'PATIENT_ARCHIVED' | 'PATIENT_REACTIVATED' | 'BED_CONFLICT'
  | 'SHIFT_HANDOVER_VIEW' | 'SHIFT_HANDOVER_PRINT'
  | 'SYNC_STARTED' | 'SYNC_COMPLETED';
```

---

## JWT Token

### Payload Structure

```typescript
interface JWTPayload {
  userId: number;
  username: string;
  role: 'admin' | 'enfermagem';
  tokenVersion: number;
  iat: number;
  exp: number;
}

// Acessar em req.user
app.get("/api/example", ...requireRoleWithAuth(["admin"]), (req, res) => {
  const { userId, username, role } = req.user;
});
```

### Duração dos Tokens

| Token | Duração |
|-------|---------|
| Access Token | 15 minutos |
| Refresh Token | 7 dias |

---

## Exemplo Completo: Novo Endpoint

```typescript
// server/routes.ts
import { requireRoleWithAuth } from "./middleware/rbac";
import { auditService } from "./services/audit.service";
import { z } from "zod";

// Schema de validação
const createReportSchema = z.object({
  patientId: z.string().uuid(),
  reportType: z.enum(["daily", "weekly", "discharge"]),
  content: z.string().min(10).max(10000),
});

// Endpoint
app.post("/api/reports",
  ...requireRoleWithAuth(["admin", "enfermagem"]),
  async (req, res) => {
    const startTime = Date.now();
    
    try {
      // 1. Validar input
      const result = createReportSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: "Validation error",
          details: result.error.issues 
        });
      }
      
      // 2. Verificar se paciente existe
      const patient = await storage.getPatient(result.data.patientId);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }
      
      // 3. Criar relatório
      const report = await storage.createReport({
        ...result.data,
        createdBy: req.user.userId,
        createdAt: new Date(),
      });
      
      // 4. Auditar
      await auditService.log({
        user: { 
          id: req.user.userId, 
          name: req.user.username, 
          role: req.user.role 
        },
        action: 'CREATE',
        resource: 'reports',
        resourceId: report.id,
        changes: { after: report },
        metadata: { patientId: result.data.patientId },
        req,
        statusCode: 201,
        startTime
      });
      
      // 5. Retornar
      res.status(201).json({ 
        data: report,
        message: "Report created successfully"
      });
      
    } catch (error) {
      logger.error("Error creating report:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);
```

---

## Checklist para Novo Endpoint

- [ ] Usar `...requireRoleWithAuth([roles])` para proteção
- [ ] Validar body com Zod schema
- [ ] Validar params (UUID, etc.)
- [ ] Tratar erros com try/catch
- [ ] Retornar status codes corretos (200, 201, 400, 404, 500)
- [ ] Auditar ações críticas (CREATE, UPDATE, DELETE)
- [ ] Não expor dados sensíveis em logs ou erros
- [ ] Aplicar rate limiter se for endpoint crítico
