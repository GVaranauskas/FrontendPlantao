# Frontend Plantão

Sistema de gerenciamento de plantões médicos desenvolvido com React, TypeScript e Vite.

## 🚀 Tecnologias

- **React 18** - Biblioteca para construção de interfaces
- **TypeScript** - Superset tipado de JavaScript
- **Vite** - Build tool e dev server extremamente rápido
- **React Router** - Roteamento de aplicações React
- **TanStack Query** - Gerenciamento de estado assíncrono
- **Zustand** - Gerenciamento de estado global
- **Axios** - Cliente HTTP
- **Tailwind CSS** - Framework CSS utility-first
- **Vitest** - Framework de testes rápido
- **ESLint & Prettier** - Linting e formatação de código

## 📦 Pré-requisitos

- Node.js >= 18.0.0
- pnpm >= 8.0.0 (recomendado) ou npm/yarn

## 🛠️ Instalação

```bash
# Clone o repositório
git clone <repository-url>

# Entre no diretório
cd FrontendPlantao

# Instale as dependências
pnpm install
```

## ⚙️ Configuração

1. Copie o arquivo `.env.example` para `.env.development`:

```bash
cp .env.example .env.development
```

2. Configure as variáveis de ambiente conforme necessário:

```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_API_TIMEOUT=30000
VITE_ENABLE_DEV_TOOLS=true
```

## 🏃 Executando o projeto

```bash
# Modo desenvolvimento
pnpm dev

# Build para produção
pnpm build

# Preview do build de produção
pnpm preview
```

## 🧪 Testes

```bash
# Executar testes
pnpm test

# Executar testes com UI
pnpm test:ui

# Executar testes com coverage
pnpm test:coverage
```

## 📝 Scripts disponíveis

| Script | Descrição |
|--------|-----------|
| `pnpm dev` | Inicia o servidor de desenvolvimento |
| `pnpm build` | Cria build de produção |
| `pnpm preview` | Preview do build de produção |
| `pnpm test` | Executa os testes |
| `pnpm lint` | Executa o linter |
| `pnpm lint:fix` | Corrige problemas de linting |
| `pnpm format` | Formata o código |
| `pnpm type-check` | Verifica erros de TypeScript |

## 📁 Estrutura do Projeto

```
FrontendPlantao/
├── .github/
│   └── workflows/          # CI/CD pipelines
├── public/                 # Arquivos estáticos
├── src/
│   ├── app/               # Configuração da aplicação
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── router.tsx
│   ├── components/        # Componentes reutilizáveis
│   │   ├── common/       # Componentes genéricos
│   │   └── layout/       # Componentes de layout
│   ├── features/         # Funcionalidades por domínio
│   │   ├── auth/
│   │   ├── plantao/
│   │   └── dashboard/
│   ├── hooks/            # Custom hooks
│   ├── services/         # Serviços (API, storage)
│   ├── store/            # Estado global (Zustand)
│   ├── types/            # TypeScript types
│   ├── utils/            # Funções utilitárias
│   ├── pages/            # Páginas/Views
│   └── styles/           # Estilos globais
├── .eslintrc.json        # Configuração ESLint
├── .prettierrc           # Configuração Prettier
├── tsconfig.json         # Configuração TypeScript
├── vite.config.ts        # Configuração Vite
└── tailwind.config.js    # Configuração Tailwind
```

## 🏗️ Arquitetura

### Organização por Features

O projeto utiliza uma arquitetura baseada em features/domínios, onde cada funcionalidade principal contém seus próprios componentes, hooks, services e types. Isso facilita:

- **Escalabilidade**: Adicionar novas features sem afetar as existentes
- **Manutenibilidade**: Código relacionado está agrupado
- **Reutilização**: Componentes comuns ficam separados

### Gerenciamento de Estado

- **Zustand**: Estado global da aplicação (auth, configurações)
- **TanStack Query**: Estado do servidor (cache, sincronização)
- **React State**: Estado local dos componentes

### Camadas de Serviço

```typescript
// API Layer
services/api/axios.config.ts  // Configuração HTTP
services/api/endpoints.ts     // Definição de endpoints

// Business Logic
features/plantao/services/    // Lógica de negócio

// UI Layer
features/plantao/components/  // Componentes UI
```

## 🎨 Guia de Estilo

### Componentes

```typescript
// Componente funcional com TypeScript
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
}

export const Button = ({ variant = 'primary', children }: ButtonProps) => {
  return <button className={variant}>{children}</button>;
};
```

### Hooks Customizados

```typescript
// Hook com tipagem
export const useAuth = () => {
  const { user, login, logout } = useAuthStore();
  return { user, login, logout };
};
```

### Serviços de API

```typescript
// Serviço tipado
export const plantaoService = {
  getAll: () => api.get<Plantao[]>(ENDPOINTS.PLANTAO.LIST),
  getById: (id: string) => api.get<Plantao>(ENDPOINTS.PLANTAO.GET_BY_ID(id)),
};
```

## 🔒 Boas Práticas

### TypeScript

- ✅ Sempre use tipos explícitos
- ✅ Evite usar `any`
- ✅ Use interfaces para objetos complexos
- ✅ Ative modo strict

### Componentes

- ✅ Mantenha componentes pequenos e focados
- ✅ Use composição ao invés de herança
- ✅ Extraia lógica para custom hooks
- ✅ Prefira componentes funcionais

### Performance

- ✅ Use lazy loading para rotas
- ✅ Implemente code splitting
- ✅ Memoize computações custosas
- ✅ Otimize re-renders

### Segurança

- ✅ Nunca commite arquivos `.env`
- ✅ Valide inputs do usuário
- ✅ Sanitize dados antes de renderizar
- ✅ Use HTTPS em produção

## 🚀 Deploy

### Build de Produção

```bash
pnpm build
```

Os arquivos otimizados estarão em `dist/`.

### Variáveis de Ambiente

Para produção, configure:

```env
VITE_API_BASE_URL=https://api.production.com
VITE_ENABLE_DEV_TOOLS=false
```

## 🤝 Contribuindo

1. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
2. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
3. Push para a branch (`git push origin feature/AmazingFeature`)
4. Abra um Pull Request

### Commits

Siga o padrão de commits semânticos:

- `feat:` Nova funcionalidade
- `fix:` Correção de bug
- `docs:` Documentação
- `style:` Formatação
- `refactor:` Refatoração
- `test:` Testes
- `chore:` Manutenção

## 📄 Licença

Este projeto está sob a licença MIT.

## 👥 Equipe

- **Desenvolvimento**: Your Team
- **Contato**: your-email@example.com

## 📚 Recursos Adicionais

- [Documentação do React](https://react.dev)
- [Documentação do Vite](https://vitejs.dev)
- [Documentação do TypeScript](https://www.typescriptlang.org)
- [Documentação do TanStack Query](https://tanstack.com/query)
- [Documentação do Tailwind CSS](https://tailwindcss.com)
