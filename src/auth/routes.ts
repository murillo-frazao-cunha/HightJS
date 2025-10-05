import { HightJSRequest, HightJSResponse } from '../api/http';
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
        pattern: '/api/auth/[value]',

        async GET(req: HightJSRequest, params: { [key: string]: string }) {
            const path = params["value"];
            const route = Array.isArray(path) ? path.join('/') : path || '';

            switch (route) {
                case 'session':
                    return await handleSession(req, auth);

                case 'csrf':
                    return await handleCsrf(req);

                case 'providers':
                    return await handleProviders(config);

                default:
                    return HightJSResponse.json({ error: 'Route not found' }, { status: 404 });
            }
        },

        async POST(req: HightJSRequest, params: { [key: string]: string }) {
            const path = params["value"];
            const route = Array.isArray(path) ? path.join('/') : path || '';

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
async function handleSession(req: HightJSRequest, auth: any) {
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
async function handleProviders(config: AuthConfig) {
    const providers = config.providers
        .filter(p => p.type === 'credentials') // Apenas credentials
        .map(p => ({
            id: p.id,
            name: p.name,
            type: p.type
        }));

    return HightJSResponse.json({ providers });
}

/**
 * Handler para POST /api/auth/signin
 */
async function handleSignIn(req: HightJSRequest, auth: any) {
    try {
        const { provider = 'credentials', ...credentials } = await req.json();

        // Apenas credentials agora
        const result = await auth.signIn(provider, credentials);

        if (!result) {
            return HightJSResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        return auth.createAuthResponse(result.token, {
            success: true,
            user: result.session.user
        });
    } catch (error) {
        return HightJSResponse.json(
            { error: 'Authentication failed' },
            { status: 500 }
        );
    }
}

/**
 * Handler para POST /api/auth/signout
 */
async function handleSignOut(req: HightJSRequest, auth: any) {
    return auth.signOut();
}

