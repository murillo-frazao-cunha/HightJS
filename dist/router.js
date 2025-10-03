"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearAllRouteCache = clearAllRouteCache;
exports.clearFileCache = clearFileCache;
exports.loadLayout = loadLayout;
exports.getLayout = getLayout;
exports.loadRoutes = loadRoutes;
exports.findMatchingRoute = findMatchingRoute;
exports.loadBackendRoutes = loadBackendRoutes;
exports.findMatchingBackendRoute = findMatchingBackendRoute;
exports.loadNotFound = loadNotFound;
exports.getNotFound = getNotFound;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const console_1 = __importDefault(require("./api/console"));
// --- Roteamento do Frontend ---
// Guarda todas as rotas de PÁGINA (React) encontradas
// A rota agora também armazena o caminho do arquivo para ser usado como um ID único no cliente
let allRoutes = [];
// Guarda o layout se existir
let layoutComponent = null;
// Guarda o componente 404 personalizado se existir
let notFoundComponent = null;
// Cache de arquivos carregados para limpeza
let loadedRouteFiles = new Set();
let loadedLayoutFiles = new Set();
let loadedNotFoundFiles = new Set();
/**
 * Limpa o cache do require para um arquivo específico
 * @param filePath Caminho do arquivo para limpar
 */
function clearRequireCache(filePath) {
    try {
        const resolvedPath = require.resolve(filePath);
        delete require.cache[resolvedPath];
        // Também limpa arquivos temporários relacionados
        const tempFile = filePath.replace(/\.(tsx|ts)$/, '.temp.$1');
        try {
            const tempResolvedPath = require.resolve(tempFile);
            delete require.cache[tempResolvedPath];
        }
        catch {
            // Arquivo temporário pode não existir
        }
    }
    catch (error) {
        // Arquivo pode não estar no cache
    }
}
/**
 * Limpa todo o cache de rotas carregadas
 */
