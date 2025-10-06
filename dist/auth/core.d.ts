import { HightJSRequest, HightJSResponse } from '../api/http';
import type { AuthConfig, AuthProviderClass, Session } from './types';
export declare class HWebAuth {
    private config;
    private sessionManager;
    constructor(config: AuthConfig);
    /**
     * Middleware para adicionar autenticação às rotas
     */
    private middleware;
    /**
     * Autentica um usuário usando um provider específico
     */
    signIn(providerId: string, credentials: Record<string, string>): Promise<{
        session: Session;
        token: string;
    } | {
        redirectUrl: string;
    } | null>;
    /**
     * Faz logout do usuário
     */
    signOut(req: HightJSRequest): Promise<HightJSResponse>;
    /**
     * Obtém a sessão atual
     */
    getSession(req: HightJSRequest): Promise<Session | null>;
    /**
     * Verifica se o usuário está autenticado
     */
    isAuthenticated(req: HightJSRequest): Promise<boolean>;
    /**
     * Retorna todos os providers disponíveis (dados públicos)
     */
    getProviders(): any[];
    /**
     * Busca um provider específico
     */
    getProvider(id: string): AuthProviderClass | null;
    /**
     * Retorna todas as rotas adicionais dos providers
     */
    getAllAdditionalRoutes(): Array<{
        provider: string;
        route: any;
    }>;
    /**
     * Cria resposta com cookie de autenticação - Secure implementation
     */
    createAuthResponse(token: string, data: any): HightJSResponse;
    /**
     * Extrai token da requisição (cookie ou header)
     */
    private getTokenFromRequest;
}
