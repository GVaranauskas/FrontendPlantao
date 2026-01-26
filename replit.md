# 11Care Nursing Platform

## Overview

The 11Care Nursing Platform is a healthcare management system designed for hospital nursing staff. Its main goal is to optimize shift handover processes using the SBAR methodology, with future plans to incorporate work schedule and bed management functionalities. The platform aims to offer a professional, user-friendly interface that aligns with established healthcare software design patterns and the official 11Care brand. Key capabilities include integration with external data sources like N8N for patient evolution data and real-time synchronization. The platform includes AI-powered clinical analysis and recommendations to improve patient care and documentation.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, Vite, Wouter for routing.
- **UI/UX**: shadcn/ui (New York style), Radix UI primitives, Tailwind CSS, custom 11Care brand design system with specific color palette, theming, and spacing.
- **State Management**: TanStack Query for server state (staleTime: Infinity with refetchQueries for immediate updates), React Hook Form with Zod for form handling.
- **Services Layer**: Centralized API abstraction using `ApiService` with generic CRUD methods and specific services for patients, users, templates, and nursing units.
- **Type Organization**: AI/clinical analysis types centralized to prevent circular dependencies.
- **Key Features**: Login with mandatory first-access password change, module selection dashboard, SBAR shift handover with an 18-column patient table, real-time API status, automatic patient data refresh and auto-sync, print functionality for handover reports, centralized admin menu for nursing unit management with approval workflows, patient history viewing for archived patients (alta, transfers, deaths), and usage analytics dashboard for UX/Customer Success analysis.
- **Usage Analytics**: Automatic tracking of user sessions, page views, and actions via `useAnalytics` hook with event batching (max 20 events or 5 seconds), session heartbeats (1 min intervals), and cleanup on unmount/beforeunload.

### Backend Architecture
- **Server**: Express.js with TypeScript on Node.js (ESM).
- **API Design**: RESTful API supporting JSON and TOON formats with custom middleware for logging and parsing.
- **Storage**: PostgreSQL with Drizzle ORM, with automatic fallback to MemStorage.
- **Data Models**: User, Patient (with 14 normalized N8N fields), ImportHistory, NursingUnitTemplate, NursingUnit, NursingUnitChange, PatientNoteEvent (audit trail), UserNotification, UserSession, AnalyticsEvent.
- **Patient Notes Audit System**: Full audit trail for patient note actions (create, update, delete) with encrypted previous values, performer/target user tracking, IP address logging, and optional deletion reasons. Admin-only note deletion with automatic notification to original author.
- **API Endpoints**: Standard CRUD for patients and alerts, N8N sync, template management, authentication, user management, WebSocket for import, and analytics (events, sessions, metrics).
- **Usage Analytics System**: Session-based tracking with 10 REST endpoints: POST /api/analytics/events (single), POST /api/analytics/events/batch, POST /api/analytics/sessions, POST /api/analytics/sessions/:id/end, POST /api/analytics/sessions/:id/heartbeat, GET /api/admin/analytics/* (metrics, sessions, top-pages, top-actions, users/:userId, events). Admin-only endpoints protected by RBAC.
- **N8N Integration Service**: Direct 1:1 mapping from N8N webhook responses to patient fields.
- **Auto Sync Scheduler**: Cron-based automation (default 1 hour) with a 4-layer cost-saving system: change detection, intelligent cache, GPT-4o-mini, and hourly auto-sync. Includes validation to block patients from non-approved wards. Deterministic archiving (immediate when patient not in N8N) with sanity validation (N8N_MIN_RECORD_RATIO=0.5, MIN_ABSOLUTE_RECORDS=5) to prevent mass archiving from incomplete N8N responses.
- **Automatic Patient Reactivation**: During N8N sync, patients archived in history are automatically reactivated if they appear in N8N data. Uses dual lookup (primary by codigoAtendimento, fallback by leito). Core rule: "If patient is in N8N, they must be active in the system." **Important**: History records are NEVER deleted - they serve as a permanent audit log of all discharges and transfers.
- **Bed Conflict Resolution**: Before inserting or reactivating a patient, the system checks if the target bed is occupied by a different patient (different codigoAtendimento). If so, the old patient is automatically archived as "registro_antigo" to prevent UNIQUE constraint violations.
- **Single Insertion Point**: All patient insertions/updates go through `upsertPatientByCodigoAtendimento()` only. The 3-step sync process is: (1) resolve bed conflicts, (2) mark reactivated patients (history preserved), (3) UPSERT with N8N data. This prevents duplicate key errors during reactivation.
- **Global Error Handling**: Structured JSON logging for production and human-readable logs for development, with middleware for error catching.
- **Security**: JWT authentication with mandatory password change on first login, Role-Based Access Control (admin, enfermagem, visualizador) applied to all API endpoints. Input validation includes SQL injection detection, UUID, format, and query parameter validation. CSRF protection, secure cookie handling, N8N webhook validation, and AES-256-GCM data encryption are implemented.

## External Dependencies

- **Database**: Drizzle ORM for PostgreSQL, @neondatabase/serverless.
- **UI & Styling**: Radix UI, Tailwind CSS, PostCSS, class-variance-authority, Lucide React.
- **Form & Validation**: React Hook Form, Zod, @hookform/resolvers, drizzle-zod.
- **Data Format**: @toon-format/toon.
- **Security**: jsonwebtoken, bcryptjs, csurf, cookie-parser.
- **Utilities**: date-fns, clsx, tailwind-merge, nanoid.
- **External API**: N8N API for patient evolution data (`https://dev-n8n.7care.com.br/webhook/evolucoes`) and nursing units (`https://dev-n8n.7care.com.br/webhook/unidades-internacao`).
- **AI Integration**: GPT-4o-mini (primary) via UnifiedClinicalAnalysisService for consistent analysis across individual and batch flows. Claude Haiku 3.5 as fallback. Cache key strategy uses codigoAtendimento as primary identifier.
- **Scheduled Tasks**: Daily automatic sync of nursing units with change detection and admin approval workflow.
- **Database Schema Check**: Automatic verification on startup that all required tables exist. In production, missing tables cause a fatal error with clear instructions on how to resolve (copy dev database or run migrations). In development, missing tables generate a warning but allow the app to continue.