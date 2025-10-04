import { HightJSRequest, HightJSResponse } from '../api/http';
import type { AuthConfig, Session } from './types';
export declare class HWebAuth {
    private config;
    private sessionManager;
    constructor(config: AuthConfig);
    /**
     * Middleware para adicionar autenticação às rotas
     */
    private middleware;
    /**
     * Autentica um usuário com credenciais
     */
    signIn(provider: string, credentials: Record<string, string>): Promise<{
        session: Session;
        token: string;
    } | null>;
    /**
     * Faz logout do usuário
     */
    signOut(): HightJSResponse;
    /**
     * Obtém a sessão atual
     */
    getSession(req: HightJSRequest): Promise<Session | null>;
    /**
     * Verifica se o usuário está autenticado
     */
    isAuthenticated(req: HightJSRequest): Promise<boolean>;
    /**
     * Cria resposta com cookie de autenticação - Secure implementation
     */
    createAuthResponse(token: string, data: any): HightJSResponse;
    /**
     * Extrai token da requisição (cookie ou header)
     */
    private getTokenFromRequest;
}
