"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = exports.FrameworkAdapterFactory = exports.FastifyAdapter = exports.ExpressAdapter = exports.HightJSResponse = exports.HightJSRequest = void 0;
exports.default = hweb;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const express_1 = require("./adapters/express");
const builder_1 = require("./builder");
const router_1 = require("./router");
const renderer_1 = require("./renderer");
const http_1 = require("./api/http");
Object.defineProperty(exports, "HightJSRequest", { enumerable: true, get: function () { return http_1.HightJSRequest; } });
Object.defineProperty(exports, "HightJSResponse", { enumerable: true, get: function () { return http_1.HightJSResponse; } });
const hotReload_1 = require("./hotReload");
const factory_1 = require("./adapters/factory");
const console_1 = __importStar(require("./api/console"));
// Exporta os adapters para uso manual se necessário
var express_2 = require("./adapters/express");
Object.defineProperty(exports, "ExpressAdapter", { enumerable: true, get: function () { return express_2.ExpressAdapter; } });
var fastify_1 = require("./adapters/fastify");
Object.defineProperty(exports, "FastifyAdapter", { enumerable: true, get: function () { return fastify_1.FastifyAdapter; } });
var factory_2 = require("./adapters/factory");
Object.defineProperty(exports, "FrameworkAdapterFactory", { enumerable: true, get: function () { return factory_2.FrameworkAdapterFactory; } });
// Exporta os helpers para facilitar integração
var helpers_1 = require("./helpers");
Object.defineProperty(exports, "app", { enumerable: true, get: function () { return helpers_1.app; } });
// Exporta o sistema de autenticação
// Função para verificar se o projeto é grande o suficiente para se beneficiar de chunks
function isLargeProject(projectDir) {
    try {
        const srcDir = path_1.default.join(projectDir, 'src');
        if (!fs_1.default.existsSync(srcDir))
            return false;
        let totalFiles = 0;
        let totalSize = 0;
        function scanDirectory(dir) {
            const items = fs_1.default.readdirSync(dir, { withFileTypes: true });
            for (const item of items) {
                const fullPath = path_1.default.join(dir, item.name);
                if (item.isDirectory() && item.name !== 'node_modules' && item.name !== '.git') {
                    scanDirectory(fullPath);
                }
                else if (item.isFile() && /\.(tsx?|jsx?|css|scss|less)$/i.test(item.name)) {
                    totalFiles++;
                    totalSize += fs_1.default.statSync(fullPath).size;
                }
            }
        }
        scanDirectory(srcDir);
        // Considera projeto grande se:
        // - Mais de 20 arquivos de frontend/style
        // - Ou tamanho total > 500KB
        return totalFiles > 20 || totalSize > 500 * 1024;
    }
    catch (error) {
        // Em caso de erro, assume que não é um projeto grande
        return false;
    }
}
// Função para gerar o arquivo de entrada para o esbuild
function createEntryFile(projectDir, routes) {
    const tempDir = path_1.default.join(projectDir, '.hweb');
    fs_1.default.mkdirSync(tempDir, { recursive: true });
    const entryFilePath = path_1.default.join(tempDir, 'entry.client.js');
    // Verifica se há layout
    const layout = (0, router_1.getLayout)();
    // Verifica se há notFound personalizado
    const notFound = (0, router_1.getNotFound)();
    // Gera imports dinâmicos para cada componente
    const imports = routes
        .map((route, index) => {
        const relativePath = path_1.default.relative(tempDir, route.componentPath).replace(/\\/g, '/');
        return `import route${index} from '${relativePath}';`;
    })
        .join('\n');
    // Import do layout se existir
    const layoutImport = layout
        ? `import LayoutComponent from '${path_1.default.relative(tempDir, layout.componentPath).replace(/\\/g, '/')}';`
        : '';
    // Import do notFound se existir
    const notFoundImport = notFound
        ? `import NotFoundComponent from '${path_1.default.relative(tempDir, notFound.componentPath).replace(/\\/g, '/')}';`
        : '';
    // Registra os componentes no window para o cliente acessar
    const componentRegistration = routes
        .map((route, index) => `  '${route.componentPath}': route${index}.component || route${index}.default?.component,`)
        .join('\n');
    // Registra o layout se existir
    const layoutRegistration = layout
        ? `window.__HWEB_LAYOUT__ = LayoutComponent.default || LayoutComponent;`
        : `window.__HWEB_LAYOUT__ = null;`;
    // Registra o notFound se existir
    const notFoundRegistration = notFound
        ? `window.__HWEB_NOT_FOUND__ = NotFoundComponent.default || NotFoundComponent;`
        : `window.__HWEB_NOT_FOUND__ = null;`;
    // Caminho correto para o entry.client.tsx
    const sdkDir = path_1.default.dirname(__dirname); // Vai para a pasta pai de src (onde está o hweb-sdk)
    const entryClientPath = path_1.default.join(sdkDir, 'src', 'client', 'entry.client.tsx');
    const relativeEntryPath = path_1.default.relative(tempDir, entryClientPath).replace(/\\/g, '/');
    // Import do DefaultNotFound do SDK
    const defaultNotFoundPath = path_1.default.join(sdkDir, 'src', 'client', 'DefaultNotFound.tsx');
    const relativeDefaultNotFoundPath = path_1.default.relative(tempDir, defaultNotFoundPath).replace(/\\/g, '/');
    const entryContent = `// Arquivo gerado automaticamente pelo hweb
${imports}
${layoutImport}
${notFoundImport}
import DefaultNotFound from '${relativeDefaultNotFoundPath}';

// Registra os componentes para o cliente
window.__HWEB_COMPONENTS__ = {
${componentRegistration}
};

// Registra o layout se existir
${layoutRegistration}

// Registra o notFound se existir
${notFoundRegistration}

// Registra o DefaultNotFound do hweb
window.__HWEB_DEFAULT_NOT_FOUND__ = DefaultNotFound;

// Importa e executa o entry.client.tsx
import '${relativeEntryPath}';
`;
    fs_1.default.writeFileSync(entryFilePath, entryContent);
    return entryFilePath;
}
function hweb(options) {
    const { dev = true, dir = process.cwd(), port = 3000 } = options;
    const userWebDir = path_1.default.join(dir, 'src', 'web');
    const userWebRoutesDir = path_1.default.join(userWebDir, 'routes');
    const userBackendRoutesDir = path_1.default.join(userWebDir, 'backend', 'routes');
    /**
     * Executa middlewares sequencialmente e depois o handler final
     * @param middlewares Array de middlewares para executar
     * @param finalHandler Handler final da rota
     * @param request Requisição do HightJS
     * @param params Parâmetros da rota
     * @returns Resposta do middleware ou handler final
     */
    async function executeMiddlewareChain(middlewares, finalHandler, request, params) {
        if (!middlewares || middlewares.length === 0) {
            // Não há middlewares, executa diretamente o handler final
            return await finalHandler(request, params);
        }
        let currentIndex = 0;
        // Função next que será chamada pelos middlewares
        const next = async () => {
            if (currentIndex < middlewares.length) {
                // Ainda há middlewares para executar
                const currentMiddleware = middlewares[currentIndex];
                currentIndex++;
                return await currentMiddleware(request, params, next);
            }
            else {
                // Todos os middlewares foram executados, chama o handler final
                return await finalHandler(request, params);
            }
        };
        // Inicia a cadeia de execução
        return await next();
    }
    let frontendRoutes = [];
    let hotReloadManager = null;
    let entryPoint;
    let outfile;
    // Função para regenerar o entry file
    const regenerateEntryFile = () => {
        // Recarrega todas as rotas e componentes
        frontendRoutes = (0, router_1.loadRoutes)(userWebRoutesDir);
        (0, router_1.loadLayout)(userWebDir);
        (0, router_1.loadNotFound)(userWebDir);
        // Regenera o entry file
        entryPoint = createEntryFile(dir, frontendRoutes);
    };
    const app = {
        prepare: async () => {
            const isProduction = !dev;
            if (!isProduction) {
                // Inicia hot reload apenas em desenvolvimento (sem logs)
                hotReloadManager = new hotReload_1.HotReloadManager(dir);
                await hotReloadManager.start();
                // Adiciona callback para recarregar rotas de backend quando mudarem
                hotReloadManager.onBackendApiChange(() => {
                    (0, router_1.loadBackendRoutes)(userBackendRoutesDir);
                });
                // Adiciona callback para regenerar entry file quando frontend mudar
                hotReloadManager.onFrontendChange(() => {
                    regenerateEntryFile();
                });
            }
            // ORDEM IMPORTANTE: Carrega TUDO antes de criar o arquivo de entrada
            frontendRoutes = (0, router_1.loadRoutes)(userWebRoutesDir);
            (0, router_1.loadBackendRoutes)(userBackendRoutesDir);
            // Carrega layout.tsx ANTES de criar o entry file
            const layout = (0, router_1.loadLayout)(userWebDir);
            const notFound = (0, router_1.loadNotFound)(userWebDir);
            const outDir = path_1.default.join(dir, 'hweb-dist');
            fs_1.default.mkdirSync(outDir, { recursive: true });
            entryPoint = createEntryFile(dir, frontendRoutes);
            // Usa chunks quando há muitas rotas ou o projeto é grande
            const shouldUseChunks = frontendRoutes.length > 5 || isLargeProject(dir);
            if (shouldUseChunks) {
                const outDir = path_1.default.join(dir, 'hweb-dist');
                if (isProduction) {
                    await (0, builder_1.buildWithChunks)(entryPoint, outDir, isProduction);
                    console_1.default.info(`✅ Build com chunks finalizado! ${frontendRoutes.length} rotas processadas.`);
                }
                else {
                    (0, builder_1.watchWithChunks)(entryPoint, outDir, hotReloadManager).catch(err => {
                        console_1.default.error(`Erro ao iniciar o watch com chunks`, err);
                    });
                    console_1.default.info(`🚀 Modo watch com chunks ativo para ${frontendRoutes.length} rotas.`);
                }
            }
            else {
                outfile = path_1.default.join(dir, 'hweb-dist', 'main.js');
                if (isProduction) {
                    await (0, builder_1.build)(entryPoint, outfile, isProduction);
                }
                else {
                    (0, builder_1.watch)(entryPoint, outfile, hotReloadManager).catch(err => {
                        console_1.default.error(`Erro ao iniciar o watch`, err);
                    });
                }
            }
        },
        executeInstrumentation: () => {
            // verificar se dir/src/instrumentation.(tsx/jsx/js/ts) existe com regex
            const instrumentationFile = fs_1.default.readdirSync(path_1.default.join(dir, 'src')).find(file => /^hightweb\.(tsx|jsx|js|ts)$/.test(file));
            if (instrumentationFile) {
                const instrumentationPath = path_1.default.join(dir, 'src', instrumentationFile);
                // dar require, e executar a função principal do arquivo
                const instrumentation = require(instrumentationPath);
                if (typeof instrumentation === 'function') {
                    instrumentation();
                }
                else if (typeof instrumentation.default === 'function') {
                    instrumentation.default();
                }
                else {
                    console_1.default.warn(`O arquivo de instrumentação ${instrumentationFile} não exporta uma função padrão.`);
                }
            }
        },
        getRequestHandler: () => {
            return async (req, res) => {
                // Detecta automaticamente o framework e cria o adapter apropriado
                const adapter = factory_1.FrameworkAdapterFactory.detectFramework(req, res);
                const genericReq = adapter.parseRequest(req);
                const genericRes = adapter.createResponse(res);
                // Adiciona informações do hweb na requisição genérica
                genericReq.hwebDev = dev;
                genericReq.hotReloadManager = hotReloadManager;
                const { pathname } = new URL(genericReq.url, `http://${genericReq.headers.host || 'localhost'}`);
                const method = genericReq.method.toUpperCase();
                // 1. Verifica se é WebSocket upgrade para hot reload
                if (pathname === '/hweb-hotreload/' && genericReq.headers.upgrade === 'websocket' && hotReloadManager) {
                    // Framework vai chamar o evento 'upgrade' do servidor HTTP
                    return;
                }
                // 2. Primeiro verifica se é um arquivo estático da pasta public
                if (pathname !== '/' && !pathname.startsWith('/api/') && !pathname.startsWith('/hweb-')) {
                    const publicDir = path_1.default.join(dir, 'public');
                    const filePath = path_1.default.join(publicDir, pathname);
                    if (fs_1.default.existsSync(filePath) && fs_1.default.statSync(filePath).isFile()) {
                        const ext = path_1.default.extname(filePath).toLowerCase();
                        const contentTypes = {
                            '.html': 'text/html',
                            '.css': 'text/css',
                            '.js': 'application/javascript',
                            '.json': 'application/json',
                            '.png': 'image/png',
                            '.jpg': 'image/jpeg',
                            '.jpeg': 'image/jpeg',
                            '.gif': 'image/gif',
                            '.svg': 'image/svg+xml',
                            '.ico': 'image/x-icon',
                            '.webp': 'image/webp',
                            '.mp4': 'video/mp4',
                            '.webm': 'video/webm',
                            '.mp3': 'audio/mpeg',
                            '.wav': 'audio/wav',
                            '.pdf': 'application/pdf',
                            '.txt': 'text/plain',
                            '.xml': 'application/xml',
                            '.zip': 'application/zip'
                        };
                        genericRes.header('Content-Type', contentTypes[ext] || 'application/octet-stream');
                        // Para arquivos estáticos, usamos o método nativo do framework
                        if (adapter.type === 'express') {
                            res.sendFile(filePath);
                        }
                        else if (adapter.type === 'fastify') {
                            const fileContent = fs_1.default.readFileSync(filePath);
                            genericRes.send(fileContent);
                        }
                        else if (adapter.type === 'native') {
                            const fileContent = fs_1.default.readFileSync(filePath);
                            genericRes.send(fileContent);
                        }
                        return;
                    }
                }
                // 3. Verifica se é um arquivo estático do hweb-dist
                if (pathname.startsWith('/hweb-dist/')) {
                    const staticPath = path_1.default.join(dir, 'hweb-dist');
                    const filePath = path_1.default.join(staticPath, pathname.replace('/hweb-dist/', ''));
                    if (fs_1.default.existsSync(filePath)) {
                        const ext = path_1.default.extname(filePath).toLowerCase();
                        const contentTypes = {
                            '.js': 'application/javascript',
                            '.css': 'text/css',
                            '.map': 'application/json'
                        };
                        genericRes.header('Content-Type', contentTypes[ext] || 'text/plain');
                        // Para arquivos estáticos, usamos o método nativo do framework
                        if (adapter.type === 'express') {
                            res.sendFile(filePath);
                        }
                        else if (adapter.type === 'fastify') {
                            const fileContent = fs_1.default.readFileSync(filePath);
                            genericRes.send(fileContent);
                        }
                        else if (adapter.type === 'native') {
                            const fileContent = fs_1.default.readFileSync(filePath);
                            genericRes.send(fileContent);
                        }
                        return;
                    }
                }
                // 4. REMOVIDO: Verificação de arquivos React UMD - não precisamos mais
                // O React agora será bundlado diretamente no main.js
                // 5. Verifica se é uma rota de API (backend)
                const backendMatch = (0, router_1.findMatchingBackendRoute)(pathname, method);
                if (backendMatch) {
                    try {
                        const handler = backendMatch.route[method];
                        if (handler) {
                            const hwebReq = new http_1.HightJSRequest(genericReq);
                            // Executa middlewares e depois o handler final
                            const hwebRes = await executeMiddlewareChain(backendMatch.route.middleware, handler, hwebReq, backendMatch.params);
                            // Aplica a resposta usando o adapter correto
                            hwebRes._applyTo(genericRes);
                            return;
                        }
                    }
                    catch (error) {
                        console_1.default.error(`Erro na rota de API ${pathname}:`, error);
                        genericRes.status(500).text('Erro interno do servidor na API');
                        return;
                    }
                }
                // 6. Por último, tenta renderizar uma página (frontend) ou 404
                const pageMatch = (0, router_1.findMatchingRoute)(pathname);
                if (!pageMatch) {
                    // Em vez de enviar texto simples, renderiza a página 404 React
                    try {
                        // Cria uma "rota falsa" para a página 404
                        const notFoundRoute = {
                            pattern: '/__404__',
                            component: () => null, // Componente vazio, será tratado no cliente
                            componentPath: '__404__'
                        };
                        const html = await (0, renderer_1.render)({
                            req: genericReq,
                            route: notFoundRoute,
                            params: {},
                            allRoutes: frontendRoutes
                        });
                        genericRes.status(404).header('Content-Type', 'text/html').send(html);
                        return;
                    }
                    catch (error) {
                        console_1.default.error(`Erro ao renderizar página 404:`, error);
                        genericRes.status(404).text('Página não encontrada');
                        return;
                    }
                }
                try {
                    const html = await (0, renderer_1.render)({
                        req: genericReq,
                        route: pageMatch.route,
                        params: pageMatch.params,
                        allRoutes: frontendRoutes
                    });
                    genericRes.status(200).header('Content-Type', 'text/html').send(html);
                }
                catch (error) {
                    console_1.default.error(`Erro ao renderizar a página ${pathname}:`, error);
                    genericRes.status(500).text('Erro interno do servidor');
                }
            };
        },
        // Método para configurar WebSocket upgrade nos servidores Express e Fastify
        setupWebSocket: (server) => {
            if (hotReloadManager) {
                // Detecta se é um servidor Express ou Fastify
                const isExpressServer = factory_1.FrameworkAdapterFactory.getCurrentAdapter() instanceof express_1.ExpressAdapter;
                if (isExpressServer) {
                    server.on('upgrade', (request, socket, head) => {
                        const { pathname } = new URL(request.url, `http://${request.headers.host}`);
                        if (pathname === '/hweb-hotreload/') {
                            hotReloadManager.handleUpgrade(request, socket, head);
                        }
                        else {
                            socket.destroy();
                        }
                    });
                }
                else {
                    // Fastify usa um approach diferente para WebSockets
                    const actualServer = server.server || server;
                    actualServer.on('upgrade', (request, socket, head) => {
                        const { pathname } = new URL(request.url, `http://${request.headers.host}`);
                        if (pathname === '/hweb-hotreload/') {
                            hotReloadManager.handleUpgrade(request, socket, head);
                        }
                        else {
                            socket.destroy();
                        }
                    });
                }
            }
        },
        build: async () => {
            const msg = console_1.default.dynamicLine(`  ${console_1.Colors.FgYellow}●  ${console_1.Colors.Reset}Iniciando build do cliente para produção`);
            const outDir = path_1.default.join(dir, 'hweb-dist');
            fs_1.default.mkdirSync(outDir, { recursive: true });
            const routes = (0, router_1.loadRoutes)(userWebRoutesDir);
            const entryPoint = createEntryFile(dir, routes);
            const outfile = path_1.default.join(outDir, 'main.js');
            await (0, builder_1.build)(entryPoint, outfile, true); // Força produção no build manual
            msg.end(`  ${console_1.Colors.FgGreen}●  ${console_1.Colors.Reset}Build do cliente concluído: ${outfile}`);
        },
        stop: () => {
            if (hotReloadManager) {
                hotReloadManager.stop();
            }
        }
    };
    return app;
}
