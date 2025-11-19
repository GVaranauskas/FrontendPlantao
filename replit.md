# 11Care Nursing Platform

## Overview

The 11Care Nursing Platform is a healthcare management system designed for nursing staff in hospital environments. The application focuses on shift handover processes (SBAR methodology), with planned expansions to work schedule management and bed management. Built with a modern stack using Angular 19, it provides a professional, accessible interface following established healthcare software design patterns with the official 11Care brand identity.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (November 2025)

**Complete UI Redesign - November 19, 2025**
- Comprehensive UI redesign matching passagem-de-plantao-v2 reference HTML file
- Replaced all emoji placeholders with Font Awesome 6.4.0 icons (fa-bars, fa-sync-alt, fa-bell, fa-search)
- Refactored hover/focus behaviors from inline style manipulation to CSS classes (icon-btn, module-card-hover, btn-secondary-hover, search-input)
- Added smooth CSS transitions (0.3s ease) for all interactive elements including alert sidebar
- Implemented modern 11Care design system with gradient buttons, card layouts, and professional healthcare aesthetics
- All three components (Login, Modules, ShiftHandover) now follow consistent design patterns
- Application compiles successfully and all features remain fully operational

**Major Migration: React → Angular**
- Completely migrated frontend from React 18 to Angular 19
- Maintained all features and functionality
- Backend API unchanged
- See MIGRATION_GUIDE.md for detailed migration notes

## System Architecture

### Frontend Architecture

**Framework & Build System**
- **Angular 19** with TypeScript for type-safe component development
- **Angular CLI** as the build tool and development server
- **Standalone Components** architecture (no NgModules)
- Lazy-loaded routes for optimized performance

