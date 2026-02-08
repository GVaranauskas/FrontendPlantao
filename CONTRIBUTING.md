# Guia de Contribuição

Obrigado por considerar contribuir com o **11Care Nursing Platform**! Este documento fornece diretrizes e padrões para contribuições ao projeto.

## 📋 Índice

- [Código de Conduta](#código-de-conduta)
- [Como Contribuir](#como-contribuir)
- [Padrões de Código](#padrões-de-código)
- [Convenções de Nomenclatura](#convenções-de-nomenclatura)
- [Estrutura de Commits](#estrutura-de-commits)
- [Processo de Pull Request](#processo-de-pull-request)
- [Testes](#testes)
- [Documentação](#documentação)

## 📜 Código de Conduta

- Seja respeitoso e profissional
- Aceite críticas construtivas
- Foque no que é melhor para a comunidade
- Mantenha a confidencialidade de dados sensíveis (LGPD)

## 🤝 Como Contribuir

### 1. Fork e Clone

```bash
git clone https://github.com/seu-usuario/FrontendPlantao.git
cd FrontendPlantao
```

### 2. Crie uma Branch

```bash
git checkout -b feature/nome-da-feature
# ou
git checkout -b fix/nome-do-bug
```

### 3. Faça suas Alterações

Siga os padrões de código descritos abaixo.

### 4. Teste Localmente

```bash
npm run build
npm run typecheck
```

### 5. Commit e Push

```bash
git add .
git commit -m "feat: adiciona nova funcionalidade"
git push origin feature/nome-da-feature
```

### 6. Abra um Pull Request

Descreva claramente o que foi alterado e por quê.

## 💻 Padrões de Código

### TypeScript

- **Sempre use TypeScript** - Evite `any`, prefira tipos explícitos
- **Strict mode** habilitado - Respeite as regras do tsconfig
- **Interfaces vs Types**: Use `interface` para objetos extensíveis, `type` para uniões/interseções

```typescript
// ✅ Bom
interface User {
  id: number;
  name: string;
  role: 'admin' | 'enfermagem' | 'visualizador';
}

// ❌ Evitar
const user: any = { ... };
```

### React

- **Functional Components** - Use hooks ao invés de class components
- **Props Typing** - Sempre defina tipos para props

```typescript
// ✅ Bom
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export function Button({ label, onClick, variant = 'primary' }: ButtonProps) {
  return <button onClick={onClick}>{label}</button>;
}
```

- **Hooks customizados** - Prefixe com `use` e coloque em `/client/src/hooks/`
- **Componentes pequenos** - Mantenha componentes focados e reutilizáveis

### Backend

- **Layered Architecture** - Mantenha separação clara:
  ```
  Routes → Middleware → Services → Repositories → Database
  ```

- **Error Handling** - Use `AppError` para erros estruturados:

```typescript
// ✅ Bom
throw new AppError('Usuário não encontrado', 404);

// ❌ Evitar
throw new Error('User not found');
```

- **Campos N8N** - Sempre use `ensureString()` para campos vindos do N8N, **nunca** `|| ""`:

```typescript
// ❌ ERRADO - Arrays são truthy, || "" não os detecta
diagnostico: dadosBrutos.diagnostico || "",

// ✅ CORRETO - Converte arrays para string, trata null/undefined
diagnostico: ensureString(dadosBrutos.diagnostico),
```

- **Validação** - Use Zod para validação de entrada:

```typescript
import { z } from 'zod';

const userSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
});
```

### Estilização

- **Tailwind CSS** - Use classes utilitárias ao invés de CSS custom
- **Design System** - Siga as cores da marca 11Care (ver `design_guidelines.md`)
- **Responsividade** - Sempre teste em mobile e desktop

```typescript
// ✅ Bom
<div className="flex items-center justify-between p-4 bg-primary-light">
```

## 🏷️ Convenções de Nomenclatura

### Arquivos

- **Componentes React**: `PascalCase.tsx` (ex: `PatientCard.tsx`)
- **Hooks**: `kebab-case.ts` com prefixo `use-` (ex: `use-auto-sync.ts`)
- **Services**: `kebab-case.service.ts` (ex: `patients.service.ts`)
- **Utilitários**: `kebab-case.ts` (ex: `date-utils.ts`)
- **Types**: `types.ts` ou `[nome].types.ts`

### Código

```typescript
// Variáveis e funções: camelCase
const patientData = ...;
function fetchPatients() { ... }

// Componentes e Classes: PascalCase
class ApiService { ... }
function PatientCard() { ... }

// Constantes: UPPER_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;
const API_BASE_URL = ...;

// Enums: PascalCase
enum UserRole {
  Admin = 'admin',
  Enfermagem = 'enfermagem',
  Visualizador = 'visualizador',
}
```

### Branches

- `feature/[nome]` - Novas funcionalidades
- `fix/[nome]` - Correções de bugs
- `refactor/[nome]` - Refatorações
- `docs/[nome]` - Documentação
- `chore/[nome]` - Tarefas de manutenção

## 📝 Estrutura de Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

```
<tipo>[escopo opcional]: <descrição>

[corpo opcional]

[rodapé opcional]
```

### Tipos

- `feat`: Nova funcionalidade
- `fix`: Correção de bug
- `docs`: Apenas documentação
- `style`: Formatação (não afeta código)
- `refactor`: Refatoração de código
- `perf`: Melhoria de performance
- `test`: Adicionar/modificar testes
- `chore`: Tarefas de manutenção
- `security`: Correções de segurança

### Exemplos

```bash
feat(shift-handover): adiciona filtro por enfermaria
fix(auth): corrige validação de token JWT
docs: atualiza guia de contribuição
refactor(api): simplifica serviço de pacientes
security(encryption): atualiza algoritmo AES para GCM
```

### Descrição

- Use **imperativo** ("adiciona" não "adicionado")
- Primeira letra **minúscula**
- Sem ponto final
- Máximo **72 caracteres**

### Corpo (opcional)

```
feat(ai): implementa análise em batch

Adiciona endpoint para análise de múltiplos pacientes
simultaneamente, reduzindo tempo de processamento em 60%.

Refs: #123
```

### Breaking Changes

```
feat(api)!: altera estrutura de resposta da API

BREAKING CHANGE: O campo 'data' agora retorna um objeto
ao invés de array. Atualizar clientes para usar 'data.items'.
```

## 🔄 Processo de Pull Request

### Checklist

Antes de abrir um PR, verifique:

- [ ] Código segue os padrões de estilo
- [ ] TypeScript compila sem erros (`npm run build`)
- [ ] Não há erros de lint
- [ ] Testei localmente (funciona no cliente e servidor)
- [ ] Adicionei/atualizei documentação se necessário
- [ ] Commits seguem o padrão Conventional Commits
- [ ] Branch está atualizada com a main

### Título do PR

Siga o mesmo padrão de commits:

```
feat(shift-handover): adiciona exportação para PDF
```

### Descrição do PR

Use este template:

```markdown
## Descrição
Breve descrição do que foi alterado e por quê.

## Tipo de Mudança
- [ ] Nova funcionalidade (feat)
- [ ] Correção de bug (fix)
- [ ] Breaking change (mudança que quebra compatibilidade)
- [ ] Refatoração
- [ ] Documentação

## Como Testar
1. Passo a passo para testar
2. Casos de teste importantes
3. Screenshots se aplicável

## Checklist
- [ ] Código testado localmente
- [ ] Documentação atualizada
- [ ] TypeScript compila sem erros
- [ ] Segue padrões de código

## Issues Relacionadas
Closes #123
```

### Review

- Responda aos comentários prontamente
- Seja receptivo ao feedback
- Faça alterações solicitadas em novos commits
- **Não faça force push** após o PR estar aberto

## 🧪 Testes

### Frontend

```typescript
// Em desenvolvimento - guidelines virão aqui
// Usar: React Testing Library + Vitest
```

### Backend

```typescript
// Em desenvolvimento - guidelines virão aqui
// Usar: Vitest + Supertest
```

### Testes Manuais

Sempre teste:

1. **Login/Logout** - Autenticação funciona
2. **CRUD Operations** - Criar, ler, atualizar, deletar
3. **Validação** - Inputs inválidos são rejeitados
4. **Permissões** - Roles têm acesso correto
5. **Responsividade** - Funciona em mobile/desktop
6. **Performance** - Sem travamentos ou lentidão

## 📚 Documentação

### Quando Documentar

- **Sempre**: Funções públicas complexas
- **Sempre**: APIs e endpoints
- **Às vezes**: Lógica de negócio não óbvia
- **Nunca**: Código autoexplicativo

### Comentários de Código

```typescript
// ✅ Bom - explica o "porquê"
// Usamos AES-256-GCM ao invés de AES-256-CBC para garantir
// integridade dos dados além de confidencialidade (LGPD Art. 46)
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

// ❌ Ruim - explica o óbvio
// Cria um cipher
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
```

### JSDoc

Use para funções públicas complexas:

```typescript
/**
 * Sincroniza paciente com análise de IA
 *
 * @param patientId - ID do paciente a sincronizar
 * @param forceRefresh - Força nova análise ignorando cache
 * @returns Promise com dados atualizados do paciente
 * @throws {AppError} Se paciente não encontrado (404)
 */
async function syncPatient(
  patientId: number,
  forceRefresh: boolean = false
): Promise<Patient> {
  // ...
}
```

### README em Módulos

Para módulos complexos, adicione um README.md:

```
/client/src/components/shift-handover/
  ├── README.md              # Explica o módulo
  ├── PatientTable.tsx
  ├── PatientDetailsModal.tsx
  └── ...
```

## 🔒 Segurança

### Nunca Commitar

- ❌ Senhas ou secrets
- ❌ `.env` ou `.env.local`
- ❌ Tokens de API
- ❌ Chaves de criptografia
- ❌ Dados reais de pacientes

### Boas Práticas

- ✅ Use variáveis de ambiente
- ✅ Valide todas entradas de usuário
- ✅ Sanitize dados antes de exibir
- ✅ Use prepared statements (Drizzle faz isso)
- ✅ Audite operações sensíveis

## 🐛 Reportando Bugs

Use o template de issue:

```markdown
**Descrição**
Descrição clara do bug

**Como Reproduzir**
1. Vá para '...'
2. Clique em '...'
3. Veja o erro

**Comportamento Esperado**
O que deveria acontecer

**Screenshots**
Se aplicável

**Ambiente**
- Browser: Chrome 120
- OS: Windows 11
- Versão: v1.2.3
```

## 💡 Sugerindo Funcionalidades

Use o template de issue:

```markdown
**Problema a Resolver**
Qual problema esta feature resolve?

**Solução Proposta**
Descrição da solução

**Alternativas Consideradas**
Outras abordagens possíveis

**Contexto Adicional**
Mockups, exemplos, etc.
```

## 📞 Contato

- **Issues**: Para bugs e features
- **Discussions**: Para perguntas gerais
- **Email**: [seu-email@11care.com]

---

**Obrigado por contribuir! 🎉**
