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
     * Autentica um usuário com credenciais
     */
    async signIn(provider, credentials) {
        const authProvider = this.config.providers.find(p => p.id === provider);
        if (!authProvider || authProvider.type !== 'credentials') {
            return null;
        }
        if (!authProvider.authorize) {
            return null;
        }
        try {
            const user = await authProvider.authorize(credentials);
            if (!user)
                return null;
            // Callback de signIn se definido
            if (this.config.callbacks?.signIn) {
                const allowed = await this.config.callbacks.signIn(user, { provider }, {});
                if (!allowed)
                    return null;
            }
            const result = this.sessionManager.createSession(user);
            // Callback de sessão se definido
            if (this.config.callbacks?.session) {
                result.session = await this.config.callbacks.session(result.session, user);
            }
            return result;
        }
        catch (error) {
            console.error('[hweb-auth] Erro no signIn:', error);
            return null;
        }
    }
    /**
     * Faz logout do usuário
     */
    signOut() {
        return http_1.HightJSResponse
            .json({ success: true })
            .clearCookie('hweb-auth-token', {
            path: '/',
            httpOnly: true,
            secure: true, // Always use secure cookies
            sameSite: 'strict' // Stronger CSRF protection
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
