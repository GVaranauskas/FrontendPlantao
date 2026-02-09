# 11Care Nursing Platform

## Overview
The 11Care Nursing Platform is a healthcare management system for hospital nursing staff, aiming to optimize shift handover processes using the SBAR methodology. It plans to integrate work schedule and bed management. The platform offers a professional, user-friendly interface aligned with healthcare software design patterns and the 11Care brand. Key capabilities include integration with external data sources like N8N for patient evolution data, real-time synchronization, and AI-powered clinical analysis and recommendations to improve patient care and documentation.

## User Preferences
Preferred communication style: Simple, everyday language.

Development Workflow Rules:
1. **Describe Before Coding**: Before writing any code, describe your approach and wait for approval. Always ask clarifying questions before writing any code if requirements are ambiguous.
2. **Break Down Large Tasks**: If a task requires changes to more than 3 files, stop and break it into smaller tasks first.
3. **List What Could Break**: After writing code, list what could break and suggest tests to cover it.
4. **Test-First Bug Fixing**: When there's a bug, start by writing a test that reproduces it, then fix it until the test passes.
5. **Learn From Corrections**: Every time I correct you, add a new rule to this replit.md file so it never happens again.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, Vite, Wouter for routing.
- **UI/UX**: shadcn/ui (New York style), Radix UI primitives, Tailwind CSS, custom 11Care brand design system.
- **State Management**: TanStack Query for server state, React Hook Form with Zod for form handling. Manual sync uses syncId-based polling.
- **Services Layer**: Centralized API abstraction with `ApiService` for CRUD operations and specific services.
- **Type Organization**: AI/clinical analysis types centralized to prevent circular dependencies.
- **Key Features**: Login with mandatory first-access password change, module selection dashboard, SBAR shift handover with optimized patient table, real-time API status, automatic patient data refresh and auto-sync, print functionality, admin menu for nursing unit management with approval workflows, patient history viewing, usage analytics dashboard, interactive table filtering by patient status and Specialty/Branch, shift overview page (hidden, modular, `/shift-overview`).
- **Reusable Components**: `ShiftIndicators` and `LevelClassification` extracted from shift-handover for reuse across pages.
- **Usage Analytics**: Automatic tracking of user sessions, page views, and actions via `useAnalytics` hook with event batching and session heartbeats.

### Backend Architecture
- **Server**: Express.js with TypeScript on Node.js (ESM).
- **API Design**: RESTful API supporting JSON and TOON formats.
- **Storage**: PostgreSQL with Drizzle ORM, with automatic fallback to MemStorage.
- **Data Models**: User, Patient, ImportHistory, NursingUnitTemplate, NursingUnit, NursingUnitChange, PatientNoteEvent, UserNotification, UserSession, AnalyticsEvent.
- **Comprehensive Audit System**: Full audit trail using `AuditService` for critical operations like patient notes, patient lifecycle, shift handover, and sync operations. Admin-only note deletion with notification.
- **API Endpoints**: Standard CRUD for patients and alerts, N8N sync, template management, authentication, user management, WebSocket for import, and analytics.
- **Usage Analytics System**: Session-based tracking with dedicated REST endpoints for events, sessions, and admin metrics.
- **N8N Integration Service**: Direct 1:1 mapping from N8N webhook responses to patient fields.
- **Auto Sync Scheduler**: Cron-based automation (default 1 hour) with a 4-layer cost-saving system (change detection, intelligent cache, GPT-4o-mini, hourly auto-sync). Includes validation to block patients from non-approved wards and deterministic archiving.
- **Automatic Patient Reactivation**: Patients appearing in N8N data are automatically reactivated, preserving historical records.
- **Bed Conflict Resolution**: When a new patient occupies an existing bed, the old patient is archived and then deleted from the active patient table.
- **Idempotent Archive**: `archivePatient()` method includes a 5-minute idempotency check to prevent duplicate history records.
- **Single Insertion Point**: All patient insertions/updates go through `upsertPatientByCodigoAtendimento()`. The 3-step sync process involves bed conflict resolution, marking reactivated patients, and UPSERTing with N8N data, utilizing parallel processing.
- **Global Error Handling**: Structured JSON logging for production and human-readable logs for development.
- **Security**: JWT authentication with mandatory password change, Role-Based Access Control (admin, enfermagem, visualizador) via `requireRoleWithAuth()` middleware. Input validation, CSRF protection, secure cookie handling, N8N webhook validation, and AES-256-GCM data encryption. JWT token versioning for remote logout. Flexible rate limiting using hybrid key generator (userId for authenticated, IP for unauthenticated) and specific limits for different endpoints. `isActive` validation for deactivated accounts. Hardened security with environmental variables for secrets, reduced JWT expiry, and strict CSP.
- **LGPD Compliance**: Admin-only endpoints for patient data export, history anonymization, and data category transparency. Anonymization affects only sensitive patient history records while preserving audit integrity.

## External Dependencies
- **Database**: Drizzle ORM for PostgreSQL, @neondatabase/serverless.
- **UI & Styling**: Radix UI, Tailwind CSS, PostCSS, class-variance-authority, Lucide React.
- **Form & Validation**: React Hook Form, Zod, @hookform/resolvers, drizzle-zod.
- **Data Format**: @toon-format/toon.
- **Security**: jsonwebtoken, bcryptjs, csurf, cookie-parser.
- **Utilities**: date-fns, clsx, tailwind-merge, nanoid.
- **External API**: N8N API for patient evolution data and nursing units.
- **AI Integration**: GPT-4o-mini (primary) via UnifiedClinicalAnalysisService for consistent analysis, with Claude Haiku 4.5 as fallback (prompt caching enabled via cache_control for cost optimization).
- **Scheduled Tasks**: Daily automatic sync of nursing units.
- **Database Schema Check**: Automatic verification on startup.