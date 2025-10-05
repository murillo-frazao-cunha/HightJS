import type { AuthProviderClass, User, AuthRoute } from '../types';
import { HightJSRequest, HightJSResponse } from '../../api/http';

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
export class DiscordProvider implements AuthProviderClass {
    public readonly id: string;
    public readonly name: string;
    public readonly type: string = 'discord';

    private config: DiscordConfig;
    private readonly defaultScope = ['identify', 'email'];

    constructor(config: DiscordConfig) {
        this.config = config;
        this.id = config.id || 'discord';
        this.name = config.name || 'Discord';
    }

    /**
     * Método principal para autenticar usuário com Discord OAuth
     */
    async handleSignIn(credentials: Record<string, string>): Promise<User | null> {
        try {
            const { code, state } = credentials;

            if (!code) {
                throw new Error('Authorization code not provided');
            }

            // Troca o código por access token
            const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    client_id: this.config.clientId,
                    client_secret: this.config.clientSecret,
                    grant_type: 'authorization_code',
                    code,
                    redirect_uri: this.config.callbackUrl || '',
                    scope: (this.config.scope || this.defaultScope).join(' ')
                }),
            });

            if (!tokenResponse.ok) {
                const error = await tokenResponse.text();
                throw new Error(`Failed to exchange code for token: ${error}`);
            }

            const tokens = await tokenResponse.json();

            // Busca dados do usuário
            const userResponse = await fetch('https://discord.com/api/users/@me', {
                headers: {
                    'Authorization': `Bearer ${tokens.access_token}`,
                },
            });

            if (!userResponse.ok) {
                throw new Error('Failed to fetch user data');
            }

            const discordUser = await userResponse.json();

            // Retorna objeto User padronizado
            return {
                id: discordUser.id,
                name: discordUser.global_name || discordUser.username,
                email: discordUser.email,
                image: discordUser.avatar
                    ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
                    : null,
                username: discordUser.username,
                discriminator: discordUser.discriminator,
                provider: this.id,
                providerId: discordUser.id,
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token
            };

        } catch (error) {
            console.error(`[${this.id} Provider] Error during sign in:`, error);
            return null;
        }
    }

    /**
     * Método opcional para logout
     */
    async handleSignOut?(): Promise<void> {
        // Discord OAuth não precisa de logout especial
        // O token será invalidado pelo tempo de vida
        console.log(`[${this.id} Provider] User signed out`);
    }

    /**
     * Rotas adicionais específicas do Discord OAuth
     */
    public additionalRoutes: AuthRoute[] = [
        // Rota para iniciar autenticação
        {
            method: 'GET',
            path: '/api/auth/signin/discord',
            handler: async (req: HightJSRequest, params: any) => {
                const state = Math.random().toString(36).substring(2);
                const authUrl = this.getAuthorizationUrl(state);

                return HightJSResponse
                    .redirect(authUrl)
                    .cookie('discord-oauth-state', state, {
                        httpOnly: true,
                        secure: true,
                        sameSite: 'strict',
                        maxAge: 600000 // 10 minutos
                    });
            }
        },

        // Rota de callback do Discord
        {
            method: 'GET',
            path: '/api/auth/callback/discord',
            handler: async (req: HightJSRequest, params: any) => {
                const url = new URL(req.url || '', 'http://localhost');
                const code = url.searchParams.get('code');
                const state = url.searchParams.get('state');
                const storedState = req.cookie('discord-oauth-state');

                // Validação de state para prevenir CSRF
                if (!state || !storedState || state !== storedState) {
                    return HightJSResponse.json(
                        { error: 'Invalid state parameter' },
                        { status: 400 }
                    );
                }

                if (!code) {
                    return HightJSResponse.json(
                        { error: 'Authorization code not provided' },
                        { status: 400 }
                    );
                }

                try {
                    // Usa o método handleSignIn para processar
                    const user = await this.handleSignIn({ code, state });

                    if (!user) {
                        return HightJSResponse.redirect('/auth/error?error=AuthenticationFailed');
                    }

                    // Aqui você precisaria integrar com o sistema de sessão
                    // Por enquanto, vamos redirecionar com sucesso
                    return HightJSResponse
                        .redirect('/auth/success')
                        .clearCookie('discord-oauth-state');

                } catch (error) {
                    console.error(`[${this.id} Provider] Callback error:`, error);
                    return HightJSResponse.redirect('/auth/error?error=CallbackError');
                }
            }
        },

        // Rota para obter configuração pública
        {
            method: 'GET',
            path: '/api/auth/discord/config',
            handler: async (req: HightJSRequest, params: any) => {
                return HightJSResponse.json({
                    config: {
                        id: this.id,
                        name: this.name,
                        type: this.type,
                        authUrl: '/api/auth/signin/discord',
                        callbackUrl: this.config.callbackUrl
                    }
                });
            }
        }
    ];

    /**
     * Gera URL de autorização do Discord
     */
    getAuthorizationUrl(state?: string): string {
        const params = new URLSearchParams({
            client_id: this.config.clientId,
            redirect_uri: this.config.callbackUrl || '',
            response_type: 'code',
            scope: (this.config.scope || this.defaultScope).join(' ')
        });

        if (state) {
            params.append('state', state);
        }

        return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
    }

    /**
     * Retorna configuração pública do provider
     */
    getConfig(): any {
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            clientId: this.config.clientId, // Público
            scope: this.config.scope || this.defaultScope,
            callbackUrl: this.config.callbackUrl
        };
    }
}
