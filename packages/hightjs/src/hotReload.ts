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
import { WebSocket, WebSocketServer } from 'ws';
import * as chokidar from 'chokidar';
import * as path from 'path';
import * as fs from 'fs';
import { IncomingMessage } from 'http';
import * as url from 'url';
import { clearFileCache } from './router';
import Console, {Colors, Levels} from "./api/console"

interface ClientConnection {
    ws: WebSocket;
    pingTimer: NodeJS.Timeout;
    lastPong: number;
}

export class HotReloadManager {
    private wss: WebSocketServer | null = null;
    private watchers: chokidar.FSWatcher[] = [];
    private projectDir: string;
    private clients: Map<WebSocket, ClientConnection> = new Map();
    private backendApiChangeCallback: (() => void) | null = null;
    private frontendChangeCallback: (() => void) | null = null;
    private isShuttingDown: boolean = false;
    private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
    private customHotReloadListener: ((file: string) => Promise<void> | void) | null = null;
    private isBuilding: boolean = false;
    private buildCompleteResolve: (() => void) | null = null;

    constructor(projectDir: string) {
        this.projectDir = projectDir;
    }

    async start() {
        this.setupWatchers();
    }

    // Método para integrar com Express
    handleUpgrade(request: IncomingMessage, socket: any, head: Buffer) {
        if (this.isShuttingDown) {
            socket.destroy();
            return;
        }

        if (!this.wss) {
            this.wss = new WebSocketServer({
                noServer: true,
                perMessageDeflate: false, // Desabilita compressão para melhor performance
                maxPayload: 1024 * 1024 // Limite de 1MB por mensagem
            });
            this.setupWebSocketServer();
        }

        this.wss.handleUpgrade(request, socket, head, (ws) => {
            this.wss!.emit('connection', ws, request);
        });
    }

    private setupWebSocketServer() {
        if (!this.wss) return;

        this.wss.on('connection', (ws: WebSocket) => {
            if (this.isShuttingDown) {
                ws.close();
                return;
            }

            // Setup ping/pong para detectar conexões mortas
            const pingTimer = setInterval(() => {
                const client = this.clients.get(ws);
                if (client && ws.readyState === WebSocket.OPEN) {
                    // Se não recebeu pong há mais de 60 segundos, desconecta
                    if (Date.now() - client.lastPong > 60000) {
                        ws.terminate();
                        return;
                    }
                    ws.ping();
                }
            }, 30000);

            const clientConnection: ClientConnection = {
                ws,
                pingTimer,
                lastPong: Date.now()
            };

            this.clients.set(ws, clientConnection);

            ws.on('pong', () => {
                const client = this.clients.get(ws);
                if (client) {
                    client.lastPong = Date.now();
                }
            });

            ws.on('close', () => {
                this.cleanupClient(ws);
            });

            ws.on('error', (error) => {
                Console.logWithout(Levels.ERROR, Colors.BgRed,`WebSocket error: ${error.message}`);
                this.cleanupClient(ws);
            });

        });
    }

    private cleanupClient(ws: WebSocket) {
        const client = this.clients.get(ws);
        if (client) {
            clearInterval(client.pingTimer);
            this.clients.delete(ws);
        }
    }

    private setupWatchers() {
        // Remove watchers antigos e use apenas um watcher global para src
        const debouncedChange = this.debounce((filePath: string) => {
            this.handleAnySrcChange(filePath);
        }, 100);

        const watcher = chokidar.watch([
            path.join(this.projectDir, 'src/**/*'),
        ], {
            ignored: [
                /(^|[\/\\])\../, // arquivos ocultos
                '**/node_modules/**',
                '**/.git/**',
                '**/dist/**'
            ],
            persistent: true,
            ignoreInitial: true,
            usePolling: false,
            awaitWriteFinish: {
                stabilityThreshold: 100,
                pollInterval: 50
            }
        });

        watcher.on('change', debouncedChange);
        watcher.on('add', debouncedChange);
        watcher.on('unlink', (filePath) => {
            Console.info(`🗑️ Arquivo removido: ${path.basename(filePath)}`);
            clearFileCache(filePath);
            this.clearBackendCache(filePath);
            this.frontendChangeCallback?.();
            this.backendApiChangeCallback?.();
            this.notifyClients('src-reload', { file: filePath, event: 'unlink' });
        });

        this.watchers.push(watcher);
    }

