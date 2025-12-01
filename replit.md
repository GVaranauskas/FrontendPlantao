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
    - **User**: Authentication and role-based access with role field (admin, enfermeiro, visualizador).
    - **Patient**: Comprehensive 18-column data (leito, nome, mobilidade, etc.) plus 9 extended N8N-specific fields (idEvolucao, dsEnfermaria, dsEspecialidade, etc.). Includes alert status.
    - **ImportHistory**: Records details of import events with timestamps and statistics.
    - **NursingUnitTemplate**: Defines customizable nursing unit templates with field configuration and special rules.
- **API Endpoints**:
    - Standard CRUD operations for patients and alerts (`/api/patients`, `/api/alerts`).
    - N8N integration endpoints: `GET /api/enfermarias`, `POST /api/import/evolucoes`, `GET /api/import/status`, `GET /api/import/history`, `GET /api/import/stats`, `DELETE /api/import/cleanup`.
    - Template management endpoints: `GET /api/templates`, `GET /api/templates/:id`, `POST /api/templates`, `PATCH /api/templates/:id`, `DELETE /api/templates/:id`.
    - Authentication endpoints: `POST /api/auth/login`, `POST /api/auth/logout`, `POST /api/auth/refresh`, `GET /api/auth/me`.
    - Real-time WebSocket at `/ws/import` for import event notifications.
    - CSRF token endpoint: `GET /api/csrf-token`.
- **N8N Integration Service**: Dedicated service for fetching, processing, validating, and storing patient evolution data from the N8N API. Features automatic field mapping, data extraction (patient name, registration, care codes), date formatting, mobility normalization, and storage of raw N8N JSON for audit trails.
- **Periodic Sync Scheduler**: Cron-based automation (node-cron) for automatic patient data synchronization at predefined intervals (e.g., 10A at top of hour, 10B at 30 minutes). Records history and statistics automatically.
- **Global Error Handling**: Structured JSON logging (production) and human-readable logs (development), middleware catches all errors without crashing server, automatic logging of request context and errors.

## External Dependencies

- **Database**: Drizzle ORM for PostgreSQL, @neondatabase/serverless for connectivity, automatic fallback to MemStorage.
- **UI & Styling**: Radix UI, Tailwind CSS, PostCSS, class-variance-authority, Lucide React (iconography).
- **Form & Validation**: React Hook Form, Zod, @hookform/resolvers, drizzle-zod.
- **Data Format**: @toon-format/toon for TOON encoding/decoding, offering compact, human-readable data transmission compatible with JSON data models.
- **Security**: jsonwebtoken (JWT), bcryptjs (password hashing), csurf (CSRF protection), cookie-parser (cookie handling).
- **Utilities**: date-fns, clsx, tailwind-merge, nanoid.
- **Development Tools**: tsx, esbuild, Replit-specific plugins (dev banners, cartographer, error overlays).
- **External API**: N8N API (`https://n8n-dev.iamspe.sp.gov.br/webhook/evolucoes`) for patient evolution data.

## Recent Implementations

### 1. Nursing Unit Templates System
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
- Created `/analytics` page for comprehensive visual data analysis
- Stats cards: Total Patients, Complete Records, Pending Records, Overall Completion %
- Visual charts: Specialty distribution (pie chart), Mobility distribution (bar chart)
- Interactive patient table with search, filtering, sorting
- Field-by-field completion analysis with progress bars
- JSON export functionality

### 4. FASE 1 - Security Implementation (COMPLETED)
**Implemented Nov 27, 2025**

**Infrastructure Added:**
- JWT authentication system with access/refresh tokens
- Role-based access control (RBAC) with 3 roles: admin, enfermeiro, visualizador
- CSRF protection using csurf middleware
- Secure cookie handling (HttpOnly, Secure, SameSite=strict)
- N8N webhook validation (signature verification, IP allowlist)
- Optional authentication middleware for public endpoints

**New Files Created:**
- `server/security/jwt.ts` - JWT token generation and verification
- `server/security/n8n-validation.ts` - N8N webhook validation and IP whitelisting
- `server/middleware/auth.ts` - JWT authentication middleware
- `server/middleware/rbac.ts` - Role-based access control with permission system
- `server/middleware/csrf.ts` - CSRF protection setup and token endpoints
- `server/middleware/cookies.ts` - Secure cookie utilities
- `server/middleware/n8n-validation.ts` - N8N request validation
- `server/routes/auth.ts` - Authentication routes (login, logout, refresh, me)

