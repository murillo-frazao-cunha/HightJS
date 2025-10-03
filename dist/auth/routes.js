"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthRoutes = createAuthRoutes;
const http_1 = require("../api/http");
const core_1 = require("./core");
/**
 * Cria o handler catch-all para /api/auth/[...value]
 */
function createAuthRoutes(config) {
    const auth = new core_1.HWebAuth(config);
    /**
     * Handler principal que gerencia todas as rotas de auth
     * Uso: /api/auth/[...value].ts
     */
    return {
        pattern: '/api/auth/[value]',
        async GET(req, params) {
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
                    return http_1.HightJSResponse.json({ error: 'Route not found' }, { status: 404 });
            }
        },
        async POST(req, params) {
            const path = params["value"];
            const route = Array.isArray(path) ? path.join('/') : path || '';
            switch (route) {
                case 'signin':
                    return await handleSignIn(req, auth);
                case 'signout':
                    return await handleSignOut(req, auth);
                default:
                    return http_1.HightJSResponse.json({ error: 'Route not found' }, { status: 404 });
            }
        },
        // Middleware para proteger rotas
        requireAuth: (req) => auth.requireAuth(req),
        // Instância do auth para uso manual
        auth
    };
}
/**
 * Handler para GET /api/auth/session
 */
async function handleSession(req, auth) {
    const session = await auth.getSession(req);
    if (!session) {
        return http_1.HightJSResponse.json({ session: null });
    }
    return http_1.HightJSResponse.json({ session });
}
/**
 * Handler para GET /api/auth/csrf
 */
async function handleCsrf(req) {
    // Token CSRF simples para proteção
    const csrfToken = Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
    return http_1.HightJSResponse.json({ csrfToken });
}
/**
 * Handler para GET /api/auth/providers
 */
async function handleProviders(config) {
    const providers = config.providers
        .filter(p => p.type === 'credentials') // Apenas credentials
        .map(p => ({
        id: p.id,
        name: p.name,
        type: p.type
    }));
    return http_1.HightJSResponse.json({ providers });
}
/**
 * Handler para POST /api/auth/signin
 */
async function handleSignIn(req, auth) {
    try {
        const { provider = 'credentials', ...credentials } = await req.json();
        // Apenas credentials agora
        const result = await auth.signIn(provider, credentials);
        if (!result) {
            return http_1.HightJSResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }
        return auth.createAuthResponse(result.token, {
            success: true,
            user: result.session.user
        });
    }
    catch (error) {
        return http_1.HightJSResponse.json({ error: 'Authentication failed' }, { status: 500 });
    }
}
/**
 * Handler para POST /api/auth/signout
 */
async function handleSignOut(req, auth) {
    return auth.signOut();
}
