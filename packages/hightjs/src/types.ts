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
import type { ComponentType } from 'react';
import type { GenericRequest } from './types/framework';
import {HightJSRequest, HightJSResponse} from "./api/http";
import { WebSocket } from 'ws';
import { IncomingMessage } from 'http';

// Interface do contexto WebSocket simplificada
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

// --- Tipos do Frontend (sem alteração) ---
export interface HightJSOptions {
    dev?: boolean;
    hostname?: string;
    port?: number;
    dir?: string;
    framework?: 'express' | 'fastify' | 'native';
    ssl?: {
        redirectPort: number;
        key: string;
        cert: string;
        ca?: string;
    };
}

// --- Tipos de Configuração ---

/**
 * Interface para as configurações avançadas do servidor HightJS.
 * Essas configurações podem ser definidas no arquivo hightjs.config.js
 */
export interface HightConfig {
    /**
     * Limita o número máximo de headers HTTP permitidos por requisição.
     * Padrão: 100
     */
    maxHeadersCount?: number;

    /**
     * Timeout em milissegundos para receber os headers HTTP.
     * Padrão: 60000 (60 segundos)
     */
    headersTimeout?: number;

    /**
     * Timeout em milissegundos para uma requisição completa.
     * Padrão: 30000 (30 segundos)
     */
    requestTimeout?: number;

    /**
     * Timeout geral do servidor em milissegundos.
     * Padrão: 35000 (35 segundos)
     */
    serverTimeout?: number;

    /**
     * Timeout por requisição individual em milissegundos.
     * Padrão: 30000 (30 segundos)
     */
    individualRequestTimeout?: number;

    /**
     * Tamanho máximo permitido para a URL em caracteres.
     * Padrão: 2048
     */
    maxUrlLength?: number;

    /**
     * Habilita o log de acesso HTTP (ex: GET /api/users 200 15ms).
     * Padrão: false
     */
    accessLogging?: boolean;
}

/**
 * Tipo da função de configuração que pode ser exportada no hightjs.config.js
 */
export type HightConfigFunction = (
    phase: string,
    context: { defaultConfig: HightConfig }
) => HightConfig | Promise<HightConfig>;

export interface Metadata {
    // Basic metadata
    title?: string;
    description?: string;
    keywords?: string | string[];
    author?: string;
    favicon?: string;

    // Viewport and mobile
    viewport?: string;
    themeColor?: string;

    // SEO
    canonical?: string;
    robots?: string;

    // Open Graph (Facebook, LinkedIn, etc.)
    openGraph?: {
        title?: string;
        description?: string;
        type?: string;
        url?: string;
        image?: string | {
            url: string;
            width?: number;
            height?: number;
            alt?: string;
        };
        siteName?: string;
        locale?: string;
    };

    // Twitter Card
    twitter?: {
        card?: 'summary' | 'summary_large_image' | 'app' | 'player';
        site?: string;
        creator?: string;
        title?: string;
        description?: string;
        image?: string;
        imageAlt?: string;
    };

    // Additional metadata
    language?: string;
    charset?: string;
    appleTouchIcon?: string;
    manifest?: string;

    // Custom meta tags
    other?: Record<string, string>;
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
) => Promise<HightJSResponse> | HightJSResponse; // HWebResponse será importado onde necessário



export type HightMiddleware = (
    request: HightJSRequest, // HWebRequest será importado onde necessário
    params: { [key: string]: string },
    next: () => Promise<HightJSResponse>
) => Promise<HightJSResponse> | HightJSResponse; // HWebResponse será importado onde necessário


/**
 * Define o formato de uma função que manipula uma rota WebSocket.
 */
export type WebSocketHandler = (
    context: WebSocketContext
) => Promise<void> | void;

/**
 * Define a estrutura de cada rota da API, com suporte para métodos HTTP e WebSocket.
 */
export interface BackendRouteConfig {
    pattern: string;
    GET?: BackendHandler;
    POST?: BackendHandler;
    PUT?: BackendHandler;
    DELETE?: BackendHandler;
    WS?: WebSocketHandler; // Suporte para WebSocket
    middleware?: HightMiddleware[]; // Permite adicionar middlewares específicos à rota
}
