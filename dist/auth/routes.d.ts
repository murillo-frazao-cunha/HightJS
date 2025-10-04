import { HightJSRequest, HightJSResponse } from '../api/http';
import type { AuthConfig } from './types';
import { HWebAuth } from './core';
/**
 * Cria o handler catch-all para /api/auth/[...value]
 */
export declare function createAuthRoutes(config: AuthConfig): {
    pattern: string;
    GET(req: HightJSRequest, params: {
        [key: string]: string;
    }): Promise<HightJSResponse>;
    POST(req: HightJSRequest, params: {
        [key: string]: string;
    }): Promise<any>;
    auth: HWebAuth;
};
