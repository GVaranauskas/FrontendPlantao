# 11Care Nursing Platform

## Overview

The 11Care Nursing Platform is a healthcare management system for nursing staff in hospitals. Its primary purpose is to streamline shift handover processes using the SBAR methodology, with future expansion planned for work schedule and bed management. The platform aims to provide a professional and accessible interface, adhering to established healthcare software design patterns and the official 11Care brand identity. Key capabilities include integration with external data sources like N8N for patient evolution data and real-time synchronization.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, Vite, Wouter for routing.
- **UI/UX**: shadcn/ui (New York style), Radix UI primitives, Tailwind CSS. Custom 11Care brand design system with specific color palette, CSS variable-based theming, 4px-based spacing, and gradient elements.
- **State Management**: TanStack Query for server state, React Hook Form with Zod for form handling.
- **Key Features**: Login, module selection dashboard, SBAR shift handover page with 18-column patient table, sticky LEITO column, mobility legend, patient search, statistics dashboard, color-coded patient rows, alert system panel, mobile responsiveness, dedicated `/import` page for manual data import, `/dashboard` for import history, real-time API status indicator, automatic patient table refresh, and auto-sync for patient data. Print functionality for shift handover reports, optimized for A4 landscape. Centralized admin menu. Nursing units management with external API sync, change detection, and admin approval workflow (`/admin/nursing-units`).

### Backend Architecture
- **Server**: Express.js with TypeScript on Node.js (ESM).
- **API Design**: RESTful API supporting JSON and TOON formats. Custom middleware for logging and JSON parsing.
- **Storage**: PostgreSQL with Drizzle ORM, with automatic fallback to MemStorage.
- **Development**: Vite middleware integration, Replit-specific plugins, separate static file serving.
- **Data Models**: User (authentication, role-based access), Patient (14 normalized N8N fields: braden, diagnostico, alergias, mobilidade, dieta, eliminacoes, dispositivos, atb, curativos, aporteSaturacao, exames, cirurgia, observacoes, previsaoAlta), ImportHistory, NursingUnitTemplate, NursingUnit, NursingUnitChange.
- **API Endpoints**: Standard CRUD for patients and alerts. N8N sync endpoint (`/api/sync/evolucoes`). Template management. Authentication (`/api/auth/*`). WebSocket (`/ws/import`). User management (`/api/users/*`).
- **N8N Integration Service**: Simple direct mapping from N8N webhook response to patient fields. No complex extraction - fields are mapped 1:1 as returned by N8N. **PRODUÇÃO**: Apenas unidades 22,23 (enfermarias 10A01-10A20).
- **Auto Sync Scheduler GPT-4o**: Cron-based automation (cada 15 minutos) com sistema de economia de custos em 4 camadas:
  1. Change Detection (85-90% economia) - processa apenas dados alterados
  2. Intelligent Cache (60-80% economia) - cache com TTL dinâmico
  3. GPT-4o-mini (50% economia) - modelo otimizado para custo
  4. Auto Sync 15min (95%+ economia) - sincronização automática
- **Validação de Enfermaria**: Camada de segurança no storage que BLOQUEIA qualquer paciente de enfermarias não-10A*.
- **Global Error Handling**: Structured JSON logging (production) and human-readable logs (development), middleware for error catching, automatic logging of request context.
- **Security**: 
  - **Authentication**: JWT authentication (access/refresh tokens) applied to ALL API endpoints
  - **Authorization**: Role-Based Access Control (admin, enfermeiro, visualizador) with `requireRole()` middleware
  - **Input Validation**: Detection-only middleware (`server/middleware/input-validation.ts`) with:
    - SQL injection detection (55+ patterns) - blocks requests but preserves data types for Zod validation
    - UUID parameter validation for all `:id` routes
    - Format validation for leito, enfermaria, unitIds parameters
    - Query parameter validation (numeric ranges)
    - WebSocket JWT authentication for /ws/import endpoint
  - **Route Protection Status**: 100% of data-modifying routes protected
    - All GET endpoints require `authMiddleware`
    - All DELETE endpoints require `requireRole('admin')`
    - All POST/PATCH endpoints require `authMiddleware` or `requireRole()`
  - **Additional**: CSRF protection, secure cookie handling, N8N webhook validation, AES-256-GCM data encryption

## External Dependencies

