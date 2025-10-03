import type { HightJSOptions } from './types';
export default app;
export declare function app(options?: HightJSOptions): {
    /**
     * Integra com uma aplicação de qualquer framework (Express, Fastify, etc)
     */
    integrate: (serverApp: any) => Promise<any>;
    /**
     * Inicia um servidor HightJS fechado (o usuário não tem acesso ao framework)
     */
    init: () => Promise<any>;
    prepare: () => Promise<void>;
    executeInstrumentation: () => void;
    getRequestHandler: () => import("./types").RequestHandler;
    setupWebSocket: (server: any) => void;
    build: () => Promise<void>;
    stop: () => void;
};
