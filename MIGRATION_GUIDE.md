# Guia de Migração: React para Angular

## ✅ Migração Completa

A aplicação **11Care Nursing Platform** foi migrada com sucesso de **React 18** para **Angular 19**.

## Mudanças Principais

### Frontend

#### Antes (React)
- **Framework:** React 18 com TypeScript
- **Build:** Vite
- **Roteamento:** Wouter
- **State Management:** TanStack Query (React Query)
- **Forms:** React Hook Form + Zod
- **UI:** shadcn/ui + Radix UI
- **Styling:** Tailwind CSS

#### Depois (Angular)
- **Framework:** Angular 19 com TypeScript
- **Build:** Angular CLI
- **Roteamento:** Angular Router (standalone)
- **HTTP:** HttpClient com RxJS
- **Forms:** Template-driven forms (FormsModule)
- **UI:** Componentes HTML nativos + Tailwind CSS
- **Styling:** Tailwind CSS (mantido)

### Backend (Sem Alterações)
- **Framework:** Express.js com TypeScript
- **API:** REST endpoints em `/api/*`
- **Storage:** In-memory (MemStorage)
- **Validação:** Zod schemas

## Estrutura de Arquivos

```
client/
├── angular.json          # Configuração do Angular CLI
├── tsconfig.app.json    # TypeScript config para Angular
└── src/
    ├── index.html       # HTML principal
    ├── main.ts          # Bootstrap da aplicação
    ├── styles.css       # Estilos globais Tailwind
    └── app/
        ├── app.component.ts      # Root component
        ├── app.routes.ts         # Configuração de rotas
        ├── services/             # Serviços HTTP
        │   ├── patient.service.ts
        │   └── alert.service.ts
        └── pages/                # Componentes de página
            ├── login/
            │   ├── login.component.ts
            │   ├── login.component.html
            │   └── login.component.css
            ├── modules/
            │   ├── modules.component.ts
            │   ├── modules.component.html
            │   └── modules.component.css
            └── shift-handover/
                ├── shift-handover.component.ts
                ├── shift-handover.component.html
                └── shift-handover.component.css

server/
├── index.ts       # Express server (atualizado)
├── angular.ts     # Configuração Angular proxy/static
├── routes.ts      # API routes (sem alterações)
└── storage.ts     # In-memory storage (sem alterações)
```

## Componentes Migrados

### 1. Login Component
- **Navegação:** `useLocation` (wouter) → `Router.navigate()`
- **Forms:** Controlled components com useState → `[(ngModel)]` two-way binding
- **Styling:** Classes Tailwind mantidas

### 2. Modules Component
- **Data:** Dados estáticos mantidos
- **Navegação:** `setLocation()` → `router.navigate()`
- **Loops:** `.map()` → `*ngFor`
- **Condicionais:** Ternários → `[ngClass]`

### 3. Shift Handover Component
- **HTTP Calls:** `useQuery` (React Query) → `HttpClient.get()` com RxJS
- **State:** `useState` → propriedades de classe
- **Loading:** `isLoading` → propriedade booleana
- **Search:** Filtro reativo mantido
- **Tabela:** 18 colunas completas mantidas

## Serviços Angular

### PatientService
```typescript
@Injectable({ providedIn: 'root' })
export class PatientService {
  getAllPatients(): Observable<Patient[]>
  getPatient(id: string): Observable<Patient>
  createPatient(patient: Partial<Patient>): Observable<Patient>
  updatePatient(id: string, patient: Partial<Patient>): Observable<Patient>
  deletePatient(id: string): Observable<void>
}
```

### AlertService
```typescript
@Injectable({ providedIn: 'root' })
export class AlertService {
  getAllAlerts(): Observable<Alert[]>
  createAlert(alert): Observable<Alert>
  deleteAlert(id: string): Observable<void>
}
```

## Desenvolvimento

### Setup Inicial
```bash
# Instalar dependências (já feito)
npm install

# Estrutura dual server:
# - Angular dev server: localhost:4200
# - Express API server: localhost:5000
```

### Executar Aplicação
```bash
# Opção 1: Script shell (recomendado)
bash dev.sh

# Opção 2: Manualmente (duas janelas de terminal)
# Terminal 1: Angular
npx ng serve --port 4200

# Terminal 2: Express
NODE_ENV=development npx tsx server/index.ts
```

### Como Funciona

**Desenvolvimento:**
1. Angular dev server roda na porta 4200 (HMR habilitado)
2. Express API roda na porta 5000
3. Express faz proxy de requisições não-API para Angular (localhost:4200)
4. Requisições `/api/*` são tratadas pelo Express

**Produção:**
1. `ng build` compila Angular para `dist/client/browser/`
2. Express serve arquivos estáticos do build Angular
3. Express continua servindo API em `/api/*`

## Build de Produção

