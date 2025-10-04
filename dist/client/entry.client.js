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
    const content = layoutComponent
        ? react_1.default.createElement(layoutComponent, { children: PageContent })
        : (0, jsx_runtime_1.jsx)("div", { children: PageContent });
    // Adiciona o indicador de dev se não for produção
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [content, process.env.NODE_ENV !== 'production' && (0, jsx_runtime_1.jsx)(DevIndicator, {})] }));
}
// --- Constantes de Configuração ---
const DEV_INDICATOR_SIZE = 48;
const DEV_INDICATOR_CORNERS = [
    { top: 16, left: 16 }, // 0: topo-esquerda
    { top: 16, right: 16 }, // 1: topo-direita
    { bottom: 16, left: 16 }, // 2: baixo-esquerda
    { bottom: 16, right: 16 }, // 3: baixo-direita
];
function DevIndicator() {
    const [corner, setCorner] = (0, react_1.useState)(3); // Canto atual (0-3)
    const [isMenuOpen, setIsMenuOpen] = (0, react_1.useState)(false); // Estado do menu
    const [isDragging, setIsDragging] = (0, react_1.useState)(false); // Estado de arrastar
    // Posição visual do indicador durante o arraste
    const [position, setPosition] = (0, react_1.useState)({ top: 0, left: 0 });
    const indicatorRef = (0, react_1.useRef)(null);
    const dragStartRef = (0, react_1.useRef)(null);
    // --- Estilos Dinâmicos ---
    const getIndicatorStyle = () => {
        const baseStyle = {
            position: 'fixed',
            zIndex: 9999,
            width: DEV_INDICATOR_SIZE,
            height: DEV_INDICATOR_SIZE,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #8e2de2, #4a00e0)', // Gradiente Roxo
            color: 'white',
            fontWeight: 'bold',
            fontSize: 28,
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
            transition: isDragging ? 'none' : 'all 0.3s ease-out', // Animação suave ao soltar
        };
        if (isDragging) {
            return {
                ...baseStyle,
                top: position.top,
                left: position.left,
            };
        }
        return { ...baseStyle, ...DEV_INDICATOR_CORNERS[corner] };
    };
    const getMenuPositionStyle = () => {
        // Posiciona o menu dependendo do canto
        switch (corner) {
            case 0: return { top: '110%', left: '0' }; // Top-Left
            case 1: return { top: '110%', right: '0' }; // Top-Right
            case 2: return { bottom: '110%', left: '0' }; // Bottom-Left
            case 3: return { bottom: '110%', right: '0' }; // Bottom-Right
            default: return {};
        }
    };
    // --- Lógica de Eventos ---
    const handleMouseDown = (e) => {
        e.preventDefault();
        dragStartRef.current = { x: e.clientX, y: e.clientY, moved: false };
        if (indicatorRef.current) {
            const rect = indicatorRef.current.getBoundingClientRect();
            setPosition({ top: rect.top, left: rect.left });
        }
        setIsDragging(true);
    };
    const handleMouseMove = (0, react_1.useCallback)((e) => {
        if (!isDragging || !dragStartRef.current)
            return;
        const deltaX = e.clientX - dragStartRef.current.x;
        const deltaY = e.clientY - dragStartRef.current.y;
        // Diferencia clique de arrastar (threshold de 5px)
        if (!dragStartRef.current.moved && Math.hypot(deltaX, deltaY) > 5) {
            dragStartRef.current.moved = true;
            setIsMenuOpen(false); // Fecha o menu se começar a arrastar
        }
        if (dragStartRef.current.moved) {
            setPosition(prevPos => ({
                top: prevPos.top + deltaY,
                left: prevPos.left + deltaX,
            }));
            // Atualiza a referência para o próximo movimento
            dragStartRef.current.x = e.clientX;
            dragStartRef.current.y = e.clientY;
        }
    }, [isDragging]);
    const handleMouseUp = (0, react_1.useCallback)((e) => {
        if (!isDragging)
            return;
        setIsDragging(false);
        // Se moveu, calcula o canto mais próximo
        if (dragStartRef.current?.moved) {
            const { clientX, clientY } = e;
            const w = window.innerWidth;
            const h = window.innerHeight;
            const dists = [
                Math.hypot(clientX, clientY), // TL
                Math.hypot(w - clientX, clientY), // TR
                Math.hypot(clientX, h - clientY), // BL
                Math.hypot(w - clientX, h - clientY), // BR
            ];
            setCorner(dists.indexOf(Math.min(...dists)));
        }
        else {
            // Se não moveu, foi um clique: abre/fecha o menu
            setIsMenuOpen(prev => !prev);
        }
        dragStartRef.current = null;
    }, [isDragging]);
    // Adiciona e remove listeners globais
    (0, react_1.useEffect)(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, handleMouseMove, handleMouseUp]);
    // Fecha o menu ao clicar fora
    (0, react_1.useEffect)(() => {
        if (!isMenuOpen)
            return;
        const handleClickOutside = (event) => {
            if (indicatorRef.current && !indicatorRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isMenuOpen]);
    return ((0, jsx_runtime_1.jsxs)("div", { ref: indicatorRef, style: getIndicatorStyle(), onMouseDown: handleMouseDown, title: "Modo Dev HightJS", children: ["H", isMenuOpen && ((0, jsx_runtime_1.jsx)("div", { style: {
                    position: 'absolute',
                    background: 'white',
                    borderRadius: 8,
                    boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                    minWidth: 150,
                    padding: '8px 0',
                    color: '#333',
                    fontSize: 14,
                    fontWeight: 'normal',
                    ...getMenuPositionStyle(),
                }, children: (0, jsx_runtime_1.jsxs)("ul", { style: { listStyle: 'none', margin: 0, padding: 0, zIndex: 10000 }, children: [(0, jsx_runtime_1.jsx)("li", { style: { padding: '8px 16px', cursor: 'pointer' }, onClick: () => alert('Opção 1 clicada!'), children: "Ver Logs" }), (0, jsx_runtime_1.jsx)("li", { style: { padding: '8px 16px', cursor: 'pointer' }, onClick: () => alert('Opção 2 clicada!'), children: "Limpar Cache" }), (0, jsx_runtime_1.jsx)("li", { style: { padding: '8px 16px', cursor: 'pointer' }, onClick: () => alert('Opção 3 clicada!'), children: "Recarregar" })] }) }))] }));
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
