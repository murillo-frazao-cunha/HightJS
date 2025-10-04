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
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = __importStar(require("react"));
const client_1 = require("react-dom/client");
const clientRouter_1 = require("./clientRouter");
function App({ componentMap, routes, initialComponentPath, initialParams, layoutComponent }) {
    // Estado que guarda o componente a ser renderizado atualmente
    if (process.env.NODE_ENV !== 'production') {
        console.log('%c[HightJS] Modo de desenvolvimento ativo. Algumas funcionalidades podem estar limitadas.', 'color: orange; font-weight: bold;');
    }
    const [CurrentPageComponent, setCurrentPageComponent] = (0, react_1.useState)(() => {
        // Se for a rota especial __404__, não busca no componentMap
        if (initialComponentPath === '__404__') {
            return null;
        }
        return componentMap[initialComponentPath];
    });
    const [params, setParams] = (0, react_1.useState)(initialParams);
    const findRouteForPath = (0, react_1.useCallback)((path) => {
        for (const route of routes) {
            const regexPattern = route.pattern.replace(/\[(\w+)\]/g, '(?<$1>[^/]+)');
            const regex = new RegExp(`^${regexPattern}/?$`);
            const match = path.match(regex);
            if (match) {
                return {
                    componentPath: route.componentPath,
                    params: match.groups || {}
                };
            }
        }
        return null;
    }, [routes]);
    const updateRoute = (0, react_1.useCallback)(() => {
        const currentPath = clientRouter_1.router.pathname;
        const match = findRouteForPath(currentPath);
        if (match) {
            setCurrentPageComponent(() => componentMap[match.componentPath]);
            setParams(match.params);
        }
        else {
            // Se não encontrou rota, define como null para mostrar 404
            setCurrentPageComponent(null);
            setParams({});
        }
    }, [clientRouter_1.router.pathname, findRouteForPath, componentMap]);
    // Ouve os eventos de "voltar" e "avançar" do navegador
    (0, react_1.useEffect)(() => {
        const handlePopState = () => {
            updateRoute();
        };
        window.addEventListener('popstate', handlePopState);
        // Também se inscreve no router para mudanças de rota
        const unsubscribe = clientRouter_1.router.subscribe(updateRoute);
        return () => {
            window.removeEventListener('popstate', handlePopState);
            unsubscribe();
        };
    }, [updateRoute]);
    // Se não há componente ou é a rota __404__, mostra página 404
    if (!CurrentPageComponent || initialComponentPath === '__404__') {
        // Usa o componente 404 personalizado se existir, senão usa o padrão do hweb
        const NotFoundComponent = window.__HWEB_NOT_FOUND__;
        if (NotFoundComponent) {
            // Usa o notFound.tsx personalizado do usuário
            const NotFoundContent = (0, jsx_runtime_1.jsx)(NotFoundComponent, {});
            // Aplica o layout se existir
            if (layoutComponent) {
                return react_1.default.createElement(layoutComponent, { children: NotFoundContent });
            }
            return NotFoundContent;
        }
        else {
            // Usa o 404 padrão do hweb que foi incluído no build
            const DefaultNotFound = window.__HWEB_DEFAULT_NOT_FOUND__;
            const NotFoundContent = (0, jsx_runtime_1.jsx)(DefaultNotFound, {});
            // Aplica o layout se existir
            if (layoutComponent) {
                return react_1.default.createElement(layoutComponent, { children: NotFoundContent });
            }
            return NotFoundContent;
        }
    }
    // Renderiza o componente atual (sem Context, usa o router diretamente)
    const PageContent = (0, jsx_runtime_1.jsx)(CurrentPageComponent, { params: params });
    // SEMPRE usa o layout - se não existir, cria um wrapper padrão
    if (layoutComponent) {
        // Usa o layout personalizado do usuário
        return react_1.default.createElement(layoutComponent, { children: PageContent });
    }
    else {
        // Se não há layout personalizado, cria um wrapper básico mas SEMPRE envolve
        return ((0, jsx_runtime_1.jsx)("div", { children: PageContent }));
    }
}
// --- Inicialização do Cliente (CSR - Client-Side Rendering) ---
function initializeClient() {
    const initialData = window.__HWEB_INITIAL_DATA__;
    if (!initialData) {
        console.error('[hweb] Dados iniciais não encontrados na página.');
        return;
    }
    // Cria o mapa de componentes dinamicamente a partir dos módulos carregados
    const componentMap = {};
    // Registra todos os componentes que foram importados
    if (window.__HWEB_COMPONENTS__) {
        Object.assign(componentMap, window.__HWEB_COMPONENTS__);
    }
    const container = document.getElementById('root');
    if (!container) {
        console.error('[hweb] Container #root não encontrado.');
        return;
    }
    try {
        // Usar createRoot para render inicial (CSR)
        const root = (0, client_1.createRoot)(container);
        root.render((0, jsx_runtime_1.jsx)(App, { componentMap: componentMap, routes: initialData.routes, initialComponentPath: initialData.initialComponentPath, initialParams: initialData.initialParams, layoutComponent: window.__HWEB_LAYOUT__ }));
    }
    catch (error) {
        console.error('[hweb] Erro ao renderizar aplicação:', error);
    }
}
// Executa quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeClient);
}
else {
    initializeClient();
}
