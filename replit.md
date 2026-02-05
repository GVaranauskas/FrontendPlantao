# 11Care Nursing Platform

## Overview

The 11Care Nursing Platform is a healthcare management system designed for hospital nursing staff. Its main goal is to optimize shift handover processes using the SBAR methodology, with future plans to incorporate work schedule and bed management functionalities. The platform aims to offer a professional, user-friendly interface that aligns with established healthcare software design patterns and the official 11Care brand. Key capabilities include integration with external data sources like N8N for patient evolution data and real-time synchronization. The platform includes AI-powered clinical analysis and recommendations to improve patient care and documentation.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, Vite, Wouter for routing.
- **UI/UX**: shadcn/ui (New York style), Radix UI primitives, Tailwind CSS, custom 11Care brand design system with specific color palette, theming, and spacing.
- **State Management**: TanStack Query for server state (staleTime: Infinity with refetchQueries for immediate updates), React Hook Form with Zod for form handling. Manual sync uses syncId-based polling (2s intervals, max 60s) to track exact sync status before refreshing data.
- **Services Layer**: Centralized API abstraction using `ApiService` with generic CRUD methods and specific services for patients, users, templates, and nursing units.
- **Type Organization**: AI/clinical analysis types centralized to prevent circular dependencies.
- **Key Features**: Login with mandatory first-access password change, module selection dashboard, SBAR shift handover with optimized patient table (hidden ENFERMARIA and DATA DE NASCIMENTO columns, birth date integrated into NOME/REGISTRO/IDADE), real-time API status, automatic patient data refresh and auto-sync, print functionality for handover reports, centralized admin menu for nursing unit management with approval workflows, patient history viewing for archived patients (alta, transfers, deaths), usage analytics dashboard for UX/Customer Success analysis, interactive table filtering by patient status (Critical, Pending filters with clickable stat cards), and Specialty/Branch filter dropdown for dynamic patient filtering.
- **Usage Analytics**: Automatic tracking of user sessions, page views, and actions via `useAnalytics` hook with event batching (max 20 events or 5 seconds), session heartbeats (1 min intervals), and cleanup on unmount/beforeunload.

### Backend Architecture
- **Server**: Express.js with TypeScript on Node.js (ESM).
- **API Design**: RESTful API supporting JSON and TOON formats with custom middleware for logging and parsing.
- **Storage**: PostgreSQL with Drizzle ORM, with automatic fallback to MemStorage.
- **Data Models**: User, Patient (with 14 normalized N8N fields), ImportHistory, NursingUnitTemplate, NursingUnit, NursingUnitChange, PatientNoteEvent (audit trail), UserNotification, UserSession, AnalyticsEvent.
- **Comprehensive Audit System (v1.5.9)**: Full audit trail using AuditService for all critical operations:
  - **Patient Notes**: CREATE, UPDATE, DELETE events with AES-256-GCM encrypted previous/new values, performer/target user tracking, IP address, and deletion reasons.
  - **Patient Lifecycle**: PATIENT_ARCHIVED, PATIENT_REACTIVATED, BED_CONFLICT events logged during N8N sync and bed conflict resolution.
  - **Shift Handover**: SHIFT_HANDOVER_VIEW and SHIFT_HANDOVER_PRINT events with authenticated user context, nursing unit, and patient count.
  - **Sync Operations**: SYNC_STARTED and SYNC_COMPLETED events for N8N synchronization tracking.
  - Admin-only note deletion with automatic notification to original author.