function clearAllRouteCache() {
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
function clearFileCache(changedFilePath) {
    const absolutePath = path_1.default.isAbsolute(changedFilePath) ? changedFilePath : path_1.default.resolve(changedFilePath);
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
function loadLayout(webDir) {
    const layoutPath = path_1.default.join(webDir, 'layout.tsx');
    const layoutPathJs = path_1.default.join(webDir, 'layout.ts');
    const layoutFile = fs_1.default.existsSync(layoutPath) ? layoutPath :
        fs_1.default.existsSync(layoutPathJs) ? layoutPathJs : null;
    if (layoutFile) {
        const componentPath = path_1.default.relative(process.cwd(), layoutFile).replace(/\\/g, '/');
        const absolutePath = path_1.default.resolve(layoutFile);
        try {
            // Limpa o cache antes de recarregar
            clearRequireCache(absolutePath);
            // HACK: Cria uma versão temporária do layout SEM imports de CSS para carregar no servidor
            const layoutContent = fs_1.default.readFileSync(layoutFile, 'utf8');
            const tempContent = layoutContent
                .replace(/import\s+['"][^'"]*\.css['"];?/g, '// CSS import removido para servidor')
                .replace(/import\s+['"][^'"]*\.scss['"];?/g, '// SCSS import removido para servidor')
                .replace(/import\s+['"][^'"]*\.sass['"];?/g, '// SASS import removido para servidor');
            const tempFile = layoutFile.replace(/\.(tsx|ts)$/, '.temp.$1');
            fs_1.default.writeFileSync(tempFile, tempContent);
            // Carrega o arquivo temporário sem CSS
            delete require.cache[require.resolve(tempFile)];
            const layoutModule = require(tempFile);
            // Remove o arquivo temporário
            fs_1.default.unlinkSync(tempFile);
            const metadata = layoutModule.metadata || null;
            // Registra o arquivo como carregado
            loadedLayoutFiles.add(absolutePath);
            layoutComponent = { componentPath, metadata };
            return layoutComponent;
        }
        catch (error) {
            console_1.default.error(`Erro ao carregar layout ${layoutFile}:`, error);
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
function getLayout() {
    return layoutComponent;
}
/**
 * Carrega dinamicamente todas as rotas de frontend do diretório do usuário.
 * @param routesDir O diretório onde as rotas de página estão localizadas.
 * @returns A lista de rotas de página que foram carregadas.
 */
function loadRoutes(routesDir) {
    if (!fs_1.default.existsSync(routesDir)) {
        console_1.default.warn(`Diretório de rotas de frontend não encontrado em ${routesDir}. Nenhuma página será carregada.`);
        allRoutes = [];
        return allRoutes;
    }
    const files = fs_1.default.readdirSync(routesDir, { recursive: true, encoding: 'utf-8' });
    // Corrigindo o filtro para excluir corretamente o diretório backend
    const routeFiles = files.filter(file => {
        const isTypeScriptFile = file.endsWith('.ts') || file.endsWith('.tsx');
        const isNotBackend = !file.includes('backend' + path_1.default.sep) && !file.includes('backend/');
        return isTypeScriptFile && isNotBackend;
    });
    const loaded = [];
    for (const file of routeFiles) {
        const filePath = path_1.default.join(routesDir, file);
        const absolutePath = path_1.default.resolve(filePath);
        // Usamos um caminho relativo ao CWD como um ID estável para o componente.
        const componentPath = path_1.default.relative(process.cwd(), filePath).replace(/\\/g, '/');
        try {
            // Limpa o cache antes de recarregar para pegar alterações nos metadados
            clearRequireCache(absolutePath);
            const routeModule = require(filePath);
            if (routeModule.default && routeModule.default.pattern && routeModule.default.component) {
                loaded.push({ ...routeModule.default, componentPath });
                // Registra o arquivo como carregado
                loadedRouteFiles.add(absolutePath);
            }
        }
        catch (error) {
            console_1.default.error(`Erro ao carregar a rota de página ${filePath}:`, error);
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
function findMatchingRoute(pathname) {
    for (const route of allRoutes) {
        if (!route.pattern)
            continue;
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
let allBackendRoutes = [];
/**
 * Carrega dinamicamente todas as rotas de API do diretório de backend.
 * @param backendRoutesDir O diretório onde as rotas de API estão localizadas.
 */
function loadBackendRoutes(backendRoutesDir) {
    if (!fs_1.default.existsSync(backendRoutesDir)) {
        // É opcional ter uma API, então não mostramos um aviso se a pasta não existir.
        allBackendRoutes = [];
        return;
    }
    const files = fs_1.default.readdirSync(backendRoutesDir, { recursive: true, encoding: 'utf-8' });
    const routeFiles = files.filter(file => file.endsWith('.ts') || file.endsWith('.tsx'));
    const loaded = [];
    for (const file of routeFiles) {
        const filePath = path_1.default.join(backendRoutesDir, file);
        try {
            const routeModule = require(filePath);
            if (routeModule.default && routeModule.default.pattern) {
                loaded.push(routeModule.default);
            }
        }
        catch (error) {
            console_1.default.error(`Erro ao carregar a rota de API ${filePath}:`, error);
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
function findMatchingBackendRoute(pathname, method) {
    for (const route of allBackendRoutes) {
        // Verifica se a rota tem um handler para o método HTTP atual
        if (!route.pattern || !route[method.toUpperCase()])
            continue;
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
function loadNotFound(webDir) {
    const notFoundPath = path_1.default.join(webDir, 'notFound.tsx');
    const notFoundPathJs = path_1.default.join(webDir, 'notFound.ts');
    const notFoundFile = fs_1.default.existsSync(notFoundPath) ? notFoundPath :
        fs_1.default.existsSync(notFoundPathJs) ? notFoundPathJs : null;
    if (notFoundFile) {
        const componentPath = path_1.default.relative(process.cwd(), notFoundFile).replace(/\\/g, '/');
        const absolutePath = path_1.default.resolve(notFoundFile);
        try {
            // Limpa o cache antes de recarregar
            clearRequireCache(absolutePath);
            // Registra o arquivo como carregado
            loadedNotFoundFiles.add(absolutePath);
            notFoundComponent = { componentPath };
            return notFoundComponent;
        }
        catch (error) {
            console_1.default.error(`Erro ao carregar notFound ${notFoundFile}:`, error);
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
function getNotFound() {
    return notFoundComponent;
}
