# Backup do Sistema 11Care

## Informações Gerais

- **Data e Hora**: 2025-12-09 11:25:13 UTC
- **Node.js Version**: v20.19.3
- **Total de Arquivos .ts/.tsx**: 3631 (incluindo shadcn/ui components)

---

## Dependências (package.json)

### Dependências de Produção

| Pacote | Versão |
|--------|--------|
| @hookform/resolvers | ^3.10.0 |
| @neondatabase/serverless | ^0.10.4 |
| @radix-ui/react-* | Vários (UI components) |
| @tanstack/react-query | ^5.60.5 |
| @toon-format/toon | ^1.4.0 |
| bcryptjs | ^3.0.3 |
| class-variance-authority | ^0.7.1 |
| clsx | ^2.1.1 |
| cookie-parser | ^1.4.7 |
| csurf | ^1.11.0 |
| date-fns | ^3.6.0 |
| drizzle-orm | ^0.39.1 |
| drizzle-zod | ^0.7.0 |
| exceljs | ^4.4.0 |
| express | ^4.21.2 |
| express-rate-limit | ^8.2.1 |
| express-session | ^1.18.1 |
| framer-motion | ^11.13.1 |
| helmet | ^8.1.0 |
| jsonwebtoken | ^9.0.2 |
| lucide-react | ^0.453.0 |
| memorystore | ^1.6.7 |
| node-cron | ^4.2.1 |
| passport | ^0.7.0 |
| passport-local | ^1.0.0 |
| react | ^18.3.1 |
| react-dom | ^18.3.1 |
| react-hook-form | ^7.55.0 |
| recharts | ^2.15.2 |
| tailwind-merge | ^2.6.0 |
| wouter | ^3.3.5 |
| ws | ^8.18.0 |
| zod | ^3.24.2 |

### Dependências de Desenvolvimento

| Pacote | Versão |
|--------|--------|
| @vitejs/plugin-react | ^4.7.0 |
| drizzle-kit | ^0.31.4 |
| esbuild | ^0.25.0 |
| tailwindcss | ^3.4.17 |
| tsx | ^4.20.5 |
| typescript | 5.6.3 |
| vite | ^5.4.20 |

---

## Estrutura de Diretórios

```
/
├── attached_assets/          # Imagens e arquivos anexados
├── client/
│   ├── public/               # Arquivos estáticos (favicon)
│   └── src/
│       ├── components/       # Componentes React
│       │   └── ui/           # Componentes shadcn/ui
│       ├── hooks/            # Custom hooks
│       ├── lib/              # Utilitários e contextos
│       └── pages/            # Páginas da aplicação
├── server/
│   ├── lib/                  # Database e logger
│   ├── middleware/           # Middlewares Express
│   ├── repositories/         # Camada de persistência
│   ├── routes/               # Rotas modulares
│   ├── scripts/              # Scripts utilitários
│   ├── security/             # JWT e validação N8N
│   └── services/             # Serviços de negócio
└── shared/                   # Schema compartilhado
```

---

## Arquivos de Middleware (server/middleware/)

| Arquivo | Tamanho | Última Modificação |
|---------|---------|-------------------|
| auth.ts | 1655 bytes | Nov 27 13:56 |
| cookies.ts | 929 bytes | Nov 27 13:56 |
| csrf.ts | 1037 bytes | Nov 27 13:56 |
| error-handler.ts | 2273 bytes | Nov 26 16:12 |
| n8n-validation.ts | 895 bytes | Nov 27 13:57 |
| rbac.ts | 1951 bytes | Nov 27 13:56 |

---

## Arquivos de Segurança (server/security/)

| Arquivo | Tamanho | Última Modificação |
|---------|---------|-------------------|
| jwt.ts | 2104 bytes | Dec 02 13:16 |
| n8n-validation.ts | 1086 bytes | Nov 27 13:56 |

---

## Linhas Comentadas em server/index.ts

