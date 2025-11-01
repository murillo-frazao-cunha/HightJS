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
import fs from 'fs';
import path from 'path';
import { RouteConfig, BackendRouteConfig, HightMiddleware, WebSocketHandler, WebSocketContext } from './types';
import { WebSocketServer as WSServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { URL } from 'url';
import Console from "./api/console"
import {FrameworkAdapterFactory} from "./adapters/factory";
import {HightJSRequest} from "./api/http";

// --- Roteamento do Frontend ---

// Guarda todas as rotas de PÁGINA (React) encontradas
// A rota agora também armazena o caminho do arquivo para ser usado como um ID único no cliente
let allRoutes: (RouteConfig & { componentPath: string })[] = [];

// Guarda o layout se existir
let layoutComponent: { componentPath: string; metadata?: any } | null = null;

// Guarda o componente 404 personalizado se existir
let notFoundComponent: { componentPath: string } | null = null;

// Cache de arquivos carregados para limpeza
let loadedRouteFiles: Set<string> = new Set();
let loadedLayoutFiles: Set<string> = new Set();
let loadedNotFoundFiles: Set<string> = new Set();

/**
 * Limpa o cache do require para um arquivo específico
 * @param filePath Caminho do arquivo para limpar
 */
function clearRequireCache(filePath: string) {
    try {
        const resolvedPath = require.resolve(filePath);
        delete require.cache[resolvedPath];

        // Também limpa arquivos temporários relacionados (apenas se existir no cache)
        const tempFile = filePath.replace(/\.(tsx|ts)$/, '.temp.$1');
        const tempResolvedPath = require.cache[require.resolve(tempFile)];
        if (tempResolvedPath) {
            delete require.cache[require.resolve(tempFile)];
        }
    } catch {
        // Arquivo pode não estar no cache ou não ser resolvível
    }
}

/**
 * Limpa todo o cache de rotas carregadas
 */
export function clearAllRouteCache() {
    // Limpa cache das rotas
    loadedRouteFiles.forEach(filePath => {
        clearRequireCache(filePath);
    });
    loadedRouteFiles.clear();

    // Limpa cache do layout
    loadedLayoutFiles.forEach(filePath => {
        clearRequireCache(filePath);
    });
    loadedLayoutFiles.clear();

    // Limpa cache do notFound
    loadedNotFoundFiles.forEach(filePath => {
        clearRequireCache(filePath);
    });
    loadedNotFoundFiles.clear();
}

/**
 * Limpa o cache de um arquivo específico e recarrega as rotas se necessário
 * @param changedFilePath Caminho do arquivo que foi alterado
 */
export function clearFileCache(changedFilePath: string) {
    const absolutePath = path.isAbsolute(changedFilePath) ? changedFilePath : path.resolve(changedFilePath);

    // Limpa o cache do arquivo específico
    clearRequireCache(absolutePath);

    // Remove das listas de arquivos carregados
    loadedRouteFiles.delete(absolutePath);
    loadedLayoutFiles.delete(absolutePath);
    loadedNotFoundFiles.delete(absolutePath);
}

/**
 * Carrega o layout.tsx se existir no diretório web
 * @param webDir O diretório web onde procurar o layout
 * @returns O layout carregado ou null se não existir
 */
export function loadLayout(webDir: string): { componentPath: string; metadata?: any } | null {
    const layoutPath = path.join(webDir, 'layout.tsx');
    const layoutPathJs = path.join(webDir, 'layout.ts');

    const layoutFile = fs.existsSync(layoutPath) ? layoutPath :
        fs.existsSync(layoutPathJs) ? layoutPathJs : null;

    if (layoutFile) {
        const absolutePath = path.resolve(layoutFile);
        const componentPath = path.relative(process.cwd(), layoutFile).replace(/\\/g, '/');

        try {
            // HACK: Cria uma versão temporária do layout SEM imports de CSS para carregar no servidor
            const layoutContent = fs.readFileSync(layoutFile, 'utf8');
            const tempContent = layoutContent
                .replace(/import\s+['"][^'"]*\.css['"];?/g, '// CSS import removido para servidor')
                .replace(/import\s+['"][^'"]*\.scss['"];?/g, '// SCSS import removido para servidor')
                .replace(/import\s+['"][^'"]*\.sass['"];?/g, '// SASS import removido para servidor');

            const tempFile = layoutFile.replace(/\.(tsx|ts)$/, '.temp.$1');
            fs.writeFileSync(tempFile, tempContent);

            // Otimização: limpa cache apenas se existir
            try {
                const resolvedPath = require.resolve(tempFile);
                if (require.cache[resolvedPath]) {
                    delete require.cache[resolvedPath];
                }
            } catch {}

            const layoutModule = require(tempFile);

            // Remove o arquivo temporário
            fs.unlinkSync(tempFile);

            const metadata = layoutModule.metadata || null;

            // Registra o arquivo como carregado
            loadedLayoutFiles.add(absolutePath);

            layoutComponent = { componentPath, metadata };
            return layoutComponent;
        } catch (error) {
            Console.error(`Error loading layout ${layoutFile}:`, error);
            layoutComponent = { componentPath };
            return layoutComponent;
        }
    }

    layoutComponent = null;
    return null;
}

/**
 * Retorna o layout atual se carregado
 */
export function getLayout(): { componentPath: string; metadata?: any } | null {
    return layoutComponent;
}

/**
 * Carrega dinamicamente todas as rotas de frontend do diretório do usuário.
 * @param routesDir O diretório onde as rotas de página estão localizadas.
 * @returns A lista de rotas de página que foram carregadas.
 */
export function loadRoutes(routesDir: string): (RouteConfig & { componentPath: string })[] {
    if (!fs.existsSync(routesDir)) {
        Console.warn(`Frontend routes directory not found at ${routesDir}. No page will be loaded.`);
        allRoutes = [];
        return allRoutes;
    }

    // Otimização: usa função recursiva manual para evitar overhead do recursive: true
    const routeFiles: string[] = [];
    const scanDirectory = (dir: string, baseDir: string = '') => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const relativePath = baseDir ? path.join(baseDir, entry.name) : entry.name;

            if (entry.isDirectory()) {
                // Pula diretório backend inteiro
                if (entry.name === 'backend') continue;
                scanDirectory(path.join(dir, entry.name), relativePath);
            } else if (entry.isFile()) {
                // Filtra apenas arquivos .ts/.tsx
                if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
                    routeFiles.push(relativePath);
                }
            }
        }
    };

    scanDirectory(routesDir);

    const loaded: (RouteConfig & { componentPath: string })[] = [];
    const cwdPath = process.cwd();

    // Otimização: processa arquivos em lote
    for (const file of routeFiles) {
        const filePath = path.join(routesDir, file);
        const absolutePath = path.resolve(filePath);

        try {
            // Otimização: limpa cache apenas se já existir
            const resolvedPath = require.resolve(filePath);
            if (require.cache[resolvedPath]) {
                delete require.cache[resolvedPath];
            }

            const routeModule = require(filePath);
            if (routeModule.default?.pattern && routeModule.default?.component) {
                // Otimização: calcula componentPath apenas uma vez
                const componentPath = path.relative(cwdPath, filePath).replace(/\\/g, '/');
                loaded.push({ ...routeModule.default, componentPath });
                loadedRouteFiles.add(absolutePath);
            }
        } catch (error) {
            Console.error(`Error loading page route ${filePath}:`, error);
        }
    }

    allRoutes = loaded;
    return allRoutes;
}

