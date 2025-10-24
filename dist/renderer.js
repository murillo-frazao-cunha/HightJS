"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.render = render;
const router_1 = require("./router");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Funções para codificar/decodificar dados (disfarça o JSON no HTML)
function encodeInitialData(data) {
    // Converte para JSON, depois para base64, e adiciona um prefixo fake
    const jsonStr = JSON.stringify(data);
    const base64 = Buffer.from(jsonStr).toString('base64');
    return `hweb_${base64}_config`;
}
function createDecodeScript() {
    return `
    
    window.__HWEB_DECODE__ = function(encoded) { const base64 = encoded.replace('hweb_', '').replace('_config', ''); const jsonStr = atob(base64); return JSON.parse(jsonStr); };
    `;
}
async function render({ req, route, params, allRoutes }) {
    const { generateMetadata } = route;
    // Pega a opção dev e hot reload manager do req
    const isProduction = !req.hwebDev;
    const hotReloadManager = req.hotReloadManager;
    // Pega o layout se existir
    const layout = (0, router_1.getLayout)();
    let metadata = { title: 'App hweb' };
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
    // Codifica os dados para disfarçar
    const encodedData = encodeInitialData(initialData);
    // Script de hot reload apenas em desenvolvimento
    const hotReloadScript = !isProduction && hotReloadManager
        ? hotReloadManager.getClientScript()
        : '';
    const favicon = metadata.favicon ? `<link rel="icon" href="${metadata.favicon}">` : '';
    // Determina quais arquivos JavaScript carregar
    const jsFiles = getJavaScriptFiles(req);
    // HTML base sem SSR - apenas o container e scripts para client-side rendering
    return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${metadata.title || 'App hweb'}</title>${metadata.description ? `<meta name="description" content="${metadata.description}">` : ''}${favicon}</head><body><div id="root"></div><script>${createDecodeScript()}window.__HWEB_INITIAL_DATA__ = window.__HWEB_DECODE__('${encodedData}');</script>${jsFiles}${hotReloadScript}</body></html>`;
}
// Função para determinar quais arquivos JavaScript carregar
function getJavaScriptFiles(req) {
    const projectDir = process.cwd();
    const distDir = path_1.default.join(projectDir, 'hweb-dist');
    try {
        // Verifica se existe um manifesto de chunks (gerado pelo ESBuild com splitting)
        const manifestPath = path_1.default.join(distDir, 'manifest.json');
        if (fs_1.default.existsSync(manifestPath)) {
            // Modo chunks - carrega todos os arquivos necessários
            const manifest = JSON.parse(fs_1.default.readFileSync(manifestPath, 'utf8'));
            const scripts = Object.values(manifest)
                .filter((file) => file.endsWith('.js'))
                .map((file) => `<script src="/hweb-dist/${file}"></script>`)
                .join('');
            return scripts;
        }
        else {
            // Verifica se existem múltiplos arquivos JS (chunks sem manifesto)
            const jsFiles = fs_1.default.readdirSync(distDir)
                .filter(file => file.endsWith('.js') && !file.endsWith('.map'))
                .sort((a, b) => {
                // Ordena para carregar arquivos principais primeiro
                if (a.includes('main'))
                    return -1;
                if (b.includes('main'))
                    return 1;
                if (a.includes('vendor') || a.includes('react'))
                    return -1;
                if (b.includes('vendor') || b.includes('react'))
                    return 1;
                return a.localeCompare(b);
            });
            if (jsFiles.length > 1) {
                // Modo chunks sem manifesto
                return jsFiles
                    .map(file => `<script src="/hweb-dist/${file}"></script>`)
                    .join('');
            }
            else {
                // Modo tradicional - único arquivo
                return '<script src="/hweb-dist/main.js"></script>';
            }
        }
    }
    catch (error) {
        // Fallback para o modo tradicional
        return '<script src="/hweb-dist/main.js"></script>';
    }
}
