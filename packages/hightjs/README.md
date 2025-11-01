<div align="center">
  <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://repository-images.githubusercontent.com/1069175740/e5c59d3a-e1fd-446c-a89f-785ed08f6a16">
      <img alt="Next.js logo" src="https://repository-images.githubusercontent.com/1069175740/e5c59d3a-e1fd-446c-a89f-785ed08f6a16" height="128">
    </picture>
  <h1>HightJS</h1>

[![NPM](https://img.shields.io/npm/v/hightjs.svg?style=for-the-badge&labelColor=000000)](https://www.npmjs.com/package/hightjs)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg?style=for-the-badge&labelColor=000000)](../../LICENSE)


</div>

> Um framework web full‑stack moderno para Node.js, focado em simplicidade, DX e velocidade. Bundler via esbuild, hot reload, roteamento automático, APIs, autenticação JWT, CLI e muito mais.
---

# Precisa de ajuda?
Caso tenha alguma dúvida, entre em contato por uma das redes abaixo:

[![Discord](https://img.shields.io/badge/Discord-mulinfrc-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.com/users/1264710048786026588)
[![Gmail](https://img.shields.io/badge/Gmail-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:murillofrazaocunha@gmail.com)
[![Instagram](https://img.shields.io/badge/Instagram-E4405F?style=for-the-badge&logo=instagram&logoColor=white)](https://instagram.com/itsmuh_)
[![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/murillo-frazao-cunha)

---

## 📑 Índice

- [✨ Principais Recursos](#-principais-recursos)
- [🚀 Início Rápido](#-início-rápido)
- [📚 Documentação](#-documentação)
- [🪪 Licença](#-licença)
---

## ✨ Principais Recursos

- **Roteamento automático** de páginas [`src/web/routes`] e APIs [`src/backend/routes`]
- **React 19** com client-side hydration
- **TypeScript** first (totalmente tipado)
- **WebSockets** nativo nas rotas backend
- **Rotas dinâmicas** com parâmetros (frontend e backend)
- **Middlewares** por pasta ou rota
- **Hot Reload** nativo (WebSocket interno) em dev
- **Layouts globais** e página 404 customizada
- **Metadata** dinâmica por página
- **Build inteligente** (single bundle ou chunks)
- **SSL integrado** no modo Native (HTTPS out-of-the-box)
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
    "target": "ES2020",
    "module": "NodeNext",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "rootDir": "./src",
    "outDir": "./dist",
    "moduleResolution": "nodenext"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
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
import { RouteConfig } from 'hightjs/react';
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

## 🪪 Licença

Copyright 2025 itsmuzin

Este projeto está licenciado sob a [Licença Apache 2.0](../../LICENSE).

---