/**
 * Encontra a rota de página correspondente para uma URL.
 * @param pathname O caminho da URL (ex: "/users/123").
 * @returns Um objeto com a rota e os parâmetros, ou null se não encontrar.
 */
export function findMatchingRoute(pathname: string) {
    for (const route of allRoutes) {
        if (!route.pattern) continue;

        const regexPattern = route.pattern
            // [[...param]] → opcional catch-all
            .replace(/\[\[\.\.\.(\w+)\]\]/g, '(?<$1>.+)?')
            // [...param] → obrigatório catch-all
            .replace(/\[\.\.\.(\w+)\]/g, '(?<$1>.+)')
            // /[[param]] → opcional com barra também opcional
            .replace(/\/\[\[(\w+)\]\]/g, '(?:/(?<$1>[^/]+))?')
            // [[param]] → segmento opcional (sem barra anterior)
            .replace(/\[\[(\w+)\]\]/g, '(?<$1>[^/]+)?')
            // [param] → segmento obrigatório
            .replace(/\[(\w+)\]/g, '(?<$1>[^/]+)');

        // permite / opcional no final
        const regex = new RegExp(`^${regexPattern}/?$`);
        const match = pathname.match(regex);

        if (match) {
            return {
                route,
                params: match.groups || {}
            };
        }
    }

    return null;
}


