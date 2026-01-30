# 🔒 PROMPTS DE CORREÇÃO DE SEGURANÇA - REPLIT

Execute estes prompts em ordem no Replit Agent. Copie e cole cada etapa completamente.

---

## 1️⃣ ETAPA 1: CONFIGURAÇÃO & HEADERS (30min)

```
ETAPA 1: Correções de Configuração de Segurança

Faça as seguintes correções mantendo todas as funcionalidades atuais:

1. CORRIGIR CSP - server/security.ts linha 11-20:
   - Remover 'unsafe-eval' de scriptSrc
   - Remover 'unsafe-inline' de scriptSrc
   - Manter apenas ["'self'", "https:"]

2. CORRIGIR SAMESITE - server/middleware/cookies.ts linhas 12 e 25:
   - Mudar sameSite de 'none' para 'strict' em accessCookieOptions
   - Mudar sameSite de 'none' para 'strict' em refreshCookieOptions
   - Manter secure: true

3. REMOVER SENHAS HARDCODED - server/routes/auth.ts linhas 50-51:
   - Remover fallback '|| admin123' e '|| enf123'
   - Adicionar validação que lança erro se env vars não existirem:
     if (!process.env.DEFAULT_ADMIN_PASSWORD) throw new Error(...)
   - NUNCA retornar senhas nas respostas (remover linhas 84-86)

4. FORÇAR ENCRYPTION_KEY - server/services/encryption.service.ts linha 16-21:
   - Remover o if (isProductionEnv) condicional
   - SEMPRE lançar erro se masterKeyBase64 estiver vazio
   - Adicionar comentário: "Encryption is mandatory in all environments"

5. ADICIONAR VALIDAÇÃO NO .env.example:
   - Documentar que ENCRYPTION_KEY, DEFAULT_ADMIN_PASSWORD são OBRIGATÓRIOS
   - Adicionar exemplo de como gerar: npm run generate-encryption-key

Após as mudanças:
- Verificar que a aplicação ainda compila
- Verificar que não há erros de TypeScript
- NÃO faça commit ainda
```

**Teste:**
```bash
npm run check && npm run build
```

---

## 2️⃣ ETAPA 2: AUTENTICAÇÃO & SESSÕES (1h)

```
ETAPA 2: Melhorias de Autenticação e Rate Limiting

Implemente as seguintes melhorias de segurança:

1. REDUZIR JWT EXPIRY - server/security/jwt.ts linha 14:
   - Mudar JWT_EXPIRY de '24h' para '15m'
   - Manter REFRESH_EXPIRY em '7d'
   - Adicionar comentário explicando: "Short-lived access tokens reduce attack window"

2. MELHORAR RATE LIMITING - server/security.ts linhas 66-73:
   - authLimiter: Reduzir max de 5 para 3 tentativas
   - authLimiter: Adicionar standardHeaders: true
   - authLimiter: Adicionar legacyHeaders: false
   - Melhorar mensagem de erro: "Too many login attempts. Try again in 15 minutes."

3. ADICIONAR RATE LIMIT POR USERNAME (NOVO):
   - Criar novo middleware em server/middleware/login-rate-limit.ts
   - Usar Map<username, {attempts, lastAttempt}>
   - Bloquear após 3 tentativas no mesmo username
   - Resetar após 15 minutos
   - Aplicar ANTES do authLimiter em /api/auth/login

4. VALIDAR TOKEN VERSION - server/security/jwt.ts linha 75-85:
   - No verifyToken, adicionar validação explícita:
     if (!payload.instanceId || payload.instanceId !== STABLE_INSTANCE_ID) {
       throw new Error('Token version mismatch');
     }
   - Logar tentativas de uso de tokens antigos

5. MELHORAR SECURE FLAG - server/middleware/cookies.ts:
   - Adicionar validação: if (isProductionEnv && !req.secure) throw error
   - Garantir que em produção HTTPS é obrigatório

Após as mudanças:
- Testar login e refresh token flow
- Verificar que rate limiting está funcionando (tente 4 logins incorretos)
- Confirmar que tokens expiram em 15 minutos
```

**Teste Manual:**
```
1. Login normal - deve funcionar
2. Esperar 15 min - access token expira
3. Refresh automático deve funcionar
4. 4 logins incorretos - deve bloquear
```

---

## 3️⃣ ETAPA 3: PROTEÇÃO DE DADOS (1.5h)

