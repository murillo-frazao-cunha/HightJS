"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleProvider = void 0;
const http_1 = require("../../api/http");
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
class GoogleProvider {
    constructor(config) {
        this.type = 'google';
        this.defaultScope = [
            'openid',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile'
        ];
        /**
         * Rotas adicionais específicas do Google OAuth
         */
        this.additionalRoutes = [
            // Rota de callback do Google
            {
                method: 'GET',
                path: '/api/auth/callback/google',
                handler: async (req, params) => {
                    const url = new URL(req.url || '', 'http://localhost');
                    const code = url.searchParams.get('code');
                    if (!code) {
                        return http_1.HightJSResponse.json({ error: 'Authorization code not provided' }, { status: 400 });
                    }
                    try {
                        // Delega o 'code' para o endpoint de signin principal
                        const authResponse = await fetch(`${req.headers.origin || 'http://localhost:3000'}/api/auth/signin`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                provider: this.id,
                                code,
                            })
                        });
                        if (authResponse.ok) {
                            // Propaga o cookie de sessão e redireciona para a URL de sucesso
                            const setCookieHeader = authResponse.headers.get('set-cookie');
                            if (this.config.successUrl) {
                                return http_1.HightJSResponse
                                    .redirect(this.config.successUrl)
                                    .header('Set-Cookie', setCookieHeader || '');
                            }
                            return http_1.HightJSResponse.json({ success: true })
                                .header('Set-Cookie', setCookieHeader || '');
                        }
                        else {
                            const errorText = await authResponse.text();
                            console.error(`[${this.id} Provider] Session creation failed during callback. Status: ${authResponse.status}, Body: ${errorText}`);
                            return http_1.HightJSResponse.json({ error: 'Session creation failed' }, { status: 500 });
                        }
                    }
                    catch (error) {
                        console.error(`[${this.id} Provider] Callback handler fetch error:`, error);
                        return http_1.HightJSResponse.json({ error: 'Internal server error' }, { status: 500 });
                    }
                }
            }
        ];
        this.config = config;
        this.id = config.id || 'google';
        this.name = config.name || 'Google';
    }
    /**
     * Método para gerar URL OAuth (usado pelo handleSignIn)
     */
    handleOauth(credentials = {}) {
        return this.getAuthorizationUrl();
    }
    /**
     * Método principal - redireciona para OAuth ou processa o callback
     */
    async handleSignIn(credentials) {
        // Se tem código, é o callback - processa a autenticação
        if (credentials.code) {
            return await this.processOAuthCallback(credentials);
        }
        // Se não tem código, é o início do OAuth - retorna a URL
        return this.handleOauth(credentials);
    }
    /**
     * Processa o callback do OAuth (troca o código pelo usuário)
     */
    async processOAuthCallback(credentials) {
        try {
            const { code } = credentials;
            if (!code) {
                throw new Error('Authorization code not provided');
            }
            // Troca o código por um access token
            const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
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
                }),
            });
            if (!tokenResponse.ok) {
                const error = await tokenResponse.text();
                throw new Error(`Failed to exchange code for token: ${error}`);
            }
            const tokens = await tokenResponse.json();
            // Busca os dados do usuário com o access token
            const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: {
                    'Authorization': `Bearer ${tokens.access_token}`,
                },
            });
            if (!userResponse.ok) {
                throw new Error('Failed to fetch user data');
            }
            const googleUser = await userResponse.json();
            // Retorna o objeto User padronizado
            return {
                id: googleUser.id,
                name: googleUser.name,
                email: googleUser.email,
                image: googleUser.picture || null,
                provider: this.id,
                providerId: googleUser.id,
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token
            };
        }
        catch (error) {
            console.error(`[${this.id} Provider] Error during OAuth callback:`, error);
            return null;
        }
    }
    /**
     * Gera a URL de autorização do Google
     */
    getAuthorizationUrl() {
        const params = new URLSearchParams({
            client_id: this.config.clientId,
            redirect_uri: this.config.callbackUrl || '',
            response_type: 'code',
            scope: (this.config.scope || this.defaultScope).join(' ')
        });
        return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    }
    /**
     * Retorna a configuração pública do provider
     */
    getConfig() {
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
exports.GoogleProvider = GoogleProvider;
