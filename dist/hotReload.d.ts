import { IncomingMessage } from 'http';
export declare class HotReloadManager {
    private wss;
    private watchers;
    private projectDir;
    private clients;
    private pingInterval;
    private backendApiChangeCallback;
    private frontendChangeCallback;
    constructor(projectDir: string);
    start(): Promise<void>;
    handleUpgrade(request: IncomingMessage, socket: any, head: Buffer): void;
    private setupWebSocketServer;
    private setupWatchers;
    private notifyClients;
    private restartServer;
    stop(): void;
    getClientScript(): string;
    private clearBackendCache;
    onBackendApiChange(callback: () => void): void;
    onFrontendChange(callback: () => void): void;
    private checkFrontendBuild;
}
