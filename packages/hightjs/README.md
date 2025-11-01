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
- **Asset Imports** - Importe arquivos .md, .png, .jpg, .svg, .json, .txt, fontes, áudio e vídeo diretamente
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

---

## 📦 Importação de Assets

HightJS suporta importação nativa de diversos tipos de arquivos, sem necessidade de configuração adicional!

### Tipos de arquivo suportados:

#### 🖼️ Imagens
```tsx
import logo from './logo.png';
import photo from './photo.jpg';
import icon from './icon.webp';

<img src={logo} alt="Logo" />
```

Suporte para: `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.avif`, `.ico`, `.bmp`, `.tiff`

#### 📄 Markdown
```tsx
import readme from './README.md';

<pre>{readme}</pre>
```

#### 🎨 SVG (com duas formas de uso)
```tsx
import icon, { svgContent } from './icon.svg';

// Como data URL
<img src={icon} alt="Icon" />

// Como HTML direto
<div dangerouslySetInnerHTML={{ __html: svgContent }} />
```

#### 📋 JSON
```tsx
import config from './config.json';

<p>Version: {config.version}</p>
```

#### 📝 Arquivos de texto
```tsx
import terms from './terms.txt';

<pre>{terms}</pre>
```

#### 🎵 Áudio
```tsx
import music from './song.mp3';

<audio src={music} controls />
```

Suporte para: `.mp3`, `.wav`, `.ogg`, `.m4a`, `.aac`, `.flac`

#### 🎬 Vídeo
```tsx
import video from './demo.mp4';

<video src={video} controls />
```

Suporte para: `.mp4`, `.webm`, `.ogv`

#### 🔤 Fontes
```tsx
import customFont from './custom-font.woff2';

// Use em @font-face
const style = document.createElement('style');
style.textContent = `
  @font-face {
    font-family: 'CustomFont';
    src: url(${customFont}) format('woff2');
  }
`;
document.head.appendChild(style);
```

Suporte para: `.woff`, `.woff2`, `.ttf`, `.otf`, `.eot`

### ✨ Benefícios

- ✅ **Type Safety**: Suporte completo a TypeScript com auto-complete
- ✅ **Zero Config**: Funciona out-of-the-box
- ✅ **Otimizado**: Assets são automaticamente bundlados e otimizados
- ✅ **Base64 Encoding**: Arquivos são inline como data URLs, reduzindo requisições HTTP

---

## 🪪 Licença

Copyright 2025 itsmuzin

Este projeto está licenciado sob a [Licença Apache 2.0](../../LICENSE).

---



