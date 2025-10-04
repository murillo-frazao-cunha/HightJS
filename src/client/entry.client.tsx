import React, {useState, useEffect, useCallback, useRef} from 'react';
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



// --- Constantes de Configuração ---
const DEV_INDICATOR_SIZE = 48;
const DEV_INDICATOR_CORNERS = [
    { top: 16, left: 16 },    // 0: topo-esquerda
    { top: 16, right: 16 },   // 1: topo-direita
    { bottom: 16, left: 16 }, // 2: baixo-esquerda
    { bottom: 16, right: 16 },// 3: baixo-direita
];

function DevIndicator() {
    const [corner, setCorner] = useState(3); // Canto atual (0-3)
    const [isMenuOpen, setIsMenuOpen] = useState(false); // Estado do menu
    const [isDragging, setIsDragging] = useState(false); // Estado de arrastar

    // Posição visual do indicador durante o arraste
    const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

    const indicatorRef = useRef<HTMLDivElement>(null);
    const dragStartRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);

    // --- Estilos Dinâmicos ---
    const getIndicatorStyle = (): React.CSSProperties => {
        const baseStyle: React.CSSProperties = {
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

    const getMenuPositionStyle = (): React.CSSProperties => {
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
    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        dragStartRef.current = { x: e.clientX, y: e.clientY, moved: false };
        if (indicatorRef.current) {
            const rect = indicatorRef.current.getBoundingClientRect();
            setPosition({ top: rect.top, left: rect.left });
        }
        setIsDragging(true);
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging || !dragStartRef.current) return;

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

    const handleMouseUp = useCallback((e: MouseEvent) => {
        if (!isDragging) return;
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
        } else {
            // Se não moveu, foi um clique: abre/fecha o menu
            setIsMenuOpen(prev => !prev);
        }

        dragStartRef.current = null;
    }, [isDragging]);

    // Adiciona e remove listeners globais
    useEffect(() => {
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
    useEffect(() => {
        if (!isMenuOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (indicatorRef.current && !indicatorRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isMenuOpen]);

    return (
        <div ref={indicatorRef} style={getIndicatorStyle()} onMouseDown={handleMouseDown} title="Modo Dev HightJS">
            H
            {isMenuOpen && (
                <div style={{
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
                }}>
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0, zIndex: 10000 }}>
                        <li style={{ padding: '8px 16px', cursor: 'pointer' }} onClick={() => alert('Opção 1 clicada!')}>Ver Logs</li>
                        <li style={{ padding: '8px 16px', cursor: 'pointer' }} onClick={() => alert('Opção 2 clicada!')}>Limpar Cache</li>
                        <li style={{ padding: '8px 16px', cursor: 'pointer' }} onClick={() => alert('Opção 3 clicada!')}>Recarregar</li>
                    </ul>
                </div>
            )}
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
