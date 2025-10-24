import type { ComponentType } from 'react';
import type { GenericRequest } from './types/framework';
import { HightJSRequest, HightJSResponse } from "./api/http";
import { WebSocket } from 'ws';
import { IncomingMessage } from 'http';
export interface WebSocketContext {
    ws: WebSocket;
    req: IncomingMessage;
    hightReq: HightJSRequest;
    url: URL;
    params: Record<string, string>;
    query: Record<string, string>;
    send: (data: any) => void;
    close: (code?: number, reason?: string) => void;
    broadcast: (data: any, exclude?: WebSocket[]) => void;
}
export interface HightJSOptions {
    dev?: boolean;
    hostname?: string;
    port?: number;
    dir?: string;
    framework?: 'express' | 'fastify' | 'native';
}
export interface Metadata {
    title?: string;
    description?: string;
    favicon?: string;
}
export interface RouteConfig {
    pattern: string;
    component: ComponentType<any>;
    generateMetadata?: (params: any, req: GenericRequest) => Promise<Metadata> | Metadata;
}
export type RequestHandler = (req: any, res: any) => Promise<void>;
/**
 * Define o formato de uma função que manipula uma rota da API.
 */
export type BackendHandler = (request: HightJSRequest, // HWebRequest será importado onde necessário
params: {
    [key: string]: string;
}) => Promise<HightJSResponse> | HightJSResponse;
export type HightMiddleware = (request: HightJSRequest, // HWebRequest será importado onde necessário
params: {
    [key: string]: string;
}, next: () => Promise<HightJSResponse>) => Promise<HightJSResponse> | HightJSResponse;
/**
 * Define o formato de uma função que manipula uma rota WebSocket.
 */
export type WebSocketHandler = (context: WebSocketContext) => Promise<void> | void;
/**
 * Define a estrutura de cada rota da API, com suporte para métodos HTTP e WebSocket.
 */
export interface BackendRouteConfig {
    pattern: string;
    GET?: BackendHandler;
    POST?: BackendHandler;
    PUT?: BackendHandler;
    DELETE?: BackendHandler;
    WS?: WebSocketHandler;
    middleware?: HightMiddleware[];
}