**UI Component Library**
- Native HTML components with Angular directives
- **Tailwind CSS** for utility-first styling with custom design tokens
- Custom design system based on 11Care brand guidelines with specific color palette (#0056b3 primary blue, #007bff secondary blue, etc.)

**State Management & Data Fetching**
- **HttpClient** for API communication
- **RxJS Observables** for reactive data streams
- Services with `providedIn: 'root'` for singleton instances
- Template-driven forms with **FormsModule** and two-way binding

**Key Design Decisions**
- Standalone components (no NgModules required)
- Lazy loading for all page components (login, modules, shift-handover)
- Reactive programming with RxJS Observables
- 4px-based spacing scale for consistent layouts
- Gradient buttons and card-based layouts following healthcare software conventions

**Component Structure**
```
client/src/app/
├── app.component.ts          # Root component
├── app.routes.ts             # Route configuration with lazy loading
├── services/
│   ├── patient.service.ts    # HTTP service for patient data
│   └── alert.service.ts      # HTTP service for alerts
└── pages/
    ├── login/                # Login page component
    ├── modules/              # Dashboard modules component
    └── shift-handover/       # SBAR shift handover component
```

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
- Zod validation for request bodies

**Storage Layer**
- In-memory storage implementation (MemStorage class) for development
- Interface-based storage abstraction (IStorage) allowing easy swapping to persistent databases
- Seed data for mock patients matching hospital shift handover scenarios

**Development Server Integration**
- Angular dev server on port 4200 (with HMR)
- Express proxy middleware forwarding non-API requests to Angular dev server
- API requests (`/api/*`) handled directly by Express
- Dual-server orchestration via `dev.sh` bash script

**Production Build**
- `ng build` generates optimized bundle in `dist/client/browser/`
- Express serves static files from build directory
- Single port (5000) serves both API and frontend assets

### External Dependencies

**Angular Core**
- @angular/core, @angular/common, @angular/platform-browser (v20.3.x)
- @angular/router for navigation
- @angular/forms for form handling
- @angular/animations for transitions
- rxjs for reactive programming
- zone.js for change detection

**Build & Development**
- @angular/cli and @angular-devkit/build-angular
- TypeScript 5.8
- concurrently for running multiple processes

**Database**
- Drizzle ORM configured for PostgreSQL
- @neondatabase/serverless for database connectivity
- Schema defined with patient and user tables
- Migration system via drizzle-kit
- Note: Database is configured but storage layer currently uses in-memory implementation

**Styling**
- Tailwind CSS with PostCSS for styling pipeline
- Custom Tailwind configuration with 11Care brand colors

**Validation**
- Zod for runtime type validation and schema definition
- drizzle-zod for automatic schema-to-Zod conversions

**Utilities**
- date-fns for date manipulation and formatting
- nanoid for unique ID generation
- http-proxy-middleware for development proxy

**Development Tools**
- tsx for TypeScript execution in development
- esbuild for server-side production bundling

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
- Mobile-responsive design with adaptive layouts

**Data Models**
- User: Authentication and role-based access (username, password, name, role)
- Patient: Comprehensive shift handover data with 18 columns matching reference document:
  - Basic info: leito (bed number), especialidadeRamal (specialty/extension), nome (name), registro (registration), dataNascimento (birth date)
  - Clinical data: dataInternacao (admission date), rqBradenScp (Braden scale), diagnosticoComorbidades (diagnosis/comorbidities), alergias (allergies)
  - Mobility: mobilidade (A=Acamado/Bedridden, D=Deambula/Walks, DA=Deambula Com Auxílio/Walks with assistance)
    - **Validation:** Backend enforces enum ["A", "D", "DA"] via Zod schema on POST and PATCH
  - Care details: dieta (diet), eliminacoes (eliminations), dispositivos (devices), atb (antibiotics), curativos (dressings)
  - Monitoring: aporteSaida (intake/output), examesRealizadosPendentes (tests completed/pending)
  - Planning: dataProgramacaoCirurgica (surgical schedule), observacoesIntercorrencias (observations/complications), previsaoAlta (expected discharge)
  - Alert status for color-coded patient rows

**Planned Features**
- Work schedule management module (marked as "coming soon")
- Bed management module (marked as "coming soon")
- Print functionality for shift handover reports
- Real-time updates and notifications

## Development Workflow

### Running the Application

**Development Mode:**
```bash
# Start both Angular dev server (4200) and Express API (5000)
bash dev.sh

# Or manually in separate terminals:
# Terminal 1: Angular
cd client && ng serve --port 4200

# Terminal 2: Express
NODE_ENV=development npx tsx server/index.ts
```

**Access Points:**
- Frontend: http://localhost:5000 (Express proxy to Angular)
- Direct Angular: http://localhost:4200 (with HMR)
- API: http://localhost:5000/api/*

**Production Build:**
```bash
# Build both frontend and backend
bash build.sh

# Start production server
npm start
```

### Project Scripts

Located in `package.json` (read-only, use workflow tools to modify):
- `dev`: Development mode (use `bash dev.sh` instead)
- `build`: Production build (use `bash build.sh`)
- `start`: Production server
- `check`: TypeScript type checking
- `db:push`: Push Drizzle schema to database

### Workflow Configuration

**Development Workflow** (Start application):
- Command: `bash dev.sh`
- Starts Angular dev server on port 4200
- Starts Express API server on port 5000
- Express proxies non-API requests to Angular for HMR

## Technical Notes

### Angular Configuration

**angular.json:**
- Build output: `../dist/client/browser`
- Assets from `src/assets` and `../attached_assets`
- Production optimization with budgets

**tsconfig.app.json:**
- Target: ES2022
- Module: ES2022
- Experimental decorators enabled
- Strict type checking

### API Endpoints

**Patients:**
- `GET /api/patients` - List all patients
- `GET /api/patients/:id` - Get patient by ID
- `POST /api/patients` - Create patient (Zod validation)
- `PATCH /api/patients/:id` - Update patient (Zod validation)
- `DELETE /api/patients/:id` - Delete patient

**Alerts:**
- `GET /api/alerts` - List all alerts
- `POST /api/alerts` - Create alert
- `DELETE /api/alerts/:id` - Delete alert

### File Structure Reference

```
.
├── client/                   # Angular frontend
│   ├── angular.json         # Angular CLI configuration
│   ├── tsconfig.app.json    # TypeScript config
│   └── src/
│       ├── index.html       # Main HTML file
│       ├── main.ts          # Bootstrap file
│       ├── styles.css       # Global Tailwind styles
│       └── app/             # Application code
├── server/                  # Express backend
│   ├── index.ts            # Server entry point
│   ├── angular.ts          # Angular proxy/static config
│   ├── routes.ts           # API routes
│   └── storage.ts          # In-memory storage
├── shared/                  # Shared types
│   └── schema.ts           # Drizzle schema + Zod validation
├── attached_assets/         # User-uploaded assets
├── dev.sh                  # Development orchestrator
├── build.sh                # Production build script
└── MIGRATION_GUIDE.md      # React → Angular migration details
```

## Deployment

The application uses Replit's deployment system:
- Development: Dual-server setup with HMR
- Production: Single Express server serving both API and static Angular bundle
- Build command: `bash build.sh`
- Start command: `npm start`
- Port: 5000 (firewalled, only this port accessible)

## Security & Validation

- **Input Validation:** Zod schemas on all POST/PATCH endpoints
- **Mobility Codes:** Enforced enum validation prevents invalid data
- **Environment Secrets:** SESSION_SECRET managed by Replit
- **CORS:** Not needed (same-origin in production)

## Known Issues & Limitations

- Database configured but not active (using in-memory storage)
- Some React dependencies still in package.json (will be removed in cleanup)
- Workflow command must be manually set to `bash dev.sh` in Replit UI

## Future Improvements

1. Migrate from in-memory to PostgreSQL storage
2. Implement authentication system
3. Add reactive forms where appropriate
4. Complete work schedule module
5. Complete bed management module
6. Add print functionality
7. Implement real-time updates with WebSockets
8. Add unit and e2e tests (Jasmine/Karma or Jest + Cypress)

## Support & Documentation

- Angular Documentation: https://angular.dev
- Angular CLI: https://angular.dev/cli
- RxJS: https://rxjs.dev
- Tailwind CSS: https://tailwindcss.com
- Drizzle ORM: https://orm.drizzle.team
- Project-specific: See MIGRATION_GUIDE.md
