# Estratégia de Testes

Guia completo de testes para o **11Care Nursing Platform**.

## 📋 Índice

- [Status Atual](#status-atual)
- [Estratégia de Testes](#estratégia-de-testes)
- [Pirâmide de Testes](#pirâmide-de-testes)
- [Testes Unitários](#testes-unitários)
- [Testes de Integração](#testes-de-integração)
- [Testes E2E](#testes-e2e)
- [Testes de Segurança](#testes-de-segurança)
- [Testes de Performance](#testes-de-performance)
- [Setup de Testes](#setup-de-testes)
- [CI/CD](#cicd)
- [Melhores Práticas](#melhores-práticas)

## 📊 Status Atual

### Implementação de Testes

| Tipo | Status | Coverage | Prioridade |
|------|--------|----------|------------|
| Unitários | 🔴 Não implementado | 0% | Alta |
| Integração | 🔴 Não implementado | 0% | Alta |
| E2E | 🔴 Não implementado | 0% | Média |
| Segurança | 🟡 Manual | - | Alta |
| Performance | 🔴 Não implementado | - | Baixa |

### Roadmap

**Fase 1** (Curto prazo):
- [ ] Setup Vitest + React Testing Library
- [ ] Testes unitários para serviços críticos
- [ ] Testes de integração para API
- [ ] CI/CD com GitHub Actions

**Fase 2** (Médio prazo):
- [ ] Testes E2E com Playwright
- [ ] Coverage > 70%
- [ ] Testes de segurança automatizados

**Fase 3** (Longo prazo):
- [ ] Testes de performance (k6/Artillery)
- [ ] Visual regression testing
- [ ] Coverage > 90%

## 🎯 Estratégia de Testes

### Objetivos

1. **Confiabilidade**: Garantir que funcionalidades críticas funcionem
2. **Regressão**: Detectar bugs ao modificar código
3. **Documentação**: Testes como documentação viva
4. **Velocidade**: Feedback rápido no desenvolvimento
5. **Segurança**: Validar proteções de segurança

### Prioridades

#### Alta Prioridade (Testar sempre)

- ✅ Autenticação e autorização
- ✅ Criptografia de dados (LGPD)
- ✅ Validação de entrada (SQL injection, XSS)
- ✅ CRUD de pacientes
- ✅ Integração N8N
- ✅ Sistema de IA (custos!)

#### Média Prioridade

- 🟡 CRUD de usuários
- 🟡 CRUD de enfermarias
- 🟡 Sistema de notas
- 🟡 Auditoria

#### Baixa Prioridade

- ⚪ UI components (já testados via Radix)
- ⚪ Utilitários simples
- ⚪ Estilos

## 🏔️ Pirâmide de Testes

```
        ┌─────────────┐
        │     E2E     │  ← Poucos (10-20 testes)
        │  (Lentos)   │     Fluxos críticos
        └─────────────┘
             ▲
      ┌──────────────┐
      │  Integração  │    ← Moderados (50-100 testes)
      │   (Médios)   │       API + DB
      └──────────────┘
            ▲
    ┌───────────────────┐
    │    Unitários      │  ← Muitos (200+ testes)
    │    (Rápidos)      │     Funções isoladas
    └───────────────────┘
```

### Distribuição Recomendada

- **70%** Unitários (rápidos, isolados)
- **20%** Integração (API + DB)
- **10%** E2E (fluxos completos)

## 🧪 Testes Unitários

### Stack

- **Vitest**: Test runner (compatível com Vite)
- **React Testing Library**: Testes de componentes React
- **@testing-library/user-event**: Simulação de interações

### Setup

```bash
npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

**vitest.config.ts**:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.d.ts',
        '**/*.config.*',
      ],
    },
  },
});
```

**test/setup.ts**:
```typescript
import '@testing-library/jest-dom';
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup após cada teste
afterEach(() => {
  cleanup();
});
```

### Exemplos

#### Testar Componente React

```typescript
// client/src/components/ui/button.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Button } from './button';

describe('Button', () => {
  it('deve renderizar com texto', () => {
    render(<Button>Clique aqui</Button>);
    expect(screen.getByText('Clique aqui')).toBeInTheDocument();
  });

  it('deve chamar onClick quando clicado', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Clique</Button>);

    await userEvent.click(screen.getByText('Clique'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('deve estar desabilitado quando disabled=true', () => {
    render(<Button disabled>Desabilitado</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

#### Testar Hook Customizado

```typescript
// client/src/hooks/use-search-filter.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useSearchFilter } from './use-search-filter';

describe('useSearchFilter', () => {
  const mockData = [
    { id: 1, nome: 'João Silva', leito: '101A' },
    { id: 2, nome: 'Maria Santos', leito: '102B' },
  ];

  it('deve filtrar por nome', () => {
    const { result } = renderHook(() => useSearchFilter(mockData));

    act(() => {
      result.current.setSearchTerm('João');
    });

    expect(result.current.filteredData).toHaveLength(1);
    expect(result.current.filteredData[0].nome).toBe('João Silva');
  });

  it('deve retornar todos quando search vazio', () => {
    const { result } = renderHook(() => useSearchFilter(mockData));

    expect(result.current.filteredData).toHaveLength(2);
  });
});
```

#### Testar Serviço (Backend)

```typescript
// server/services/encryption.service.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(() => {
    // Mock ENCRYPTION_KEY
    process.env.ENCRYPTION_KEY = '0'.repeat(64); // 64 char hex
    service = new EncryptionService();
  });

  it('deve criptografar e descriptografar corretamente', () => {
    const plaintext = 'João da Silva';

    const encrypted = service.encrypt(plaintext);

    expect(encrypted.encrypted).toBeTruthy();
    expect(encrypted.iv).toBeTruthy();
    expect(encrypted.authTag).toBeTruthy();

    const decrypted = service.decrypt(encrypted);

    expect(decrypted).toBe(plaintext);
  });

  it('deve gerar IV único a cada criptografia', () => {
    const plaintext = 'Teste';

    const encrypted1 = service.encrypt(plaintext);
    const encrypted2 = service.encrypt(plaintext);

    expect(encrypted1.iv).not.toBe(encrypted2.iv);
    expect(encrypted1.encrypted).not.toBe(encrypted2.encrypted);
  });

  it('deve falhar se authTag for modificado', () => {
    const plaintext = 'Teste';
    const encrypted = service.encrypt(plaintext);

    // Modifica authTag
    encrypted.authTag = 'invalid';

    expect(() => service.decrypt(encrypted)).toThrow();
  });
});
```

### Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage"
  }
}
```

## 🔗 Testes de Integração

### Stack

- **Vitest**: Test runner
- **Supertest**: Testes de API HTTP
- **Test Database**: PostgreSQL separado

### Setup

```bash
npm install -D supertest @types/supertest
```

### Exemplo

```typescript
// server/routes/auth.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../index';
import { db } from '../lib/database';

describe('Auth Routes', () => {
  beforeAll(async () => {
    // Setup test database
    await db.migrate.latest();
  });

  afterAll(async () => {
    // Cleanup
    await db.migrate.rollback();
  });

  describe('POST /api/auth/login', () => {
    it('deve fazer login com credenciais válidas', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'admin123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.user).toHaveProperty('username', 'admin');
    });

    it('deve retornar 401 para credenciais inválidas', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('deve retornar 400 se faltar username', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          password: 'admin123',
        })
        .expect(400);
    });
  });

  describe('GET /api/auth/me', () => {
    it('deve retornar usuário autenticado', async () => {
      // 1. Fazer login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'admin123' });

      const token = loginResponse.body.accessToken;

      // 2. Obter dados do usuário
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.user.username).toBe('admin');
    });

    it('deve retornar 401 sem token', async () => {
      await request(app)
        .get('/api/auth/me')
        .expect(401);
    });
  });
});
```

### Test Database

```typescript
// server/lib/database.test.ts
import { drizzle } from 'drizzle-orm/neon-serverless';

export function createTestDatabase() {
  const testDbUrl = process.env.TEST_DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/frontendplantao_test';

  return drizzle(testDbUrl);
}
```

## 🎭 Testes E2E

### Stack

- **Playwright**: Framework E2E moderno

### Setup

```bash
npm install -D @playwright/test
npx playwright install
```

**playwright.config.ts**:
```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:5000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Exemplo

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Autenticação', () => {
  test('deve fazer login com credenciais válidas', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Deve redirecionar para dashboard
    await expect(page).toHaveURL('/dashboard');

    // Deve exibir nome do usuário
    await expect(page.locator('text=Administrador')).toBeVisible();
  });

  test('deve exibir erro para credenciais inválidas', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Deve exibir mensagem de erro
    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });
});

test.describe('Passagem de Plantão', () => {
  test.beforeEach(async ({ page }) => {
    // Login antes de cada teste
    await page.goto('/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('deve exibir tabela de pacientes', async ({ page }) => {
    await page.goto('/shift-handover');

    // Deve exibir tabela
    await expect(page.locator('table')).toBeVisible();

    // Deve ter header com colunas
    await expect(page.locator('th:has-text("Leito")')).toBeVisible();
    await expect(page.locator('th:has-text("Nome")')).toBeVisible();
  });

  test('deve buscar paciente por nome', async ({ page }) => {
    await page.goto('/shift-handover');

    // Digitar na busca
    await page.fill('input[placeholder*="Buscar"]', 'João');

    // Aguardar filtro
    await page.waitForTimeout(300);

    // Deve exibir apenas resultados filtrados
    const rows = page.locator('tbody tr');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('João');
  });
});
```

### Scripts

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug"
  }
}
```

## 🔒 Testes de Segurança

### Checklist Manual

- [ ] **SQL Injection**: Tentar injetar SQL em inputs
- [ ] **XSS**: Tentar injetar `<script>` em campos
- [ ] **CSRF**: Tentar fazer request sem token CSRF
- [ ] **Auth Bypass**: Tentar acessar rotas sem token
- [ ] **RBAC**: Tentar acessar recursos sem permissão
- [ ] **Rate Limiting**: Fazer múltiplos requests rápidos

### Testes Automatizados

```typescript
// server/middleware/input-validation.test.ts
import { describe, it, expect } from 'vitest';
import { validateInput } from './input-validation';

describe('Input Validation', () => {
  describe('SQL Injection', () => {
    it('deve bloquear SQL injection simples', () => {
      const malicious = "'; DROP TABLE users; --";
      expect(() => validateInput(malicious)).toThrow();
    });

    it('deve bloquear UNION attacks', () => {
      const malicious = "1' UNION SELECT * FROM users--";
      expect(() => validateInput(malicious)).toThrow();
    });
  });

  describe('XSS', () => {
    it('deve bloquear scripts', () => {
      const malicious = '<script>alert("XSS")</script>';
      expect(() => validateInput(malicious)).toThrow();
    });

    it('deve bloquear event handlers', () => {
      const malicious = '<img src=x onerror="alert(1)">';
      expect(() => validateInput(malicious)).toThrow();
    });
  });
});
```

### Ferramentas

- **npm audit**: Vulnerabilidades em dependências
- **OWASP ZAP**: Scanning de vulnerabilidades
- **Snyk**: Security scanning

```bash
# Verificar vulnerabilidades
npm audit

# Fix automático
npm audit fix

# Snyk (requer instalação)
npx snyk test
```

## ⚡ Testes de Performance

### Métricas

- **Latência da API**: < 200ms (p95)
- **Tempo de carregamento**: < 3s
- **Bundle size**: < 500KB
- **First Contentful Paint**: < 1.5s

### Ferramentas

#### k6 (Load Testing)

```bash
npm install -D k6
```

**load-test.js**:
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up
    { duration: '1m', target: 50 },   // Stay at 50 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'], // 95% < 200ms
  },
};

export default function () {
  const res = http.get('http://localhost:5000/api/patients');

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });

  sleep(1);
}
```

```bash
k6 run load-test.js
```

#### Lighthouse (Frontend)

```bash
npm install -D @lhci/cli

# Run lighthouse
lhci autorun
```

## 🛠️ Setup de Testes

### 1. Instalar Dependências

```bash
# Vitest + React Testing Library
npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom

# Supertest (API)
npm install -D supertest @types/supertest

# Playwright (E2E)
npm install -D @playwright/test
npx playwright install
```

### 2. Configurar Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

### 3. Criar Estrutura

```
test/
  ├── setup.ts           # Setup global
  ├── fixtures/          # Dados de teste
  │   └── patients.ts
  └── helpers/           # Helpers de teste
      └── auth.ts

e2e/
  ├── auth.spec.ts
  └── shift-handover.spec.ts
```

## 🔄 CI/CD

### GitHub Actions

**.github/workflows/test.yml**:
```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: frontendplantao_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run type checking
        run: npm run typecheck

      - name: Run unit tests
        run: npm run test:coverage

      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/frontendplantao_test

      - name: Upload coverage
        uses: codecov/codecov-action@v3

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

## ✅ Melhores Práticas

### Geral

1. **AAA Pattern**: Arrange, Act, Assert
2. **Um assert por teste**: Testes focados
3. **Nomes descritivos**: `deve retornar erro quando username inválido`
4. **Isolamento**: Testes não devem depender uns dos outros
5. **Mocks mínimos**: Prefer real implementations

### React Testing Library

```typescript
// ✅ Bom - testa comportamento do usuário
const button = screen.getByRole('button', { name: /submit/i });
await userEvent.click(button);
expect(screen.getByText('Success')).toBeInTheDocument();

// ❌ Ruim - testa implementação
expect(component.state.isLoading).toBe(false);
```

### Avoid

- ❌ Testar detalhes de implementação
- ❌ Testes que quebram com refactor
- ❌ Testes muito longos (> 20 linhas)
- ❌ Magic numbers sem explicação

### Coverage

**Meta**: 70-80% de coverage

**Foco**:
- 100% das funções críticas (auth, crypto, validation)
- 80% dos serviços
- 50% dos componentes UI

**Não priorizar**:
- Arquivos de configuração
- Types/interfaces
- Componentes triviais

## 📚 Recursos

### Documentação

- [Vitest](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright](https://playwright.dev/)
- [Supertest](https://github.com/visionmedia/supertest)

### Guias

- [Kent C. Dodds - Testing](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)

---

**Última atualização**: 2026-01-15

**Contribua**: Adicione testes ao fazer PRs!
