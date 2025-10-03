import { HightJSRequest, HightJSResponse } from '../api/http';
import type { AuthConfig, AuthProvider, User, Session } from './types';
import { SessionManager } from './jwt';

export class HWebAuth {
    private config: AuthConfig;
    private sessionManager: SessionManager;

    constructor(config: AuthConfig) {
        this.config = {
            session: { strategy: 'jwt', maxAge: 86400, ...config.session },
            pages: { signIn: '/auth/signin', signOut: '/auth/signout', ...config.pages },
            ...config
        };

        this.sessionManager = new SessionManager(
            config.secret,
            this.config.session?.maxAge || 86400
        );
    }

    /**
     * Middleware para adicionar autenticação às rotas
     */
    async middleware(req: HightJSRequest): Promise<{ session: Session | null; user: User | null }> {
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
    async signIn(provider: string, credentials: Record<string, string>): Promise<{ session: Session; token: string } | null> {
        const authProvider = this.config.providers.find(p => p.id === provider);
        if (!authProvider || authProvider.type !== 'credentials') {
            return null;
        }

        if (!authProvider.authorize) {
            return null;
        }

        try {
            const user = await authProvider.authorize(credentials);
            if (!user) return null;

            // Callback de signIn se definido
            if (this.config.callbacks?.signIn) {
                const allowed = await this.config.callbacks.signIn(user, { provider }, {});
                if (!allowed) return null;
            }

            const result = this.sessionManager.createSession(user);

            // Callback de sessão se definido
            if (this.config.callbacks?.session) {
                result.session = await this.config.callbacks.session(result.session, user);
            }

            return result;
        } catch (error) {
            console.error('[hweb-auth] Erro no signIn:', error);
            return null;
        }
    }

    /**
     * Faz logout do usuário
     */
    signOut(): HightJSResponse {
        return HightJSResponse
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
    async getSession(req: HightJSRequest): Promise<Session | null> {
        const { session } = await this.middleware(req);
        return session;
    }

    /**
     * Verifica se o usuário está autenticado
     */
    async isAuthenticated(req: HightJSRequest): Promise<boolean> {
        const session = await this.getSession(req);
        return session !== null;
    }

    /**
     * Middleware para proteger rotas (require authentication)
     */
    async requireAuth(req: HightJSRequest): Promise<{ user: User; session: Session } | HightJSResponse> {
        const { session, user } = await this.middleware(req);

        if (!session || !user) {
            return HightJSResponse.unauthorized('Authentication required');
        }

        return { user, session };
    }

    /**
     * Cria resposta com cookie de autenticação - Secure implementation
     */
    createAuthResponse(token: string, data: any): HightJSResponse {
        return HightJSResponse
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
    private getTokenFromRequest(req: HightJSRequest): string | null {
        // Primeiro tenta pegar do cookie
        const cookieToken = req.cookie('hweb-auth-token');
        if (cookieToken) return cookieToken;

        // Depois tenta do header Authorization
        const authHeader = req.header('authorization');
        if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }

        return null;
    }
}