- **API Endpoints**: Standard CRUD for patients and alerts, N8N sync, template management, authentication, user management, WebSocket for import, and analytics (events, sessions, metrics).
- **Usage Analytics System**: Session-based tracking with 10 REST endpoints: POST /api/analytics/events (single), POST /api/analytics/events/batch, POST /api/analytics/sessions, POST /api/analytics/sessions/:id/end, POST /api/analytics/sessions/:id/heartbeat, GET /api/admin/analytics/* (metrics, sessions, top-pages, top-actions, users/:userId, events). Admin-only endpoints protected by RBAC.
- **N8N Integration Service**: Direct 1:1 mapping from N8N webhook responses to patient fields.
- **Auto Sync Scheduler**: Cron-based automation (default 1 hour) with a 4-layer cost-saving system: change detection, intelligent cache, GPT-4o-mini, and hourly auto-sync. Includes validation to block patients from non-approved wards. Deterministic archiving (immediate when patient not in N8N) with sanity validation (N8N_MIN_RECORD_RATIO=0.5, MIN_ABSOLUTE_RECORDS=5) to prevent mass archiving from incomplete N8N responses.
- **Automatic Patient Reactivation**: During N8N sync, patients archived in history are automatically reactivated if they appear in N8N data. Uses dual lookup (primary by codigoAtendimento, fallback by leito). Core rule: "If patient is in N8N, they must be active in the system." **Important**: History records are NEVER deleted - they serve as a permanent audit log of all discharges and transfers.
- **Bed Conflict Resolution (v1.5.8.2)**: Simple and clean approach - when a new patient occupies a bed already in use, the old patient is archived to history (with all real data including the original leito) and then deleted from the active patients table. Uses cascade-safe deletion that cleans up related notifications and events before removing the patient. Uses `getPatientByLeito()` method for conflict detection.
- **Idempotent Archive (v1.5.8.2)**: The `archivePatient()` method includes a 5-minute idempotency check to prevent duplicate history records - if the same patient was archived with the same reason within 5 minutes, the existing record is returned instead of creating a new one.
- **Single Insertion Point**: All patient insertions/updates go through `upsertPatientByCodigoAtendimento()` only. The 3-step sync process is: (1) resolve bed conflicts, (2) mark reactivated patients (history preserved), (3) UPSERT with N8N data. This prevents duplicate key errors during reactivation. **Parallel Processing (v1.5.5)**: Database saves use `Promise.all()` with `CONCURRENCY_LIMIT=10` for ~85% time reduction.
- **Global Error Handling**: Structured JSON logging for production and human-readable logs for development, with middleware for error catching.
- **Security**: JWT authentication with mandatory password change on first login, Role-Based Access Control (admin, enfermagem, visualizador) applied to all API endpoints via `requireRoleWithAuth()` middleware (v1.5.2) which combines auth + firstAccess check + RBAC to prevent first-access bypass. Input validation includes SQL injection detection, UUID, format, and query parameter validation. CSRF protection, secure cookie handling, N8N webhook validation, and AES-256-GCM data encryption (mandatory in all environments). **Token Versioning (v1.5.7)**: JWT tokens include `tokenVersion` field validated on every request; `incrementUserTokenVersion()` invalidates all existing tokens for a user; endpoint `/api/auth/invalidate-all-sessions` for remote logout. **Flexible Rate Limiting (v1.5.9.2)**: Hybrid key generator uses `userId` for authenticated requests and IP for unauthenticated (login/register), solving corporate NAT issues. Limits: Login 10/15min per IP, API 300/min per user, Sync 30/min per user, AI 20/min per user, Refresh 30/min per user. **isActive Validation (v1.5.7)**: Deactivated accounts blocked at login, refresh, and auth middleware levels with 403 error. **Security Hardening (v1.5.8)**: Hardcoded passwords removed (now requires env vars), JWT expiry reduced to 15 minutes, cookies SameSite=strict, password hashes filtered from getAllUsers(), CSP hardened (removed unsafe-inline/unsafe-eval), optional pagination on /api/patients.
- **LGPD Compliance (v1.5.8)**: Three admin-only endpoints for data subject rights: GET `/api/lgpd/export/patient/:id` (exports patient data + history using UUID then codigoAtendimento), POST `/api/lgpd/anonymize/history/:codigoAtendimento` (anonymizes history records, requires reason), GET `/api/lgpd/data-categories` (transparency endpoint listing collected data categories). Anonymization affects only patients_history records (nome, registro, notasPaciente, dadosCompletos) while preserving audit integrity.

## External Dependencies

- **Database**: Drizzle ORM for PostgreSQL, @neondatabase/serverless.
- **UI & Styling**: Radix UI, Tailwind CSS, PostCSS, class-variance-authority, Lucide React.
- **Form & Validation**: React Hook Form, Zod, @hookform/resolvers, drizzle-zod.
- **Data Format**: @toon-format/toon.
- **Security**: jsonwebtoken, bcryptjs, csurf, cookie-parser.
- **Utilities**: date-fns, clsx, tailwind-merge, nanoid.
- **External API**: N8N API for patient evolution data (`https://dev-n8n.7care.com.br/webhook/evolucoes`) and nursing units (`https://dev-n8n.7care.com.br/webhook/unidades-internacao`).
- **AI Integration**: GPT-4o-mini (primary) via UnifiedClinicalAnalysisService for consistent analysis across individual and batch flows. Claude Haiku 3.5 as fallback. Cache key strategy uses codigoAtendimento as primary identifier. **Batch Real Paralelo (v1.5.5)**: 4 batches of 10 patients processed in parallel (~14s), combined with parallel database saves (~10s), achieving total sync time of ~30s for 35 patients.
- **Scheduled Tasks**: Daily automatic sync of nursing units with change detection and admin approval workflow.
- **Database Schema Check**: Automatic verification on startup that all required tables exist. In production, missing tables cause a fatal error with clear instructions on how to resolve (copy dev database or run migrations). In development, missing tables generate a warning but allow the app to continue.

## Recent Changes (v1.5.9.4 - 2026-02-05)

### Aggressive Token Auto-Refresh System
- **Proactive Refresh**: Auto-refresh timer runs every 10 minutes to prevent session expiration during long operations
- **401 Interceptor**: Automatic token refresh and request retry on 401 responses
- **Debouncing**: 5-second debounce prevents multiple simultaneous refresh attempts
- **Auth Failure Handling**: Centralized `authFailureTriggered` flag stops all network activity on auth failure; `isAuthFailed()` export for checking state; `resetAuthFailure()` called on successful login
- **Analytics Integration**: `flushEvents` and `sendHeartbeat` check `isAuthFailed()` and `getAccessToken()` before making network calls; event queue cleared on auth failure
- **SQL Injection Fix**: `SQL_CHECK_SKIP_FIELDS` array in server/validation.ts excludes clinical text fields (dsEvolucaoMedica, dsAnotacaoEnfermagem, dsEvolucaoCompleta, observacoes, diagnostico, dadosBrutosJson) from SQL injection checks to prevent false positives

### Foreign Key Constraint Fix
- **Bug Fixed**: Nursing unit approval was passing literal string "admin" instead of user UUID for `reviewerId`
- **Solution**: Admin page now uses `user?.id` from `useAuth()` hook for all approval/rejection mutations
- **Documentation**: New skill `11care-frontend-backend-integration` created to prevent similar issues
- **Security Review Updated**: Added Foreign Key validation to security checklist

## Previous Changes (v1.5.9.3 - 2026-02-04)

### New N8N Integration Fields
- **dsEvolucaoMedica**: Medical evolution text field from N8N
- **dsAnotacaoEnfermagem**: Nursing notes text field from N8N
- Both fields encrypted with AES-256-GCM (added to SENSITIVE_PATIENT_FIELDS)
- UI displays fields in collapsible Card sections with character count indicators
- N8N mapping: `dadosBrutos.dsEvolucaoMedica` and `dadosBrutos.dsAnotacaoEnfermagem`

## Previous Changes (v1.5.9.2 - 2026-02-03)

### Rate Limiting Flexível v2
- **Middleware `extractUserForRateLimit`**: Extrai `userId` do JWT antes dos rate limiters executarem
  - Popula `req.rateLimitUser.userId` para uso pelo key generator híbrido
  - Aplicado globalmente em `/api/` antes do `apiRateLimiter`
- **Key Generator Híbrido**: Usa `userId` para autenticados, IP normalizado para não autenticados
- **Refresh Token Limiter**: Extrai `userId` diretamente do refresh token no keyGenerator
- **Normalização IPv6**: Agrupa por /64 subnet para prevenir bypass via rotação de endereços
- **Solução NAT Corporativo**: Usuários na mesma rede não compartilham mais limites
- **Novos Limites**:
  - Login/Registro: 10 tentativas/15min por IP
  - API Geral: 300 req/min por usuário
  - Sync/Import: 30 req/min por usuário
  - IA (OpenAI): 20 req/min por usuário
  - Refresh Token: 30 req/min por usuário

### Correções
- Fixed patient modal overflow with break-all CSS for long continuous text