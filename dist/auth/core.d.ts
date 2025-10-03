import { HightJSRequest, HightJSResponse } from '../api/http';
import type { AuthConfig, User, Session } from './types';
export declare class HWebAuth {
    private config;
    private sessionManager;
    constructor(config: AuthConfig);
    /**
     * Middleware para adicionar autenticação às rotas
     */
    middleware(req: HightJSRequest): Promise<{
        session: Session | null;
        user: User | null;
    }>;
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
     * Middleware para proteger rotas (require authentication)
     */
    requireAuth(req: HightJSRequest): Promise<{
        user: User;
        session: Session;
    } | HightJSResponse>;
    /**
     * Cria resposta com cookie de autenticação - Secure implementation
     */
    createAuthResponse(token: string, data: any): HightJSResponse;
    /**
     * Extrai token da requisição (cookie ou header)
     */
    private getTokenFromRequest;
}
