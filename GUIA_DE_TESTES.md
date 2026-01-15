# Guia Rápido de Testes

## ✅ Como Executar os Testes

### Executar todos os testes uma vez

```bash
npm test
```

### Executar testes em modo de observação (reexecuta quando arquivos mudam)

```bash
npm test
```
*(Pressione `q` para sair)*

### Executar testes com interface visual

```bash
npm run test:ui
```
*(Abre uma interface web em http://localhost:51204)*

### Gerar relatório de cobertura

```bash
npm run test:coverage
```
*(Cria um relatório HTML em `/coverage/index.html`)*

---

## 📊 Status Atual

✅ **27 testes passando** (100%)

- **10 testes** - Hook de busca e filtro
- **11 testes** - Serviço de criptografia
- **6 testes** - Componente Button

---

## 📁 Estrutura de Testes

```
FrontendPlantao/
├── client/src/
│   ├── components/ui/
│   │   ├── button.tsx
│   │   └── button.test.tsx  ← Testes do componente
│   │
│   └── hooks/
│       ├── use-search-filter.ts
│       └── use-search-filter.test.ts  ← Testes do hook
│
├── server/services/
│   ├── encryption.service.ts
│   └── encryption.service.test.ts  ← Testes do serviço
│
├── test/
│   └── setup.ts  ← Configuração global de testes
│
└── vitest.config.ts  ← Configuração do Vitest
```

---

## 🧪 Como Adicionar Novos Testes

### 1. Para Componentes React

Crie um arquivo `.test.tsx` ao lado do componente:

```typescript
// client/src/components/MeuComponente.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MeuComponente } from './MeuComponente';

describe('MeuComponente', () => {
  it('deve renderizar', () => {
    render(<MeuComponente />);
    expect(screen.getByText('Olá')).toBeInTheDocument();
  });
});
```

### 2. Para Hooks

Crie um arquivo `.test.ts` ao lado do hook:

```typescript
// client/src/hooks/use-meu-hook.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useMeuHook } from './use-meu-hook';

describe('useMeuHook', () => {
  it('deve retornar valor inicial', () => {
    const { result } = renderHook(() => useMeuHook());
    expect(result.current.value).toBe(0);
  });
});
```

### 3. Para Serviços/Funções

Crie um arquivo `.test.ts` ao lado do serviço:

```typescript
// server/services/meu-servico.test.ts
import { describe, it, expect } from 'vitest';
import { meuServico } from './meu-servico';

describe('meuServico', () => {
  it('deve processar dados', () => {
    const resultado = meuServico.processar('teste');
    expect(resultado).toBe('TESTE');
  });
});
```

---

## 🎯 O que Testar

### ✅ Sempre testar

- **Lógica de negócio** - Cálculos, validações, transformações
- **Componentes críticos** - Formulários, botões de ação
- **Serviços** - APIs, criptografia, validações
- **Hooks customizados** - Lógica reutilizável

### ⚠️ Pode pular

- **Componentes visuais simples** - Apenas mostram dados
- **Types/Interfaces** - TypeScript já valida
- **Configurações** - Arquivos de config

---

## 💡 Dicas

### Nomear testes claramente

```typescript
// ✅ Bom
it('deve retornar erro quando username inválido', () => {})

// ❌ Ruim
it('teste de validação', () => {})
```

### Um teste, uma coisa

```typescript
// ✅ Bom - testa apenas o clique
it('deve chamar onClick quando clicado', async () => {
  const handleClick = vi.fn();
  render(<Button onClick={handleClick}>Clique</Button>);
  await userEvent.click(screen.getByText('Clique'));
  expect(handleClick).toHaveBeenCalled();
});

// ❌ Ruim - testa muitas coisas
it('deve funcionar', async () => {
  // testa renderização
  // testa clique
  // testa estado
  // testa props
});
```

### Arrange, Act, Assert

```typescript
it('deve somar dois números', () => {
  // Arrange (preparar)
  const a = 2;
  const b = 3;

  // Act (executar)
  const resultado = somar(a, b);

  // Assert (verificar)
  expect(resultado).toBe(5);
});
```

---

## 🐛 Resolver Problemas

### Teste falha ao importar módulo

```
Error: Cannot find module './meu-arquivo'
```

**Solução**: Verificar o caminho do import está correto.

### Teste de componente falha

```
Error: document is not defined
```

**Solução**: Já está configurado! Se persistir, verificar se `environment: 'jsdom'` está no `vitest.config.ts`.

### Cobertura baixa

**Solução**: Adicionar mais testes! Meta: 70%+

---

## 📚 Recursos

- **Documentação completa**: `TESTING.md`
- **Vitest Docs**: https://vitest.dev/
- **React Testing Library**: https://testing-library.com/react
- **Exemplos**: Veja os arquivos `.test.tsx` e `.test.ts` existentes

---

## ✨ Resumo Rápido

```bash
# Rodar testes
npm test

# Ver interface visual
npm run test:ui

# Ver cobertura
npm run test:coverage
```

**Tudo está configurado e funcionando! 27 testes passando! 🎉**
