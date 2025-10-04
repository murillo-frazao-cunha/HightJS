import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { router } from './clientRouter';

// --- O Componente Principal do Cliente (Roteador) ---

interface AppProps {
    componentMap: Record<string, any>;
    routes: { pattern: string; componentPath: string }[];
    initialComponentPath: string;
    initialParams: any;
    layoutComponent?: any;
}

function App({ componentMap, routes, initialComponentPath, initialParams, layoutComponent }: AppProps) {
    // Estado que guarda o componente a ser renderizado atualmente

    if(process.env.NODE_ENV !== 'production'){
        console.log('%c[HightJS] Modo de desenvolvimento ativo. Algumas funcionalidades podem estar limitadas.', 'color: orange; font-weight: bold;');
    }

    const [CurrentPageComponent, setCurrentPageComponent] = useState(() => {
        // Se for a rota especial __404__, não busca no componentMap
        if (initialComponentPath === '__404__') {
            return null;
        }
        return componentMap[initialComponentPath];
    });
    const [params, setParams] = useState(initialParams);

    const findRouteForPath = useCallback((path: string) => {
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

    const updateRoute = useCallback(() => {
        const currentPath = router.pathname;
        const match = findRouteForPath(currentPath);
        if (match) {
            setCurrentPageComponent(() => componentMap[match.componentPath]);
            setParams(match.params);
        } else {
            // Se não encontrou rota, define como null para mostrar 404
            setCurrentPageComponent(null);
            setParams({});
        }
    }, [router.pathname, findRouteForPath, componentMap]);

    // Ouve os eventos de "voltar" e "avançar" do navegador
    useEffect(() => {
        const handlePopState = () => {
            updateRoute();
        };

        window.addEventListener('popstate', handlePopState);

        // Também se inscreve no router para mudanças de rota
        const unsubscribe = router.subscribe(updateRoute);

        return () => {
            window.removeEventListener('popstate', handlePopState);
            unsubscribe();
        };
    }, [updateRoute]);

    // Se não há componente ou é a rota __404__, mostra página 404
    if (!CurrentPageComponent || initialComponentPath === '__404__') {
        // Usa o componente 404 personalizado se existir, senão usa o padrão do hweb
        const NotFoundComponent = (window as any).__HWEB_NOT_FOUND__;

        if (NotFoundComponent) {
            // Usa o notFound.tsx personalizado do usuário
            const NotFoundContent = <NotFoundComponent />;

            // Aplica o layout se existir
            if (layoutComponent) {
                return React.createElement(layoutComponent, { children: NotFoundContent });
            }
            return NotFoundContent;
        } else {
            // Usa o 404 padrão do hweb que foi incluído no build
            const DefaultNotFound = (window as any).__HWEB_DEFAULT_NOT_FOUND__;
            const NotFoundContent = <DefaultNotFound />;

            // Aplica o layout se existir
            if (layoutComponent) {
                return React.createElement(layoutComponent, { children: NotFoundContent });
            }
            return NotFoundContent;
        }
    }

    // Renderiza o componente atual (sem Context, usa o router diretamente)
    const PageContent = <CurrentPageComponent params={params} />;

    // SEMPRE usa o layout - se não existir, cria um wrapper padrão
    const content = layoutComponent
        ? React.createElement(layoutComponent, { children: PageContent })
        : <div>{PageContent}</div>;

    // Adiciona o indicador de dev se não for produção
    return (
        <>
            {content}
            {process.env.NODE_ENV !== 'production' && <DevIndicator />}
        </>
    );
}

// --- Indicador de Desenvolvimento ---
const DEV_INDICATOR_SIZE = 48;
const DEV_INDICATOR_CORNERS = [
    { top: 16, left: 16 }, // topo-esquerda
    { top: 16, right: 16 }, // topo-direita
    { bottom: 16, left: 16 }, // baixo-esquerda
    { bottom: 16, right: 16 }, // baixo-direita
];

function DevIndicator() {
    const [corner, setCorner] = useState(3); // default: bottom-right
    const [dragging, setDragging] = useState(false);
    const indicatorRef = React.useRef<HTMLDivElement>(null);

    // Calcula o estilo baseado no canto
    const style: React.CSSProperties = {
        position: 'fixed',
        zIndex: 9999,
        width: DEV_INDICATOR_SIZE,
        height: DEV_INDICATOR_SIZE,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #ffb300 60%, #fffbe6 100%)',
        color: '#222',
        fontWeight: 'bold',
        fontSize: 28,
        boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: dragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        transition: dragging ? 'none' : 'all 0.2s',
        ...DEV_INDICATOR_CORNERS[corner],
    };

    // Drag logic: move para o canto mais próximo ao soltar
    const onMouseDown = (e: React.MouseEvent) => {
        setDragging(true);
        e.preventDefault();
    };
    const onMouseUp = (e: MouseEvent) => {
        setDragging(false);
        if (!indicatorRef.current) return;
        const { clientX, clientY } = e;
        const w = window.innerWidth, h = window.innerHeight;
        // Calcula distâncias para cada canto
        const dists = [
            Math.hypot(clientX - 16, clientY - 16), // TL
            Math.hypot(clientX - (w - 16), clientY - 16), // TR
            Math.hypot(clientX - 16, clientY - (h - 16)), // BL
            Math.hypot(clientX - (w - 16), clientY - (h - 16)), // BR
        ];
        setCorner(dists.indexOf(Math.min(...dists)));
    };
    React.useEffect(() => {
        if (!dragging) return;
        const onMove = (e: MouseEvent) => {
            // Segue o mouse, mas não move visualmente (snap só ao soltar)
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onMouseUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [dragging]);

    return (
        <div ref={indicatorRef} style={style} onMouseDown={onMouseDown} title="Modo Dev HightJS">
            H
        </div>
    );
}

// --- Inicialização do Cliente (CSR - Client-Side Rendering) ---

function initializeClient() {
    const initialData = (window as any).__HWEB_INITIAL_DATA__;

    if (!initialData) {
        console.error('[hweb] Dados iniciais não encontrados na página.');
        return;
    }

    // Cria o mapa de componentes dinamicamente a partir dos módulos carregados
    const componentMap: Record<string, any> = {};

    // Registra todos os componentes que foram importados
    if ((window as any).__HWEB_COMPONENTS__) {
        Object.assign(componentMap, (window as any).__HWEB_COMPONENTS__);
    }

    const container = document.getElementById('root');
    if (!container) {
        console.error('[hweb] Container #root não encontrado.');
        return;
    }

    try {
        // Usar createRoot para render inicial (CSR)
        const root = createRoot(container);

        root.render(
            <App
                componentMap={componentMap}
                routes={initialData.routes}
                initialComponentPath={initialData.initialComponentPath}
                initialParams={initialData.initialParams}
                layoutComponent={(window as any).__HWEB_LAYOUT__}
            />
        );
    } catch (error) {
        console.error('[hweb] Erro ao renderizar aplicação:', error);
    }
}

// Executa quando o DOM estiver pronto
if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeClient);
} else {
    initializeClient();
}
