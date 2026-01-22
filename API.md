# Documentação da API

Documentação completa dos endpoints da API REST do **11Care Nursing Platform**.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Autenticação](#autenticação)
- [Endpoints](#endpoints)
  - [Auth](#auth)
  - [Patients](#patients)
  - [Users](#users)
  - [Nursing Units](#nursing-units)
  - [Templates](#templates)
  - [Notes](#notes)
  - [Analytics](#analytics)
  - [Usage Analytics](#usage-analytics)
  - [Sync & IA](#sync--ia)
  - [Webhooks](#webhooks)
- [Códigos de Status](#códigos-de-status)
- [Rate Limiting](#rate-limiting)
- [CORS](#cors)
- [Paginação](#paginação)
- [Erros](#erros)

## 🎯 Visão Geral

### Base URL

```
Development: http://localhost:5000/api
Production:  https://your-domain.com/api
```

### Content Type

```
Content-Type: application/json
```

### Segurança

- **HTTPS**: Todas as comunicações devem usar HTTPS em produção
- **Authentication**: JWT Bearer tokens
- **CSRF Protection**: Token em header `X-CSRF-Token`
- **Rate Limiting**: 100 requests/15min por IP

## 🔐 Autenticação

### Fluxo de Autenticação

```
1. POST /api/auth/login → Recebe accessToken + refreshToken (cookie)
2. Requests → Header: Authorization: Bearer <accessToken>
3. Token expira → POST /api/auth/refresh → Novo accessToken
4. POST /api/auth/logout → Invalida tokens
```

### Access Token (JWT)

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Payload**:
```json
{
  "userId": 1,
  "username": "admin",
  "role": "admin",
  "iat": 1234567890,
  "exp": 1234568790
}
```

**Duração**: 15 minutos

### Refresh Token

Enviado como **httpOnly cookie** automaticamente.

**Duração**: 7 dias

### Roles

```typescript
enum UserRole {
  Admin = 'admin',          // Acesso completo
  Enfermagem = 'enfermagem', // CRUD pacientes, criar notas
  Visualizador = 'visualizador', // Apenas leitura
}
```

## 📡 Endpoints

---

## Auth

### POST /api/auth/setup

Cria usuário admin inicial (apenas primeira execução).

**Auth**: Não requerida

**Body**:
```json
{
  "setupKey": "your-setup-key-from-env"
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Setup completed successfully",
  "credentials": {
    "admin": {
      "username": "admin",
      "password": "admin123"
    },
    "enfermeiro": {
      "username": "enfermeiro",
      "password": "enf123"
    }
  }
}
```

**Errors**:
- `403` - Invalid setup key
- `503` - SETUP_KEY not configured

---

### POST /api/auth/login

Autentica usuário e retorna tokens.

**Auth**: Não requerida

**Body**:
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response** (200):
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "admin",
    "name": "Administrador",
    "email": "admin@11care.com.br",
    "role": "admin",
    "isActive": true
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Cookies**:
```
refreshToken=...; HttpOnly; Secure; SameSite=Strict; Max-Age=604800
```

**Errors**:
- `400` - Username and password required
- `401` - Invalid credentials

---

### POST /api/auth/refresh

Obtém novo access token usando refresh token.

**Auth**: Refresh token (cookie)

**Response** (200):
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors**:
- `401` - Invalid or expired refresh token

---

### POST /api/auth/logout

Invalida refresh token e limpa cookies.

**Auth**: Bearer token

**Response** (200):
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### GET /api/auth/me

Retorna dados do usuário autenticado.

**Auth**: Bearer token

**Response** (200):
```json
{
  "user": {
    "id": 1,
    "username": "admin",
    "name": "Administrador",
    "email": "admin@11care.com.br",
    "role": "admin",
    "isActive": true,
    "createdAt": "2026-01-15T10:00:00Z"
  }
}
```

---

## Patients

### GET /api/patients

Lista todos os pacientes.

**Auth**: Bearer token
**Roles**: `admin`, `enfermagem`, `visualizador`

**Query Params**:
```
?search=João          # Busca por nome/registro/leito
?unidade=UTI Adulto   # Filtro por unidade
?includeArchived=true # Incluir pacientes arquivados
```

**Response** (200):
```json
{
  "patients": [
    {
      "id": 1,
      "leito": "101A",
      "nome": "João Silva",
      "registro": "12345",
      "idade": 65,
      "dataNascimento": "1961-01-15",
      "dataInternacao": "2026-01-10T08:00:00Z",
      "diagnostico": "Pneumonia",
      "alergias": "Penicilina",
      "unidadeInternacao": "UTI Adulto",
      "escoreBraden": 14,
      "mobilidade": "Restrito ao leito",
      "dieta": "NPO",
      "eliminacoes": "Fralda",
      "dispositivos": "CVP, SNE, SVD",
      "atb": "Ceftriaxone 1g 12/12h",
      "curativos": "Lesão sacral Stage II",
      "aporteSaturacao": "O2 2L/min - SpO2 94%",
      "exames": "Raio-X tórax",
      "cirurgia": "Não programada",
      "observacoes": "Paciente estável",
      "previsaoAlta": "2026-01-20",
      "clinicalInsights": {
        "riskLevel": "medium",
        "sbarAnalysis": "...",
        "recommendations": ["..."]
      },
      "createdAt": "2026-01-10T08:00:00Z",
      "updatedAt": "2026-01-15T10:00:00Z"
    }
  ],
  "total": 1,
  "stats": {
    "total": 25,
    "complete": 20,
    "pending": 3,
    "alerts": 2
  }
}
```

---

### GET /api/patients/:id

Obtém detalhes de um paciente.

**Auth**: Bearer token
**Roles**: `admin`, `enfermagem`, `visualizador`

**Response** (200):
```json
{
  "patient": {
    "id": 1,
    "leito": "101A",
    "nome": "João Silva",
    // ... todos os campos
  }
}
```

**Errors**:
- `404` - Patient not found

---

### POST /api/patients

Cria novo paciente.

**Auth**: Bearer token
**Roles**: `admin`, `enfermagem`

**Body**:
```json
{
  "leito": "101A",
  "nome": "João Silva",
  "registro": "12345",
  "idade": 65,
  "diagnostico": "Pneumonia",
  "alergias": "Penicilina",
  "unidadeInternacao": "UTI Adulto"
}
```

**Response** (201):
```json
{
  "patient": {
    "id": 1,
    "leito": "101A",
    "nome": "João Silva",
    // ... campos
    "createdAt": "2026-01-15T10:00:00Z"
  }
}
```

**Errors**:
- `400` - Validation error
- `403` - Forbidden (role)

---

### PUT /api/patients/:id

Atualiza paciente existente.

**Auth**: Bearer token
**Roles**: `admin`, `enfermagem`

**Body**:
```json
{
  "observacoes": "Paciente apresentou melhora",
  "escoreBraden": 16
}
```

**Response** (200):
```json
{
  "patient": {
    "id": 1,
    // ... campos atualizados
    "updatedAt": "2026-01-15T11:00:00Z"
  }
}
```

**Errors**:
- `404` - Patient not found
- `403` - Forbidden

---

### DELETE /api/patients/:id

Remove paciente (soft delete - arquiva).

**Auth**: Bearer token
**Roles**: `admin`

**Body**:
```json
{
  "reason": "alta", // "alta" | "transferencia" | "obito" | "registro_antigo"
  "notes": "Alta médica"
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Patient archived successfully"
}
```

**Errors**:
- `404` - Patient not found
- `403` - Forbidden (admin only)

---

### POST /api/patients/:id/archive

Arquiva paciente no histórico.

**Auth**: Bearer token
**Roles**: `admin`, `enfermagem`

**Body**:
```json
{
  "reason": "alta",
  "notes": "Alta médica conforme solicitado"
}
```

**Response** (200):
```json
{
  "success": true,
  "archivedPatient": {
    "id": 1,
    "patientId": 1,
    "reason": "alta",
    // ... snapshot completo dos dados
  }
}
```

---

## Users

### GET /api/users

Lista todos os usuários.

**Auth**: Bearer token
**Roles**: `admin`

**Response** (200):
```json
{
  "users": [
    {
      "id": 1,
      "username": "admin",
      "name": "Administrador",
      "email": "admin@11care.com.br",
      "role": "admin",
      "isActive": true,
      "createdAt": "2026-01-01T00:00:00Z"
    }
  ]
}
```

---

### POST /api/users

Cria novo usuário.

**Auth**: Bearer token
**Roles**: `admin`

**Body**:
```json
{
  "username": "enfermeira.maria",
  "name": "Maria Silva",
  "email": "maria@11care.com.br",
  "password": "Senha@123",
  "role": "enfermagem",
  "isActive": true
}
```

**Validação de Senha**:
- Mínimo 8 caracteres
- 1 maiúscula, 1 minúscula, 1 número, 1 especial

**Response** (201):
```json
{
  "user": {
    "id": 2,
    "username": "enfermeira.maria",
    "name": "Maria Silva",
    "email": "maria@11care.com.br",
    "role": "enfermagem",
    "isActive": true
  }
}
```

**Errors**:
- `400` - Validation error
- `409` - Username or email already exists

---

### PUT /api/users/:id

Atualiza usuário.

**Auth**: Bearer token
**Roles**: `admin`

**Body**:
```json
{
  "name": "Maria Silva Santos",
  "email": "maria.santos@11care.com.br",
  "isActive": true
}
```

**Response** (200):
```json
{
  "user": {
    "id": 2,
    // ... campos atualizados
  }
}
```

---

### DELETE /api/users/:id

Remove usuário (soft delete).

**Auth**: Bearer token
**Roles**: `admin`

**Response** (200):
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

## Nursing Units

### GET /api/nursing-units

Lista unidades de internação.

**Auth**: Bearer token
**Roles**: `admin`, `enfermagem`, `visualizador`

**Response** (200):
```json
{
  "units": [
    {
      "id": 1,
      "codigo": "UTI-01",
      "nome": "UTI Adulto",
      "localizacao": "2º Andar - Ala Norte",
      "descricao": "Unidade de Terapia Intensiva",
      "observacoes": "24 leitos",
      "ramal": "2001",
      "ativa": true,
      "createdAt": "2026-01-01T00:00:00Z"
    }
  ]
}
```

---

### POST /api/nursing-units

Cria unidade de internação.

**Auth**: Bearer token
**Roles**: `admin`

**Body**:
```json
{
  "codigo": "UTI-01",
  "nome": "UTI Adulto",
  "localizacao": "2º Andar - Ala Norte",
  "descricao": "Unidade de Terapia Intensiva",
  "ramal": "2001",
  "ativa": true
}
```

**Response** (201):
```json
{
  "unit": {
    "id": 1,
    // ... campos
  }
}
```

---

### GET /api/nursing-units/changes

Lista mudanças pendentes de aprovação.

**Auth**: Bearer token
**Roles**: `admin`

**Response** (200):
```json
{
  "changes": [
    {
      "id": 1,
      "unitId": 1,
      "changeType": "update",
      "oldValue": "{\"nome\": \"UTI Adulto\"}",
      "newValue": "{\"nome\": \"UTI Adulto I\"}",
      "status": "pending",
      "createdAt": "2026-01-15T06:00:00Z"
    }
  ]
}
```

---

### POST /api/nursing-units/changes/:id/approve

Aprova mudança de unidade.

**Auth**: Bearer token
**Roles**: `admin`

**Response** (200):
```json
{
  "success": true,
  "message": "Change approved and applied"
}
```

---

### POST /api/nursing-units/changes/:id/reject

Rejeita mudança de unidade.

**Auth**: Bearer token
**Roles**: `admin`

**Response** (200):
```json
{
  "success": true,
  "message": "Change rejected"
}
```

---

## Templates

### GET /api/templates

Lista templates de enfermaria.

**Auth**: Bearer token
**Roles**: `admin`

**Response** (200):
```json
{
  "templates": [
    {
      "id": 1,
      "unidadeInternacao": "UTI Adulto",
      "templateData": {
        "requiredFields": ["diagnostico", "alergias"],
        "customFields": []
      },
      "ativo": true
    }
  ]
}
```

---

## Notes

### GET /api/notes/:patientId

Lista notas de um paciente.

**Auth**: Bearer token
**Roles**: `admin`, `enfermagem`, `visualizador`

**Response** (200):
```json
{
  "notes": [
    {
      "id": 1,
      "patientId": 1,
      "userId": 1,
      "userName": "Administrador",
      "note": "Paciente colaborativo",
      "createdAt": "2026-01-15T10:00:00Z",
      "updatedAt": "2026-01-15T10:00:00Z"
    }
  ]
}
```

---

### POST /api/notes

Cria nova nota.

**Auth**: Bearer token
**Roles**: `admin`, `enfermagem`

**Body**:
```json
{
  "patientId": 1,
  "note": "Paciente apresentou melhora significativa"
}
```

**Response** (201):
```json
{
  "note": {
    "id": 1,
    "patientId": 1,
    "userId": 1,
    "note": "Paciente apresentou melhora significativa",
    "createdAt": "2026-01-15T10:00:00Z"
  }
}
```

---

### PUT /api/notes/:id

Atualiza nota existente.

**Auth**: Bearer token
**Roles**: `admin`, `enfermagem` (própria nota)

**Body**:
```json
{
  "note": "Paciente apresentou melhora significativa e boa resposta ao tratamento"
}
```

**Response** (200):
```json
{
  "note": {
    "id": 1,
    // ... campos atualizados
    "updatedAt": "2026-01-15T11:00:00Z"
  }
}
```

---

### DELETE /api/notes/:id

Remove nota (admin only com motivo).

**Auth**: Bearer token
**Roles**: `admin`

**Body**:
```json
{
  "reason": "Nota duplicada"
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Note deleted successfully"
}
```

---

## Analytics

### GET /api/analytics/overview

Retorna visão geral de análises.

**Auth**: Bearer token
**Roles**: `admin`, `enfermagem`

**Response** (200):
```json
{
  "totalPatients": 25,
  "completedAnalyses": 20,
  "pendingAnalyses": 5,
  "highRiskPatients": 3,
  "recentCosts": {
    "today": 1.50,
    "week": 8.75,
    "month": 32.40
  }
}
```

---

## Usage Analytics

Endpoints para rastreamento de uso do sistema (sessoes, page views, acoes).

### POST /api/analytics/events

Registra um evento de analytics.

**Auth**: Bearer token
**Roles**: `admin`, `enfermagem`, `visualizador`

**Body**:
```json
{
  "sessionId": "uuid-session-id",
  "eventType": "page_view",
  "eventName": "shift_handover_view",
  "pagePath": "/shift-handover/22",
  "pageTitle": "Passagem de Plantao - Enfermaria 22",
  "metadata": {}
}
```

**Response** (201):
```json
{
  "id": "uuid-event-id",
  "createdAt": "2026-01-22T12:00:00Z"
}
```

---

### POST /api/analytics/events/batch

Registra multiplos eventos em lote (otimizado para performance).

**Auth**: Bearer token
**Roles**: `admin`, `enfermagem`, `visualizador`

**Body**:
```json
{
  "events": [
    {
      "sessionId": "uuid-session-id",
      "eventType": "action",
      "eventName": "patient_note_create",
      "pagePath": "/shift-handover/22",
      "metadata": { "patientId": "123" }
    }
  ]
}
```

**Response** (201):
```json
{
  "inserted": 1
}
```

---

### POST /api/analytics/sessions

Cria uma nova sessao de usuario.

**Auth**: Bearer token
**Roles**: `admin`, `enfermagem`, `visualizador`

**Body**:
```json
{
  "userId": "user-id",
  "userName": "Joao Silva",
  "userRole": "enfermagem",
  "userAgent": "Mozilla/5.0...",
  "screenResolution": "1920x1080",
  "language": "pt-BR"
}
```

**Response** (201):
```json
{
  "id": "uuid-session-id",
  "startedAt": "2026-01-22T12:00:00Z"
}
```

---

### POST /api/analytics/sessions/:id/end

Encerra uma sessao de usuario.

**Auth**: Bearer token
**Roles**: `admin`, `enfermagem`, `visualizador`

**Response** (200):
```json
{
  "success": true,
  "endedAt": "2026-01-22T13:30:00Z"
}
```

---

### POST /api/analytics/sessions/:id/heartbeat

Atualiza o heartbeat de uma sessao (mantém sessao ativa).

**Auth**: Bearer token
**Roles**: `admin`, `enfermagem`, `visualizador`

**Response** (200):
```json
{
  "success": true,
  "lastActivityAt": "2026-01-22T12:15:00Z"
}
```

---

### GET /api/admin/analytics/metrics

Retorna metricas consolidadas de uso.

**Auth**: Bearer token
**Roles**: `admin`

**Query Params**:
- `days`: Periodo em dias (default: 30)

**Response** (200):
```json
{
  "totalSessions": 150,
  "activeSessions": 5,
  "totalPageViews": 2500,
  "totalActions": 800,
  "uniqueUsers": 12,
  "avgSessionDuration": 1800000,
  "avgPageViewsPerSession": 16.67
}
```

---

### GET /api/admin/analytics/sessions

Lista todas as sessoes com paginacao.

**Auth**: Bearer token
**Roles**: `admin`

**Query Params**:
- `limit`: Limite de registros (default: 50)
- `offset`: Offset para paginacao (default: 0)

**Response** (200):
```json
{
  "sessions": [
    {
      "id": "uuid",
      "userId": "user-id",
      "userName": "Joao Silva",
      "userRole": "enfermagem",
      "startedAt": "2026-01-22T08:00:00Z",
      "endedAt": "2026-01-22T16:00:00Z",
      "isActive": false
    }
  ],
  "total": 150
}
```

---

### GET /api/admin/analytics/top-pages

Retorna ranking das paginas mais visitadas.

**Auth**: Bearer token
**Roles**: `admin`

**Query Params**:
- `days`: Periodo em dias (default: 30)
- `limit`: Limite de resultados (default: 10)

**Response** (200):
```json
{
  "pages": [
    { "pagePath": "/shift-handover/22", "pageTitle": "Enfermaria 22", "count": 500 },
    { "pagePath": "/shift-handover/23", "pageTitle": "Enfermaria 23", "count": 450 }
  ]
}
```

---

### GET /api/admin/analytics/top-actions

Retorna ranking das acoes mais realizadas.

**Auth**: Bearer token
**Roles**: `admin`

**Query Params**:
- `days`: Periodo em dias (default: 30)
- `limit`: Limite de resultados (default: 10)

**Response** (200):
```json
{
  "actions": [
    { "eventName": "patient_note_create", "count": 200 },
    { "eventName": "ai_analysis_request", "count": 150 }
  ]
}
```

---

### GET /api/admin/analytics/users/:userId

Retorna estatisticas de uso de um usuario especifico.

**Auth**: Bearer token
**Roles**: `admin`

**Query Params**:
- `days`: Periodo em dias (default: 30)

**Response** (200):
```json
{
  "userId": "user-id",
  "userName": "Joao Silva",
  "totalSessions": 25,
  "totalPageViews": 400,
  "totalActions": 120,
  "lastActivity": "2026-01-22T16:00:00Z"
}
```

---

### GET /api/admin/analytics/events

Lista eventos de analytics com filtros.

**Auth**: Bearer token
**Roles**: `admin`

**Query Params**:
- `sessionId`: Filtrar por sessao
- `userId`: Filtrar por usuario
- `eventType`: Filtrar por tipo (page_view, action)
- `limit`: Limite de registros (default: 100)
- `offset`: Offset para paginacao (default: 0)

**Response** (200):
```json
{
  "events": [
    {
      "id": "uuid",
      "sessionId": "session-uuid",
      "eventType": "page_view",
      "eventName": "shift_handover_view",
      "pagePath": "/shift-handover/22",
      "createdAt": "2026-01-22T12:00:00Z"
    }
  ],
  "total": 2500
}
```

---

## Sync & IA

### POST /api/sync/patient/:id

Sincroniza análise de IA para um paciente.

**Auth**: Bearer token
**Roles**: `admin`, `enfermagem`

**Body** (opcional):
```json
{
  "forceRefresh": true
}
```

**Response** (200):
```json
{
  "success": true,
  "patient": {
    "id": 1,
    "clinicalInsights": {
      "riskLevel": "medium",
      "risks": {
        "quedas": "medium",
        "lesaoPressao": "high",
        "infeccao": "low"
      },
      "sbarAnalysis": {
        "situation": "Paciente de 65 anos...",
        "background": "...",
        "assessment": "...",
        "recommendation": "..."
      },
      "recommendations": [
        "Monitorar lesão sacral",
        "Atenção à mobilização"
      ]
    }
  },
  "cached": false,
  "cost": 0.03
}
```

---

### POST /api/sync/batch

Sincroniza análises para múltiplos pacientes.

**Auth**: Bearer token
**Roles**: `admin`, `enfermagem`

**Body**:
```json
{
  "patientIds": [1, 2, 3],
  "forceRefresh": false
}
```

**Response** (200):
```json
{
  "success": true,
  "results": [
    {
      "patientId": 1,
      "success": true,
      "cached": true,
      "cost": 0
    },
    {
      "patientId": 2,
      "success": true,
      "cached": false,
      "cost": 0.03
    }
  ],
  "totalCost": 0.03,
  "cacheSavings": 0.03
}
```

---

### GET /api/sync/status

Retorna status do sistema de sincronização.

**Auth**: Bearer token
**Roles**: `admin`, `enfermagem`

**Response** (200):
```json
{
  "autoSyncEnabled": true,
  "lastSync": "2026-01-15T10:00:00Z",
  "nextSync": "2026-01-15T11:00:00Z",
  "cron": "0 * * * *",
  "stats": {
    "totalSyncs": 150,
    "cacheHitRate": 0.85,
    "averageCost": 0.02,
    "totalSavings": 15.50
  }
}
```

---

### GET /api/sync-gpt4o/detailed-status

Retorna status detalhado do último sync com estatísticas de alterações.

**Auth**: Bearer token
**Roles**: `admin`, `enfermagem`

**Response** (200):
```json
{
  "lastSync": "2026-01-22T10:00:00Z",
  "isRunning": false,
  "lastSyncStats": {
    "totalRecords": 35,
    "newRecords": 2,
    "changedRecords": 5,
    "unchangedRecords": 25,
    "removedRecords": 3,
    "reactivatedRecords": 1
  },
  "sanityValidation": {
    "minAbsoluteRecords": 5,
    "minRecordRatio": 0.5,
    "lastValidSync": {
      "timestamp": "2026-01-22T09:00:00Z",
      "totalRecords": 35
    }
  }
}
```

**Uso**: Chamado pelo frontend após sync para exibir resumo das alterações (novos, atualizados, arquivados, reativados).

---

## Webhooks

### POST /webhook/evolucoes

Webhook N8N para importação de evoluções de pacientes.

**Auth**: Header `x-n8n-secret`
**Roles**: N/A (webhook externo)

**Headers**:
```
x-n8n-secret: your-webhook-secret
Content-Type: application/json
```

**Body**:
```json
{
  "leito": "101A",
  "nome": "João Silva",
  "registro": "12345",
  "idade": 65,
  "dataNascimento": "15/01/1961",
  "diagnostico": "Pneumonia",
  "alergias": "Penicilina",
  "unidadeInternacao": "UTI Adulto",
  "dsEvolucaoCompleta": "Evolução completa do paciente..."
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Evolução importada com sucesso",
  "patientsProcessed": 1
}
```

**Errors**:
- `401` - Invalid or missing x-n8n-secret
- `403` - IP not allowed (if N8N_ALLOWED_IPS configured)
- `400` - Validation error

**Documentação**: Ver `docs/N8N_WEBHOOK_SPECIFICATION.md`

---

### POST /webhook/unidades-internacao

Webhook N8N para sincronização de unidades.

**Auth**: Header `x-n8n-secret`

**Body**:
```json
[
  {
    "codigo": "UTI-01",
    "nome": "UTI Adulto",
    "localizacao": "2º Andar",
    "ramal": "2001",
    "ativa": true
  }
]
```

**Response** (200):
```json
{
  "success": true,
  "message": "Unidades sincronizadas",
  "changes": [
    {
      "type": "update",
      "unitId": 1,
      "status": "pending"
    }
  ]
}
```

---

## 📊 Códigos de Status

### Sucesso

| Código | Significado | Uso |
|--------|-------------|-----|
| `200` | OK | Request bem-sucedido |
| `201` | Created | Recurso criado |
| `204` | No Content | Sucesso sem body |

### Cliente

| Código | Significado | Uso |
|--------|-------------|-----|
| `400` | Bad Request | Validação falhou |
| `401` | Unauthorized | Token inválido/ausente |
| `403` | Forbidden | Sem permissão (role) |
| `404` | Not Found | Recurso não encontrado |
| `409` | Conflict | Conflito (ex: username duplicado) |
| `422` | Unprocessable Entity | Validação semântica falhou |
| `429` | Too Many Requests | Rate limit excedido |

### Servidor

| Código | Significado | Uso |
|--------|-------------|-----|
| `500` | Internal Server Error | Erro não tratado |
| `503` | Service Unavailable | Serviço temporariamente indisponível |

---

## 🚦 Rate Limiting

### Limites Gerais

```
Janela: 15 minutos
Máximo: 100 requests por IP
```

### Limites Específicos

#### Login (Brute Force Protection)

```
Janela: 15 minutos
Máximo: 5 tentativas de login
```

### Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642252800
```

### Response (429)

```json
{
  "error": {
    "message": "Muitas requisições. Tente novamente em 15 minutos.",
    "status": 429,
    "retryAfter": 900
  }
}
```

---

## 🌐 CORS

### Origem Permitida

```
Origin: https://your-domain.com
```

### Credenciais

```
Access-Control-Allow-Credentials: true
```

### Métodos

```
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
```

### Headers

```
Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token
```

---

## 📄 Paginação

**Atualmente**: Não implementada (retorna todos resultados)

**Roadmap** (futuro):

```http
GET /api/patients?page=1&limit=20
```

**Response**:
```json
{
  "patients": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## ❌ Erros

### Formato de Erro

```json
{
  "error": {
    "message": "Descrição do erro em português",
    "status": 400,
    "code": "VALIDATION_ERROR",
    "details": [
      {
        "field": "nome",
        "message": "Nome é obrigatório"
      }
    ]
  }
}
```

### Tipos de Erro

#### Validação (400)

```json
{
  "error": {
    "message": "Erro de validação",
    "status": 400,
    "code": "VALIDATION_ERROR",
    "details": [
      {
        "field": "password",
        "message": "Senha deve ter pelo menos 8 caracteres"
      }
    ]
  }
}
```

#### Autenticação (401)

```json
{
  "error": {
    "message": "Token inválido ou expirado",
    "status": 401,
    "code": "INVALID_TOKEN"
  }
}
```

#### Autorização (403)

```json
{
  "error": {
    "message": "Acesso negado",
    "status": 403,
    "code": "FORBIDDEN"
  }
}
```

#### Not Found (404)

```json
{
  "error": {
    "message": "Paciente não encontrado",
    "status": 404,
    "code": "NOT_FOUND"
  }
}
```

#### Conflict (409)

```json
{
  "error": {
    "message": "Username já existe",
    "status": 409,
    "code": "DUPLICATE_USERNAME"
  }
}
```

#### Servidor (500)

```json
{
  "error": {
    "message": "Erro interno do servidor",
    "status": 500,
    "code": "INTERNAL_ERROR"
  }
}
```

---

## 🔧 Exemplos de Uso

### cURL

```bash
# Login
curl -X POST https://api.11care.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  -c cookies.txt

# Get patients (com token)
curl -X GET https://api.11care.com/api/patients \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-CSRF-Token: YOUR_CSRF_TOKEN" \
  -b cookies.txt
```

### JavaScript (fetch)

```javascript
// Login
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  credentials: 'include', // Importante para cookies
});

const { accessToken } = await response.json();

// Get patients
const patientsResponse = await fetch('/api/patients', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'X-CSRF-Token': csrfToken,
  },
  credentials: 'include',
});

const { patients } = await patientsResponse.json();
```

### TypeScript (axios)

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// Interceptor para adicionar token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Login
const { data } = await api.post('/auth/login', {
  username: 'admin',
  password: 'admin123',
});

localStorage.setItem('accessToken', data.accessToken);

// Get patients
const { data: patientsData } = await api.get('/patients');
console.log(patientsData.patients);
```

---

## 📚 Recursos Adicionais

- **N8N Webhook Spec**: `docs/N8N_WEBHOOK_SPECIFICATION.md`
- **Segurança**: `SECURITY.md`
- **Arquitetura**: `ARCHITECTURE.md`
- **IA Integration**: `AI_INTEGRATION.md`

---

**Última atualização**: 2026-01-15

**Versão da API**: v1.0.0

**Contato**: api-support@11care.com
