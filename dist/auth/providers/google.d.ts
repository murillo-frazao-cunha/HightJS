import type { AuthProviderClass, AuthRoute, User } from '../types';
export interface GoogleConfig {
    id?: string;
    name?: string;
    clientId: string;
    clientSecret: string;
    callbackUrl?: string;
    successUrl?: string;
    scope?: string[];
}
/**
 * Provider para autenticação com Google OAuth2
 *
 * Este provider permite autenticação usando Google OAuth2.
 * Automaticamente gerencia o fluxo OAuth completo e rotas necessárias.
 *
 * Exemplo de uso:
 * ```typescript
 * new GoogleProvider({
 * clientId: process.env.GOOGLE_CLIENT_ID!,
 * clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
 * callbackUrl: "http://localhost:3000/api/auth/callback/google"
 * })
 * ```
 *
 * Fluxo de autenticação:
 * 1. GET /api/auth/signin/google - Gera URL e redireciona para Google
 * 2. Google redireciona para /api/auth/callback/google com código
 * 3. Provider troca código por token e busca dados do usuário
 * 4. Retorna objeto User com dados do Google
 */
export declare class GoogleProvider implements AuthProviderClass {
    readonly id: string;
    readonly name: string;
    readonly type: string;
    private config;
    private readonly defaultScope;
    constructor(config: GoogleConfig);
    /**
     * Método para gerar URL OAuth (usado pelo handleSignIn)
     */
    handleOauth(credentials?: Record<string, string>): string;
    /**
     * Método principal - redireciona para OAuth ou processa o callback
     */
    handleSignIn(credentials: Record<string, string>): Promise<User | string | null>;
    /**
     * Processa o callback do OAuth (troca o código pelo usuário)
     */
    private processOAuthCallback;
    /**
     * Rotas adicionais específicas do Google OAuth
     */
    additionalRoutes: AuthRoute[];
    /**
     * Gera a URL de autorização do Google
     */
    getAuthorizationUrl(): string;
    /**
     * Retorna a configuração pública do provider
     */
    getConfig(): any;
}
