/*
 * This file is part of the HightJS Project.
 * Copyright (c) 2025 itsmuzin
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import React from 'react';
import { RouteConfig, Metadata } from './types';
import { getLayout } from './router';
import type { GenericRequest } from './types/framework';
import fs from 'fs';
import path from 'path';

// Função para gerar todas as meta tags
function generateMetaTags(metadata: Metadata): string {
    const tags: string[] = [];

    // Charset
    tags.push(`<meta charset="${metadata.charset || 'UTF-8'}">`);

    // Viewport
    tags.push(`<meta name="viewport" content="${metadata.viewport || 'width=device-width, initial-scale=1.0'}">`);

    // Description
    if (metadata.description) {
        tags.push(`<meta name="description" content="${metadata.description}">`);
    }

    // Keywords
    if (metadata.keywords) {
        const keywordsStr = Array.isArray(metadata.keywords)
            ? metadata.keywords.join(', ')
            : metadata.keywords;
        tags.push(`<meta name="keywords" content="${keywordsStr}">`);
    }

    // Author
    if (metadata.author) {
        tags.push(`<meta name="author" content="${metadata.author}">`);
    }

    // Theme color
    if (metadata.themeColor) {
        tags.push(`<meta name="theme-color" content="${metadata.themeColor}">`);
    }

    // Robots
    if (metadata.robots) {
        tags.push(`<meta name="robots" content="${metadata.robots}">`);
    }

    // Canonical
    if (metadata.canonical) {
        tags.push(`<link rel="canonical" href="${metadata.canonical}">`);
    }

    // Favicon
    if (metadata.favicon) {
        tags.push(`<link rel="icon" href="${metadata.favicon}">`);
    }

    // Apple Touch Icon
    if (metadata.appleTouchIcon) {
        tags.push(`<link rel="apple-touch-icon" href="${metadata.appleTouchIcon}">`);
    }

    // Manifest
    if (metadata.manifest) {
        tags.push(`<link rel="manifest" href="${metadata.manifest}">`);
    }

    // Open Graph
    if (metadata.openGraph) {
        const og = metadata.openGraph;
        if (og.title) tags.push(`<meta property="og:title" content="${og.title}">`);
        if (og.description) tags.push(`<meta property="og:description" content="${og.description}">`);
        if (og.type) tags.push(`<meta property="og:type" content="${og.type}">`);
        if (og.url) tags.push(`<meta property="og:url" content="${og.url}">`);
        if (og.siteName) tags.push(`<meta property="og:site_name" content="${og.siteName}">`);
        if (og.locale) tags.push(`<meta property="og:locale" content="${og.locale}">`);

        if (og.image) {
            if (typeof og.image === 'string') {
                tags.push(`<meta property="og:image" content="${og.image}">`);
            } else {
                tags.push(`<meta property="og:image" content="${og.image.url}">`);
                if (og.image.width) tags.push(`<meta property="og:image:width" content="${og.image.width}">`);
                if (og.image.height) tags.push(`<meta property="og:image:height" content="${og.image.height}">`);
                if (og.image.alt) tags.push(`<meta property="og:image:alt" content="${og.image.alt}">`);
            }
        }
    }

    // Twitter Card
    if (metadata.twitter) {
        const tw = metadata.twitter;
        if (tw.card) tags.push(`<meta name="twitter:card" content="${tw.card}">`);
        if (tw.site) tags.push(`<meta name="twitter:site" content="${tw.site}">`);
        if (tw.creator) tags.push(`<meta name="twitter:creator" content="${tw.creator}">`);
        if (tw.title) tags.push(`<meta name="twitter:title" content="${tw.title}">`);
        if (tw.description) tags.push(`<meta name="twitter:description" content="${tw.description}">`);
        if (tw.image) tags.push(`<meta name="twitter:image" content="${tw.image}">`);
        if (tw.imageAlt) tags.push(`<meta name="twitter:image:alt" content="${tw.imageAlt}">`);
    }

    // Custom meta tags
    if (metadata.other) {
        for (const [key, value] of Object.entries(metadata.other)) {
            tags.push(`<meta name="${key}" content="${value}">`);
        }
    }

    return tags.join('\n');
}

// Função para ofuscar dados (não é criptografia, apenas ofuscação)
function obfuscateData(data: any): string {
    // 1. Serializa para JSON minificado
    const jsonStr = JSON.stringify(data);

    // 2. Converte para base64
    const base64 = Buffer.from(jsonStr).toString('base64');

    // 3. Adiciona um hash fake no início para parecer um token
    const hash = Buffer.from(Date.now().toString()).toString('base64').substring(0, 8);

    return `${hash}.${base64}`;
}

// Função para criar script ofuscado
function createInitialDataScript(data: any): string {
    const obfuscated = obfuscateData(data);

    // Usa um atributo data-* ao invés de JSON visível
    return `<script id="__hight_data__" type="text/plain" data-h="${obfuscated}"></script>`;
}

// Interface para opções de renderização apenas do cliente
interface RenderOptions {
    req: GenericRequest;
    route: RouteConfig & { componentPath: string };
    params: Record<string, string>;
    allRoutes: (RouteConfig & { componentPath: string })[];
}

export async function render({ req, route, params, allRoutes }: RenderOptions): Promise<string> {
    const { generateMetadata } = route;

    // Pega a opção dev e hot reload manager do req
    const isProduction = !(req as any).hwebDev;
    const hotReloadManager = (req as any).hotReloadManager;

    // Pega o layout se existir
    const layout = getLayout();

    let metadata: Metadata = { title: 'App hweb' };

    // Primeiro usa o metadata do layout se existir
    if (layout && layout.metadata) {
        metadata = { ...metadata, ...layout.metadata };
    }

    // Depois sobrescreve com metadata específico da rota se existir
    if (generateMetadata) {
        const routeMetadata = await Promise.resolve(generateMetadata(params, req));
        metadata = { ...metadata, ...routeMetadata };
    }

    // Prepara os dados para injetar na janela do navegador
    const initialData = {
        routes: allRoutes.map(r => ({ pattern: r.pattern, componentPath: r.componentPath })),
        initialComponentPath: route.componentPath,
        initialParams: params,
    };

    // Cria script JSON limpo
    const initialDataScript = createInitialDataScript(initialData);

    // Script de hot reload apenas em desenvolvimento
    const hotReloadScript = !isProduction && hotReloadManager
        ? hotReloadManager.getClientScript()
        : '';

    // Gera todas as meta tags
    const metaTags = generateMetaTags(metadata);

    // Determina quais arquivos JavaScript carregar
    const jsFiles = getJavaScriptFiles(req);

    const htmlLang = metadata.language || 'pt-BR';

    // HTML base sem SSR - apenas o container e scripts para client-side rendering
    return `<!DOCTYPE html>
<html lang="${htmlLang}">
<head>
${metaTags}
<title>${metadata.title || 'App hweb'}</title>
</head>
<body>
<div id="root"></div>
${initialDataScript}
${jsFiles}
${hotReloadScript}
</body>
</html>`;
}

// Função para determinar quais arquivos JavaScript carregar
function getJavaScriptFiles(req: GenericRequest): string {
    const projectDir = process.cwd();
    const distDir = path.join(projectDir, '.hight');

    // Verifica se o diretório de build existe
    if (!fs.existsSync(distDir)) {
        // Diretório não existe - build ainda não foi executado
        return getBuildingHTML();
    }

    try {
        // Verifica se existe um manifesto de chunks (gerado pelo ESBuild com splitting)
        const manifestPath = path.join(distDir, 'manifest.json');

        if (fs.existsSync(manifestPath)) {
            // Modo chunks - carrega todos os arquivos necessários
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            const scripts = Object.values(manifest)
                .filter((file: any) => file.endsWith('.js'))
                .map((file: any) => `<script src="/_hight/${file}"></script>`)
                .join('');

            // Se não há arquivos JS no manifesto, build em andamento
            if (!scripts) {
                return getBuildingHTML();
            }

            return scripts;
        } else {
            // Verifica se existem múltiplos arquivos JS (chunks sem manifesto)
            const jsFiles = fs.readdirSync(distDir)
                .filter(file => file.endsWith('.js') && !file.endsWith('.map'))
                .sort((a, b) => {
                    // Ordena para carregar arquivos principais primeiro
                    if (a.includes('main')) return -1;
                    if (b.includes('main')) return 1;
                    if (a.includes('vendor') || a.includes('react')) return -1;
                    if (b.includes('vendor') || b.includes('react')) return 1;
                    return a.localeCompare(b);
                });

            // @ts-ignore
            if (jsFiles.length >= 1) {
                // Modo chunks sem manifesto
                return jsFiles
                    .map(file => `<script src="/_hight/${file}"></script>`)
                    .join('');
            } else {
                // Nenhum arquivo JS encontrado - build em andamento ou erro
                return getBuildingHTML();
            }
        }
    } catch (error) {
        // Erro ao ler diretório - build em andamento ou erro
        return getBuildingHTML();
    }
}

// Função para retornar HTML de "Build em andamento" com auto-refresh
function getBuildingHTML(): string {
    return `
    <style>
        /*
         * Estilo combinado:
         * - Tema (light/dark) adaptativo como o Next.js
         * - Ícone personalizado
         * - Efeito Glassmorphism para o card
         */
        
        html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            font-family: system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            box-sizing: border-box;
        }

        *, *:before, *:after {
            box-sizing: inherit;
        }

        /* Tema Claro (Default) */
        body {
            color: #000;
            background: linear-gradient(to bottom, #e9e9e9, #ffffff);
            background-attachment: fixed;
            
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            text-align: center;
            padding: 20px;
        }

        /* Contêiner com Glassmorphism */
        .building-container {
            width: 100%;
            max-width: 500px;
            padding: 40px 50px;
            
            /* Efeito de vidro */
            background: rgba(255, 255, 255, 0.15); /* Mais transparente no modo claro */
            backdrop-filter: blur(12px); /* Um pouco mais de blur */
            -webkit-backdrop-filter: blur(12px);
            
            border-radius: 16px;
            border: 1px solid rgba(255, 255, 255, 0.3); /* Borda mais visível no claro */
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1); /* Sombra mais leve no claro */
        }

        /* Ícone */
        .building-icon {
            width: 70px; /* Tamanho do ícone */
            height: 70px;
            margin-bottom: 20px; /* Espaço abaixo do ícone */
            vertical-align: middle;
            filter: drop-shadow(0 0 5px rgba(0,0,0,0.1)); /* Leve sombra para destacar */
        }

        /* Título */
        .building-title {
            font-size: 2.8rem;
            font-weight: 700;
            margin-top: 0; /* Ajusta a margem superior após o ícone */
            margin-bottom: 20px;
            text-shadow: 0 0 10px rgba(0, 0, 0, 0.05); /* Sombra de texto sutil */
            color: inherit; /* Garante que a cor se adapta ao tema */
        }

        /* Texto de apoio */
        .building-text {
            font-size: 1.15rem;
            margin-bottom: 35px;
            font-weight: 400;
            opacity: 0.9;
            color: inherit; /* Garante que a cor se adapta ao tema */
        }

        /* Spinner adaptado para light/dark */
        .spinner {
            width: 50px;
            height: 50px;
            margin: 0 auto;
            border-radius: 50%;
            
            /* Estilo para Modo Claro */
            border: 5px solid rgba(0, 0, 0, 0.1);
            border-top-color: #000;
            
            animation: spin 1s linear infinite;
        }

        /* Animação de rotação */
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        /* Tema Escuro (via @media query) */
        @media (prefers-color-scheme: dark) {
            body {
                color: #fff;
                background: linear-gradient(to bottom, #222, #000);
            }

            .building-container {
                background: rgba(255, 255, 255, 0.05); /* Mais opaco no modo escuro */
                border: 1px solid rgba(255, 255, 255, 0.1); /* Borda mais sutil no escuro */
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3); /* Sombra mais forte no escuro */
            }

            .building-title {
                 text-shadow: 0 0 10px rgba(255, 255, 255, 0.1);
            }
            
            .building-icon {
                 filter: drop-shadow(0 0 5px rgba(255,255,255,0.1));
            }

            .spinner {
                border: 5px solid rgba(255, 255, 255, 0.1);
                border-top-color: #fff;
            }
        }
    </style>
    <div class="building-container">
        <!-- Ícone da imagem --><img src="https://repository-images.githubusercontent.com/1069175740/e5c59d3a-e1fd-446c-a89f-785ed08f6a16" alt="HightJS Logo" class="building-icon">
        
        <div class="building-title">HightJS</div>
        <div class="building-text">Build in progress...</div>
        <div class="spinner"></div>
    </div>
<script>
    // Auto-refresh a cada 2 segundos para verificar se o build terminou
    setTimeout(() => {
        window.location.reload();
    }, 2000);
</script>`;
}
