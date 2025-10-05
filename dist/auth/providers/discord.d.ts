import type { AuthProviderClass, User, AuthRoute } from '../types';
export interface DiscordConfig {
    id?: string;
    name?: string;
    clientId: string;
    clientSecret: string;
    callbackUrl?: string;
    scope?: string[];
}
/**
 * Provider para autenticação com Discord OAuth2
 *
 * Este provider permite autenticação usando Discord OAuth2.
 * Automaticamente gerencia o fluxo OAuth completo e rotas necessárias.
 *
 * Exemplo de uso:
 * ```typescript
 * new DiscordProvider({
 *   clientId: process.env.DISCORD_CLIENT_ID!,
 *   clientSecret: process.env.DISCORD_CLIENT_SECRET!,
 *   callbackUrl: "http://localhost:3000/api/auth/callback/discord"
 * })
 * ```
 *
 * Fluxo de autenticação:
 * 1. GET /api/auth/signin/discord - Gera URL e redireciona para Discord
 * 2. Discord redireciona para /api/auth/callback/discord com código
 * 3. Provider troca código por token e busca dados do usuário
 * 4. Retorna objeto User com dados do Discord
 */
export declare class DiscordProvider implements AuthProviderClass {
    readonly id: string;
    readonly name: string;
    readonly type: string;
    private config;
    private readonly defaultScope;
    constructor(config: DiscordConfig);
    /**
     * Método principal para autenticar usuário com Discord OAuth
     */
    handleSignIn(credentials: Record<string, string>): Promise<User | null>;
    /**
     * Método opcional para logout
     */
    handleSignOut?(): Promise<void>;
    /**
     * Rotas adicionais específicas do Discord OAuth
     */
    additionalRoutes: AuthRoute[];
    /**
     * Gera URL de autorização do Discord
     */
    getAuthorizationUrl(state?: string): string;
    /**
     * Retorna configuração pública do provider
     */
    getConfig(): any;
}
