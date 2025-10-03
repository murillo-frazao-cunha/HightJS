import type { Request, Response } from 'express';
import type { ComponentType } from 'react';
import type { GenericRequest } from './types/framework';
import {HightJSRequest} from "./api/http";

// --- Tipos do Frontend (sem alteração) ---
export interface HightJSOptions {
    dev?: boolean;
    hostname?: string;
    port?: number;
    dir?: string;
}
export interface Metadata {
    title?: string;
    description?: string;
}
export interface RouteConfig {
    pattern: string;
    component: ComponentType<any>;
    generateMetadata?: (params: any, req: GenericRequest) => Promise<Metadata> | Metadata;
}
export type RequestHandler = (req: any, res: any) => Promise<void>;

// --- NOVO: Tipos do Backend ---

/**
 * Define o formato de uma função que manipula uma rota da API.
 */
export type BackendHandler = (
    request: HightJSRequest, // HWebRequest será importado onde necessário
    params: { [key: string]: string }
) => Promise<any> | any; // HWebResponse será importado onde necessário

/**
 * Define a estrutura de cada rota da API, com suporte para métodos HTTP.
 */
export interface BackendRouteConfig {
    pattern: string;
    GET?: BackendHandler;
    POST?: BackendHandler;
    PUT?: BackendHandler;
    DELETE?: BackendHandler;
}
