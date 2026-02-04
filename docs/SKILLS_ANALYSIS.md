# Análise de Skills para o Projeto 11Care

## Sumário Executivo

Este documento apresenta uma análise completa das skills que podem ser criadas para o projeto 11Care (FrontendPlantao), organizadas em quatro categorias principais:

1. **Otimização do Trabalho** - Automação e produtividade
2. **Segurança** - Proteção de dados e sistemas
3. **LGPD** - Conformidade com a Lei Geral de Proteção de Dados
4. **Proteção contra Erros** - Salvaguardas para usuários inexperientes

---

## 1. Skills de Otimização do Trabalho

### 1.1 Skill: Validador de Build e Deploy

**Objetivo:** Automatizar a validação completa antes de cada deploy

**Funcionalidades:**
```bash
# Comando sugerido
npm run skill:validate-deploy
```

**Checklist automático:**
- [ ] Verificar se `npm run check` (TypeScript) passa sem erros
- [ ] Verificar se `npm run build` completa com sucesso
- [ ] Validar variáveis de ambiente obrigatórias
- [ ] Verificar conexão com banco de dados
- [ ] Validar chave de criptografia (formato e tamanho)
- [ ] Testar endpoints críticos (healthcheck)
- [ ] Verificar se não há `console.log` em produção
- [ ] Validar que migrations estão sincronizadas

**Implementação sugerida:**
```typescript
// server/scripts/validate-deploy.ts
import { validateEnv } from '../config/env';
import { db } from '../lib/database';
import { encryptionService } from '../services/encryption.service';

async function validateDeploy() {
  const checks = [];

  // 1. Validar ambiente
  try {
    validateEnv();
    checks.push({ name: 'Variáveis de ambiente', status: 'OK' });
  } catch (e) {
    checks.push({ name: 'Variáveis de ambiente', status: 'FALHOU', error: e.message });
  }

  // 2. Testar banco de dados
  try {
    await db.execute('SELECT 1');
    checks.push({ name: 'Conexão BD', status: 'OK' });
  } catch (e) {
    checks.push({ name: 'Conexão BD', status: 'FALHOU', error: e.message });
  }

  // 3. Validar criptografia
  try {
    const test = encryptionService.encrypt('test');
    encryptionService.decrypt(test);
    checks.push({ name: 'Criptografia', status: 'OK' });
  } catch (e) {
    checks.push({ name: 'Criptografia', status: 'FALHOU', error: e.message });
  }

  return checks;
}
```

---

### 1.2 Skill: Gerador de Código Padronizado

**Objetivo:** Gerar código seguindo os padrões do projeto automaticamente

**Funcionalidades:**
```bash
# Gerar novo endpoint CRUD completo
npm run skill:generate endpoint pacientes-pendentes

# Gerar novo componente React
npm run skill:generate component PatientCard

# Gerar novo hook customizado
npm run skill:generate hook usePatientSync
```

**Templates gerados:**
1. **Endpoint:** Route + Service + Repository + Validação Zod
2. **Componente:** TSX + Types + Hook de dados
3. **Hook:** Custom hook com TanStack Query integrado

**Benefícios:**
- Padronização automática de código
- Redução de erros de digitação
- Conformidade com arquitetura do projeto
- Inclusão automática de audit logging

---

### 1.3 Skill: Sincronizador de Schema

**Objetivo:** Manter schema do banco sincronizado e validado

**Funcionalidades:**
```bash
npm run skill:schema-sync
```

**Ações automáticas:**
- Detectar diferenças entre `shared/schema.ts` e banco de dados
- Gerar migrations automaticamente
- Validar que não há breaking changes
- Backup automático antes de migração
- Rollback automático em caso de falha

---

### 1.4 Skill: Analisador de Performance

**Objetivo:** Identificar gargalos de performance automaticamente

**Funcionalidades:**
```bash
npm run skill:perf-analyze
```

**Análises realizadas:**
- Queries N+1 detectadas no código
- Componentes React sem memoização adequada
- Endpoints sem paginação
- Uso excessivo de memoria
- Tempo de resposta de APIs
- Bundle size do frontend

