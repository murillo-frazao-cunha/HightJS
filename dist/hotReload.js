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
exports.HotReloadManager = void 0;
const ws_1 = require("ws");
const chokidar = __importStar(require("chokidar"));
const path = __importStar(require("path"));
const router_1 = require("./router");
const console_1 = __importStar(require("./api/console"));
class HotReloadManager {
    constructor(projectDir) {
        this.wss = null;
        this.watchers = [];
        this.clients = new Map();
        this.backendApiChangeCallback = null;
        this.frontendChangeCallback = null;
        this.isShuttingDown = false;
        this.debounceTimers = new Map();
        this.customHotReloadListener = null;
        this.projectDir = projectDir;
    }
    async start() {
        this.setupWatchers();
    }
    // Método para integrar com Express
    handleUpgrade(request, socket, head) {
        if (this.isShuttingDown) {
            socket.destroy();
            return;
        }
        if (!this.wss) {
            this.wss = new ws_1.WebSocketServer({
                noServer: true,
                perMessageDeflate: false, // Desabilita compressão para melhor performance
                maxPayload: 1024 * 1024 // Limite de 1MB por mensagem
            });
            this.setupWebSocketServer();
        }
        this.wss.handleUpgrade(request, socket, head, (ws) => {
            this.wss.emit('connection', ws, request);
        });
    }
    setupWebSocketServer() {
        if (!this.wss)
            return;
        this.wss.on('connection', (ws) => {
            if (this.isShuttingDown) {
                ws.close();
                return;
            }
            // Setup ping/pong para detectar conexões mortas
            const pingTimer = setInterval(() => {
                const client = this.clients.get(ws);
                if (client && ws.readyState === ws_1.WebSocket.OPEN) {
                    // Se não recebeu pong há mais de 60 segundos, desconecta
                    if (Date.now() - client.lastPong > 60000) {
                        ws.terminate();
                        return;
                    }
                    ws.ping();
                }
            }, 30000);
            const clientConnection = {
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
                console_1.default.logWithout(console_1.Levels.ERROR, `WebSocket error: ${error.message}`);
                this.cleanupClient(ws);
            });
            console_1.default.logWithout(console_1.Levels.INFO, '🔌 Hot-reload cliente conectado');
        });
    }
    cleanupClient(ws) {
        const client = this.clients.get(ws);
        if (client) {
            clearInterval(client.pingTimer);
            this.clients.delete(ws);
        }
    }
    setupWatchers() {
        // Remove watchers antigos e use apenas um watcher global para src
        const debouncedChange = this.debounce((filePath) => {
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
            console_1.default.info(`🗑️ Arquivo removido: ${path.basename(filePath)}`);
            (0, router_1.clearFileCache)(filePath);
            this.clearBackendCache(filePath);
            this.frontendChangeCallback?.();
            this.backendApiChangeCallback?.();
            this.notifyClients('src-reload', { file: filePath, event: 'unlink' });
        });
        this.watchers.push(watcher);
    }
    debounce(func, wait) {
        return (...args) => {
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
    async handleAnySrcChange(filePath) {
        console_1.default.logWithout(console_1.Levels.INFO, `🔄 Arquivo alterado: ${path.basename(filePath)}`);
        // Detecta se é arquivo de frontend ou backend
        const isFrontendFile = filePath.includes(path.join('src', 'web', 'routes')) ||
            filePath.includes(path.join('src', 'web', 'components')) ||
            filePath.includes('layout.tsx') ||
            filePath.includes('not-found.tsx') ||
            filePath.endsWith('.tsx') ||
            filePath.endsWith('.jsx');
        const isBackendFile = filePath.includes(path.join('src', 'web', 'backend')) ||
            (filePath.includes(path.join('src', 'web')) && !isFrontendFile);
        // Limpa o cache do arquivo alterado
        (0, router_1.clearFileCache)(filePath);
        this.clearBackendCache(filePath);
        // Checa build se for .ts/.tsx/.js/.jsx
        const ext = path.extname(filePath);
        if ([".ts", ".tsx", ".js", ".jsx"].includes(ext)) {
            const result = await this.checkFrontendBuild(filePath);
            if (result.error) {
                this.notifyClients('src-error', { file: filePath, error: result.error });
                return;
            }
        }
        // Se for arquivo de frontend, notifica o cliente para recarregar a página
        if (isFrontendFile) {
            console_1.default.logWithout(console_1.Levels.INFO, `📄 Recarregando frontend...`);
            this.frontendChangeCallback?.();
            this.notifyClients('frontend-reload', { file: filePath, event: 'change' });
        }
        // Se for arquivo de backend, recarrega o módulo e notifica
        if (isBackendFile) {
            console_1.default.logWithout(console_1.Levels.INFO, `⚙️ Recarregando backend...`);
            this.backendApiChangeCallback?.();
            this.notifyClients('backend-api-reload', { file: filePath, event: 'change' });
        }
        // Fallback: se não for nem frontend nem backend detectado, recarrega tudo
        if (!isFrontendFile && !isBackendFile) {
            console_1.default.logWithout(console_1.Levels.INFO, `🔄 Recarregando aplicação...`);
            this.frontendChangeCallback?.();
            this.backendApiChangeCallback?.();
            this.notifyClients('src-reload', { file: filePath, event: 'change' });
        }
        // Chama listener customizado se definido
        if (this.customHotReloadListener) {
            try {
                await this.customHotReloadListener(filePath);
            }
            catch (error) {
                // @ts-ignore
                console_1.default.logWithout(console_1.Levels.ERROR, `Erro no listener customizado: ${error.message}`);
            }
        }
    }
    notifyClients(type, data) {
        if (this.isShuttingDown || this.clients.size === 0) {
            return;
        }
        const message = JSON.stringify({ type, data, timestamp: Date.now() });
        const deadClients = [];
        this.clients.forEach((client, ws) => {
            if (ws.readyState === ws_1.WebSocket.OPEN) {
                try {
                    ws.send(message);
                }
                catch (error) {
                    console_1.default.logWithout(console_1.Levels.ERROR, `Erro ao enviar mensagem WebSocket: ${error}`);
                    deadClients.push(ws);
                }
            }
            else {
                deadClients.push(ws);
            }
        });
        // Remove clientes mortos
        deadClients.forEach(ws => this.cleanupClient(ws));
    }
    restartServer() {
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
            if (ws.readyState === ws_1.WebSocket.OPEN) {
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
    getClientScript() {
        return `
        <script>
        (function() {
            if (typeof window !== 'undefined') {
                let ws;
                let reconnectAttempts = 0;
                let maxReconnectInterval = 30000; // 30 segundos max
                let reconnectInterval = 1000; // Começa com 1 segundo
                let reconnectTimer;
                let isConnected = false;
                
                function connect() {
                    // Evita múltiplas tentativas simultâneas
                    if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
                        return;
                    }

                    try {
                        ws = new WebSocket('ws://localhost:3000/hweb-hotreload/');
                        
                        ws.onopen = function() {
                            console.log('🔌 Hot-reload conectado');
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
                                        window.location.reload();
                                        break;
                                    case 'backend-api-reload':
                                        // Recarrega apenas se necessário
                                        window.location.reload();
                                        break;
                                    case 'server-restart':
                                        console.log('🔄 Servidor reiniciando...');
                                        break;
                                    case 'server-ready':
                                        setTimeout(() => window.location.reload(), 500);
                                        break;
                                    case 'frontend-error':
                                        console.error('❌ Erro no frontend:', message.data);
                                        break;
                                }
                            } catch (e) {
                                console.error('Erro ao processar mensagem do hot-reload:', e);
                            }
                        };
                        
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
                        console.error('Erro ao criar WebSocket:', error);
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
    clearBackendCache(filePath) {
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
    onBackendApiChange(callback) {
        this.backendApiChangeCallback = callback;
    }
    onFrontendChange(callback) {
        this.frontendChangeCallback = callback;
    }
    setHotReloadListener(listener) {
        this.customHotReloadListener = listener;
        console_1.default.info('🔌 Hot reload listener customizado registrado');
    }
    removeHotReloadListener() {
        this.customHotReloadListener = null;
    }
    async checkFrontendBuild(filePath) {
        try {
            const tsNodePath = require.resolve('ts-node');
            const { spawn } = require('child_process');
            return new Promise((resolve) => {
                const proc = spawn(process.execPath, [tsNodePath, '--transpile-only', filePath], {
                    cwd: this.projectDir,
                    env: process.env,
                    timeout: 10000 // Timeout de 10 segundos
                });
                let errorMsg = '';
                proc.stderr.on('data', (data) => {
                    errorMsg += data.toString();
                });
                proc.on('close', (code) => {
                    if (code !== 0 && errorMsg) {
                        resolve({ error: errorMsg });
                    }
                    else {
                        resolve({});
                    }
                });
                proc.on('error', (error) => {
                    resolve({ error: error.message });
                });
            });
        }
        catch (error) {
            return { error: `Erro ao verificar build: ${error}` };
        }
    }
}
exports.HotReloadManager = HotReloadManager;