```
ETAPA 3: Proteção e Controle de Acesso a Dados

Implemente proteções para dados sensíveis:

1. ADICIONAR PAGINAÇÃO OBRIGATÓRIA - server/routes.ts linha 449-464:

   // GET /api/patients
   - Adicionar query params: page (default: 1), limit (default: 50, max: 100)
   - Validar: if (limit > 100) limit = 100
   - Implementar offset: (page - 1) * limit
   - Retornar metadata: { patients, total, page, totalPages, hasNext }
   - Atualizar storage.getAllPatients() para aceitar (limit, offset)

2. FILTRAR CAMPOS DE USUÁRIO - server/repositories/postgres-storage.ts linha 9-20:

   // getAllUsers()
   - Substituir db.select().from(users) por:
     db.select({
       id: users.id,
       username: users.username,
       email: users.email,
       name: users.name,
       role: users.role,
       isActive: users.isActive,
       createdAt: users.createdAt,
       lastLogin: users.lastLogin,
       tokenVersion: users.tokenVersion
     }).from(users)
   - NUNCA incluir password ou passwordHash

3. MELHORAR CSRF PROTECTION - server/middleware/csrf.ts linha 37-43:

   - Remover bypass completo para API routes
   - Validar que Bearer token está presente:
     const hasValidAuth = req.headers.authorization?.startsWith('Bearer ')
   - Se não tiver Bearer token, EXIGIR CSRF token
   - Adicionar comentário explicando a lógica

4. ADICIONAR VALIDAÇÃO DE ACESSO POR ENFERMARIA (NOVO):

   - Criar middleware: server/middleware/validate-access.ts
   - Verificar se usuário tem permissão para acessar leitos/enfermarias específicas
   - Se role === 'enfermagem', validar que está atribuído àquela enfermaria
   - Se role === 'admin', permitir tudo
   - Aplicar em: GET /api/patients/:id, PUT /api/patients/:id, DELETE /api/patients/:id

5. SANITIZAR LOGS - server/middleware/audit.ts:

   - Criar função sanitizeForLog(data) que remove:
     * Campos: password, token, authorization
     * CPF (mascarar: XXX.XXX.XXX-12)
     * Email (mostrar só domínio: ***@example.com)
   - Aplicar em todos os logs de auditoria

6. MELHORAR DESCRIPTOGRAFIA - server/services/encryption.service.ts linha 116-119:

   - Quando descriptografia falhar, NUNCA retornar ciphertext
   - Lançar erro: throw new Error('Decryption failed')
   - Logar erro para investigação
   - Frontend deve tratar erro gracefully

Após as mudanças:
- Testar endpoint /api/patients com paginação
- Verificar que campos de senha não aparecem em /api/users
- Confirmar que CSRF ainda funciona para formulários
- Testar que enfermeiros só veem seus pacientes
```

**Testes API:**
```
GET /api/patients?page=1&limit=10
GET /api/patients?limit=200 (deve limitar a 100)
GET /api/users (sem campo password)
```

---

## 4️⃣ ETAPA 4: LGPD COMPLIANCE (2h)

```
ETAPA 4: Implementação de Conformidade LGPD

Adicione recursos para compliance com LGPD:

1. CRIAR ENDPOINT DE PORTABILIDADE DE DADOS (Art. 18):

   // GET /api/patients/:id/export
   - Retornar JSON completo com TODOS os dados do paciente
   - Formato estruturado: { patient: {...}, history: [...], observations: [...] }
   - Incluir metadata: exportedAt, exportedBy
   - Logar ação no audit log
   - Apenas admin ou enfermeiro atribuído pode exportar

2. IMPLEMENTAR DATA RETENTION POLICY (Art. 16):

   - Criar arquivo: server/services/data-retention.service.ts
   - Política: Dados de pacientes inativos > 5 anos são marcados para exclusão
   - Criar campo: patients.scheduledForDeletion (date nullable)
   - Cron job (opcional): Marcar pacientes para exclusão
   - Criar endpoint: POST /api/admin/data-retention/review
     * Lista pacientes agendados para exclusão
     * Admin pode aprovar ou rejetar exclusão
   - Endpoint DELETE efetivo apenas após aprovação admin

3. ADICIONAR CONSENTIMENTO (Art. 8):

   - Adicionar campo ao schema: patients.dataProcessingConsent (boolean, default: false)
   - Criar endpoint: POST /api/patients/:id/consent
     * Body: { consentGiven: boolean, consentType: 'dataProcessing' | 'dataSharing' }
     * Logar no audit: "Consent granted/revoked for patient X"
   - Validar que consent foi dado antes de processar dados sensíveis
   - Frontend deve solicitar consent no cadastro

4. IMPLEMENTAR ANONIMIZAÇÃO (Art. 12):

   - Criar função: anonymizePatient(patientId)
   - Substituir:
     * name -> "Paciente Anônimo [ID hash]"
     * registration -> "ANON-[random]"
     * dateOfBirth -> null ou age range
   - Manter ID para integridade relacional
   - Criar endpoint: POST /api/patients/:id/anonymize
   - Apenas admin pode anonimizar
   - Processo é IRREVERSÍVEL - confirmar com admin

5. CRIAR RELATÓRIO DE CONFORMIDADE (Art. 37):

   - Criar endpoint: GET /api/admin/lgpd-report
   - Retornar:
     * Total de pacientes com consent
     * Total de pacientes agendados para exclusão
     * Total de acessos a dados sensíveis (últimos 30 dias)
     * Total de pacientes anonimizados
     * Últimas exportações de dados
   - Formato: JSON e CSV para auditoria

6. DOCUMENTAR POLÍTICAS:

   - Criar arquivo: PRIVACY_POLICY.md
   - Incluir:
     * Tipos de dados coletados
     * Finalidade do processamento
     * Prazo de retenção (5 anos)
     * Direitos dos titulares
     * Como exercer direitos (contato DPO)
   - Criar arquivo: LGPD_COMPLIANCE.md
   - Detalhar todas as medidas implementadas

Após as mudanças:
- Testar endpoint de exportação
- Verificar que anonimização funciona
- Confirmar que consent é registrado
- Validar relatório LGPD
```