    private debounce(func: Function, wait: number): (...args: any[]) => void {
        return (...args: any[]) => {
            const key = args[0]; // usa o primeiro argumento como chave

            const existingTimer = this.debounceTimers.get(key);
            if (existingTimer) {
                clearTimeout(existingTimer);
            }

            const timer = setTimeout(() => {
                this.debounceTimers.delete(key);
                func.apply(this, args);
            }, wait);

            this.debounceTimers.set(key, timer);
        };
    }

    private async handleAnySrcChange(filePath: string) {
        Console.logWithout(Levels.INFO, Colors.BgRed,`🔄 Arquivo alterado: ${path.basename(filePath)}`);

        // Detecta se é arquivo de frontend ou backend
        const isFrontendFile = filePath.includes(path.join('src', 'web', 'routes')) ||
                               filePath.includes(path.join('src', 'web', 'components')) ||
                               filePath.includes('layout.tsx') ||
                               filePath.includes('not-found.tsx') ||
                               filePath.endsWith('.tsx');

        const isBackendFile = filePath.includes(path.join('src', 'backend')) && !isFrontendFile;

        // Limpa o cache do arquivo alterado
        clearFileCache(filePath);
        this.clearBackendCache(filePath);

        // Se for arquivo de frontend, aguarda o build terminar antes de recarregar
        if (isFrontendFile) {
            Console.logWithout(Levels.INFO, Colors.BgRed,`📄 Waiting for frontend build...`);

            // Marca que estamos esperando um build
            this.isBuilding = true;

            // Cria uma promise que será resolvida quando o build terminar
            const buildPromise = new Promise<void>((resolve) => {
                this.buildCompleteResolve = resolve;
            });

            // Aguarda o build terminar (com timeout de 30 segundos)
            const timeoutPromise = new Promise<void>((_, reject) => {
                setTimeout(() => reject(new Error('Build timeout')), 30000);
            });

            try {
                this.frontendChangeCallback?.();
                await Promise.race([buildPromise, timeoutPromise]);
                Console.logWithout(Levels.INFO, Colors.BgRed,`✅ Build complete, reloading frontend...`);
                this.frontendChangeCallback?.();
                this.notifyClients('frontend-reload', { file: filePath, event: 'change' });
            } catch (error) {
                Console.logWithout(Levels.ERROR, Colors.BgRed,`⚠️ Timeout in build, reloading anyway...`);
                this.frontendChangeCallback?.();
                this.notifyClients('frontend-reload', { file: filePath, event: 'change' });
            } finally {
                this.isBuilding = false;
                this.buildCompleteResolve = null;
            }
        }

        // Se for arquivo de backend, recarrega o módulo e notifica
        if (isBackendFile) {
            Console.logWithout(Levels.INFO, Colors.BgRed,`⚙️ Reloading backend...`);
            this.backendApiChangeCallback?.();
            this.notifyClients('backend-api-reload', { file: filePath, event: 'change' });
        }

        // Fallback: se não for nem frontend nem backend detectado, recarrega tudo
        if (!isFrontendFile && !isBackendFile) {
            Console.logWithout(Levels.INFO, Colors.BgRed,`🔄 Reloading application...`);
            this.frontendChangeCallback?.();
            this.backendApiChangeCallback?.();
            this.notifyClients('src-reload', { file: filePath, event: 'change' });
        }

        // Chama listener customizado se definido
        if (this.customHotReloadListener) {
            try {
                await this.customHotReloadListener(filePath);
            } catch (error) {
                // @ts-ignore
                Console.logWithout(Levels.ERROR, `Error in custom listener: ${error.message}`);
            }
        }
    }

    private notifyClients(type: string, data?: any) {
        if (this.isShuttingDown || this.clients.size === 0) {
            return;
        }

        const message = JSON.stringify({ type, data, timestamp: Date.now() });
        const deadClients: WebSocket[] = [];

        this.clients.forEach((client, ws) => {
            if (ws.readyState === WebSocket.OPEN) {
                try {
                    ws.send(message);
                } catch (error) {
                    Console.logWithout(Levels.ERROR, Colors.BgRed, `Error sending WebSocket message: ${error}`);
                    deadClients.push(ws);
                }
            } else {
                deadClients.push(ws);
            }
        });

        // Remove clientes mortos
        deadClients.forEach(ws => this.cleanupClient(ws));
    }