**Relatório gerado:**
```
=== Análise de Performance 11Care ===

⚠️  ALERTAS:
1. Query N+1 detectada em: server/routes/patients.ts:45
   Sugestão: Usar JOIN ou eager loading

2. Componente sem memo: client/src/components/PatientList.tsx
   Sugestão: Adicionar React.memo() ou useMemo()

3. Endpoint sem paginação: GET /api/audit-logs
   Sugestão: Implementar limit/offset

✅ OK:
- Bundle size: 245KB (abaixo do limite de 500KB)
- Tempo médio de API: 120ms (abaixo do limite de 500ms)
```

---

### 1.5 Skill: Auto-Documentação de API

**Objetivo:** Gerar documentação OpenAPI automaticamente

**Funcionalidades:**
```bash
npm run skill:docs-generate
```

**Saídas:**
- `docs/openapi.yaml` - Especificação OpenAPI 3.0
- `docs/api-reference.html` - Documentação visual
- Validação de que todos endpoints estão documentados
- Exemplos de request/response extraídos do código

---

## 2. Skills de Segurança

### 2.1 Skill: Scanner de Vulnerabilidades

**Objetivo:** Detectar vulnerabilidades de segurança no código

**Funcionalidades:**
```bash
npm run skill:security-scan
```

**Verificações realizadas:**
```typescript
// security-scanner.ts
const securityChecks = [
  // SQL Injection
  {
    pattern: /\$\{.*\}.*SELECT|INSERT|UPDATE|DELETE/gi,
    severity: 'CRÍTICO',
    message: 'Possível SQL Injection detectado'
  },

  // XSS
  {
    pattern: /dangerouslySetInnerHTML/g,
    severity: 'ALTO',
    message: 'Uso de dangerouslySetInnerHTML detectado'
  },

  // Hardcoded Secrets
  {
    pattern: /(password|secret|key|token)\s*[:=]\s*['"][^'"]+['"]/gi,
    severity: 'CRÍTICO',
    message: 'Possível secret hardcoded'
  },

  // Console.log em produção
  {
    pattern: /console\.(log|debug|info)/g,
    severity: 'MÉDIO',
    message: 'Console.log deve ser removido em produção'
  },

  // Eval perigoso
  {
    pattern: /eval\s*\(/g,
    severity: 'CRÍTICO',
    message: 'Uso de eval() detectado'
  },

  // Senhas fracas
  {
    pattern: /password.*length.*[<]\s*8/gi,
    severity: 'ALTO',
    message: 'Validação de senha pode ser insuficiente'
  }
];
```

**Relatório:**
```
=== Security Scan 11Care ===
Data: 2024-01-15 10:30:00

🔴 CRÍTICO: 0
🟠 ALTO: 1
🟡 MÉDIO: 3
🟢 BAIXO: 5

Detalhes:
[ALTO] client/src/components/RichTextEditor.tsx:45
  - dangerouslySetInnerHTML detectado
  - Recomendação: Usar DOMPurify para sanitização

[MÉDIO] server/routes/debug.ts:12
  - console.log detectado
  - Recomendação: Usar logger apropriado
```

---

### 2.2 Skill: Validador de Dependências

**Objetivo:** Verificar vulnerabilidades em dependências

**Funcionalidades:**
```bash
npm run skill:deps-audit
```

**Verificações:**
- `npm audit` com análise de severidade
- Dependências desatualizadas com vulnerabilidades conhecidas
- Licenças incompatíveis com uso comercial
- Dependências abandonadas (sem updates há mais de 2 anos)

**Ações automáticas:**
- Sugerir atualizações seguras
- Bloquear deploy se vulnerabilidades críticas
- Gerar relatório para compliance

---

### 2.3 Skill: Monitor de Acessos Suspeitos

**Objetivo:** Detectar padrões de acesso anormais em tempo real

**Funcionalidades:**
```bash
npm run skill:access-monitor
```

**Detecções:**
```typescript
const suspiciousPatterns = {
  // Múltiplas tentativas de login falhadas
  bruteForce: {
    threshold: 5,
    window: '5 minutes',
    action: 'block_ip_30min'
  },

  // Acesso a muitos pacientes em pouco tempo
  dataScraping: {
    threshold: 100,
    window: '10 minutes',
    action: 'alert_admin'
  },

  // Tentativa de acesso a recursos não autorizados
  authorizationBypass: {
    threshold: 3,
    window: '1 minute',
    action: 'logout_user'
  },

  // Acesso fora do horário normal
  afterHoursAccess: {
    startHour: 22,
    endHour: 6,
    action: 'log_enhanced'
  },

  // Mudança de IP durante sessão
  sessionHijacking: {
    action: 'invalidate_session'
  }
};
```

