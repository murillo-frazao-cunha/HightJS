import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

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
    const [CurrentPageComponent, setCurrentPageComponent] = useState(() => {
        // Se for a rota especial __404__, não busca no componentMap
        if (initialComponentPath === '__404__') {
            return null;
        }
        return componentMap[initialComponentPath];
    });
    const [params, setParams] = useState(initialParams);

    const findRouteForPath = (path: string) => {
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
    };

    const navigate = (path: string) => {
        // Atualiza a URL na barra de endereço
        window.history.pushState({ path }, '', path);
        // Encontra o novo componente e atualiza o estado
        const match = findRouteForPath(path);
        if (match) {
            setCurrentPageComponent(() => componentMap[match.componentPath]);
            setParams(match.params);
        } else {
            // Se não encontrou rota, define como null para mostrar 404
            setCurrentPageComponent(null);
            setParams({});
        }
    };

    // Ouve os eventos de "voltar" e "avançar" do navegador
    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            const currentPath = window.location.pathname;
            const match = findRouteForPath(currentPath);
            if (match) {
                setCurrentPageComponent(() => componentMap[match.componentPath]);
                setParams(match.params);
            } else {
                // Se não encontrou rota, define como null para mostrar 404
                setCurrentPageComponent(null);
                setParams({});
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [routes, componentMap]);

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

    // Cria um contexto simples para navegação
    const RouterContext = React.createContext({ navigate });

    // Renderiza o componente atual
    const PageContent = (
        <RouterContext.Provider value={{ navigate }}>
            <CurrentPageComponent params={params} />
        </RouterContext.Provider>
    );

    // SEMPRE usa o layout - se não existir, cria um wrapper padrão
    if (layoutComponent) {
        // Usa o layout personalizado do usuário
        return React.createElement(layoutComponent, { children: PageContent });
    } else {
        // Se não há layout personalizado, cria um wrapper básico mas SEMPRE envolve
        return (
            <div style={{ minHeight: '100vh' }}>
                {PageContent}
            </div>
        );
    }
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