    private restartServer() {
        this.notifyClients('server-restart');
        setTimeout(() => {
            this.notifyClients('server-ready');
        }, 2000);
    }

    stop() {
        this.isShuttingDown = true;

        // Limpa todos os debounce timers
        this.debounceTimers.forEach(timer => clearTimeout(timer));
        this.debounceTimers.clear();

        // Para todos os watchers
        this.watchers.forEach(watcher => watcher.close());
        this.watchers = [];

        // Limpa todos os clientes
        this.clients.forEach((client, ws) => {
            clearInterval(client.pingTimer);
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
        });
        this.clients.clear();

        // Fecha WebSocket server
        if (this.wss) {
            this.wss.close();
            this.wss = null;
        }
    }

    // Script do cliente otimizado com reconnection backoff
    getClientScript(): string {
        return `
        <script>
        (function() {
            if (typeof window !== 'undefined') {
                let ws;
                let reconnectAttempts = 0;
                let maxReconnectInterval = 30000; 
                let reconnectInterval = 1000;
                let reconnectTimer;
                let isConnected = false;
                
                function connect() {
                    const url = window.location; // Objeto com info da URL atual
                    const protocol = url.protocol === "https:" ? "wss:" : "ws:"; // Usa wss se for https
                    const wsUrl = protocol + '//' + url.host + '/hweb-hotreload/';
                    if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
                        return;
                    }

                    try {
                        ws = new WebSocket(wsUrl);
                        
                        ws.onopen = function() {
                            console.log('🔌 Hot-reload connected');
                            isConnected = true;
                            reconnectAttempts = 0;
                            reconnectInterval = 1000;
                            clearTimeout(reconnectTimer);
                        };
                        
                        ws.onmessage = function(event) {
                            try {
                                const message = JSON.parse(event.data);
                                
                                switch(message.type) {
                                    case 'frontend-reload':
                                        handleFrontendReload(message.data);
                                        break;
                                    case 'backend-api-reload':
                                        // Backend sempre precisa recarregar
                                        console.log('🔄 Backend changed, reloading...');
                                        window.location.reload();
                                        break;
                                    case 'server-restart':
                                        console.log('🔄 Server restarting...');
                                        break;
                                    case 'server-ready':
                                        setTimeout(() => window.location.reload(), 500);
                                        break;
                                    case 'frontend-error':
                                        console.error('❌ Frontend error:', message.data);
                                        break;
                                    case 'hmr-update':
                                        handleHMRUpdate(message.data);
                                        break;
                                }
                            } catch (e) {
                                console.error('Erro ao processar mensagem do hot-reload:', e);
                            }
                        };
                        
                        function handleFrontendReload(data) {
                            if (!data || !data.file) {
                                window.location.reload();
                                return;
                            }
                            
                            const file = data.file.toLowerCase();
                            
                            // Mudanças que exigem reload completo
                            const needsFullReload = 
                                file.includes('layout.tsx') ||
                                file.includes('not-found.tsx') ||
                                file.endsWith('.css');
                            
                            if (needsFullReload) {
                                console.log('⚡ Layout/CSS changed, full reload...');
                                window.location.reload();
                                return;
                            }
                            
                            // Mudanças em rotas: tenta HMR
                            if (file.includes('/routes/') || file.includes('\\routes\\')) {
                                console.log('⚡ Route component changed, hot reloading...');

                                // Dispara evento para forçar re-render
                                const event = new CustomEvent('hmr:component-update', { 
                                    detail: { file: data.file, timestamp: Date.now() } 
                                });
                                window.dispatchEvent(event);

                                // Aguarda 500ms para ver se o HMR foi bem-sucedido
                                setTimeout(() => {
                                    const hmrSuccess = window.__HMR_SUCCESS__;
                                    if (!hmrSuccess) {
                                        console.log('⚠️ HMR failed, falling back to full reload');
                                        window.location.reload();
                                    } else {
                                        console.log('✅ HMR successful!');
                                    }
                                }, 500);
                            } else {
                                // Outros arquivos: reload completo por segurança
                                window.location.reload();
                            }
                        }
                        
                        function handleHMRUpdate(data) {
                            console.log('🔥 HMR Update:', data);
                            
                            // Dispara evento customizado para o React capturar
                            const event = new CustomEvent('hmr:update', { 
                                detail: data 
                            });
                            window.dispatchEvent(event);
                        }
                        
                        function attemptHMR(changedFile) {
                            // Tenta fazer Hot Module Replacement
                            // Dispara evento para o React App capturar
                            const event = new CustomEvent('hmr:component-update', { 
                                detail: { file: changedFile, timestamp: Date.now() } 
                            });
                            window.dispatchEvent(event);
                            
                            // Fallback: se após 2s não houve sucesso, reload
                            setTimeout(() => {
                                const hmrSuccess = window.__HMR_SUCCESS__;
                                if (!hmrSuccess) {
                                    console.log('⚠️ HMR failed, falling back to full reload');
                                    window.location.reload();
                                }
                            }, 2000);
                        }
                        
                        ws.onclose = function(event) {
                            isConnected = false;
                            
                            // Não tenta reconectar se foi fechamento intencional
                            if (event.code === 1000) {
                                return;
                            }
                            
                            scheduleReconnect();
                        };
                        
                        ws.onerror = function(error) {
                            isConnected = false;
                            // Não loga erros de conexão para evitar spam no console
                        };
                        
                    } catch (error) {
                        console.error('Error creating WebSocket:', error);
                        scheduleReconnect();
                    }
                }
                
                function scheduleReconnect() {
                    if (reconnectTimer) {
                        clearTimeout(reconnectTimer);
                    }
                    
                    reconnectAttempts++;
                    
                    // Exponential backoff com jitter
                    const baseInterval = Math.min(reconnectInterval * Math.pow(1.5, reconnectAttempts - 1), maxReconnectInterval);
                    const jitter = Math.random() * 1000; // Adiciona até 1 segundo de variação
                    const finalInterval = baseInterval + jitter;
                    
                    reconnectTimer = setTimeout(() => {
                        if (!isConnected) {
                            connect();
                        }
                    }, finalInterval);
                }
                
                // Detecta quando a página está sendo fechada para evitar reconexões desnecessárias
                window.addEventListener('beforeunload', function() {
                    if (ws && ws.readyState === WebSocket.OPEN) {
                        ws.close(1000, 'Page unloading');
                    }
                    clearTimeout(reconnectTimer);
                });
                
                // Detecta quando a aba fica visível novamente para reconectar se necessário
                document.addEventListener('visibilitychange', function() {
                    if (!document.hidden && !isConnected) {
                        reconnectAttempts = 0; // Reset do contador quando a aba fica ativa
                        connect();
                    }
                });
                
                connect();
            }
        })();
        </script>
        `;
    }

    private clearBackendCache(filePath: string) {
        const absolutePath = path.resolve(filePath);
        delete require.cache[absolutePath];

        // Limpa dependências relacionadas de forma mais eficiente
        const dirname = path.dirname(absolutePath);
        Object.keys(require.cache).forEach(key => {
            if (key.startsWith(dirname)) {
                delete require.cache[key];
            }
        });
    }

    onBackendApiChange(callback: () => void) {
        this.backendApiChangeCallback = callback;
    }

    onFrontendChange(callback: () => void) {
        this.frontendChangeCallback = callback;
    }

    setHotReloadListener(listener: (file: string) => Promise<void> | void) {
        this.customHotReloadListener = listener;
        Console.info('🔌 Hot reload custom listener registered');
    }

    removeHotReloadListener() {
        this.customHotReloadListener = null;
    }

    onBuildComplete(success: boolean) {
        if (this.buildCompleteResolve) {
            this.buildCompleteResolve();
            this.buildCompleteResolve = null;
        }
        this.isBuilding = false;

        // Notifica os clientes que o build terminou
        if (success) {
            this.notifyClients('build-complete', { success: true });
        } else {
            this.notifyClients('build-error', { success: false });
        }
    }
}