**Dependencies Installed:**
- jsonwebtoken (JWT handling)
- bcryptjs (password hashing)
- csurf (CSRF protection)
- cookie-parser (cookie parsing)
- @types/jsonwebtoken, @types/csurf, @types/bcryptjs (TypeScript definitions)

**Features:**
- Secure user authentication with JWT
- Token refresh mechanism (24h access, 7d refresh)
- Role hierarchy system (admin > enfermeiro > visualizador)
- Permission-based endpoint access
- Protected N8N webhook endpoints
- CSRF token endpoint for frontend protection
- Secure session cookies

**Production Readiness:**
- HTTPS/TLS: Replit auto-configures for deployed apps
- Environment secrets: Using Replit Secrets manager
- Error handling: Integrated with global error handler
- Logging: Structured JSON logging for security events

### 5. Enhanced Import Logs System (COMPLETED)
**Implemented Nov 27, 2025**

**New Features:**
- Consolidated statistics dashboard with 6 stat cards (total, 24h, 7d, importados, erros, taxa sucesso)
- Statistics by enfermaria section showing per-unit metrics
- Log retention management with cleanup functionality (DELETE /api/import/cleanup?days=30)
- Validation: days parameter bounded to 7-365 range with default of 30
- Enhanced stats endpoint (GET /api/import/stats) returning:
  - total, last24h, last7d counts
  - totalImportados, totalErros (patient counts)
  - runsComSucesso, runsComErro (run counts for success rate)
  - avgDuracao (average import duration)
  - byEnfermaria breakdown
- Timestamps displayed in Brazil timezone (America/Sao_Paulo, UTC-3)
- Duration column showing import time in milliseconds

**New Storage Methods:**
- `deleteOldImportHistory(daysToKeep)` - Removes logs older than specified days
- `getImportStats()` - Returns consolidated statistics

**New API Endpoints:**
- `GET /api/import/stats` - Consolidated import statistics
- `DELETE /api/import/cleanup?days=30` - Clean old logs with retention policy

### 6. Templates Enfermaria Binding (COMPLETED)
**Implemented Nov 27, 2025**

- Added mandatory `enfermariaCodigo` field to nursingUnitTemplates table
- Templates now require nursing unit selection to avoid "desamarrados" (unbound) templates
- UI dropdown populated from /api/enfermarias endpoint
- Database migrated via npm run db:push --force

### 7. Print Functionality for Shift Handover (COMPLETED)
**Implemented Dec 01, 2025**

**Features:**
- Full-page print capability for SBAR shift handover reports
- Landscape A4 format optimization with 0.3cm margins
- Automatic hiding of non-essential UI elements (header, buttons, stats cards, search)
- Ultra-compact table styling for printing (7px font, minimal padding)
- Complete 18-column patient table fits entire page horizontally
- Responsive table column widths auto-adjust for landscape printing
- Color-coded row highlighting preserved (alert rows, critical rows)
- LEITO column emphasized with light blue background (#e8f0ff)
- Print-friendly color scheme with black text on white background
- Page break management to keep table rows and headers intact

**Implementation:**
- Added `onClick={() => window.print()}` handler to Print button
- Comprehensive `@media print` CSS rules in client/src/index.css
- Page setup defined as A4 landscape with minimal margins
- All table styling optimized for narrow columns and small fonts
- Print styles hide stats dashboard, search input, and all interactive buttons

**Print Workflow:**
1. User clicks "Imprimir" button in shift handover page
2. Browser print dialog opens (Ctrl+P or CMD+P)
3. User selects "Landscape" orientation if needed (usually pre-selected)
4. User chooses "Print to PDF" or printer
5. Complete 18-column table renders on single page in landscape A4 format

## Next Steps - Fase 2 (Pipeline Resilience)

1. Implement job queue system (Bull/BullMQ) for background import processing
2. Add idempotent upserts with composite keys (enfermaria, leito, evolucaoId)
3. Implement retry logic with exponential backoff
4. Add circuit breaker for N8N API failures
5. Setup Redis cache layer for frequently accessed data
6. Add database indices on performance-critical columns

## Next Steps - Fase 3 (Infrastructure)

1. Docker containerization
2. CI/CD pipeline (GitHub Actions)
3. Kubernetes/ECS deployment
4. Prometheus + Grafana monitoring
5. ELK Stack centralized logging
6. Blue-green deployment strategy
