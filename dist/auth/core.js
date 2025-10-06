"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HWebAuth = void 0;
const http_1 = require("../api/http");
const jwt_1 = require("./jwt");
class HWebAuth {
    constructor(config) {
        this.config = {
            session: { strategy: 'jwt', maxAge: 86400, ...config.session },
            pages: { signIn: '/auth/signin', signOut: '/auth/signout', ...config.pages },
            ...config
        };
        this.sessionManager = new jwt_1.SessionManager(config.secret, this.config.session?.maxAge || 86400);
    }
    /**
     * Middleware para adicionar autenticação às rotas
     */
    async middleware(req) {
        const token = this.getTokenFromRequest(req);
        if (!token) {
            return { session: null, user: null };
        }
        const session = this.sessionManager.verifySession(token);
        return {
            session,
            user: session?.user || null
        };
    }
    /**
     * Autentica um usuário usando um provider específico
     */
    async signIn(providerId, credentials) {
        const provider = this.config.providers.find(p => p.id === providerId);
        if (!provider) {
            console.error(`[hweb-auth] Provider not found: ${providerId}`);
            return null;
        }
        try {
            // Usa o método handleSignIn do provider
            const result = await provider.handleSignIn(credentials);
            if (!result)
                return null;
            // Se resultado é string, é URL de redirecionamento OAuth
            if (typeof result === 'string') {
                return { redirectUrl: result };
            }
            // Se resultado é User, cria sessão
            const user = result;
            // Callback de signIn se definido
            if (this.config.callbacks?.signIn) {
                const allowed = await this.config.callbacks.signIn(user, { provider: providerId }, {});
                if (!allowed)
                    return null;
            }
            const sessionResult = this.sessionManager.createSession(user);
            // Callback de sessão se definido
            if (this.config.callbacks?.session) {
                sessionResult.session = await this.config.callbacks.session(sessionResult.session, user);
            }
            return sessionResult;
        }
        catch (error) {
            console.error(`[hweb-auth] Erro no signIn com provider ${providerId}:`, error);
            return null;
        }
    }
    /**
     * Faz logout do usuário
     */
    async signOut(req) {
        // Busca a sessão atual para saber qual provider usar
        const { session } = await this.middleware(req);
        if (session?.user?.provider) {
            const provider = this.config.providers.find(p => p.id === session.user.provider);
            if (provider && provider.handleSignOut) {
                try {
                    await provider.handleSignOut();
                }
                catch (error) {
                    console.error(`[hweb-auth] Erro no signOut do provider ${provider.id}:`, error);
                }
            }
        }
        return http_1.HightJSResponse
            .json({ success: true })
            .clearCookie('hweb-auth-token', {
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'strict'
        });
    }
    /**
     * Obtém a sessão atual
     */
    async getSession(req) {
        const { session } = await this.middleware(req);
        return session;
    }
    /**
     * Verifica se o usuário está autenticado
     */
    async isAuthenticated(req) {
        const session = await this.getSession(req);
        return session !== null;
    }
    /**
     * Retorna todos os providers disponíveis (dados públicos)
     */
    getProviders() {
        return this.config.providers.map(provider => ({
            id: provider.id,
            name: provider.name,
            type: provider.type,
            config: provider.getConfig ? provider.getConfig() : {}
        }));
    }
    /**
     * Busca um provider específico
     */
    getProvider(id) {
        return this.config.providers.find(p => p.id === id) || null;
    }
    /**
     * Retorna todas as rotas adicionais dos providers
     */
    getAllAdditionalRoutes() {
        const routes = [];
        for (const provider of this.config.providers) {
            if (provider.additionalRoutes) {
                for (const route of provider.additionalRoutes) {
                    routes.push({ provider: provider.id, route });
                }
            }
        }
        return routes;
    }
    /**
     * Cria resposta com cookie de autenticação - Secure implementation
     */
    createAuthResponse(token, data) {
        return http_1.HightJSResponse
            .json(data)
            .cookie('hweb-auth-token', token, {
            httpOnly: true,
            secure: true, // Always secure, even in development
            sameSite: 'strict', // Prevent CSRF attacks
            maxAge: (this.config.session?.maxAge || 86400) * 1000,
            path: '/',
            domain: undefined // Let browser set automatically for security
        })
            .header('X-Content-Type-Options', 'nosniff')
            .header('X-Frame-Options', 'DENY')
            .header('X-XSS-Protection', '1; mode=block')
            .header('Referrer-Policy', 'strict-origin-when-cross-origin');
    }
    /**
     * Extrai token da requisição (cookie ou header)
     */
    getTokenFromRequest(req) {
        // Primeiro tenta pegar do cookie
        const cookieToken = req.cookie('hweb-auth-token');
        if (cookieToken)
            return cookieToken;
        // Depois tenta do header Authorization
        const authHeader = req.header('authorization');
        if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }
        return null;
    }
}
exports.HWebAuth = HWebAuth;