---

### 2.4 Skill: Rotação Automática de Chaves

**Objetivo:** Automatizar a rotação de chaves de criptografia

**Funcionalidades:**
```bash
npm run skill:key-rotation
```

**Processo:**
1. Gerar nova chave de criptografia
2. Re-criptografar dados existentes em background
3. Manter chave antiga para rollback (7 dias)
4. Atualizar variável de ambiente
5. Invalidar caches
6. Notificar administradores
7. Gerar relatório de auditoria

**Segurança adicional:**
- Backup da chave antiga em vault seguro
- Log de todas as operações de rotação
- Teste de integridade após rotação

---

### 2.5 Skill: Testes de Penetração Automatizados

**Objetivo:** Executar testes de segurança automatizados

**Funcionalidades:**
```bash
npm run skill:pentest
```

**Testes realizados:**
- Injeção SQL em todos os inputs
- XSS refletido e armazenado
- CSRF token bypass attempts
- Authentication bypass
- Rate limit bypass
- Path traversal
- IDOR (Insecure Direct Object Reference)

---

## 3. Skills de LGPD

### 3.1 Skill: Validador de Conformidade LGPD

**Objetivo:** Verificar conformidade com a LGPD automaticamente

**Funcionalidades:**
```bash
npm run skill:lgpd-check
```

**Checklist automático:**
```typescript
const lgpdChecklist = {
  // Art. 7 - Base legal
  legalBasis: {
    check: 'Verificar se há base legal documentada para cada tratamento',
    files: ['SECURITY.md', 'PRIVACY_POLICY.md']
  },

  // Art. 9 - Dados sensíveis
  sensitiveData: {
    check: 'Verificar se dados sensíveis estão criptografados',
    fields: ['nome', 'diagnostico', 'dataNascimento', 'registro']
  },

  // Art. 18 - Direitos do titular
  userRights: {
    check: 'Verificar se endpoints de direitos do titular existem',
    endpoints: [
      '/api/lgpd/export/patient/:id',     // Acesso
      '/api/patients/:id',                 // Correção (PUT)
      '/api/lgpd/anonymize/history/:id',  // Eliminação
      '/api/lgpd/data-categories'          // Informação
    ]
  },

  // Art. 37 - Registro de operações
  auditLog: {
    check: 'Verificar se todas operações são logadas',
    tables: ['audit_logs']
  },

  // Art. 46 - Segurança
  security: {
    check: 'Verificar medidas de segurança implementadas',
    measures: ['encryption', 'authentication', 'authorization', 'rate_limiting']
  },

  // Art. 50 - Boas práticas
  bestPractices: {
    check: 'Verificar documentação de políticas',
    docs: ['SECURITY.md', 'CONTRIBUTING.md']
  }
};
```

**Relatório gerado:**
```
=== Relatório de Conformidade LGPD ===
Data: 2024-01-15
Versão: 1.0.0

✅ CONFORMES:
- Art. 9 (Dados sensíveis): Todos campos criptografados
- Art. 37 (Registro): Audit log implementado
- Art. 46 (Segurança): Medidas adequadas

⚠️  ATENÇÃO NECESSÁRIA:
- Art. 18, §2º (Prazo): Verificar se respostas são dadas em 15 dias
- Art. 41 (DPO): Designar encarregado de dados

📋 RECOMENDAÇÕES:
1. Documentar procedimento de resposta a incidentes
2. Treinar equipe sobre LGPD
3. Revisar política de retenção de dados
```

---

### 3.2 Skill: Gerador de Relatório de Impacto (RIPD)

**Objetivo:** Gerar Relatório de Impacto à Proteção de Dados

**Funcionalidades:**
```bash
npm run skill:lgpd-ripd
```

**Conteúdo gerado:**
1. Descrição do tratamento de dados
2. Categorias de dados tratados
3. Finalidade do tratamento
4. Base legal
5. Medidas de segurança
6. Riscos identificados
7. Medidas de mitigação

---

### 3.3 Skill: Monitor de Consentimento

**Objetivo:** Rastrear e validar consentimentos

**Funcionalidades:**
```bash
npm run skill:consent-monitor
```

