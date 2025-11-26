# 11Care Nursing Platform

## Overview

The 11Care Nursing Platform is a healthcare management system for nursing staff in hospitals, focusing on shift handover processes using the SBAR methodology. It aims to expand into work schedule and bed management. The platform features a professional, accessible interface adhering to established healthcare software design patterns and the official 11Care brand identity. It integrates with external data sources like N8N for patient evolution data and offers real-time synchronization capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

- **Framework**: React 18 with TypeScript, Vite for build/dev server, Wouter for routing.
- **UI/UX**: shadcn/ui (New York style) with Radix UI primitives, Tailwind CSS for styling, custom 11Care brand design system with specific color palette (e.g., #0056b3 primary blue). Key design decisions include component aliasing, CSS variable-based theming, 4px-based spacing, and gradient buttons/card layouts.
- **State Management**: TanStack Query (React Query) for server state, React Hook Form with Zod for form handling and validation.
- **Application Features**:
    - Login page with 11Care branding.
    - Module selection dashboard.
    - Shift handover page (SBAR) with an 18-column patient table, sticky LEITO column, mobility legend, patient search, statistics dashboard (complete/pending/alert/critical/total patients), and color-coded patient rows based on alert status.
    - Alert system panel with priority-based notifications.
    - Mobile-responsive design.
    - Dedicated `/import` page for manual data import and `/dashboard` for import history and statistics.
    - Real-time API status indicator.
    - Automatic patient table refresh after import via cache invalidation.
    - Auto-sync feature for patient data with configurable intervals, page visibility detection, and a discrete visual indicator.

### Backend Architecture

- **Server**: Express.js with TypeScript on Node.js (ESM).
- **API Design**: RESTful API supporting both JSON and TOON (Token-Oriented Object Notation) formats for compact data transmission. Custom middleware for logging and JSON parsing. Error handling with standard HTTP status codes.
- **Storage**: PostgreSQL with Drizzle ORM for data persistence, with automatic fallback to MemStorage if DATABASE_URL not set.
- **Development**: Vite middleware integration, Replit-specific plugins, separate static file serving for production.
- **Data Models**:
    - **User**: Authentication and role-based access.
    - **Patient**: Comprehensive 18-column data (leito, nome, mobilidade, etc.) plus 9 extended N8N-specific fields (idEvolucao, dsEnfermaria, dsEspecialidade, etc.). Includes alert status.
    - **ImportHistory**: Records details of import events with timestamps and statistics.
    - **NursingUnitTemplate**: Defines customizable nursing unit templates with field configuration and special rules (new).
- **API Endpoints**:
    - Standard CRUD operations for patients and alerts (`/api/patients`, `/api/alerts`).
    - N8N integration endpoints: `GET /api/enfermarias`, `POST /api/import/evolucoes`, `GET /api/import/status`, `GET /api/import/history`.
    - Template management endpoints: `GET /api/templates`, `GET /api/templates/:id`, `POST /api/templates`, `PATCH /api/templates/:id`, `DELETE /api/templates/:id` (new).
    - Real-time WebSocket at `/ws/import` for import event notifications.
- **N8N Integration Service**: Dedicated service for fetching, processing, validating, and storing patient evolution data from the N8N API. Features automatic field mapping (e.g., `ds_especialidade` to `especialidadeRamal`), data extraction (patient name, registration, care codes), date formatting, mobility normalization, and storage of raw N8N JSON for audit trails.
- **Periodic Sync Scheduler**: Cron-based automation (node-cron) for automatic patient data synchronization at predefined intervals (e.g., 10A at top of hour, 10B at 30 minutes). Records history and statistics automatically.
- **Global Error Handling**: Structured JSON logging (production) and human-readable logs (development), middleware catches all errors without crashing server, automatic logging of request context and errors.

## External Dependencies

- **Database**: Drizzle ORM for PostgreSQL, @neondatabase/serverless for connectivity, automatic fallback to MemStorage.
- **UI & Styling**: Radix UI, Tailwind CSS, PostCSS, class-variance-authority, Lucide React (iconography).
- **Form & Validation**: React Hook Form, Zod, @hookform/resolvers, drizzle-zod.
- **Data Format**: @toon-format/toon for TOON encoding/decoding, offering compact, human-readable data transmission compatible with JSON data models.
- **Utilities**: date-fns, clsx, tailwind-merge, nanoid.
- **Development Tools**: tsx, esbuild, Replit-specific plugins (dev banners, cartographer, error overlays).
- **External API**: N8N API (`https://n8n-dev.iamspe.sp.gov.br/webhook/evolucoes`) for patient evolution data.

## Recent Implementations

### 1. Nursing Unit Templates System (In Progress)
- Created `nursingUnitTemplates` table in PostgreSQL with fields for name, description, fieldsConfiguration (JSON), specialRules (JSON), isActive flag, and createdAt timestamp
- Implemented storage interface methods for full CRUD operations
- Added backend API endpoints for template management (`/api/templates/*`)
- Schema and types fully defined with Zod validation
- Database schema pushed via `npm run db:push`

### 2. Global Error Handling System
- Structured logging with JSON format for production, human-readable for development
- Middleware catches all errors without crashing server
- Custom `asyncHandler` wrapper for async route handlers
- AppError class for consistent error responses with context

### 3. Analytics Dashboard
**Created**: `/analytics` page for comprehensive visual data analysis

**Features**:
- 📊 **Top Stats Cards**: 
  - Total de Pacientes
  - Registros Completos
  - Registros Pendentes
  - % Preenchimento Geral

- 🥧 **Gráficos Visuais**:
  - Pizza chart: Distribuição de especialidades
  - Bar chart: Distribuição de mobilidade

- 📈 **Análise de Preenchimento por Campo**:
  - 14 campos principais analisados
  - Barra de progresso visual com %
  - Quantidade preenchida vs vazia

- 🔍 **Tabela Interativa de Pacientes**:
  - Buscar por: leito, nome, especialidade
  - Filtrar por: status (completo/pendente)
  - Ordenar por: leito, nome, especialidade
  - Mostrar % de campos preenchidos por paciente

- 📥 **Exportar Análise**: Baixar JSON completo com dados e estatísticas
- 🧹 **Limpar Filtros**: Reset rápido da busca

**URL**: `http://localhost:5000/analytics`

## Next Steps

1. Build admin UI for template management page (`/admin/templates`)
2. Integrate templates into patient import and display logic
3. Create frontend components to manage custom fields per nursing unit
4. Add template selection in handover page
5. Test end-to-end template workflow with actual data