// --- Roteamento do Backend ---

// Guarda todas as rotas de API encontradas
let allBackendRoutes: BackendRouteConfig[] = [];

// Cache de middlewares carregados por diretório
let loadedMiddlewares: Map<string, HightMiddleware[]> = new Map();

/**
 * Carrega middlewares de um diretório específico
 * @param dir O diretório onde procurar por middleware.ts
 * @returns Array de middlewares encontrados
 */
function loadMiddlewareFromDirectory(dir: string): HightMiddleware[] {
    const middlewares: HightMiddleware[] = [];

    // Procura por middleware.ts ou middleware.tsx
    const middlewarePath = path.join(dir, 'middleware.ts');
    const middlewarePathTsx = path.join(dir, 'middleware.tsx');

    const middlewareFile = fs.existsSync(middlewarePath) ? middlewarePath :
        fs.existsSync(middlewarePathTsx) ? middlewarePathTsx : null;

    if (middlewareFile) {
        try {
            const absolutePath = path.resolve(middlewareFile);
            clearRequireCache(absolutePath);

            const middlewareModule = require(middlewareFile);

            // Suporte para export default (função única) ou export { middleware1, middleware2 }
            if (typeof middlewareModule.default === 'function') {
                middlewares.push(middlewareModule.default);
            } else if (middlewareModule.default && Array.isArray(middlewareModule.default)) {
                middlewares.push(...middlewareModule.default);
            } else {
                // Procura por exports nomeados que sejam funções
                Object.keys(middlewareModule).forEach(key => {
                    if (key !== 'default' && typeof middlewareModule[key] === 'function') {
                        middlewares.push(middlewareModule[key]);
                    }
                });
            }

        } catch (error) {
            Console.error(`Error loading middleware ${middlewareFile}:`, error);
        }
    }

    return middlewares;
}

/**
 * Coleta middlewares do diretório específico da rota (não herda dos pais)
 * @param routeFilePath Caminho completo do arquivo de rota
 * @param backendRoutesDir Diretório raiz das rotas de backend
 * @returns Array com middlewares apenas do diretório da rota
 */
function collectMiddlewaresForRoute(routeFilePath: string, backendRoutesDir: string): HightMiddleware[] {
    const relativePath = path.relative(backendRoutesDir, routeFilePath);
    const routeDir = path.dirname(path.join(backendRoutesDir, relativePath));

    // Carrega middlewares APENAS do diretório específico da rota (não herda dos pais)
    if (!loadedMiddlewares.has(routeDir)) {
        const middlewares = loadMiddlewareFromDirectory(routeDir);
        loadedMiddlewares.set(routeDir, middlewares);
    }

    return loadedMiddlewares.get(routeDir) || [];
}

/**
 * Carrega dinamicamente todas as rotas de API do diretório de backend.
 * @param backendRoutesDir O diretório onde as rotas de API estão localizadas.
 */