**Verificações:**
- Consentimentos válidos e não expirados
- Histórico de alterações de consentimento
- Alertas quando consentimento próximo de expirar
- Relatório de consentimentos por finalidade

---

### 3.4 Skill: Anonimizador de Dados

**Objetivo:** Anonimizar dados para pesquisa e estatísticas

**Funcionalidades:**
```bash
npm run skill:anonymize --dataset=patients --output=research_data.json
```

**Técnicas aplicadas:**
- Remoção de identificadores diretos (nome, CPF, registro)
- Generalização de datas (apenas mês/ano)
- Supressão de campos únicos
- K-anonimato (mínimo k=5)
- Perturbação de dados numéricos

---

### 3.5 Skill: Detector de Vazamento de Dados

**Objetivo:** Detectar possíveis vazamentos de dados pessoais

**Funcionalidades:**
```bash
npm run skill:leak-detect
```

**Verificações:**
- Logs contendo dados pessoais
- Respostas de API com dados não autorizados
- Cache contendo dados sensíveis
- Arquivos temporários com dados pessoais
- Console.log com informações de pacientes

**Exemplo de detecção:**
```
=== Leak Detection Report ===

🔴 CRÍTICO:
- server/logs/app-2024-01-15.log:1234
  Contém: CPF em texto claro
  Ação: Remover log, revisar código

🟠 ALTO:
- Resposta GET /api/patients inclui campo 'cpf'
  Ação: Filtrar campo sensível na resposta
```

---

## 4. Skills de Proteção contra Erros

### 4.1 Skill: Validador de Commits

**Objetivo:** Prevenir commits problemáticos

**Funcionalidades:**
```bash
# Instalado como git hook
.git/hooks/pre-commit
```

**Verificações antes do commit:**
```typescript
const commitValidations = [
  // Arquivos proibidos
  {
    check: 'Não commitar arquivos sensíveis',
    blocked: ['.env', '.env.*', '*.pem', '*.key', 'credentials.*']
  },

  // Tamanho de arquivos
  {
    check: 'Arquivos muito grandes',
    maxSize: '5MB',
    warning: '1MB'
  },

  // Padrões perigosos
  {
    check: 'Código perigoso',
    patterns: [
      'TODO.*REMOVER',
      'FIXME.*URGENTE',
      'password.*=.*[\'"]',
      'localhost.*:.*5000'
    ]
  },

  // Branch protection
  {
    check: 'Commits diretos em main/master',
    blockedBranches: ['main', 'master', 'production']
  },

  // TypeScript errors
  {
    check: 'Erros de TypeScript',
    command: 'npm run check'
  }
];
```

**Exemplo de bloqueio:**
```
❌ COMMIT BLOQUEADO

Razões:
1. Arquivo .env.local detectado - Nunca commitar arquivos .env
2. Padrão 'password = "123456"' encontrado em config.ts:45
3. Commit direto na branch 'main' não permitido

Sugestões:
1. Remova .env.local do staging: git reset HEAD .env.local
2. Remova a senha hardcoded e use variável de ambiente
3. Crie uma branch de feature: git checkout -b feature/minha-feature
```

---

### 4.2 Skill: Modo Seguro de Desenvolvimento

**Objetivo:** Ambiente de desenvolvimento com proteções extras

**Funcionalidades:**
```bash
npm run skill:dev-safe
```

**Proteções ativadas:**
- Dados de pacientes sempre mocados (nunca dados reais)
- Queries destrutivas (DELETE, DROP) bloqueadas
- Limite de registros afetados por query (max 10)
- Confirmação visual antes de alterações em massa
- Rollback automático disponível para todas operações

**Implementação:**
```typescript
// safe-mode.middleware.ts
export function safeModeMiddleware(req, res, next) {
  if (process.env.SAFE_MODE !== 'true') {
    return next();
  }

  // Bloquear operações destrutivas
  if (req.method === 'DELETE') {
    return res.status(403).json({
      error: 'SAFE_MODE_ENABLED',
      message: 'DELETE bloqueado em modo seguro. Use npm run dev para desativar.'
    });
  }

  // Limitar atualizações em massa
  if (req.method === 'PUT' || req.method === 'PATCH') {
    const affectedCount = await countAffectedRecords(req);
    if (affectedCount > 10) {
      return res.status(403).json({
        error: 'SAFE_MODE_LIMIT',
        message: `Operação afetaria ${affectedCount} registros. Máximo: 10`
      });
    }
  }

  next();
}
```

