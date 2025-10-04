import { WebSocket, WebSocketServer } from 'ws';
import * as chokidar from 'chokidar';
import * as path from 'path';
import * as fs from 'fs';
import { IncomingMessage } from 'http';
import * as url from 'url';
import { clearFileCache } from './router';
import Console, {Levels} from "./api/console"
export class HotReloadManager {
    private wss: WebSocketServer | null = null;
    private watchers: chokidar.FSWatcher[] = [];
    private projectDir: string;
    private clients: Set<WebSocket> = new Set();
    private pingInterval: NodeJS.Timeout | null = null;
    private backendApiChangeCallback: (() => void) | null = null;
    private frontendChangeCallback: (() => void) | null = null;

    constructor(projectDir: string) {
        this.projectDir = projectDir;
    }

    async start() {
        // Não cria servidor na porta separada - será integrado ao Express
        this.setupWatchers();
    }

    // Novo método para integrar com Express
    handleUpgrade(request: IncomingMessage, socket: any, head: Buffer) {
        if (!this.wss) {
            this.wss = new WebSocketServer({ noServer: true });
            this.setupWebSocketServer();
        }

        this.wss.handleUpgrade(request, socket, head, (ws) => {
            this.wss!.emit('connection', ws, request);
        });
    }

    private setupWebSocketServer() {
        if (!this.wss) return;

        this.wss.on('connection', (ws: WebSocket) => {
            this.clients.add(ws);

            // Setup ping/pong para manter conexão viva
            const ping = () => {
                if (ws.readyState === WebSocket.OPEN) {
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

    private setupWatchers() {
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
            Console.logWithout(Levels.INFO, `🔄 Frontend alterado: ${filePath}`);
            clearFileCache(filePath);
            // Checa build do arquivo alterado
            const result = await this.checkFrontendBuild(filePath);
            if (result.error) {
                this.notifyClients('frontend-error', { file: filePath, error: result.error });
            } else {
                this.frontendChangeCallback?.();
                this.notifyClients('frontend-reload');
            }
        });
        frontendWatcher.on('add', async (filePath) => {
            Console.info(`➕ Novo arquivo frontend: ${path.basename(filePath)}`);
            const result = await this.checkFrontendBuild(filePath);
            if (result.error) {
                this.notifyClients('frontend-error', { file: filePath, error: result.error });
            } else {
                this.frontendChangeCallback?.();
                this.notifyClients('frontend-reload');
            }
        });
        frontendWatcher.on('unlink', (filePath) => {
            Console.info(`🗑️ Arquivo frontend removido: ${path.basename(filePath)}`);
            clearFileCache(filePath);
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
            Console.info(`🔄 API backend alterada: ${path.basename(filePath)}`);
            this.clearBackendCache(filePath);
            this.notifyClients('backend-api-reload');

            // Chama o callback, se definido
            this.backendApiChangeCallback?.();
        });

        backendApiWatcher.on('add', (filePath) => {
            Console.info(`➕ Nova API backend: ${path.basename(filePath)}`);
            this.notifyClients('backend-api-reload');
        });

        backendApiWatcher.on('unlink', (filePath) => {
            Console.info(`🗑️ API backend removida: ${path.basename(filePath)}`);
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

    private notifyClients(type: string, data?: any) {
        const message = JSON.stringify({ type, data, timestamp: Date.now() });

        this.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }

    private restartServer() {
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
    getClientScript(): string {
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

    private clearBackendCache(filePath: string) {
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
    onBackendApiChange(callback: () => void) {
        this.backendApiChangeCallback = callback;
    }

    // Método para registrar callback de mudança de frontend
    onFrontendChange(callback: () => void) {
        this.frontendChangeCallback = callback;
    }

    private async checkFrontendBuild(filePath: string) {
        // Usa ts-node para checar erros de compilação do arquivo alterado
        const tsNodePath = require.resolve('ts-node');
        const { spawn } = require('child_process');
        return new Promise<{ error?: string }>((resolve) => {
            const proc = spawn(process.execPath, [tsNodePath, '--transpile-only', filePath], {
                cwd: this.projectDir,
                env: process.env,
            });
            let errorMsg = '';
            proc.stderr.on('data', (data: Buffer) => {
                errorMsg += data.toString();
            });
            proc.on('close', (code: number) => {
                if (code !== 0 && errorMsg) {
                    resolve({ error: errorMsg });
                } else {
                    resolve({});
                }
            });
        });
    }
}