export function loadBackendRoutes(backendRoutesDir: string) {
    if (!fs.existsSync(backendRoutesDir)) {
        // É opcional ter uma API, então não mostramos um aviso se a pasta não existir.
        allBackendRoutes = [];
        return;
    }

    // Limpa cache de middlewares para recarregar
    loadedMiddlewares.clear();

    // Otimização: usa função recursiva manual e coleta middlewares durante o scan
    const routeFiles: string[] = [];
    const middlewareFiles: Map<string, string> = new Map(); // dir -> filepath

    const scanDirectory = (dir: string, baseDir: string = '') => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const relativePath = baseDir ? path.join(baseDir, entry.name) : entry.name;

            if (entry.isDirectory()) {
                scanDirectory(path.join(dir, entry.name), relativePath);
            } else if (entry.isFile()) {
                const isTypeScript = entry.name.endsWith('.ts') || entry.name.endsWith('.tsx');
                if (!isTypeScript) continue;

                // Identifica middlewares durante o scan
                if (entry.name.startsWith('middleware')) {
                    const dirPath = path.dirname(path.join(backendRoutesDir, relativePath));
                    middlewareFiles.set(dirPath, path.join(backendRoutesDir, relativePath));
                } else {
                    routeFiles.push(relativePath);
                }
            }
        }
    };

    scanDirectory(backendRoutesDir);

    // Otimização: pré-carrega todos os middlewares em um único passe
    for (const [dirPath, middlewarePath] of middlewareFiles) {
        try {
            const resolvedPath = require.resolve(middlewarePath);
            if (require.cache[resolvedPath]) {
                delete require.cache[resolvedPath];
            }

            const middlewareModule = require(middlewarePath);
            const middlewares: HightMiddleware[] = [];

            if (typeof middlewareModule.default === 'function') {
                middlewares.push(middlewareModule.default);
            } else if (Array.isArray(middlewareModule.default)) {
                middlewares.push(...middlewareModule.default);
            } else {
                // Exports nomeados
                for (const key in middlewareModule) {
                    if (key !== 'default' && typeof middlewareModule[key] === 'function') {
                        middlewares.push(middlewareModule[key]);
                    }
                }
            }

            if (middlewares.length > 0) {
                loadedMiddlewares.set(dirPath, middlewares);
            }
        } catch (error) {
            Console.error(`Error loading middleware ${middlewarePath}:`, error);
        }
    }

    // Otimização: processa rotas com cache já limpo
    const loaded: BackendRouteConfig[] = [];
    for (const file of routeFiles) {
        const filePath = path.join(backendRoutesDir, file);

        try {
            // Otimização: limpa cache apenas se existir
            const resolvedPath = require.resolve(filePath);
            if (require.cache[resolvedPath]) {
                delete require.cache[resolvedPath];
            }

            const routeModule = require(filePath);
            if (routeModule.default?.pattern) {
                const routeConfig = { ...routeModule.default };
                // Se a rota NÃO tem middleware definido, usa os da pasta
                if (!routeConfig.hasOwnProperty('middleware')) {
                    const routeDir = path.dirname(path.resolve(filePath));
                    const folderMiddlewares = loadedMiddlewares.get(routeDir);
                    if (folderMiddlewares && folderMiddlewares.length > 0) {
                        routeConfig.middleware = folderMiddlewares;
                    }
                }

                loaded.push(routeConfig);
            }
        } catch (error) {
            Console.error(`Error loading API route ${filePath}:`, error);
        }
    }

    allBackendRoutes = loaded;
}

/**
 * Encontra a rota de API correspondente para uma URL e método HTTP.
 * @param pathname O caminho da URL (ex: "/api/users/123").
 * @param method O método HTTP da requisição (GET, POST, etc.).
 * @returns Um objeto com a rota e os parâmetros, ou null se não encontrar.
 */
export function findMatchingBackendRoute(pathname: string, method: string) {
    for (const route of allBackendRoutes) {
        // Verifica se a rota tem um handler para o método HTTP atual
        if (!route.pattern || !route[method.toUpperCase() as keyof BackendRouteConfig]) continue;
        const regexPattern = route.pattern
            // [[...param]] → opcional catch-all
            .replace(/\[\[\.\.\.(\w+)\]\]/g, '(?<$1>.+)?')
            // [...param] → obrigatório catch-all
            .replace(/\[\.\.\.(\w+)\]/g, '(?<$1>.+)')
            // [[param]] → segmento opcional
            .replace(/\[\[(\w+)\]\]/g, '(?<$1>[^/]+)?')
            // [param] → segmento obrigatório
            .replace(/\[(\w+)\]/g, '(?<$1>[^/]+)');

        const regex = new RegExp(`^${regexPattern}/?$`);
        const match = pathname.match(regex);

        if (match) {
            return {
                route,
                params: match.groups || {}
            };
        }
    }
    return null;
}

