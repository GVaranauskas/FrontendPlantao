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
- **Data Models**: User (authentication, role-based access), Patient (18-column data + 9 N8N-specific fields, alert status), ImportHistory, NursingUnitTemplate (customizable templates with field configuration), NursingUnit (unit registry with external ID mapping), NursingUnitChange (pending changes with approval workflow).
- **API Endpoints**: Standard CRUD for patients and alerts. N8N integration endpoints for fetching and importing evolution data. Template management endpoints. Authentication endpoints (`/api/auth/*`). Real-time WebSocket at `/ws/import` for import event notifications. CSRF token endpoint. User management (`/api/users/*`).
- **N8N Integration Service**: Fetches, processes, validates, and stores patient evolution data from the N8N API, including automatic field mapping and data extraction.
- **Periodic Sync Scheduler**: Cron-based automation for automatic patient data synchronization.
- **Global Error Handling**: Structured JSON logging (production) and human-readable logs (development), middleware for error catching, automatic logging of request context.
- **Security**: JWT authentication (access/refresh tokens), Role-Based Access Control (admin, enfermeiro, visualizador), CSRF protection, secure cookie handling, N8N webhook validation.

## External Dependencies

- **Database**: Drizzle ORM for PostgreSQL, @neondatabase/serverless.
- **UI & Styling**: Radix UI, Tailwind CSS, PostCSS, class-variance-authority, Lucide React (iconography).
- **Form & Validation**: React Hook Form, Zod, @hookform/resolvers, drizzle-zod.
- **Data Format**: @toon-format/toon for TOON encoding/decoding.
- **Security**: jsonwebtoken (JWT), bcryptjs (password hashing), csurf (CSRF protection), cookie-parser (cookie handling).
- **Utilities**: date-fns, clsx, tailwind-merge, nanoid.
- **External API**: N8N API for patient evolution data (`https://n8n-dev.iamspe.sp.gov.br/webhook/evolucoes`) and nursing units (`https://n8n-dev.iamspe.sp.gov.br/webhook/unidades-internacao`).
- **Scheduled Tasks**: Daily automatic sync of nursing units (06:00 AM) with change detection and admin approval workflow.