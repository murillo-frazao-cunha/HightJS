/*
 * This file is part of the HightJS Project.
 * Copyright (c) 2025 itsmuzin
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import type {AuthProviderClass, AuthRoute, User} from '../types';
import {HightJSRequest, HightJSResponse} from 'hightjs';

export interface GoogleConfig {
    id?: string;
    name?: string;
    clientId: string;
    clientSecret: string;
    callbackUrl?: string;
    successUrl?: string;
    // Escopos OAuth do Google, padrão: ['openid', 'email', 'profile']
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
export class GoogleProvider implements AuthProviderClass {
    public readonly id: string;
    public readonly name: string;
    public readonly type: string = 'google';

    private config: GoogleConfig;
    private readonly defaultScope = [
        'openid',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
    ];

    constructor(config: GoogleConfig) {
        this.config = config;
        this.id = config.id || 'google';
        this.name = config.name || 'Google';
    }

    /**
     * Método para gerar URL OAuth (usado pelo handleSignIn)
     */
    handleOauth(credentials: Record<string, string> = {}): string {
        return this.getAuthorizationUrl();
    }

    /**
     * Método principal - redireciona para OAuth ou processa o callback
     */
    async handleSignIn(credentials: Record<string, string>): Promise<User | string | null> {
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
    private async processOAuthCallback(credentials: Record<string, string>): Promise<User | null> {
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

        } catch (error) {
            console.error(`[${this.id} Provider] Error during OAuth callback:`, error);
            return null;
        }
    }

    /**
     * Rotas adicionais específicas do Google OAuth
     */
    public additionalRoutes: AuthRoute[] = [
        // Rota de callback do Google
        {
            method: 'GET',
            path: '/api/auth/callback/google',
            handler: async (req: HightJSRequest, params: any) => {
                const url = new URL(req.url || '', 'http://localhost');
                const code = url.searchParams.get('code');

                if (!code) {
                    return HightJSResponse.json({ error: 'Authorization code not provided' }, { status: 400 });
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

                        if(this.config.successUrl) {
                            return HightJSResponse
                                .redirect(this.config.successUrl)
                                .header('Set-Cookie', setCookieHeader || '');
                        }
                        return HightJSResponse.json({ success: true })
                            .header('Set-Cookie', setCookieHeader || '');
                    } else {
                        const errorText = await authResponse.text();
                        console.error(`[${this.id} Provider] Session creation failed during callback. Status: ${authResponse.status}, Body: ${errorText}`);
                        return HightJSResponse.json({ error: 'Session creation failed' }, { status: 500 });
                    }

                } catch (error) {
                    console.error(`[${this.id} Provider] Callback handler fetch error:`, error);
                    return HightJSResponse.json({ error: 'Internal server error' }, { status: 500 });
                }
            }
        }
    ];

    /**
     * Gera a URL de autorização do Google
     */
    getAuthorizationUrl(): string {
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