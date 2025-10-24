import { BackendHandler, BackendRouteConfig, HightJSOptions, RequestHandler } from './types';
import { HightJSRequest, HightJSResponse } from './api/http';
export { HightJSRequest, HightJSResponse };
export type { BackendRouteConfig, BackendHandler };
export { ExpressAdapter } from './adapters/express';
export { FastifyAdapter } from './adapters/fastify';
export { FrameworkAdapterFactory } from './adapters/factory';
export type { GenericRequest, GenericResponse, CookieOptions } from './types/framework';
export { app } from './helpers';
export type { WebSocketContext, WebSocketHandler } from './types';
export default function hweb(options: HightJSOptions): {
    prepare: () => Promise<void>;
    executeInstrumentation: () => void;
    getRequestHandler: () => RequestHandler;
    setupWebSocket: (server: any) => void;
    build: () => Promise<void>;
    stop: () => void;
};
