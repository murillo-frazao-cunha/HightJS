import express from 'express';
import path from 'path';
import fs from 'fs';
import { ExpressAdapter } from './adapters/express';
import { build, watch } from './builder';
import { HightJSOptions, RequestHandler, RouteConfig, BackendRouteConfig, BackendHandler, HightMiddleware } from './types';
import { loadRoutes, findMatchingRoute, loadBackendRoutes, findMatchingBackendRoute, loadLayout, getLayout, loadNotFound, getNotFound } from './router';
import { render } from './renderer';
import { HightJSRequest, HightJSResponse } from './api/http';
import { HotReloadManager } from './hotReload';
import { FrameworkAdapterFactory } from './adapters/factory';
import { GenericRequest, GenericResponse } from './types/framework';
import Console, {Colors} from "./api/console"

// Exporta apenas os tipos e classes para o backend
export { HightJSRequest, HightJSResponse };
export type { BackendRouteConfig, BackendHandler };

// Exporta os adapters para uso manual se necessário
export { ExpressAdapter } from './adapters/express';
export { FastifyAdapter } from './adapters/fastify';
export { FrameworkAdapterFactory } from './adapters/factory';
export type { GenericRequest, GenericResponse, CookieOptions } from './types/framework';

// Exporta os helpers para facilitar integração
export { app } from './helpers';

// Exporta o sistema de autenticação

// Função para gerar o arquivo de entrada para o esbuild
function createEntryFile(projectDir: string, routes: (RouteConfig & { componentPath: string })[]): string {
    const tempDir = path.join(projectDir, '.hweb');
    fs.mkdirSync(tempDir, { recursive: true });

    const entryFilePath = path.join(tempDir, 'entry.client.js');

    // Verifica se há layout
    const layout = getLayout();

    // Verifica se há notFound personalizado
    const notFound = getNotFound();

    // Gera imports dinâmicos para cada componente
    const imports = routes
        .map((route, index) => {
            const relativePath = path.relative(tempDir, route.componentPath).replace(/\\/g, '/');
            return `import route${index} from '${relativePath}';`;
        })
        .join('\n');

    // Import do layout se existir
    const layoutImport = layout
        ? `import LayoutComponent from '${path.relative(tempDir, layout.componentPath).replace(/\\/g, '/')}';`
        : '';

    // Import do notFound se existir
    const notFoundImport = notFound
        ? `import NotFoundComponent from '${path.relative(tempDir, notFound.componentPath).replace(/\\/g, '/')}';`
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
    const sdkDir = path.dirname(__dirname); // Vai para a pasta pai de src (onde está o hweb-sdk)
    const entryClientPath = path.join(sdkDir, 'src', 'client', 'entry.client.tsx');
    const relativeEntryPath = path.relative(tempDir, entryClientPath).replace(/\\/g, '/');

    // Import do DefaultNotFound do SDK
    const defaultNotFoundPath = path.join(sdkDir, 'src', 'client', 'DefaultNotFound.tsx');
    const relativeDefaultNotFoundPath = path.relative(tempDir, defaultNotFoundPath).replace(/\\/g, '/');

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

    fs.writeFileSync(entryFilePath, entryContent);

    return entryFilePath;
}

