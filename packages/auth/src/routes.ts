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
import { HightJSRequest, HightJSResponse } from 'hightjs';
import type { AuthConfig } from './types';
import { HWebAuth } from './core';

/**
 * Cria o handler catch-all para /api/auth/[...value]
 */
export function createAuthRoutes(config: AuthConfig) {
    const auth = new HWebAuth(config);

    /**
     * Handler principal que gerencia todas as rotas de auth
     * Uso: /api/auth/[...value].ts
     */
    return {
        pattern: '/api/auth/[...value]',

        async GET(req: HightJSRequest, params: { [key: string]: string }) {

            const path = params["value"];
            const route = Array.isArray(path) ? path.join('/') : path || '';

            // Verifica rotas adicionais dos providers primeiro
            const additionalRoutes = auth.getAllAdditionalRoutes();
            for (const { provider, route: additionalRoute } of additionalRoutes) {

                if (additionalRoute.method === 'GET' && additionalRoute.path.includes(route)) {
                    try {
                        return await additionalRoute.handler(req, params);
                    } catch (error) {
                        console.error(`[${provider} Provider] Error in additional route:`, error);
                        return HightJSResponse.json({ error: 'Provider route error' }, { status: 500 });
                    }
                }
            }

            // Rotas padrão do sistema
            switch (route) {
                case 'session':
                    return await handleSession(req, auth);

                case 'csrf':
                    return await handleCsrf(req);

                case 'providers':
                    return await handleProviders(auth);

                default:
                    return HightJSResponse.json({ error: 'Route not found' }, { status: 404 });
            }
        },

        async POST(req: HightJSRequest, params: { [key: string]: string }) {
            const path = params["value"];
            const route = Array.isArray(path) ? path.join('/') : path || '';

            // Verifica rotas adicionais dos providers primeiro
            const additionalRoutes = auth.getAllAdditionalRoutes();
            for (const { provider, route: additionalRoute } of additionalRoutes) {
                if (additionalRoute.method === 'POST' && additionalRoute.path.includes(route)) {
                    try {
                        return await additionalRoute.handler(req, params);
                    } catch (error) {
                        console.error(`[${provider} Provider] Error in additional route:`, error);
                        return HightJSResponse.json({ error: 'Provider route error' }, { status: 500 });
                    }
                }
            }

            // Rotas padrão do sistema
            switch (route) {
                case 'signin':
                    return await handleSignIn(req, auth);

                case 'signout':
                    return await handleSignOut(req, auth);

                default:
                    return HightJSResponse.json({ error: 'Route not found' }, { status: 404 });
            }
        },

        // Instância do auth para uso manual
        auth
    };
}

/**
 * Handler para GET /api/auth/session
 */
async function handleSession(req: HightJSRequest, auth: HWebAuth) {
    const session = await auth.getSession(req);

    if (!session) {
        return HightJSResponse.json({ session: null });
    }

    return HightJSResponse.json({ session });
}

/**
 * Handler para GET /api/auth/csrf
 */
async function handleCsrf(req: HightJSRequest) {
    // Token CSRF simples para proteção
    const csrfToken = Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);

    return HightJSResponse.json({ csrfToken });
}

/**
 * Handler para GET /api/auth/providers
 */
async function handleProviders(auth: HWebAuth) {
    const providers = auth.getProviders();

    return HightJSResponse.json({ providers });
}

/**
 * Handler para POST /api/auth/signin
 */
async function handleSignIn(req: HightJSRequest, auth: HWebAuth) {
    try {
        const { provider = 'credentials', ...credentials } = await req.json();

        const result = await auth.signIn(provider, credentials);

        if (!result) {
            return HightJSResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // Se tem redirectUrl, é OAuth - retorna URL para redirecionamento
        if ('redirectUrl' in result) {
            return HightJSResponse.json({
                success: true,
                redirectUrl: result.redirectUrl,
                type: 'oauth'
            });
        }

        // Se tem session, é credentials - retorna sessão
        return auth.createAuthResponse(result.token, {
            success: true,
            user: result.session.user,
            type: 'session'
        });
    } catch (error) {
        console.error('[hweb-auth] Error on handleSignIn:', error);
        return HightJSResponse.json(
            { error: 'Authentication failed' },
            { status: 500 }
        );
    }
}

/**
 * Handler para POST /api/auth/signout
 */
async function handleSignOut(req: HightJSRequest, auth: HWebAuth) {
    return await auth.signOut(req);
}
