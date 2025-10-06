"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionProvider = SessionProvider;
exports.useSession = useSession;
exports.useAuth = useAuth;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const clientRouter_1 = require("../client/clientRouter");
const SessionContext = (0, react_1.createContext)(undefined);
function SessionProvider({ children, basePath = '/api/auth', refetchInterval = 0, refetchOnWindowFocus = true }) {
    const [session, setSession] = (0, react_1.useState)(null);
    const [status, setStatus] = (0, react_1.useState)('loading');
    // Fetch da sessão atual
    const fetchSession = (0, react_1.useCallback)(async () => {
        try {
            const response = await fetch(`${basePath}/session`, {
                credentials: 'include'
            });
            if (!response.ok) {
                setStatus('unauthenticated');
                return null;
            }
            const data = await response.json();
            const sessionData = data.session;
            if (sessionData) {
                setSession(sessionData);
                setStatus('authenticated');
                return sessionData;
            }
            else {
                setSession(null);
                setStatus('unauthenticated');
                return null;
            }
        }
        catch (error) {
            console.error('[hweb-auth] Erro ao buscar sessão:', error);
            setSession(null);
            setStatus('unauthenticated');
            return null;
        }
    }, [basePath]);
    // SignIn function
    const signIn = (0, react_1.useCallback)(async (provider = 'credentials', options = {}) => {
        try {
            const { redirect = true, callbackUrl, ...credentials } = options;
            const response = await fetch(`${basePath}/signin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    provider,
                    ...credentials
                })
            });
            const data = await response.json();
            if (response.ok && data.success) {
                // Se é OAuth, redireciona para URL fornecida
                if (data.type === 'oauth' && data.redirectUrl) {
                    if (redirect && typeof window !== 'undefined') {
                        window.location.href = data.redirectUrl;
                    }
                    return {
                        ok: true,
                        status: 200,
                        url: data.redirectUrl
                    };
                }
                // Se é sessão (credentials), redireciona para callbackUrl
                if (data.type === 'session') {
                    if (redirect && typeof window !== 'undefined') {
                        window.location.href = callbackUrl || '/';
                    }
                    return {
                        ok: true,
                        status: 200,
                        url: callbackUrl || '/'
                    };
                }
            }
            else {
                return {
                    error: data.error || 'Authentication failed',
                    status: response.status,
                    ok: false
                };
            }
        }
        catch (error) {
            console.error('[hweb-auth] Erro no signIn:', error);
            return {
                error: 'Network error',
                status: 500,
                ok: false
            };
        }
    }, [basePath, fetchSession]);
    // SignOut function
    const signOut = (0, react_1.useCallback)(async (options = {}) => {
        try {
            await fetch(`${basePath}/signout`, {
                method: 'POST',
                credentials: 'include'
            });
            setSession(null);
            setStatus('unauthenticated');
            if (typeof window !== 'undefined') {
                try {
                    clientRouter_1.router.push(options.callbackUrl || '/');
                }
                catch (e) {
                    window.location.href = options.callbackUrl || '/';
                }
            }
        }
        catch (error) {
            console.error('[hweb-auth] Erro no signOut:', error);
        }
    }, [basePath]);
    // Update session
    const update = (0, react_1.useCallback)(async () => {
        return await fetchSession();
    }, [fetchSession]);
    // Initial session fetch
    (0, react_1.useEffect)(() => {
        fetchSession();
    }, [fetchSession]);
    // Refetch interval
    (0, react_1.useEffect)(() => {
        if (refetchInterval > 0) {
            const interval = setInterval(() => {
                if (status === 'authenticated') {
                    fetchSession();
                }
            }, refetchInterval * 1000);
            return () => clearInterval(interval);
        }
    }, [refetchInterval, status, fetchSession]);
    // Refetch on window focus
    (0, react_1.useEffect)(() => {
        if (refetchOnWindowFocus) {
            const handleFocus = () => {
                if (status === 'authenticated') {
                    fetchSession();
                }
            };
            window.addEventListener('focus', handleFocus);
            return () => window.removeEventListener('focus', handleFocus);
        }
    }, [refetchOnWindowFocus, status, fetchSession]);
    const value = {
        data: session,
        status,
        signIn,
        signOut,
        update
    };
    return ((0, jsx_runtime_1.jsx)(SessionContext.Provider, { value: value, children: children }));
}
/**
 * Hook para acessar a sessão atual
 */
function useSession() {
    const context = (0, react_1.useContext)(SessionContext);
    if (context === undefined) {
        throw new Error('useSession deve ser usado dentro de um SessionProvider');
    }
    return context;
}
/**
 * Hook para verificar se o usuário está autenticado
 */
function useAuth() {
    const { data: session, status } = useSession();
    return {
        user: session?.user || null,
        isAuthenticated: status === 'authenticated',
        isLoading: status === 'loading'
    };
}
