# 11Care Nursing Platform

## Overview

The 11Care Nursing Platform is a healthcare management system designed for nursing staff in hospital environments. The application focuses on shift handover processes (SBAR methodology), with planned expansions to work schedule management and bed management. Built with a modern stack, it provides a professional, accessible interface following established healthcare software design patterns with the official 11Care brand identity.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server for fast HMR and optimized production builds
- Wouter for lightweight client-side routing

**UI Component Library**
- shadcn/ui component system (New York style variant) with Radix UI primitives
- Tailwind CSS for utility-first styling with custom design tokens
- Custom design system based on 11Care brand guidelines with specific color palette (#0056b3 primary blue, #007bff secondary blue, etc.)

**State Management & Data Fetching**
- TanStack Query (React Query) for server state management
- Custom query client configuration with disabled refetching for stable data displays
- Form handling with React Hook Form and Zod validation

**Key Design Decisions**
- Component aliasing system (@/components, @/lib, etc.) for clean imports
- CSS variable-based theming system allowing light/dark mode support
- 4px-based spacing scale for consistent layouts
- Gradient buttons and card-based layouts following healthcare software conventions

### Backend Architecture

**Server Framework**
- Express.js with TypeScript running on Node.js
- ESM module system for modern JavaScript features
- Custom middleware for request logging and JSON parsing with raw body preservation

**API Design**
- RESTful API structure with resource-based endpoints
- Conventional HTTP methods (GET, POST, PATCH, DELETE)
- Dual format support: JSON and TOON (Token-Oriented Object Notation)
  - Send `Content-Type: application/toon` for TOON format requests
  - Send `Accept: application/toon` to receive responses in TOON format
  - Fall back to JSON if no TOON headers specified
- Error handling with appropriate HTTP status codes

**Storage Layer**
- In-memory storage implementation (MemStorage class) for development
- Interface-based storage abstraction (IStorage) allowing easy swapping to persistent databases
- Seed data for mock patients matching hospital shift handover scenarios

**Development Server Integration**
- Vite middleware integration in development mode
- Conditional Replit-specific plugins for deployment environment
- Separate static file serving for production builds

### External Dependencies

**Database**
- Drizzle ORM configured for PostgreSQL
- @neondatabase/serverless for database connectivity
- Schema defined with patient and user tables
- Migration system via drizzle-kit
- Note: Database is configured but storage layer currently uses in-memory implementation

**UI & Styling**
- Radix UI primitives for accessible, unstyled components
- Tailwind CSS with PostCSS for styling pipeline
- class-variance-authority for variant-based component styling
- Lucide React for consistent iconography

**Form & Validation**
- React Hook Form for performant form state management
- Zod for runtime type validation and schema definition
- @hookform/resolvers for integration between validation and forms
- drizzle-zod for automatic schema-to-Zod conversions

**Data Format & Transmission**
- @toon-format/toon for Token-Oriented Object Notation (TOON) encoding/decoding
  - Enables compact, human-readable data transmission (~40% token savings for LLMs)
  - Maintains JSON data model compatibility with deterministic round-trips
  - Ideal for API responses that will be processed by language models

**Utilities**
- date-fns for date manipulation and formatting
- clsx and tailwind-merge for conditional class name handling
- nanoid for unique ID generation

**Development Tools**
- tsx for TypeScript execution in development
- esbuild for server-side production bundling
- Replit-specific plugins for dev banners, cartographer, and runtime error overlays

### Application Features

**Current Implementation**
- Login page with 11Care branding and background imagery
- Module selection dashboard with cards for different platform features
- Shift handover page (SBAR methodology) with:
  - Complete 18-column patient table matching reference document structure
  - Sticky LEITO (bed) column for easy reference during horizontal scrolling
  - Visual legend for mobility codes (A, D, DA) with descriptions
  - Patient search by name, bed number, or specialty
  - Statistics dashboard showing complete/pending/alert/critical/total patient counts
  - Color-coded patient rows (red for critical, orange for medium alerts, alternating for others)
  - Alert system panel with priority-based notifications
- Mobile-responsive design with hamburger menus and adaptive layouts

**Data Models**
- User: Authentication and role-based access (username, password, name, role)
- Patient: Comprehensive shift handover data with 18 columns + extended N8N fields:
  - Basic info: leito (bed number), especialidadeRamal (specialty/extension), nome (name), registro (registration), dataNascimento (birth date)
  - Clinical data: dataInternacao (admission date), rqBradenScp (Braden scale), diagnosticoComorbidades (diagnosis/comorbidities), alergias (allergies)
  - Mobility: mobilidade (A=Acamado/Bedridden, D=Deambula/Walks, DA=Deambula Com Auxílio/Walks with assistance)
  - Care details: dieta (diet), eliminacoes (eliminations), dispositivos (devices), atb (antibiotics), curativos (dressings)
  - Monitoring: aporteSaturacao (intake/saturation), examesRealizadosPendentes (tests completed/pending)
  - Planning: dataProgramacaoCirurgica (surgical schedule), observacoesIntercorrencias (observations/complications), previsaoAlta (expected discharge)
  - Alert status for color-coded patient rows
  - N8N Fields: idEvolucao (evolution ID), dsEnfermaria (ward code), dsLeitoCompleto (complete bed code), dsEspecialidade (full specialty), codigoAtendimento (care code), dsEvolucaoCompleta (full evolution text), dhCriacaoEvolucao (creation timestamp), fonteDados (data source), dadosBrutosJson (raw API data as JSONB)

**API Endpoints (Support Both JSON and TOON)**
- `GET /api/patients` - Fetch all patients
- `GET /api/patients/:id` - Fetch single patient
- `POST /api/patients` - Create new patient (validates against schema with Zod, accepts JSON or TOON)
- `PATCH /api/patients/:id` - Update patient (validates with Zod, accepts JSON or TOON)
- `DELETE /api/patients/:id` - Delete patient
- `GET /api/alerts` - Fetch all alerts
- `POST /api/alerts` - Create alert (accepts JSON or TOON)
- `DELETE /api/alerts/:id` - Delete alert

**TOON Format Usage Examples**
- Request in TOON:
  ```
  curl -X POST http://localhost:5000/api/patients \
    -H "Content-Type: application/toon" \
    -d 'leito: "10"
  nome: TEST PATIENT
  mobilidade: DA'
  ```
- Response in TOON:
  ```
  curl -H "Accept: application/toon" http://localhost:5000/api/patients
  ```

**External API Integration**
- Integrated with external API: https://n8n-dev.iamspe.sp.gov.br/webhook/evolucoes
- Sync endpoints for fetching patient data:
  - POST /api/sync/patient/:leito - Sync single patient
  - POST /api/sync/patients - Sync multiple patients  
  - POST /api/sync/evolucoes/:enfermaria - Sync all evolucoes for enfermaria via N8N Integration Service
- Automatic field mapping and normalization (flexible field name matching for N8N variations)
- Support for both JSON and TOON response formats
- Frontend UI with sync panel (cloud icon button)
- Ability to sync specific patients or batch sync all patients
- Automatic validation and error handling

**N8N Integration Service** (`server/services/n8n-integration-service.ts`)
- Dedicated service for N8N API integration with specialized processing
- Core Methods:
  - `fetchEvolucoes(enfermaria)` - Fetches raw evolução data from N8N API
  - `processEvolucao(leito, dados)` - Processes and extracts structured data
  - `validateProcessedData(dados)` - Validates before database storage
- Data Extraction:
  - Extracts patient name (removes PT: and AT: codes)
  - Extracts registration number (PT: XXXXX)
  - Extracts care code (AT: XXXXX)
  - Formats dates to DD/MM/YYYY
  - Normalizes mobilidade (A, D, DA)
  - Maps all 27 fields (18 original + 9 N8N fields)
- Data Validation:
  - Requires: leito, nome, dataInternacao
  - Validates date format (DD/MM/YYYY)
  - Validates mobilidade codes
- N8N Field Storage:
  - Stores evolution ID (idEvolucao)
  - Captures complete ward/bed codes (dsEnfermaria, dsLeitoCompleto)
  - Records creation timestamp (dhCriacaoEvolucao)
  - Preserves full evolution text (dsEvolucaoCompleta)
  - Archives raw JSON response in JSONB column (dadosBrutosJson) for audit trail
  - Marks all records with fonteDados="N8N_IAMSPE" for data source tracking
- Logging:
  - [N8N] tags for API operations
  - [Sync] tags for sync operations
  - Detailed error tracking for debugging

**Implementation Complete** ✅

1. **Frontend Integration** (`client/src/pages/import.tsx`, `client/src/pages/dashboard.tsx`)
   - Import page with enfermaria selection and import triggering
   - Dashboard page with import history, statistics, and timeline
   - Real-time status display (API connectivity)
   - Detailed import results with leito-by-leito breakdown

2. **Sincronização Periódica** (`server/services/import-scheduler.ts`)
   - Cron-based automatic sync every hour for enfermarias 10A and 10B
   - Automatic history recording with statistics
   - Error handling and logging
   - Schedule can be customized with cron expressions

3. **Webhooks em Tempo Real** (`server/routes.ts`)
   - WebSocket server at `/ws/import` for real-time notifications
   - Broadcast function for import events
   - Client connection management with welcome messages
   - Separated from Vite HMR to avoid conflicts

4. **Dashboard de Status** (`client/src/pages/dashboard.tsx`)
   - Total imports, processed patients, total errors, success rate statistics
   - Last import card with detailed breakdown
   - Full import history timeline sorted by date
   - Auto-refresh every 30 seconds

**New API Endpoints**
- `POST /api/import/evolucoes` - Import evolucoes with detailed statistics
- `GET /api/enfermarias` - List available enfermarias
- `GET /api/import/status` - Test N8N API connectivity
- `GET /api/import/history` - Fetch complete import history

**Storage Layer Updates**
- Added `ImportHistory` interface to storage
- Methods: `getAllImportHistory()`, `createImportHistory()`, `getLastImport()`
- Stores detailed import records with timestamps and results

**New Routes in Frontend**
- `/import` - Import management page
- `/dashboard` - Import statistics and history dashboard

**Automatic Features**
- Cron job started on server startup with default schedule
- Periodic sync for 10A at top of hour, 10B at 30 minutes
- Automatic history recording after each import
- Scheduler status logging with [Scheduler] tags

**Next Steps (Optional)**
- Email notifications on import failures
- Custom cron expression UI
- Webhook endpoints for external systems
- Database persistence for import history
- Advanced filtering and search in dashboard
