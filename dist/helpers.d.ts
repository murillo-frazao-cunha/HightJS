import type { HightJSOptions } from './types';
/**
 * Helper para integração com Express
 */
export declare function createExpressApp(options?: HightJSOptions): {
    /**
     * Integra com uma aplicação Express existente
     */
    integrate: (expressApp: any) => Promise<any>;
    /**
     * Cria um servidor Express standalone
     */
    listen: (port?: number, hostname?: string) => Promise<any>;
    prepare: () => Promise<void>;
    getRequestHandler: () => import("./types").RequestHandler;
    setupWebSocket: (server: any) => void;
    build: () => Promise<void>;
    stop: () => void;
};
/**
 * Helper para integração com Fastify
 */
export declare function createFastifyApp(options?: HightJSOptions): {
    /**
     * Integra com uma aplicação Fastify existente
     */
    integrate: (fastifyApp: any) => Promise<any>;
    /**
     * Cria um servidor Fastify standalone
     */
    listen: (port?: number, hostname?: string) => Promise<any>;
    prepare: () => Promise<void>;
    getRequestHandler: () => import("./types").RequestHandler;
    setupWebSocket: (server: any) => void;
    build: () => Promise<void>;
    stop: () => void;
};
