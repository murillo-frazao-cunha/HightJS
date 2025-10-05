/**
 * Exemplo de como usar os novos providers baseados em classes
 */
export declare const authRoutes: {
    pattern: string;
    GET(req: import("..").HightJSRequest, params: {
        [key: string]: string;
    }): Promise<any>;
    POST(req: import("..").HightJSRequest, params: {
        [key: string]: string;
    }): Promise<any>;
    auth: import("./core").HWebAuth;
};
/**
 * Como usar em suas rotas API:
 *
 * // arquivo: /api/auth/[...value].ts
 * import { authRoutes } from '../../../src/auth/example';
 *
 * export const GET = authRoutes.GET;
 * export const POST = authRoutes.POST;
 */
/**
 * Rotas disponíveis automaticamente:
 *
 * Core routes:
 * - GET  /api/auth/session - Obter sessão atual
 * - GET  /api/auth/providers - Listar providers
 * - GET  /api/auth/csrf - Obter token CSRF
 * - POST /api/auth/signin - Login
 * - POST /api/auth/signout - Logout
 *
 * Provider específico (CredentialsProvider):
 * - GET  /api/auth/credentials/config - Config do provider
 *
 * Provider específico (DiscordProvider):
 * - GET  /api/auth/signin/discord - Iniciar OAuth Discord
 * - GET  /api/auth/callback/discord - Callback OAuth Discord
 * - GET  /api/auth/discord/config - Config do provider Discord
 */
