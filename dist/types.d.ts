import type { ComponentType } from 'react';
import type { GenericRequest } from './types/framework';
import { HightJSRequest, HightJSResponse } from "./api/http";
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
 * Define a estrutura de cada rota da API, com suporte para métodos HTTP.
 */
export interface BackendRouteConfig {
    pattern: string;
    GET?: BackendHandler;
    POST?: BackendHandler;
    PUT?: BackendHandler;
    DELETE?: BackendHandler;
    middleware?: HightMiddleware[];
}
