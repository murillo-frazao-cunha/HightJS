import fs from 'fs';
import path from 'path';
import { RouteConfig, BackendRouteConfig } from './types';
import Console from "./api/console"

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

        // Também limpa arquivos temporários relacionados
        const tempFile = filePath.replace(/\.(tsx|ts)$/, '.temp.$1');
        try {
            const tempResolvedPath = require.resolve(tempFile);
            delete require.cache[tempResolvedPath];
        } catch {
            // Arquivo temporário pode não existir
        }
    } catch (error) {
        // Arquivo pode não estar no cache
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
        const componentPath = path.relative(process.cwd(), layoutFile).replace(/\\/g, '/');
        const absolutePath = path.resolve(layoutFile);

        try {
            // Limpa o cache antes de recarregar
            clearRequireCache(absolutePath);

            // HACK: Cria uma versão temporária do layout SEM imports de CSS para carregar no servidor
            const layoutContent = fs.readFileSync(layoutFile, 'utf8');
            const tempContent = layoutContent
                .replace(/import\s+['"][^'"]*\.css['"];?/g, '// CSS import removido para servidor')
                .replace(/import\s+['"][^'"]*\.scss['"];?/g, '// SCSS import removido para servidor')
                .replace(/import\s+['"][^'"]*\.sass['"];?/g, '// SASS import removido para servidor');

            const tempFile = layoutFile.replace(/\.(tsx|ts)$/, '.temp.$1');
            fs.writeFileSync(tempFile, tempContent);

            // Carrega o arquivo temporário sem CSS
            delete require.cache[require.resolve(tempFile)];
            const layoutModule = require(tempFile);

            // Remove o arquivo temporário
            fs.unlinkSync(tempFile);

            const metadata = layoutModule.metadata || null;

            // Registra o arquivo como carregado
            loadedLayoutFiles.add(absolutePath);

            layoutComponent = { componentPath, metadata };
            return layoutComponent;
        } catch (error) {
            Console.error(`Erro ao carregar layout ${layoutFile}:`, error);
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
        Console.warn(`Diretório de rotas de frontend não encontrado em ${routesDir}. Nenhuma página será carregada.`);
        allRoutes = [];
        return allRoutes;
    }

    const files = fs.readdirSync(routesDir, { recursive: true, encoding: 'utf-8' });
    // Corrigindo o filtro para excluir corretamente o diretório backend
    const routeFiles = files.filter(file => {
        const isTypeScriptFile = file.endsWith('.ts') || file.endsWith('.tsx');
        const isNotBackend = !file.includes('backend' + path.sep) && !file.includes('backend/');
        return isTypeScriptFile && isNotBackend;
    });

    const loaded: (RouteConfig & { componentPath: string })[] = [];
    for (const file of routeFiles) {
        const filePath = path.join(routesDir, file);
        const absolutePath = path.resolve(filePath);
        // Usamos um caminho relativo ao CWD como um ID estável para o componente.
        const componentPath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');

        try {
            // Limpa o cache antes de recarregar para pegar alterações nos metadados
            clearRequireCache(absolutePath);

            const routeModule = require(filePath);
            if (routeModule.default && routeModule.default.pattern && routeModule.default.component) {
                loaded.push({ ...routeModule.default, componentPath });

                // Registra o arquivo como carregado
                loadedRouteFiles.add(absolutePath);
            }
        } catch (error) {
            Console.error(`Erro ao carregar a rota de página ${filePath}:`, error);
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

        // Converte o padrão da rota (ex: /users/[id]) em uma RegExp
        const regexPattern = route.pattern.replace(/\[(\w+)\]/g, '(?<$1>[^/]+)');
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
    const files = fs.readdirSync(backendRoutesDir, { recursive: true, encoding: 'utf-8' });
    const routeFiles = files.filter(file => file.endsWith('.ts') || file.endsWith('.tsx'));

    const loaded: BackendRouteConfig[] = [];
    for (const file of routeFiles) {
        const filePath = path.join(backendRoutesDir, file);
        try {
            const routeModule = require(filePath);
            if (routeModule.default && routeModule.default.pattern) {
                loaded.push(routeModule.default);
            }
        } catch (error) {
            Console.error(`Erro ao carregar a rota de API ${filePath}:`, error);
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

        const regexPattern = route.pattern.replace(/\[(\w+)\]/g, '(?<$1>[^/]+)');
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
        const componentPath = path.relative(process.cwd(), notFoundFile).replace(/\\/g, '/');
        const absolutePath = path.resolve(notFoundFile);

        try {
            // Limpa o cache antes de recarregar
            clearRequireCache(absolutePath);

            // Registra o arquivo como carregado
            loadedNotFoundFiles.add(absolutePath);

            notFoundComponent = { componentPath };
            return notFoundComponent;
        } catch (error) {
            Console.error(`Erro ao carregar notFound ${notFoundFile}:`, error);
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