**Testes LGPD:**
```
GET /api/patients/:id/export
POST /api/patients/:id/consent
POST /api/patients/:id/anonymize
GET /api/admin/lgpd-report
```

---

## 🎯 APÓS TODAS AS ETAPAS

### Commit e Push:
```bash
git add .
git commit -m "security: implement comprehensive security fixes and LGPD compliance

- Fix CSP to remove unsafe-eval and unsafe-inline
- Change cookies to sameSite strict
- Remove hardcoded passwords
- Enforce encryption in all environments
- Reduce JWT expiry to 15 minutes
- Implement username-based rate limiting
- Add mandatory pagination for patient data
- Filter sensitive fields from user queries
- Improve CSRF protection
- Add patient data portability (LGPD Art. 18)
- Implement data retention policy (LGPD Art. 16)
- Add consent management (LGPD Art. 8)
- Implement patient anonymization (LGPD Art. 12)
- Create LGPD compliance reports (LGPD Art. 37)

https://claude.ai/code/session_[SEU_SESSION_ID]"

git push -u origin claude/security-audit-fuRfV
```

### Criar Pull Request:
```bash
gh pr create --title "Security Audit Fixes & LGPD Compliance" --body "$(cat <<'EOF'
## 🔒 Security Audit Fixes & LGPD Compliance

### Summary
Comprehensive security fixes addressing 18 identified vulnerabilities and LGPD compliance gaps.

### Changes

#### 🔴 Critical Fixes
- ✅ Removed hardcoded passwords ('admin123', 'enf123')
- ✅ Fixed CSP (removed unsafe-eval, unsafe-inline)
- ✅ Changed cookies to sameSite: 'strict'
- ✅ Enforced encryption in all environments
- ✅ Reduced JWT expiry to 15 minutes
- ✅ Filtered password fields from database queries

#### 🟠 High Priority
- ✅ Implemented mandatory pagination (max 100 records)
- ✅ Enhanced rate limiting (3 attempts)
- ✅ Added username-based rate limiting
- ✅ Improved CSRF protection

#### 🔵 LGPD Compliance
- ✅ Patient data portability (Art. 18)
- ✅ Data retention policy (Art. 16)
- ✅ Consent management (Art. 8)
- ✅ Patient anonymization (Art. 12)
- ✅ Compliance reports (Art. 37)

### Breaking Changes
- **JWT tokens now expire in 15 minutes** (previously 24h)
  - Refresh token flow handles this automatically
  - Users may need to re-login more frequently
- **Pagination is now mandatory**
  - GET /api/patients requires ?page=1&limit=50
  - Maximum 100 records per request

### Testing Done
- ✅ All TypeScript checks pass
- ✅ Build succeeds
- ✅ Manual testing of authentication flow
- ✅ Rate limiting verified
- ✅ Pagination tested
- ✅ LGPD endpoints tested

### Security Improvements
- OWASP A2 (Broken Authentication): Fixed
- OWASP A5 (Broken Access Control): Fixed
- OWASP A7 (XSS): Mitigated via CSP
- LGPD Articles 8, 12, 16, 18, 37: Implemented

### Documentation
- Added PRIVACY_POLICY.md
- Added LGPD_COMPLIANCE.md
- Updated .env.example

https://claude.ai/code/session_[SEU_SESSION_ID]
EOF
)"
```

---

## 📊 MÉTRICAS DE SUCESSO

Após implementar todas as etapas:

### Vulnerabilidades Corrigidas:
- ✅ 7 Críticas
- ✅ 3 Altas
- ✅ 5+ Médias

### LGPD Compliance:
- ✅ Art. 8 (Consentimento)
- ✅ Art. 12 (Anonimização)
- ✅ Art. 16 (Retenção)
- ✅ Art. 18 (Portabilidade)
- ✅ Art. 37 (Relatórios)

### Testes de Segurança:
```bash
# Executar após tudo:
npm run security-audit (se disponível)
npm audit
npm run test (se houver testes)
```

---

## 🆘 SUPORTE

Se encontrar problemas em qualquer etapa:
1. Verifique os logs no console do Replit
2. Execute `npm run build` para ver erros de compilação
3. Revise as mudanças com `git diff`
4. Em caso de bloqueio, reverta: `git checkout .`

**Importante:** Cada etapa é independente. Se uma falhar, você pode pular e voltar depois.
