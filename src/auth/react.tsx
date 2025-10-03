import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import type { Session, SessionContextType, SignInOptions, SignInResult, User } from './types';

const SessionContext = createContext<SessionContextType | undefined>(undefined);

interface SessionProviderProps {
    children: ReactNode;
    basePath?: string;
    refetchInterval?: number;
    refetchOnWindowFocus?: boolean;
}

export function SessionProvider({
    children,
    basePath = '/api/auth',
    refetchInterval = 0,
    refetchOnWindowFocus = true
}: SessionProviderProps) {
    const [session, setSession] = useState<Session | null>(null);
    const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');

    // Fetch da sessão atual
    const fetchSession = useCallback(async (): Promise<Session | null> => {
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
            } else {
                setSession(null);
                setStatus('unauthenticated');
                return null;
            }
        } catch (error) {
            console.error('[hweb-auth] Erro ao buscar sessão:', error);
            setSession(null);
            setStatus('unauthenticated');
            return null;
        }
    }, [basePath]);

    // SignIn function
    const signIn = useCallback(async (
        provider: string = 'credentials',
        options: SignInOptions = {}
    ): Promise<SignInResult | undefined> => {
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
                // Atualiza a sessão após login bem-sucedido
                await fetchSession();

                if (redirect && typeof window !== 'undefined') {
                    window.location.href = callbackUrl || '/';
                }

                return {
                    ok: true,
                    status: 200,
                    url: callbackUrl || '/'
                };
            } else {
                return {
                    error: data.error || 'Authentication failed',
                    status: response.status,
                    ok: false
                };
            }
        } catch (error) {
            console.error('[hweb-auth] Erro no signIn:', error);
            return {
                error: 'Network error',
                status: 500,
                ok: false
            };
        }
    }, [basePath, fetchSession]);

    // SignOut function
    const signOut = useCallback(async (options: { callbackUrl?: string } = {}): Promise<void> => {
        try {
            await fetch(`${basePath}/signout`, {
                method: 'POST',
                credentials: 'include'
            });

            setSession(null);
            setStatus('unauthenticated');

            if (typeof window !== 'undefined') {
                window.location.href = options.callbackUrl || '/';
            }
        } catch (error) {
            console.error('[hweb-auth] Erro no signOut:', error);
        }
    }, [basePath]);

    // Update session
    const update = useCallback(async (): Promise<Session | null> => {
        return await fetchSession();
    }, [fetchSession]);

    // Initial session fetch
    useEffect(() => {
        fetchSession();
    }, [fetchSession]);

    // Refetch interval
    useEffect(() => {
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
    useEffect(() => {
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

    const value: SessionContextType = {
        data: session,
        status,
        signIn,
        signOut,
        update
    };

    return (
        <SessionContext.Provider value={value}>
            {children}
        </SessionContext.Provider>
    );
}

/**
 * Hook para acessar a sessão atual
 */
export function useSession(): SessionContextType {
    const context = useContext(SessionContext);
    if (context === undefined) {
        throw new Error('useSession deve ser usado dentro de um SessionProvider');
    }
    return context;
}

/**
 * Hook para verificar se o usuário está autenticado
 */
export function useAuth(): { user: User | null; isAuthenticated: boolean; isLoading: boolean } {
    const { data: session, status } = useSession();

    return {
        user: session?.user || null,
        isAuthenticated: status === 'authenticated',
        isLoading: status === 'loading'
    };
}