/**
 * Carrega o notFound.tsx se existir no diretório web
 * @param webDir O diretório web onde procurar o notFound
 * @returns O notFound carregado ou null se não existir
 */
export function loadNotFound(webDir: string): { componentPath: string } | null {
    const notFoundPath = path.join(webDir, 'notFound.tsx');
    const notFoundPathJs = path.join(webDir, 'notFound.ts');

    const notFoundFile = fs.existsSync(notFoundPath) ? notFoundPath :
        fs.existsSync(notFoundPathJs) ? notFoundPathJs : null;

    if (notFoundFile) {
        const absolutePath = path.resolve(notFoundFile);
        const componentPath = path.relative(process.cwd(), notFoundFile).replace(/\\/g, '/');

        try {
            // Otimização: limpa cache apenas se existir
            try {
                const resolvedPath = require.resolve(notFoundFile);
                if (require.cache[resolvedPath]) {
                    delete require.cache[resolvedPath];
                }
            } catch {}

            // Registra o arquivo como carregado
            loadedNotFoundFiles.add(absolutePath);

            notFoundComponent = { componentPath };
            return notFoundComponent;
        } catch (error) {
            Console.error(`Error loading notFound ${notFoundFile}:`, error);
            notFoundComponent = { componentPath };
            return notFoundComponent;
        }
    }

    notFoundComponent = null;
    return null;
}

/**
 * Retorna o componente 404 atual se carregado
 */
export function getNotFound(): { componentPath: string } | null {
    return notFoundComponent;
}

// --- WebSocket Functions ---

// Guarda todas as rotas WebSocket encontradas
let allWebSocketRoutes: { pattern: string; handler: WebSocketHandler; middleware?: HightMiddleware[] }[] = [];

// Conexões WebSocket ativas
let wsConnections: Set<WebSocket> = new Set();

/**
 * Processa e registra rotas WebSocket encontradas nas rotas backend
 */
export function processWebSocketRoutes() {
    allWebSocketRoutes = [];

    for (const route of allBackendRoutes) {
        if (route.WS) {
            const wsRoute = {
                pattern: route.pattern,
                handler: route.WS,
                middleware: route.middleware
            };

            allWebSocketRoutes.push(wsRoute);
        }
    }
}

/**
 * Encontra a rota WebSocket correspondente para uma URL
 */
export function findMatchingWebSocketRoute(pathname: string) {
    for (const route of allWebSocketRoutes) {
        if (!route.pattern) continue;

        const regexPattern = route.pattern
            .replace(/\[\[\.\.\.(\w+)\]\]/g, '(?<$1>.+)?')
            .replace(/\[\.\.\.(\w+)\]/g, '(?<$1>.+)')
            .replace(/\[\[(\w+)\]\]/g, '(?<$1>[^/]+)?')
            .replace(/\[(\w+)\]/g, '(?<$1>[^/]+)');

        const regex = new RegExp(`^${regexPattern}/?$`);
        const match = pathname.match(regex);

        if (match) {
            return {
                route,
                params: match.groups || {}
            };
        }
    }
    return null;
}

/**
 * Trata uma nova conexão WebSocket
 */
