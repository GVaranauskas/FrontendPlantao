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
- JSON request/response format
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
- Radix UI primitives for accessible, unstyled components (accordion, dialog, dropdown, etc.)
- Tailwind CSS with PostCSS for styling pipeline
- class-variance-authority for variant-based component styling
- Lucide React for consistent iconography

**Form & Validation**
- React Hook Form for performant form state management
- Zod for runtime type validation and schema definition
- @hookform/resolvers for integration between validation and forms
- drizzle-zod for automatic schema-to-Zod conversions

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
- Patient: Comprehensive shift handover data with 18 columns matching reference document:
  - Basic info: leito (bed number), especialidadeRamal (specialty/extension), nome (name), registro (registration), dataNascimento (birth date)
  - Clinical data: dataInternacao (admission date), rqBradenScp (Braden scale), diagnosticoComorbidades (diagnosis/comorbidities), alergias (allergies)
  - Mobility: mobilidade (A=Acamado/Bedridden, D=Deambula/Walks, DA=Deambula Com Auxílio/Walks with assistance)
  - Care details: dieta (diet), eliminacoes (eliminations), dispositivos (devices), atb (antibiotics), curativos (dressings)
  - Monitoring: aporteSaturacao (intake/saturation), examesRealizadosPendentes (tests completed/pending)
  - Planning: dataProgramacaoCirurgica (surgical schedule), observacoesIntercorrencias (observations/complications), previsaoAlta (expected discharge)
  - Alert status for color-coded patient rows

**Planned Features**
- Work schedule management module (marked as "coming soon")
- Bed management module (marked as "coming soon")
- Print functionality for shift handover reports
- Real-time updates and notifications