---

### 4.3 Skill: Guia Interativo de Desenvolvimento

**Objetivo:** Guiar novos desenvolvedores com assistente inteligente

**Funcionalidades:**
```bash
npm run skill:guide
```

**Menu interativo:**
```
=== 11Care Development Guide ===

O que você deseja fazer?

1. 🆕 Criar novo endpoint
2. 🎨 Criar novo componente
3. 🔧 Modificar schema do banco
4. 🧪 Executar testes
5. 📦 Preparar deploy
6. ❓ Tirar dúvidas sobre o projeto

Escolha uma opção: _
```

**Fluxo guiado para criar endpoint:**
```
Você escolheu: Criar novo endpoint

Qual o nome do recurso? (ex: medicamentos): _

Quais operações deseja? (CRUD)
[x] Create (POST)
[x] Read (GET)
[x] Update (PUT)
[ ] Delete (DELETE)

Quais campos o recurso terá?
- nome (string, obrigatório): _
- dosagem (string, opcional): _
- + Adicionar campo

Gerando arquivos...
✅ server/routes/medicamentos.ts
✅ server/services/medicamentos.service.ts
✅ server/repositories/medicamentos.repository.ts
✅ shared/schema.ts (atualizado)
✅ client/src/services/medicamentos.ts

Próximos passos:
1. Revise os arquivos gerados
2. Execute: npm run db:push
3. Teste o endpoint: curl http://localhost:5000/api/medicamentos
```

---

### 4.4 Skill: Revisor de Código Automático

**Objetivo:** Revisar código antes de merge

**Funcionalidades:**
```bash
npm run skill:code-review
```

**Verificações automáticas:**
```typescript
const codeReviewChecks = {
  // Padrões do projeto
  patterns: {
    'Usar Zod para validação': /insertSchema|selectSchema/,
    'Usar asyncHandler': /asyncHandler/,
    'Usar logger em vez de console': /logger\.(info|error|warn|debug)/,
    'Criptografar campos sensíveis': /encryptionService\.(encrypt|decrypt)/
  },

  // Anti-padrões
  antiPatterns: {
    'Evitar any': /:\s*any\b/,
    'Evitar console.log': /console\.(log|debug)/,
    'Evitar require()': /require\s*\(/,
    'Evitar hardcoded URLs': /http:\/\/localhost/
  },

  // Complexidade
  complexity: {
    maxFunctionLength: 50,    // linhas
    maxFileLength: 300,       // linhas
    maxNestingLevel: 4,       // níveis de indentação
    maxParameters: 5          // parâmetros por função
  },

  // Documentação
  documentation: {
    requireJSDoc: ['service', 'repository', 'middleware'],
    requireComments: ['complex_logic']
  }
};
```

**Relatório:**
```
=== Code Review: PR #45 ===

📊 Score: 78/100

✅ APROVADO (com sugestões)

Problemas encontrados:

🟡 SUGESTÃO: server/services/new-feature.ts:45
   Função muito longa (67 linhas). Considere dividir.

🟡 SUGESTÃO: server/routes/new-feature.ts:12
   Faltando validação Zod. Use insertNewFeatureSchema.

🟢 BOM: Criptografia aplicada corretamente
🟢 BOM: Audit logging implementado
🟢 BOM: Tipos TypeScript corretos
```

---

### 4.5 Skill: Sandbox de Testes

**Objetivo:** Ambiente isolado para testes sem risco

**Funcionalidades:**
```bash
npm run skill:sandbox
```

**Características:**
- Banco de dados separado (cópia do schema, dados mocados)
- Dados de teste gerados automaticamente
- Reset automático após cada sessão
- Nenhuma conexão com serviços externos reais
- Métricas de cobertura de testes

**Comandos do sandbox:**
```
=== 11Care Sandbox ===

Comandos disponíveis:
- reset    : Restaurar dados originais
- populate : Gerar dados de teste (100 pacientes)
- snapshot : Salvar estado atual
- restore  : Restaurar snapshot
- query    : Executar query SQL segura
- exit     : Sair do sandbox

sandbox> populate
Gerando 100 pacientes fictícios...
✅ Dados gerados com sucesso

sandbox> query SELECT COUNT(*) FROM patients
Result: 100

sandbox> _
```