```bash
# Opção 1: Script shell
bash build.sh

# Opção 2: Manual
npx ng build --configuration production --output-path dist/client/browser
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

# Executar produção
npm start
```

## Configuração do Workflow

⚠️ **AÇÃO NECESSÁRIA:** Atualizar comando do workflow "Start application":

**Método 1 (Recomendado):** Via Interface Replit
1. Clicar no botão "Run" no topo
2. Selecionar "Manage Workflows"
3. Editar workflow "Start application"
4. Alterar comando de `npm run dev` para `bash dev.sh`

**Método 2:** Via arquivo `.replit` (se tiver acesso)
```toml
[[workflows.workflow.tasks]]
task = "shell.exec"
args = "bash dev.sh"  # ← Alterar aqui
waitForPort = 5000
```

## Validação Backend

### Endpoints API (Sem Alterações)
- ✅ `GET /api/patients` - Lista todos pacientes
- ✅ `GET /api/patients/:id` - Busca paciente específico
- ✅ `POST /api/patients` - Cria novo paciente (validação Zod)
- ✅ `PATCH /api/patients/:id` - Atualiza paciente (validação Zod)
- ✅ `DELETE /api/patients/:id` - Remove paciente
- ✅ `GET /api/alerts` - Lista alertas
- ✅ `POST /api/alerts` - Cria alerta
- ✅ `DELETE /api/alerts/:id` - Remove alerta

### Validação de Mobilidade
- Schema Zod valida `mobilidade` como enum: `["A", "D", "DA"]`
- POST e PATCH rejeitam valores inválidos (retorna 400)
- Seed data atualizado com códigos válidos

## Features Mantidas

✅ **Login Page**
- Branding 11Care com logo e imagem de fundo
- Formulário username/password
- Navegação para dashboard de módulos

✅ **Modules Dashboard**
- 3 módulos: Passagem Plantão, Escala Trabalho, Gestão Leitos
- Status "Ativo" vs "Em Breve"
- Cards com gradiente e ícones

✅ **Shift Handover (SBAR)**
- Tabela 18 colunas completa
- Coluna LEITO sticky (horizontal scroll)
- Legenda mobilidade (A, D, DA)
- Busca por paciente/leito
- Estatísticas: completos, pendentes, alertas, críticos, total
- Rows coloridos por criticidade
- Painel de alertas lateral
- Responsive design

## Dependências Principais

### Angular Core
```json
{
  "@angular/core": "^20.3.12",
  "@angular/common": "^20.3.12",
  "@angular/platform-browser": "^20.3.12",
  "@angular/router": "^20.3.12",
  "@angular/forms": "^20.3.12",
  "@angular/animations": "^20.3.12",
  "@angular/cli": "^20.3.10",
  "@angular/compiler-cli": "^20.3.12",
  "@angular-devkit/build-angular": "^20.3.10"
}
```

### Build & Dev
```json
{
  "typescript": "5.8",
  "rxjs": "^7.8.1",
  "zone.js": "^0.15.0",
  "tslib": "^2.8.1"
}
```

### Backend (Mantido)
```json
{
  "express": "^4.21.2",
  "drizzle-orm": "^0.39.1",
  "drizzle-zod": "^0.7.0",
  "zod": "^3.24.2"
}
```

## Removido da Aplicação

❌ **React Dependencies**
- react, react-dom
- @tanstack/react-query
- react-hook-form
- @hookform/resolvers
- wouter
- All @radix-ui packages
- framer-motion
- next-themes

❌ **Build Tools**
- @vitejs/plugin-react
- vite (configuração)
- @replit/vite-plugin-* packages

❌ **Arquivos React**
- `client-react/` (removido)
- `vite.config.ts` (deprecado)
- `server/vite.ts` (deprecado)

## Troubleshooting

### Angular dev server não inicia
```bash
# Verificar porta 4200 disponível
lsof -ti:4200 | xargs kill -9

# Reiniciar
bash dev.sh
```

### Erro de proxy no Express
```bash
# Verificar se Angular está rodando em 4200
curl http://localhost:4200

# Se não estiver, iniciar Angular primeiro
npx ng serve --port 4200
```

### Erro de build
```bash
# Limpar cache
rm -rf dist/ .angular/

# Rebuild
bash build.sh
```

## Próximos Passos

1. ✅ **Migração Core Completa**
2. ⏳ **Atualizar Workflow** (aguardando ação manual)
3. 📝 **Testar End-to-End** (após workflow configurado)
4. 🧹 **Cleanup Final** (remover dependências React do package.json)
5. 📚 **Atualizar replit.md** com nova arquitetura

## Suporte

Para dúvidas sobre a migração:
- Documentação Angular: https://angular.dev
- Angular CLI: https://angular.dev/cli
- RxJS: https://rxjs.dev
