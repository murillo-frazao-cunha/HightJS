import { RouteConfig, BackendRouteConfig, HightMiddleware, WebSocketHandler } from './types';
/**
 * Limpa todo o cache de rotas carregadas
 */
export declare function clearAllRouteCache(): void;
/**
 * Limpa o cache de um arquivo específico e recarrega as rotas se necessário
 * @param changedFilePath Caminho do arquivo que foi alterado
 */
export declare function clearFileCache(changedFilePath: string): void;
/**
 * Carrega o layout.tsx se existir no diretório web
 * @param webDir O diretório web onde procurar o layout
 * @returns O layout carregado ou null se não existir
 */
export declare function loadLayout(webDir: string): {
    componentPath: string;
    metadata?: any;
} | null;
/**
 * Retorna o layout atual se carregado
 */
export declare function getLayout(): {
    componentPath: string;
    metadata?: any;
} | null;
/**
 * Carrega dinamicamente todas as rotas de frontend do diretório do usuário.
 * @param routesDir O diretório onde as rotas de página estão localizadas.
 * @returns A lista de rotas de página que foram carregadas.
 */
export declare function loadRoutes(routesDir: string): (RouteConfig & {
    componentPath: string;
})[];
/**
 * Encontra a rota de página correspondente para uma URL.
 * @param pathname O caminho da URL (ex: "/users/123").
 * @returns Um objeto com a rota e os parâmetros, ou null se não encontrar.
 */
export declare function findMatchingRoute(pathname: string): {
    route: RouteConfig & {
        componentPath: string;
    };
    params: {
        [key: string]: string;
    };
} | null;
/**
 * Carrega dinamicamente todas as rotas de API do diretório de backend.
 * @param backendRoutesDir O diretório onde as rotas de API estão localizadas.
 */
export declare function loadBackendRoutes(backendRoutesDir: string): void;
/**
 * Encontra a rota de API correspondente para uma URL e método HTTP.
 * @param pathname O caminho da URL (ex: "/api/users/123").
 * @param method O método HTTP da requisição (GET, POST, etc.).
 * @returns Um objeto com a rota e os parâmetros, ou null se não encontrar.
 */
export declare function findMatchingBackendRoute(pathname: string, method: string): {
    route: BackendRouteConfig;
    params: {
        [key: string]: string;
    };
} | null;
/**
 * Carrega o notFound.tsx se existir no diretório web
 * @param webDir O diretório web onde procurar o notFound
 * @returns O notFound carregado ou null se não existir
 */
export declare function loadNotFound(webDir: string): {
    componentPath: string;
} | null;
/**
 * Retorna o componente 404 atual se carregado
 */
export declare function getNotFound(): {
    componentPath: string;
} | null;
/**
 * Processa e registra rotas WebSocket encontradas nas rotas backend
 */
export declare function processWebSocketRoutes(): void;
/**
 * Encontra a rota WebSocket correspondente para uma URL
 */
export declare function findMatchingWebSocketRoute(pathname: string): {
    route: {
        pattern: string;
        handler: WebSocketHandler;
        middleware?: HightMiddleware[];
    };
    params: {
        [key: string]: string;
    };
} | null;
/**
 * Configura WebSocket upgrade no servidor HTTP existente
 * @param server Servidor HTTP (Express, Fastify ou Native)
 * @param hotReloadManager Instância do gerenciador de hot-reload para coordenação
 */
export declare function setupWebSocketUpgrade(server: any, hotReloadManager?: any): void;
