# HightJS

> Um framework web full‑stack moderno para Node.js, focado em simplicidade, DX e velocidade. Bundler via esbuild, hot reload, roteamento automático, APIs, autenticação JWT, CLI e muito mais.

---

## 📑 Índice

- [✨ Principais Recursos](#-principais-recursos)
- [🚀 Início Rápido](#-início-rápido)
- [📦 Estrutura Recomendada](#-estrutura-recomendada)
- [🖥️ Rotas Frontend (Páginas)](#-rotas-frontend)
- [🌐 Rotas Backend (API)](#-rotas-backend)
- [🧩 Middlewares](#-middlewares)
- [🔐 Autenticação (HightJS/auth)](#-autenticação-hightjsauth)
- [🛠️ CLI](#-cli)
- [📂 Arquivos Especiais](#-arquivos-especiais)
- [🧱 Adapters](#-adapters)
- [🔐 Segurança Interna](#-segurança-interna)
- [♻️ Hot Reload](#-hot-reload)
- [❓ FAQ Rápido](#-faq-rápido)
- [✅ Checklist Mental](#-checklist-mental)
- [🪪 Licença](#-licença)
---

## ✨ Principais Recursos

- **Roteamento automático** de páginas [`src/web/routes`] e APIs [`src/web/backend/routes`]
- **Middlewares** por pasta ou rota
- **Hot Reload** nativo (WebSocket interno) em dev
- **Layouts globais** e página 404 customizada
- **Metadata** dinâmica por página
- **Build inteligente** (single bundle ou chunks)
- **Adapters**: Native, Express, Fastify
- **Autenticação** JWT embutida (HWebAuth)
- **CLI própria** (`hight`) para dev e produção
- **Entrega de estáticos** (`public/`)
- Segurança, saneamento e limitações nativas

---

## 🚀 Início Rápido

> O mínimo para rodar!

```bash
npm init -y
npm install typescript --save-dev
npx tsc --init
npm install hightjs react@19 react-dom@19 ts-node
npm install --save-dev @types/react
```

Crie um `tsconfig.json` na raiz do projeto:

```json
{
  "compilerOptions": {
    "target": "ES6",
    "module": "CommonJS",
    "jsx": "react",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "moduleResolution": "nodenext"
  },
  "include": ["src/**/*"]
}
```

Estrutura mínima:

```
src/
  web/
    routes/
      index.tsx
```

Exemplo de página inicial em `src/web/routes/index.tsx`:

```tsx
import { RouteConfig } from 'hightjs/client';
import React from 'react';

function Home() {
  return <h1>Bem-vindo ao HightJS 🚀</h1>;
}

export const config: RouteConfig = {
  pattern: '/',
  component: Home,
  generateMetadata: () => ({ title: 'HightJS | Home' })
};
export default config;
```

Rode em modo dev:

```bash
npx hight dev
```

Acesse: [http://localhost:3000](http://localhost:3000)

---

## 📦 Estrutura Recomendada

```
src/
  web/
    layout.tsx              // Layout global (opcional)
    notFound.tsx            // Página 404 customizada (opcional)
    routes/
      index.tsx             // Página inicial "/"
      about.tsx             // Página "/about"
      blog[id].tsx         // Rota dinâmica "/blog/123"
    backend/
      routes/
        middleware.ts       // Middlewares globais da pasta
        version.ts          // Endpoint "/version"
        users/
          middleware.ts     // Middlewares só desse grupo
          list.ts           // Endpoint "/users/list"
```

---

## 🖥️ Rotas Frontend

Cada arquivo em `src/web/routes` é uma página.

```tsx
import { RouteConfig } from 'hightjs/client';
import React from 'react';

function Component() {
  return <h1>HELLO WORLD</h1>;
}

const config: RouteConfig = {
  pattern: '/thanks2',
  component: Component,
  generateMetadata: () => ({ title: 'HightJS | Thanks' })
};
export default config;
```

### Rotas Dinâmicas com Parâmetros

Use colchetes: `blog/[slug].tsx` → `/blog/post`.

```tsx
import {RouteConfig} from "hightjs/client";
import React from "react";

function PostPage({ params }: { params: { id: string } }) {
    const id = params.id
    return (
        <div>
            <h1>Post ID: {id}</h1>
            <p>This is the content of post {id}.</p>
        </div>
    );
}

const config: RouteConfig = {
    pattern: '/post/[id]',
    component: PostPage,
    generateMetadata: async (params) => ({ title: `Post ${params.id}` })
};
export default config

```

### Layout Global

`src/web/layout.tsx`:

```tsx
export const metadata = { title: 'Meu App', description: 'Descrição global' };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}
```

### Página 404

`src/web/notFound.tsx`:

```tsx
export default function NotFound() {
  return <h1>Página não encontrada</h1>;
}
```

---

## 🌐 Rotas Backend

Qualquer arquivo em `src/web/backend/routes` vira endpoint backend.  
O _pattern_ pode ser qualquer caminho, não só `/api/...`!

### Exemplo Simples

`src/web/backend/routes/version.ts`:

```ts
import { HightJSRequest, HightJSResponse, BackendRouteConfig } from 'hightjs';

const route: BackendRouteConfig = {
  pattern: '/version',
  GET: async (_req: HightJSRequest) => {
    return HightJSResponse.json({
      version: '1.0.0',
      name: 'HightJS',
      description: 'Framework web full-stack moderno para Node.js'
    });
  }
};
export default route;
```

### Suporte a Métodos

Defina `GET`, `POST`, `PUT`, `DELETE` (ou só os necessários).

### Rotas Dinâmicas Backend

`src/web/backend/routes/users/[id].ts` → `/users/123`

```ts
import { BackendRouteConfig, HightJSResponse } from "hightjs";

const route: BackendRouteConfig = {
    pattern: '/users/[id]',
    GET: async (req, params) => {
        return HightJSResponse.json({ userId: params.id });
    }
};
export default route;
```

---

## 🧩 Middlewares

Adicione middlewares:

- Direto na rota: `middleware: [...]`
- Arquivo `middleware.ts` na pasta (auto-carregado)

### Interface

```ts
export type HightMiddleware = (
  request: HightJSRequest,
  params: { [key: string]: string },
  next: () => Promise<HightJSResponse>
) => Promise<HightJSResponse> | HightJSResponse;
```

### Exemplo por Pasta

`src/web/backend/routes/middleware.ts`:

```ts
import {HightJSRequest, HightJSResponse} from 'hightjs';

export async function log(
    request: HightJSRequest,
    params: { [key: string]: string },
    next: () => Promise<HightJSResponse>
): Promise<HightJSResponse> {

    console.log('[API]', request.method, request.url);
    return next();
}


export async function blockLegacy(
    request: HightJSRequest,
    params: { [key: string]: string },
    next: () => Promise<HightJSResponse>
): Promise<HightJSResponse> {
    if (request.header('user-agent')?.includes('IE 8')) {
        return HightJSResponse.json({ error: 'Navegador não suportado' }, {status: 400});
    }
    return next();
}

export default [log, blockLegacy];
```

### Exemplo por Rota

```ts
import {BackendRouteConfig, HightJSRequest, HightJSResponse} from 'hightjs';

async function authCheck(
    request: HightJSRequest,
    params: { [key: string]: string },
    next: () => Promise<HightJSResponse>
): Promise<HightJSResponse> {
    if(!request.header("authorization")) {
        return HightJSResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return next();
}

const route: BackendRouteConfig = {
    pattern: '/secure/data',
    middleware: [authCheck],
    GET: async () => HightJSResponse.json({ secret: true })
};
export default route;
```

---

## 🔐 Autenticação (HightJS/auth)

Autenticação JWT embutida, fácil de configurar.  
O jeito recomendado é criar as rotas diretamente no `auth.ts` e importar onde quiser.

### Configuração Básica & Rotas

`src/auth.ts`:

```ts
import { CredentialsProvider, createAuthRoutes } from 'hightjs/auth';
import type { AuthConfig } from 'hightjs/auth';

export const authConfig: AuthConfig = {
    providers: [
        CredentialsProvider({
            id: 'credentials',
            name: 'Credentials',
            credentials: {
                username: { label: 'Username', type: 'text', placeholder: 'Digite seu usuário' },
                password: { label: 'Password', type: 'password', placeholder: 'Digite sua senha' }
            },
            async authorize(credentials) {
                if (credentials.username === 'admin' && credentials.password === 'admin') {
                    return {
                        id: '1',
                        username: 'admin',
                        email: 'admin@test.com',
                        name: 'Administrador',
                        testeeee: 'sdondsfndsfndsfodsfo'
                    };
                }
                return null;
            }
        }),
    ],
    session: {
        strategy: 'jwt',
        maxAge: 24 * 60 * 60, // 24 horas
    },
    pages: {
        signIn: '/login',
        signOut: '/'
    },
    secret: 'hweb-test-secret-key-change-in-production'
};

// Cria as rotas de autenticação automaticamente
export const authRoutes = createAuthRoutes(authConfig);
```

### Exportando as rotas

`src/web/backend/routes/auth.ts`:

```ts
import { authRoutes } from "../../../auth";
export default authRoutes;
```

### Protegendo rotas backend

```ts
import { HightJSRequest } from "hightjs";
import { BackendRouteConfig, HightJSResponse } from "hightjs";
import { authRoutes } from "../../../../auth";

const route: BackendRouteConfig = {
    pattern: "/api/version",
    GET: async (req: HightJSRequest, params: any) => {
        const session = await authRoutes.auth.getSession(req)
        if (!session) {
            return HightJSResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        return HightJSResponse.json({
            version: "1.0.0",
            name: "HightJS",
            description: "Um framework web full-stack moderno para Node.js",
        });
    }
}
export default route;
```

### Métodos principais

- `authRoutes.auth.signIn()`
- `authRoutes.auth.signOut()`
- `authRoutes.auth.getSession()`
- `authRoutes.auth.isAuthenticated()`

---

## 🛠️ CLI

Comandos principais:

| Comando            | Descrição                                 |
|--------------------|-------------------------------------------|
| `npx hight dev`    | Modo desenvolvimento (hot reload)         |
| `npx hight start`  | Modo produção (usa build gerado)          |

### Opções

- `--port`      Porta (default 3000)
- `--hostname`  Host (default 0.0.0.0)
- `--framework` `native` | `express` | `fastify` (default: native)

### Produção

```bash
npx hight start -p 8080
```

---

## 📂 Arquivos Especiais

| Arquivo                     | Localização                           | Função                                         |
|-----------------------------|---------------------------------------|------------------------------------------------|
| `layout.tsx`                | `/src/web`                            | Layout global + `export const metadata`         |
| `notFound.tsx`              | `/src/web`                            | Página 404 customizada                         |
| `middleware.ts`             | dentro de `/src/web/backend/routes`   | Middlewares globais por pasta backend           |
| `hightweb.ts` / `.tsx`      | `/src/hightweb`                       | Instrumentação opcional executada no boot       |
| `public/`                   | `/public`                             | Arquivos estáticos servidos diretamente         |

---

## 🧱 Adapters

Inicie via: `--framework native|express|fastify`

- Native: zero dependências extras
- Express/Fastify: instale peer deps (express ou fastify)

---

## 🔐 Segurança Interna

- Sanitização de headers, cookies e body
- Limites de tamanho configuráveis
- Proteção contra JSON malformado
- Timeout de requisição / body parser nativo
- JWT com HS256, verificação constant-time

---

## ♻️ Hot Reload

Em modo dev, o cliente abre WebSocket `/hweb-hotreload/`.  
Mudanças em rotas frontend ou backend recarregam automaticamente.

---

## ❓ FAQ Rápido

| Pergunta                       | Resposta                                            |
|--------------------------------|-----------------------------------------------------|
| Precisa Next/Vite?             | Não, bundler interno via esbuild.                   |
| Dá para usar React 19?         | Sim (peer dependency).                              |
| Tem SSR?                       | Atualmente só client-side hydration.                |
| Posso usar CSS/SCSS?           | Import normal nos componentes.                      |
| Rota de API conflita com página?| Não, rotas backend podem ser qualquer path.         |

---

## ✅ Checklist Mental

1. Precisa de página? Crie em `src/web/routes/...`
2. Precisa de endpoint? Crie em `src/web/backend/routes/...`
3. Precisa proteger? Use autenticação nas rotas
4. Precisa middleware? `middleware.ts` ou `middleware: []` na rota
5. Metadata? `generateMetadata` ou `metadata` no layout
6. Deploy? `npx hight start`

---

## 🪪 Licença

Copyright 2025 itsmuzin

Este projeto está licenciado sob a [Licença Apache 2.0](LICENSE).

---