- **Database**: Drizzle ORM for PostgreSQL, @neondatabase/serverless.
- **UI & Styling**: Radix UI, Tailwind CSS, PostCSS, class-variance-authority, Lucide React (iconography).
- **Form & Validation**: React Hook Form, Zod, @hookform/resolvers, drizzle-zod.
- **Data Format**: @toon-format/toon for TOON encoding/decoding.
- **Security**: jsonwebtoken (JWT), bcryptjs (password hashing), csurf (CSRF protection), cookie-parser (cookie handling).
- **Utilities**: date-fns, clsx, tailwind-merge, nanoid.
- **External API**: N8N API for patient evolution data (`https://dev-n8n.7care.com.br/webhook/evolucoes`) and nursing units (`https://dev-n8n.7care.com.br/webhook/unidades-internacao`).
- **AI Integration**: Claude Haiku 3.5 (primary) with OpenAI GPT-4o-mini (fallback) para análise IA sob demanda. Serviço unificado em `server/services/ai-service.ts`. Para sincronização automática, usa GPT-4o-mini via `server/services/ai-service-gpt4o-mini.ts`.
- **Scheduled Tasks**: Daily automatic sync of nursing units (06:00 AM) with change detection and admin approval workflow.

## OpenAI Integration

### Configuration
- **API Key**: Stored as secret `OPENAI_API_KEY`
- **Model**: `gpt-4o-mini` (configured via env var `OPENAI_MODEL`)
- **Service**: `server/services/ai-service.ts` (análise sob demanda) e `server/services/ai-service-gpt4o-mini.ts` (auto-sync)

### API Endpoints
- `POST /api/ai/analyze-patient/:id` - Analisa dados de um paciente específico
- `POST /api/ai/analyze-patients` - Analisa todos os pacientes e gera resumo
- `POST /api/ai/care-recommendations/:id` - Gera recomendações de cuidados
- `POST /api/ai/clinical-analysis/:id` - Análise clínica individual para passagem de plantão
- `POST /api/ai/clinical-analysis-batch` - Análise clínica em lote de todos os pacientes

### Response Format (analyze-patient)
```json
{
  "resumo": "Resumo clínico do paciente",
  "alertas": ["Lista de alertas"],
  "recomendacoes": ["Lista de recomendações"],
  "riscos": ["Lista de riscos"],
  "prioridade": "baixa|media|alta|critica"
}
```

### Clinical Analysis (clinical-analysis-batch)
A análise clínica em lote processa todos os pacientes e retorna uma estrutura rica com:

#### Análise Individual por Paciente
- **nivel_alerta**: VERMELHO (crítico), AMARELO (moderado), VERDE (ok)
- **score_qualidade**: 0-100% indicando completude da documentação
- **principais_alertas**: Lista de alertas identificados pela IA
- **gaps_criticos**: Campos de documentação ausentes
- **recomendacoes_enfermagem**: Recomendações específicas por paciente

#### Análise Geral do Plantão (`analiseGeral`)
A resposta inclui uma análise consolidada (`AnaliseGeralMelhorada`) com:

1. **leitos_detalhados**: Informações completas por leito:
   - Diagnóstico principal e tipo de enfermidade (Respiratória, Cardiovascular, Neurológica, etc.)
   - Dias de internação, score Braden, mobilidade
   - Riscos identificados com níveis (ALTO, MODERADO, BAIXO)
   - Protocolos ativos com frequência de execução
   - Dispositivos e antibióticos em uso
   - Gaps de documentação específicos

2. **protocolos_enfermagem**: Protocolos consolidados por categoria:
   - Prevenção de Quedas, Lesão por Pressão, Infecção, Broncoaspiração, Nutricional, Respiratório
   - Ícones e cores para visualização rápida
   - Leitos afetados e ações principais

3. **indicadores**: Métricas avançadas do plantão:
   - Total de pacientes e média Braden
   - Média de dias de internação
   - Taxa de completude documental
   - Pacientes de alta complexidade, com dispositivos, em ATB
   - Pacientes acamados, com risco de queda alto, risco de lesão por pressão

4. **classificacao_por_problema**: Leitos agrupados por tipo de risco:
   - risco_queda, risco_lesao_pressao, risco_infeccao
   - risco_broncoaspiracao, risco_nutricional, risco_respiratorio

5. **alertas_criticos_enfermagem**: Alertas prioritários consolidados

6. **recomendacoes_gerais_plantao**: Recomendações gerais para a equipe

Resultados são armazenados no campo `clinicalInsights` (JSONB) de cada paciente e exibidos como badges coloridos na tabela de passagem de plantão. O painel lateral de análise IA mostra todos os dados detalhados com cards por protocolo, indicadores visuais e informações expandidas por leito.