---

### 4.6 Skill: Detector de Breaking Changes

**Objetivo:** Detectar mudanças que quebram compatibilidade

**Funcionalidades:**
```bash
npm run skill:breaking-changes
```

**Análise:**
```typescript
const breakingChangeDetectors = [
  // Schema changes
  {
    type: 'database',
    check: 'Remoção de colunas',
    severity: 'CRÍTICO'
  },
  {
    type: 'database',
    check: 'Alteração de tipo de coluna',
    severity: 'ALTO'
  },

  // API changes
  {
    type: 'api',
    check: 'Remoção de endpoints',
    severity: 'CRÍTICO'
  },
  {
    type: 'api',
    check: 'Alteração de formato de resposta',
    severity: 'ALTO'
  },
  {
    type: 'api',
    check: 'Novos campos obrigatórios',
    severity: 'MÉDIO'
  },

  // Frontend changes
  {
    type: 'frontend',
    check: 'Alteração de props de componentes',
    severity: 'MÉDIO'
  }
];
```

**Relatório:**
```
=== Breaking Change Analysis ===

Comparando: main...feature/new-patient-fields

🔴 BREAKING CHANGES DETECTADOS:

1. [DATABASE] Coluna 'idade' removida de 'patients'
   - Impacto: Queries existentes vão falhar
   - Solução: Criar migration de deprecação primeiro

2. [API] Campo 'cpf' removido de GET /api/patients/:id
   - Impacto: Clientes dependentes vão quebrar
   - Solução: Manter campo como deprecated por 30 dias

⚠️  ATENÇÃO NECESSÁRIA:

1. [API] Novo campo obrigatório 'unidadeId' em POST /api/patients
   - Impacto: Requests existentes podem falhar
   - Solução: Tornar opcional com valor default

✅ MUDANÇAS SEGURAS:
- 3 novos endpoints adicionados
- 5 novos campos opcionais
- 2 novos componentes React
```

---

### 4.7 Skill: Backup e Restore Automatizado

**Objetivo:** Sistema de backup com restore fácil

**Funcionalidades:**
```bash
# Criar backup
npm run skill:backup create

# Listar backups
npm run skill:backup list

# Restaurar backup
npm run skill:backup restore --id=backup_2024-01-15_10-30

# Backup automático antes de operações arriscadas
npm run skill:backup auto-enable
```

**Características:**
- Backup automático antes de migrations
- Backup diário programado
- Retenção configurável (30 dias default)
- Restore seletivo (tabelas específicas)
- Verificação de integridade

---

## 5. Matriz de Priorização

### 5.1 Impacto vs Esforço

| Skill | Impacto | Esforço | Prioridade |
|-------|---------|---------|------------|
| Validador de Commits | Alto | Baixo | 🔴 URGENTE |
| Scanner de Vulnerabilidades | Alto | Médio | 🔴 URGENTE |
| Validador LGPD | Alto | Médio | 🔴 URGENTE |
| Modo Seguro Dev | Alto | Médio | 🟠 ALTA |
| Validador de Deploy | Médio | Baixo | 🟠 ALTA |
| Detector Breaking Changes | Alto | Alto | 🟠 ALTA |
| Guia Interativo | Médio | Médio | 🟡 MÉDIA |
| Revisor de Código | Médio | Alto | 🟡 MÉDIA |
| Gerador de Código | Médio | Alto | 🟡 MÉDIA |
| Sandbox de Testes | Médio | Alto | 🟡 MÉDIA |
| Rotação de Chaves | Alto | Alto | 🟢 PLANEJADA |
| Analisador de Performance | Baixo | Alto | 🟢 PLANEJADA |

### 5.2 Roadmap Sugerido

**Fase 1 - Fundação (2-4 semanas)**
1. Validador de Commits (git hooks)
2. Scanner de Vulnerabilidades básico
3. Validador de Conformidade LGPD

**Fase 2 - Proteção (4-6 semanas)**
4. Modo Seguro de Desenvolvimento
5. Validador de Build e Deploy
6. Detector de Breaking Changes

**Fase 3 - Produtividade (6-8 semanas)**
7. Guia Interativo de Desenvolvimento
8. Revisor de Código Automático
9. Gerador de Código Padronizado