| Linha | Conteúdo |
|-------|----------|
| 15 | Trust proxy for accurate IP detection |
| 18 | Apply security middleware first |
| 22 | Cookie parser middleware |
| 25-26 | CSRF protection setup - DESABILITADO |
| 34 | Custom TOON body parser middleware |
| 63 | Optional authentication middleware |
| 84-85 | CSRF error handler - DESABILITADO |
| 87-92 | Comentários sobre ordem de middleware |
| 99-101 | Auto-sync scheduler - DESABILITADO (movido para frontend) |
| 103-106 | Comentários sobre porta do servidor |

### Funcionalidades Desabilitadas:
- **CSRF Protection** (linha 26): `setupCSRF(app)` comentado
- **CSRF Error Handler** (linha 85): `csrfErrorHandler` comentado
- **Backend Auto-Sync Scheduler** (linha 101): `importScheduler.startDefaultSchedule()` comentado

---

## Variáveis de Ambiente

| Variável | Status |
|----------|--------|
| DATABASE_URL | ✅ Configurado |
| SESSION_SECRET | ✅ Configurado |
| PGDATABASE | ✅ Configurado |
| PGHOST | ✅ Configurado |
| PGPORT | ✅ Configurado |
| PGUSER | ✅ Configurado |
| PGPASSWORD | ✅ Configurado |

---

## Páginas da Aplicação

| Página | Arquivo |
|--------|---------|
| Login | login.tsx |
| Módulos | modules.tsx |
| Passagem de Plantão | shift-handover.tsx |
| Menu Admin | admin-menu.tsx |
| Gerenciar Usuários | admin-users.tsx |
| Templates | admin-templates.tsx |
| Analytics | analytics.tsx |
| Logs de Importação | import-logs.tsx |
| Painel de Importação | import-panel.tsx |
| Importação Manual | import.tsx |
| Dashboard | dashboard.tsx |
| Debug/Visualizador JSON | debug.tsx |
| Visualizador de Textos | text-viewer.tsx |
| Ferramentas | tools.tsx |

---

## APIs Externas Integradas

| API | Endpoint | Uso |
|-----|----------|-----|
| N8N | https://dev-n8n.7care.com.br/webhook/evolucoes | Dados de evolução de pacientes |

---

## Notas de Segurança

- Vulnerabilidades corrigidas: 13 → 7 (0 altas)
- React 18.3.1 (não afetado por CVE-2025-55182)
- JWT com invalidação por reinício do servidor (sid)
- CSRF desabilitado temporariamente
- Excel export migrado de xlsx para exceljs

---

## Criptografia de Dados Sensíveis (LGPD Art. 46)

**Implementado em**: 2025-12-09

### Algoritmo
- **AES-256-GCM** (Galois/Counter Mode)
- Salt único por registro (64 bytes)
- IV único por criptografia (16 bytes)
- AuthTag para verificação de integridade (16 bytes)

### Campos Criptografados (Pacientes)
| Campo | Descrição |
|-------|-----------|
| nome | Nome do paciente |
| registro | Número de registro |
| dataNascimento | Data de nascimento |
| diagnostico | Diagnóstico principal |
| alergias | Alergias conhecidas |
| observacoes | Observações e intercorrências |
| dsEvolucaoCompleta | Evolução completa do N8N |

### Arquivos Relacionados
- `server/services/encryption.service.ts` - Serviço de criptografia
- `server/repositories/postgres-storage.ts` - Integração com PostgreSQL
- `server/scripts/generate-encryption-key.ts` - Gerador de chaves

### Variável de Ambiente
| Variável | Descrição |
|----------|-----------|
| ENCRYPTION_KEY | Chave Base64 de 32 bytes (AES-256) |

### Comportamento
- Se ENCRYPTION_KEY não estiver definida, criptografia é desabilitada (fallback)
- Dados legados em texto plano são retornados sem erro (compatibilidade)
- Novos dados são sempre criptografados quando serviço está ativo

---

*Backup gerado automaticamente em 2025-12-09*
*Atualizado com implementação de criptografia em 2025-12-09*
