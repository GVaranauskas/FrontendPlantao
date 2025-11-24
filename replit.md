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
- **Storage**: In-memory storage (MemStorage) for development with an IStorage interface for future persistent database integration.
- **Development**: Vite middleware integration, Replit-specific plugins, separate static file serving for production.
- **Data Models**:
    - **User**: Authentication and role-based access.
    - **Patient**: Comprehensive 18-column data (leito, nome, mobilidade, etc.) plus 9 extended N8N-specific fields (idEvolucao, dsEnfermaria, dsEspecialidade, etc.). Includes alert status.
    - **ImportHistory**: Records details of import events with timestamps and statistics.
- **API Endpoints**:
    - Standard CRUD operations for patients and alerts (`/api/patients`, `/api/alerts`).
    - N8N integration endpoints: `GET /api/enfermarias`, `POST /api/import/evolucoes`, `GET /api/import/status`, `GET /api/import/history`.
    - Real-time WebSocket at `/ws/import` for import event notifications.
- **N8N Integration Service**: Dedicated service for fetching, processing, validating, and storing patient evolution data from the N8N API. Features automatic field mapping (e.g., `ds_especialidade` to `especialidadeRamal`), data extraction (patient name, registration, care codes), date formatting, mobility normalization, and storage of raw N8N JSON for audit trails.
- **Periodic Sync Scheduler**: Cron-based automation (node-cron) for automatic patient data synchronization at predefined intervals (e.g., 10A at top of hour, 10B at 30 minutes). Records history and statistics automatically.

## External Dependencies

- **Database**: Drizzle ORM for PostgreSQL, @neondatabase/serverless for connectivity. (Currently configured but uses in-memory storage for development).
- **UI & Styling**: Radix UI, Tailwind CSS, PostCSS, class-variance-authority, Lucide React (iconography).
- **Form & Validation**: React Hook Form, Zod, @hookform/resolvers, drizzle-zod.
- **Data Format**: @toon-format/toon for TOON encoding/decoding, offering compact, human-readable data transmission compatible with JSON data models.
- **Utilities**: date-fns, clsx, tailwind-merge, nanoid.
- **Development Tools**: tsx, esbuild, Replit-specific plugins (dev banners, cartographer, error overlays).
- **External API**: N8N API (`https://n8n-dev.iamspe.sp.gov.br/webhook/evolucoes`) for patient evolution data.