**Fase 4 - Avançado (8-12 semanas)**
10. Sandbox de Testes completo
11. Rotação Automática de Chaves
12. Analisador de Performance

---

## 6. Implementação Recomendada

### 6.1 Estrutura de Diretórios

```
FrontendPlantao/
├── skills/
│   ├── security/
│   │   ├── vulnerability-scanner.ts
│   │   ├── dependency-audit.ts
│   │   ├── access-monitor.ts
│   │   └── key-rotation.ts
│   │
│   ├── lgpd/
│   │   ├── compliance-validator.ts
│   │   ├── ripd-generator.ts
│   │   ├── consent-monitor.ts
│   │   ├── data-anonymizer.ts
│   │   └── leak-detector.ts
│   │
│   ├── protection/
│   │   ├── commit-validator.ts
│   │   ├── safe-mode.ts
│   │   ├── code-reviewer.ts
│   │   ├── breaking-change-detector.ts
│   │   └── backup-restore.ts
│   │
│   ├── productivity/
│   │   ├── deploy-validator.ts
│   │   ├── code-generator.ts
│   │   ├── schema-sync.ts
│   │   ├── perf-analyzer.ts
│   │   └── docs-generator.ts
│   │
│   └── guides/
│       ├── interactive-guide.ts
│       └── sandbox.ts
│
├── .husky/
│   ├── pre-commit
│   └── pre-push
│
└── package.json (scripts atualizados)
```

### 6.2 Scripts no package.json

```json
{
  "scripts": {
    "skill:validate-deploy": "tsx skills/productivity/deploy-validator.ts",
    "skill:generate": "tsx skills/productivity/code-generator.ts",
    "skill:schema-sync": "tsx skills/productivity/schema-sync.ts",
    "skill:perf-analyze": "tsx skills/productivity/perf-analyzer.ts",
    "skill:docs-generate": "tsx skills/productivity/docs-generator.ts",

    "skill:security-scan": "tsx skills/security/vulnerability-scanner.ts",
    "skill:deps-audit": "tsx skills/security/dependency-audit.ts",
    "skill:access-monitor": "tsx skills/security/access-monitor.ts",
    "skill:key-rotation": "tsx skills/security/key-rotation.ts",

    "skill:lgpd-check": "tsx skills/lgpd/compliance-validator.ts",
    "skill:lgpd-ripd": "tsx skills/lgpd/ripd-generator.ts",
    "skill:consent-monitor": "tsx skills/lgpd/consent-monitor.ts",
    "skill:anonymize": "tsx skills/lgpd/data-anonymizer.ts",
    "skill:leak-detect": "tsx skills/lgpd/leak-detector.ts",

    "skill:code-review": "tsx skills/protection/code-reviewer.ts",
    "skill:breaking-changes": "tsx skills/protection/breaking-change-detector.ts",
    "skill:backup": "tsx skills/protection/backup-restore.ts",
    "skill:dev-safe": "SAFE_MODE=true npm run dev",

    "skill:guide": "tsx skills/guides/interactive-guide.ts",
    "skill:sandbox": "tsx skills/guides/sandbox.ts"
  }
}
```

---

## 7. Conclusão

Este documento apresentou **17 skills** que podem ser implementadas para:

1. **Otimizar o trabalho**: 5 skills de produtividade
2. **Garantir segurança**: 5 skills de proteção de dados
3. **Garantir LGPD**: 5 skills de conformidade
4. **Proteger contra erros**: 7 skills de prevenção

### Benefícios Esperados

| Área | Melhoria Esperada |
|------|-------------------|
| Tempo de desenvolvimento | -30% (com geradores e guias) |
| Bugs em produção | -60% (com validadores) |
| Vulnerabilidades | -80% (com scanners) |
| Conformidade LGPD | 100% (com validadores) |
| Onboarding de devs | -50% tempo (com guias) |
| Incidentes de segurança | -90% (com proteções) |

### Próximos Passos

1. Revisar este documento com a equipe
2. Priorizar skills conforme necessidade
3. Começar pela Fase 1 (Fundação)
4. Implementar CI/CD para automatizar skills
5. Documentar cada skill implementada

---

*Documento gerado em: 2024*
*Versão: 1.0.0*
*Projeto: 11Care (FrontendPlantao)*
