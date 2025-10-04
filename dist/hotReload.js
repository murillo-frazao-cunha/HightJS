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
        this.clients = new Set();
        this.pingInterval = null;
        this.backendApiChangeCallback = null;
        this.frontendChangeCallback = null;
        this.projectDir = projectDir;
    }
    async start() {
        // Não cria servidor na porta separada - será integrado ao Express
        this.setupWatchers();
    }
    // Novo método para integrar com Express
    handleUpgrade(request, socket, head) {
        if (!this.wss) {
            this.wss = new ws_1.WebSocketServer({ noServer: true });
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
            this.clients.add(ws);
            // Setup ping/pong para manter conexão viva
            const ping = () => {
                if (ws.readyState === ws_1.WebSocket.OPEN) {
                    ws.ping();
                }
            };
            const pingTimer = setInterval(ping, 30000); // Ping a cada 30 segundos
            ws.on('pong', () => {
                // Cliente respondeu ao ping - conexão ainda ativa
            });
            ws.on('close', () => {
                this.clients.delete(ws);
                clearInterval(pingTimer);
            });
            ws.on('error', () => {
                this.clients.delete(ws);
                clearInterval(pingTimer);
            });
        });
    }
    setupWatchers() {
        // 1. Watcher para arquivos frontend (rotas, componentes) - EXCLUINDO backend
        const frontendWatcher = chokidar.watch([
            path.join(this.projectDir, 'src/web/**/*.{tsx,ts,jsx,js}'),
        ], {
            ignored: [
                /(^|[\/\\])\../, // arquivos ocultos
                path.join(this.projectDir, 'src/web/backend/**/*') // exclui toda a pasta backend
            ],
            persistent: true,
            ignoreInitial: true
        });
        frontendWatcher.on('change', async (filePath) => {
            console_1.default.logWithout(console_1.Levels.INFO, `🔄 Frontend alterado: ${filePath}`);
            (0, router_1.clearFileCache)(filePath);
            // Checa build do arquivo alterado
            const result = await this.checkFrontendBuild(filePath);
            if (result.error) {
                this.notifyClients('frontend-error', { file: filePath, error: result.error });
            }
            else {
                this.frontendChangeCallback?.();
                this.notifyClients('frontend-reload');
            }
        });
        frontendWatcher.on('add', async (filePath) => {
            console_1.default.info(`➕ Novo arquivo frontend: ${path.basename(filePath)}`);
            const result = await this.checkFrontendBuild(filePath);
            if (result.error) {
                this.notifyClients('frontend-error', { file: filePath, error: result.error });
            }
            else {
                this.frontendChangeCallback?.();
                this.notifyClients('frontend-reload');
            }
        });
        frontendWatcher.on('unlink', (filePath) => {
            console_1.default.info(`🗑️ Arquivo frontend removido: ${path.basename(filePath)}`);
            (0, router_1.clearFileCache)(filePath);
            this.frontendChangeCallback?.();
            this.notifyClients('frontend-reload');
        });
        // 2. Watcher específico para rotas de API backend
        const backendApiWatcher = chokidar.watch([
            path.join(this.projectDir, 'src/web/backend/routes/**/*.{ts,tsx,js,jsx}'),
        ], {
            ignored: /(^|[\/\\])\../,
            persistent: true,
            ignoreInitial: true
        });
        backendApiWatcher.on('change', (filePath) => {
            console_1.default.info(`🔄 API backend alterada: ${path.basename(filePath)}`);
            this.clearBackendCache(filePath);
            this.notifyClients('backend-api-reload');
            // Chama o callback, se definido
            this.backendApiChangeCallback?.();
        });
        backendApiWatcher.on('add', (filePath) => {
            console_1.default.info(`➕ Nova API backend: ${path.basename(filePath)}`);
            this.notifyClients('backend-api-reload');
        });
        backendApiWatcher.on('unlink', (filePath) => {
            console_1.default.info(`🗑️ API backend removida: ${path.basename(filePath)}`);
            this.clearBackendCache(filePath);
            this.notifyClients('backend-api-reload');
        });
        // 3. Watcher para arquivos backend (server.ts, configs)
        const backendWatcher = chokidar.watch([
            path.join(this.projectDir, 'src/server.ts'),
            path.join(this.projectDir, 'src/**/*.ts'),
            '!**/src/web/**', // exclui pasta web
        ], {
            ignored: /(^|[\/\\])\../,
            persistent: true,
            ignoreInitial: true
        });
        backendWatcher.on('change', () => {
            this.restartServer();
        });
        this.watchers.push(frontendWatcher, backendApiWatcher, backendWatcher);
    }
    notifyClients(type, data) {
        const message = JSON.stringify({ type, data, timestamp: Date.now() });
        this.clients.forEach((client) => {
            if (client.readyState === ws_1.WebSocket.OPEN) {
                client.send(message);
            }
        });
    }
    restartServer() {
        // Notifica clientes que o servidor está reiniciando
        this.notifyClients('server-restart');
        // Aguarda um pouco e tenta reconectar
        setTimeout(() => {
            this.notifyClients('server-ready');
        }, 2000);
    }
    stop() {
        // Para todos os watchers
        this.watchers.forEach(watcher => watcher.close());
        this.watchers = [];
        // Para ping interval
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }
        // Fecha WebSocket server
        if (this.wss) {
            this.wss.close();
        }
    }
    // Retorna o script do cliente para injetar no HTML
    getClientScript() {
        return `
        <script>
        (function() {
            if (typeof window !== 'undefined') {
                let ws;
                let reconnectInterval;
                
                function connect() {
                    ws = new WebSocket('ws://localhost:3000/hweb-hotreload/');
                    
                    ws.onopen = function() {
                        clearInterval(reconnectInterval);
                    };
                    
                    ws.onmessage = function(event) {
                        const message = JSON.parse(event.data);
                        
                        switch(message.type) {
                            case 'frontend-reload':
                                window.location.reload();
                                break;
                            case 'server-restart':
                                break;
                            case 'server-ready':
                                setTimeout(() => window.location.reload(), 500);
                                break;
                        }
                    };
                    
                    ws.onclose = function() {
                        reconnectInterval = setInterval(() => {
                            connect();
                        }, 1000);
                    };
                    
                    ws.onerror = function() {
                        // Silencioso - sem logs
                    };
                }
                
                connect();
            }
        })();
        </script>
        `;
    }
    clearBackendCache(filePath) {
        // Limpa o cache do require para forçar reload da rota de API
        const absolutePath = path.resolve(filePath);
        delete require.cache[absolutePath];
        // Também limpa dependências relacionadas
        Object.keys(require.cache).forEach(key => {
            if (key.includes(path.dirname(absolutePath))) {
                delete require.cache[key];
            }
        });
    }
    // Método para registrar callback de mudança de API backend
    onBackendApiChange(callback) {
        this.backendApiChangeCallback = callback;
    }
    // Método para registrar callback de mudança de frontend
    onFrontendChange(callback) {
        this.frontendChangeCallback = callback;
    }
    async checkFrontendBuild(filePath) {
        // Usa ts-node para checar erros de compilação do arquivo alterado
        const tsNodePath = require.resolve('ts-node');
        const { spawn } = require('child_process');
        return new Promise((resolve) => {
            const proc = spawn(process.execPath, [tsNodePath, '--transpile-only', filePath], {
                cwd: this.projectDir,
                env: process.env,
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
        });
    }
}
exports.HotReloadManager = HotReloadManager;
