import { IncomingMessage } from 'http';
import { WebSocket } from 'ws';
export interface WebSocketContext {
    ws: WebSocket;
    req: IncomingMessage;
    url: URL;
    params: Record<string, string>;
    query: Record<string, string>;
    send: (data: any) => void;
    close: (code?: number, reason?: string) => void;
    broadcast: (data: any, exclude?: WebSocket[]) => void;
}
export interface WebSocketHandler {
    (ctx: WebSocketContext): void | Promise<void>;
}
export interface WebSocketRoute {
    path: string;
    handler: WebSocketHandler;
    pathPattern?: RegExp;
    paramNames?: string[];
}
export interface WebSocketServer {
    route: (path: string, handler: WebSocketHandler) => void;
    start: (port?: number) => void;
    broadcast: (data: any) => void;
    getConnections: () => WebSocket[];
}