export default function hweb(options: HightJSOptions) {
    const { dev = true, dir = process.cwd(), port = 3000 } = options;
    const userWebDir = path.join(dir, 'src', 'web');
    const userWebRoutesDir = path.join(userWebDir, 'routes');
    const userBackendRoutesDir = path.join(userWebDir, 'backend', 'routes');

    /**
     * Executa middlewares sequencialmente e depois o handler final
     * @param middlewares Array de middlewares para executar
     * @param finalHandler Handler final da rota
     * @param request Requisição do HightJS
     * @param params Parâmetros da rota
     * @returns Resposta do middleware ou handler final
     */
    async function executeMiddlewareChain(
        middlewares: HightMiddleware[] | undefined,
        finalHandler: BackendHandler,
        request: HightJSRequest,
        params: { [key: string]: string }
    ): Promise<HightJSResponse> {
        if (!middlewares || middlewares.length === 0) {
            // Não há middlewares, executa diretamente o handler final
            return await finalHandler(request, params);
        }

        let currentIndex = 0;

        // Função next que será chamada pelos middlewares
        const next = async (): Promise<HightJSResponse> => {
            if (currentIndex < middlewares.length) {
                // Ainda há middlewares para executar
                const currentMiddleware = middlewares[currentIndex];
                currentIndex++;
                return await currentMiddleware(request, params, next);
            } else {
                // Todos os middlewares foram executados, chama o handler final
                return await finalHandler(request, params);
            }
        };

        // Inicia a cadeia de execução
        return await next();
    }

    let frontendRoutes: (RouteConfig & { componentPath: string })[] = [];
    let hotReloadManager: HotReloadManager | null = null;
    let entryPoint: string;
    let outfile: string;

    // Função para regenerar o entry file
    const regenerateEntryFile = () => {
        // Recarrega todas as rotas e componentes
        frontendRoutes = loadRoutes(userWebRoutesDir);
        loadLayout(userWebDir);
        loadNotFound(userWebDir);

        // Regenera o entry file
        entryPoint = createEntryFile(dir, frontendRoutes);
    };

    const app = {
        prepare: async () => {
            const isProduction = !dev;

            if (!isProduction) {
                // Inicia hot reload apenas em desenvolvimento (sem logs)
                hotReloadManager = new HotReloadManager(dir);
                await hotReloadManager.start();

                // Adiciona callback para recarregar rotas de backend quando mudarem
                hotReloadManager.onBackendApiChange(() => {
                    loadBackendRoutes(userBackendRoutesDir);
                });

                // Adiciona callback para regenerar entry file quando frontend mudar
                hotReloadManager.onFrontendChange(() => {
                    regenerateEntryFile();
                });
            }

            // ORDEM IMPORTANTE: Carrega TUDO antes de criar o arquivo de entrada
            frontendRoutes = loadRoutes(userWebRoutesDir);
            loadBackendRoutes(userBackendRoutesDir);

           // Carrega layout.tsx ANTES de criar o entry file
            const layout = loadLayout(userWebDir);

           const notFound = loadNotFound(userWebDir);

            const outDir = path.join(dir, 'hweb-dist');
            fs.mkdirSync(outDir, { recursive: true });

            entryPoint = createEntryFile(dir, frontendRoutes);
            outfile = path.join(outDir, 'main.js');

            if (isProduction) {
                await build(entryPoint, outfile, isProduction);
            } else {
                watch(entryPoint, outfile, hotReloadManager!).catch(err => {
                    Console.error(`Erro ao iniciar o watch`, err);
                });
            }

        },

        executeInstrumentation: () => {

            // verificar se dir/src/instrumentation.(tsx/jsx/js/ts) existe com regex
            const instrumentationFile = fs.readdirSync(path.join(dir, 'src')).find(file => /^hightweb\.(tsx|jsx|js|ts)$/.test(file));
            if (instrumentationFile) {
                const instrumentationPath = path.join(dir, 'src', instrumentationFile);
                // dar require, e executar a função principal do arquivo
                const instrumentation = require(instrumentationPath);
                if (typeof instrumentation === 'function') {
                    instrumentation();
                } else if (typeof instrumentation.default === 'function') {
                    instrumentation.default();
                } else {
                    Console.warn(`O arquivo de instrumentação ${instrumentationFile} não exporta uma função padrão.`);
                }
            }
        },
        getRequestHandler: (): RequestHandler => {
            return async (req: any, res: any) => {
                // Detecta automaticamente o framework e cria o adapter apropriado
                const adapter = FrameworkAdapterFactory.detectFramework(req, res);
                const genericReq = adapter.parseRequest(req);
                const genericRes = adapter.createResponse(res);

                // Adiciona informações do hweb na requisição genérica
                (genericReq as any).hwebDev = dev;
                (genericReq as any).hotReloadManager = hotReloadManager;

                const { pathname } = new URL(genericReq.url, `http://${genericReq.headers.host || 'localhost'}`);
                const method = genericReq.method.toUpperCase();

                // 1. Verifica se é WebSocket upgrade para hot reload
                if (pathname === '/hweb-hotreload/' && genericReq.headers.upgrade === 'websocket' && hotReloadManager) {
                    // Framework vai chamar o evento 'upgrade' do servidor HTTP
                    return;
                }

                // 2. Primeiro verifica se é um arquivo estático da pasta public
                if (pathname !== '/' && !pathname.startsWith('/api/') && !pathname.startsWith('/hweb-')) {
                    const publicDir = path.join(dir, 'public');
                    const filePath = path.join(publicDir, pathname);

                    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                        const ext = path.extname(filePath).toLowerCase();
                        const contentTypes: Record<string, string> = {
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
                            (res as any).sendFile(filePath);
                        } else if (adapter.type === 'fastify') {
                            const fileContent = fs.readFileSync(filePath);
                            genericRes.send(fileContent);
                        } else if (adapter.type === 'native') {
                            const fileContent = fs.readFileSync(filePath);
                            genericRes.send(fileContent);
                        }
                        return;
                    }
                }

                // 3. Verifica se é um arquivo estático do hweb-dist
                if (pathname.startsWith('/hweb-dist/')) {
                    const staticPath = path.join(dir, 'hweb-dist');
                    const filePath = path.join(staticPath, pathname.replace('/hweb-dist/', ''));

                    if (fs.existsSync(filePath)) {
                        const ext = path.extname(filePath).toLowerCase();
                        const contentTypes: Record<string, string> = {
                            '.js': 'application/javascript',
                            '.css': 'text/css',
                            '.map': 'application/json'
                        };

                        genericRes.header('Content-Type', contentTypes[ext] || 'text/plain');

                        // Para arquivos estáticos, usamos o método nativo do framework
                        if (adapter.type === 'express') {
                            (res as any).sendFile(filePath);
                        } else if (adapter.type === 'fastify') {
                            const fileContent = fs.readFileSync(filePath);
                            genericRes.send(fileContent);
                        } else if (adapter.type === 'native') {
                            const fileContent = fs.readFileSync(filePath);
                            genericRes.send(fileContent);
                        }
                        return;
                    }
                }

                // 4. Verifica se é um arquivo do React (node_modules)
                if (pathname === '/hweb-react/react.js') {
                    const reactPath = dev
                        ? path.join(dir, 'node_modules/react/umd/react.development.js')
                        : path.join(dir, 'node_modules/react/umd/react.production.min.js');
                    console.log(reactPath)
                    if (fs.existsSync(reactPath)) {
                        genericRes.header('Content-Type', 'application/javascript');

                        if (adapter.type === 'express') {
                            (res as any).sendFile(reactPath);
                        } else if (adapter.type === 'fastify') {
                            const fileContent = fs.readFileSync(reactPath);
                            genericRes.send(fileContent);
                        } else if (adapter.type === 'native') {
                            const fileContent = fs.readFileSync(reactPath);
                            genericRes.send(fileContent);
                        }
                        return;
                    }
                }

                if (pathname === '/hweb-react/react-dom.js') {
                    const reactDomPath = dev
                        ? path.join(dir, 'node_modules/react-dom/cjs/react-dom.development.js')
                        : path.join(dir, 'node_modules/react-dom/cjs/react-dom.production.min.js');

                    if (fs.existsSync(reactDomPath)) {
                        genericRes.header('Content-Type', 'application/javascript');

                        if (adapter.type === 'express') {
                            (res as any).sendFile(reactDomPath);
                        } else if (adapter.type === 'fastify') {
                            const fileContent = fs.readFileSync(reactDomPath);
                            genericRes.send(fileContent);
                        } else if (adapter.type === 'native') {
                            const fileContent = fs.readFileSync(reactDomPath);
                            genericRes.send(fileContent);
                        }
                        return;
                    }
                }

                // 5. Verifica se é uma rota de API (backend)
                const backendMatch = findMatchingBackendRoute(pathname, method);
                if (backendMatch) {
                    try {
                        const handler = backendMatch.route[method as keyof BackendRouteConfig] as BackendHandler;
                        if (handler) {
                            const hwebReq = new HightJSRequest(genericReq);

                            // Executa middlewares e depois o handler final
                            const hwebRes = await executeMiddlewareChain(
                                backendMatch.route.middleware,
                                handler,
                                hwebReq,
                                backendMatch.params
                            );

                            // Aplica a resposta usando o adapter correto
                            hwebRes._applyTo(genericRes);
                            return;
                        }
                    } catch (error) {
                        Console.error(`Erro na rota de API ${pathname}:`, error);
                        genericRes.status(500).text('Erro interno do servidor na API');
                        return;
                    }
                }

                // 6. Por último, tenta renderizar uma página (frontend) ou 404
                const pageMatch = findMatchingRoute(pathname);

                if (!pageMatch) {
                    // Em vez de enviar texto simples, renderiza a página 404 React
                    try {
                        // Cria uma "rota falsa" para a página 404
                        const notFoundRoute = {
                            pattern: '/__404__',
                            component: () => null, // Componente vazio, será tratado no cliente
                            componentPath: '__404__'
                        };

                        const html = await render({
                            req: genericReq,
                            route: notFoundRoute,
                            params: {},
                            allRoutes: frontendRoutes
                        });
                        genericRes.status(404).header('Content-Type', 'text/html').send(html);
                        return;
                    } catch (error) {
                        Console.error(`Erro ao renderizar página 404:`, error);
                        genericRes.status(404).text('Página não encontrada');
                        return;
                    }
                }

                try {
                    const html = await render({
                        req: genericReq,
                        route: pageMatch.route,
                        params: pageMatch.params,
                        allRoutes: frontendRoutes
                    });
                    genericRes.status(200).header('Content-Type', 'text/html').send(html);
                } catch (error) {
                    Console.error(`Erro ao renderizar a página ${pathname}:`, error);
                    genericRes.status(500).text('Erro interno do servidor');
                }
            };
        },

        // Método para configurar WebSocket upgrade nos servidores Express e Fastify
        setupWebSocket: (server: any) => {
            if (hotReloadManager) {
                // Detecta se é um servidor Express ou Fastify
                const isExpressServer = FrameworkAdapterFactory.getCurrentAdapter() instanceof ExpressAdapter;


                if (isExpressServer) {

                    server.on('upgrade', (request: any, socket: any, head: Buffer) => {
                        const { pathname } = new URL(request.url, `http://${request.headers.host}`);

                        if (pathname === '/hweb-hotreload/') {
                            hotReloadManager!.handleUpgrade(request, socket, head);
                        } else {
                            socket.destroy();
                        }
                    });
                } else {

                    // Fastify usa um approach diferente para WebSockets
                    const actualServer = server.server || server;
                    actualServer.on('upgrade', (request: any, socket: any, head: Buffer) => {
                        const { pathname } = new URL(request.url, `http://${request.headers.host}`);

                        if (pathname === '/hweb-hotreload/') {
                            hotReloadManager!.handleUpgrade(request, socket, head);
                        } else {
                            socket.destroy();
                        }
                    });
                }
            }
        },

        build: async () => {
            const msg = Console.dynamicLine(`  ${Colors.FgYellow}●  ${Colors.Reset}Iniciando build do cliente para produção`);
            const outDir = path.join(dir, 'hweb-dist');
            fs.mkdirSync(outDir, { recursive: true });

            const routes = loadRoutes(userWebRoutesDir);
            const entryPoint = createEntryFile(dir, routes);
            const outfile = path.join(outDir, 'main.js');

            await build(entryPoint, outfile, true); // Força produção no build manual

            msg.end(`  ${Colors.FgGreen}●  ${Colors.Reset}Build do cliente concluído: ${outfile}`);
        },

        stop: () => {
            if (hotReloadManager) {
                hotReloadManager.stop();
            }
        }
    };

    return app;
}
