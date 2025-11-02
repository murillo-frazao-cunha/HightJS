/*
 * This file is part of the HightJS Project.
 * Copyright (c) 2025 itsmuzin
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
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
    const [hmrTimestamp, setHmrTimestamp] = useState(Date.now());

    // Helper para encontrar rota baseado no path
    const findRouteForPath = useCallback((path: string) => {
        for (const route of routes) {
            const regexPattern = route.pattern
                // [[...param]] → opcional catch-all
                .replace(/\[\[\.\.\.(\w+)\]\]/g, '(?<$1>.+)?')
                // [...param] → obrigatório catch-all
                .replace(/\[\.\.\.(\w+)\]/g, '(?<$1>.+)')
                // /[[param]] → opcional com barra também opcional
                .replace(/\/\[\[(\w+)\]\]/g, '(?:/(?<$1>[^/]+))?')
                // [[param]] → segmento opcional (sem barra anterior)
                .replace(/\[\[(\w+)\]\]/g, '(?<$1>[^/]+)?')
                // [param] → segmento obrigatório
                .replace(/\[(\w+)\]/g, '(?<$1>[^/]+)');
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

    // Inicializa o componente e params baseado na URL ATUAL (não no initialComponentPath)
    const [CurrentPageComponent, setCurrentPageComponent] = useState(() => {
        // Pega a rota atual da URL
        const currentPath = window.location.pathname;
        const match = findRouteForPath(currentPath);

        if (match) {
            return componentMap[match.componentPath];
        }

        // Se não encontrou rota, retorna null para mostrar 404
        return null;
    });

    const [params, setParams] = useState(() => {
        // Pega os params da URL atual
        const currentPath = window.location.pathname;
        const match = findRouteForPath(currentPath);
        return match ? match.params : {};
    });

    // HMR: Escuta eventos de hot reload
    useEffect(() => {
        // Ativa o sistema de HMR
        (window as any).__HWEB_HMR__ = true;

        const handleHMRUpdate = async (event: CustomEvent) => {
            const { file, timestamp } = event.detail;
            const fileName = file ? file.split('/').pop()?.split('\\').pop() : 'unknown';
            console.log('🔥 HMR: Hot reloading...', fileName);

            try {
                // Aguarda um pouco para o esbuild terminar de recompilar
                await new Promise(resolve => setTimeout(resolve, 300));

                // Re-importa o módulo principal com cache busting
                const mainScript = document.querySelector('script[src*="main.js"]') as HTMLScriptElement;
                if (mainScript) {
                    const mainSrc = mainScript.src.split('?')[0];
                    const cacheBustedSrc = `${mainSrc}?t=${timestamp}`;

                    // Cria novo script
                    const newScript = document.createElement('script');
                    newScript.type = 'module';
                    newScript.src = cacheBustedSrc;

                    // Quando o novo script carregar, força re-render
                    newScript.onload = () => {
                        console.log('✅ HMR: Modules reloaded');

                        // Força re-render do componente
                        setHmrTimestamp(timestamp);

                        // Marca sucesso
                        (window as any).__HMR_SUCCESS__ = true;
                        setTimeout(() => {
                            (window as any).__HMR_SUCCESS__ = false;
                        }, 3000);
                    };

                    newScript.onerror = () => {
                        console.error('❌ HMR: Failed to reload modules');
                        (window as any).__HMR_SUCCESS__ = false;
                    };

                    // Remove o script antigo e adiciona o novo
                    // (não remove para não quebrar o app)
                    document.head.appendChild(newScript);
                } else {
                    // Se não encontrou o script, apenas força re-render
                    console.log('⚡ HMR: Forcing re-render');
                    setHmrTimestamp(timestamp);
                    (window as any).__HMR_SUCCESS__ = true;
                }
            } catch (error) {
                console.error('❌ HMR Error:', error);
                (window as any).__HMR_SUCCESS__ = false;
            }
        };

        window.addEventListener('hmr:component-update' as any, handleHMRUpdate);

        return () => {
            window.removeEventListener('hmr:component-update' as any, handleHMRUpdate);
        };
    }, []);


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
    // Usa key com timestamp para forçar re-mount durante HMR
    const PageContent = <CurrentPageComponent key={`page-${hmrTimestamp}`} params={params} />;

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
    const [isDragging, setIsDragging] = useState(false); // Estado de arrastar
    const [isBuilding, setIsBuilding] = useState(false); // Estado de build

    // Posição visual do indicador durante o arraste
    const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

    const indicatorRef = useRef<HTMLDivElement>(null);
    const dragStartRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);

    // Escuta eventos de hot reload para mostrar estado de build
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleHotReloadMessage = (event: MessageEvent) => {
            try {
                const message = JSON.parse(event.data);

                // Quando detecta mudança em arquivo, ativa loading
                if (message.type === 'frontend-reload' ||
                    message.type === 'backend-api-reload' ||
                    message.type === 'src-reload') {
                    setIsBuilding(true);
                }

                // Quando o build termina ou servidor fica pronto, desativa loading
                if (message.type === 'server-ready' || message.type === 'build-complete') {
                    setIsBuilding(false);
                }
            } catch (e) {
                // Ignora mensagens que não são JSON
            }
        };

        // Intercepta mensagens WebSocket
        const originalWebSocket = window.WebSocket;
        window.WebSocket = class extends originalWebSocket {
            constructor(url: string | URL, protocols?: string | string[]) {
                super(url, protocols);

                this.addEventListener('message', (event) => {
                    if (url.toString().includes('hweb-hotreload')) {
                        handleHotReloadMessage(event);
                    }
                });
            }
        } as any;

        return () => {
            window.WebSocket = originalWebSocket;
        };
    }, []);

    // --- Estilos Dinâmicos ---
    const getIndicatorStyle = (): React.CSSProperties => {
        const baseStyle: React.CSSProperties = {
            position: 'fixed',
            zIndex: 9999,
            width: DEV_INDICATOR_SIZE,
            height: DEV_INDICATOR_SIZE,
            borderRadius: '50%',
            background: isBuilding
                ? 'linear-gradient(135deg, #f093fb, #f5576c)' // Gradiente Rosa/Vermelho quando building
                : 'linear-gradient(135deg, #8e2de2, #4a00e0)', // Gradiente Roxo normal
            color: 'white',
            fontWeight: 'bold',
            fontSize: 28,
            boxShadow: isBuilding
                ? '0 4px 25px rgba(245, 87, 108, 0.6)' // Shadow mais forte quando building
                : '0 4px 15px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
            transition: isDragging ? 'none' : 'all 0.3s ease-out',
            animation: isBuilding ? 'hweb-pulse 1.5s ease-in-out infinite' : 'none',
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


    return (
        <>
            <style>
                {`
                    @keyframes hweb-pulse {
                        0%, 100% {
                            transform: scale(1);
                            opacity: 1;
                        }
                        50% {
                            transform: scale(1.1);
                            opacity: 0.8;
                        }
                    }
                    
                    @keyframes hweb-spin {
                        from {
                            transform: rotate(0deg);
                        }
                        to {
                            transform: rotate(360deg);
                        }
                    }
                `}
            </style>
            <div
                ref={indicatorRef}
                style={getIndicatorStyle()}
                onMouseDown={handleMouseDown}
                title={isBuilding ? "Building..." : "Modo Dev HightJS"}
            >
                {isBuilding ? (
                    <span style={{ animation: 'hweb-spin 1s linear infinite' }}>⟳</span>
                ) : (
                    'H'
                )}
            </div>
        </>
    );
}

// --- Inicialização do Cliente (CSR - Client-Side Rendering) ---

function deobfuscateData(obfuscated: string): any {
    try {
        // Remove o hash fake
        const parts = obfuscated.split('.');
        const base64 = parts.length > 1 ? parts[1] : parts[0];

        // Decodifica base64
        const jsonStr = atob(base64);

        // Parse JSON
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error('[hweb] Failed to decode data:', error);
        return null;
    }
}

function initializeClient() {
    // Lê os dados do atributo data-h
    const dataElement = document.getElementById('__hight_data__');

    if (!dataElement) {
        console.error('[hweb] Initial data script not found.');
        return;
    }

    const obfuscated = dataElement.getAttribute('data-h');

    if (!obfuscated) {
        console.error('[hweb] Data attribute not found.');
        return;
    }

    const initialData = deobfuscateData(obfuscated);

    if (!initialData) {
        console.error('[hweb] Failed to parse initial data.');
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
        console.error('[hweb] Container #root not found.');
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
        console.error('[hweb] Error rendering application:', error);
    }
}

// Executa quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeClient);
} else {
    initializeClient();
}