function handleWebSocketConnection(ws: WebSocket, req: IncomingMessage, hwebReq: HightJSRequest) {
    if (!req.url) return;

    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    const matchedRoute = findMatchingWebSocketRoute(pathname);
    if (!matchedRoute) {
        ws.close(1000, 'Route not found');
        return;
    }

    const params = extractWebSocketParams(pathname, matchedRoute.route.pattern);
    const query = Object.fromEntries(url.searchParams.entries());

    const context: WebSocketContext = {
        hightReq: hwebReq,
        ws,
        req,
        url,
        params,
        query,
        send: (data: any) => {
            if (ws.readyState === WebSocket.OPEN) {
                const message = typeof data === 'string' ? data : JSON.stringify(data);
                ws.send(message);
            }
        },
        close: (code?: number, reason?: string) => {
            ws.close(code || 1000, reason);
        },
        broadcast: (data: any, exclude?: WebSocket[]) => {
            const message = typeof data === 'string' ? data : JSON.stringify(data);
            const excludeSet = new Set(exclude || []);
            wsConnections.forEach(connection => {
                if (connection.readyState === WebSocket.OPEN && !excludeSet.has(connection)) {
                    connection.send(message);
                }
            });
        }
    };

    try {
        matchedRoute.route.handler(context);
    } catch (error) {
        console.error('Error in WebSocket handler:', error);
        ws.close(1011, 'Internal server error');
    }
}

/**
 * Extrai parâmetros da URL para WebSocket
 */
function extractWebSocketParams(pathname: string, pattern: string): Record<string, string> {
    const params: Record<string, string> = {};

    const regexPattern = pattern
        .replace(/\[\[\.\.\.(\w+)\]\]/g, '(?<$1>.+)?')
        .replace(/\[\.\.\.(\w+)\]/g, '(?<$1>.+)')
        .replace(/\[\[(\w+)\]\]/g, '(?<$1>[^/]+)?')
        .replace(/\[(\w+)\]/g, '(?<$1>[^/]+)');

    const regex = new RegExp(`^${regexPattern}/?$`);
    const match = pathname.match(regex);

    if (match && match.groups) {
        Object.assign(params, match.groups);
    }

    return params;
}

/**
 * Configura WebSocket upgrade no servidor HTTP existente
 * @param server Servidor HTTP (Express, Fastify ou Native)
 * @param hotReloadManager Instância do gerenciador de hot-reload para coordenação
 */
export function setupWebSocketUpgrade(server: any, hotReloadManager?: any) {
    // NÃO remove listeners existentes para preservar hot-reload
    // Em vez disso, coordena com o sistema existente

    // Verifica se já existe um listener de upgrade
    const existingListeners = server.listeners('upgrade');

    // Se não há listeners, ou se o hot-reload ainda não foi configurado, adiciona o nosso
    if (existingListeners.length === 0) {
        server.on('upgrade', (request: any, socket: any, head: Buffer) => {

            handleWebSocketUpgrade(request, socket, head, hotReloadManager);
        });
    }
}

function handleWebSocketUpgrade(request: any, socket: any, head: Buffer, hotReloadManager?: any) {
    const adapter = FrameworkAdapterFactory.getCurrentAdapter()
    if (!adapter) {
        console.error('❌ Framework adapter not detected. Unable to process WebSocket upgrade.');
        socket.destroy();
        return;
    }
    const genericReq = adapter.parseRequest(request);
    const hwebReq = new HightJSRequest(genericReq);
    const { pathname } = new URL(request.url, `http://${request.headers.host}`);

    // Prioridade 1: Hot reload (sistema interno)
    if (pathname === '/hweb-hotreload/') {

        if (hotReloadManager) {
            hotReloadManager.handleUpgrade(request, socket, head);
        } else {
            socket.destroy();
        }
        return;
    }

    // Prioridade 2: Rotas WebSocket do usuário
    const matchedRoute = findMatchingWebSocketRoute(pathname);
    if (matchedRoute) {
        // Faz upgrade para WebSocket usando noServer
        const wss = new WSServer({
            noServer: true,
            perMessageDeflate: false, // Melhor performance
            maxPayload: 1024 * 1024 // Limite de 1MB
        });

        wss.handleUpgrade(request, socket, head, (ws) => {
            wsConnections.add(ws);

            ws.on('close', () => {
                wsConnections.delete(ws);
            });

            ws.on('error', (error) => {
                wsConnections.delete(ws);
            });

            // Processa a conexão
            handleWebSocketConnection(ws, request, hwebReq);
        });
        return;
    }

    socket.destroy();
}
