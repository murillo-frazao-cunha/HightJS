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
import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import type { Session, SessionContextType, SignInOptions, SignInResult, User } from './types';
import { router } from "hightjs/react";

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
            console.error('[hweb-auth] Error fetching session:', error);
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
                await fetchSession();
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
            } else {
                return {
                    error: data.error || 'Authentication failed',
                    status: response.status,
                    ok: false
                };
            }
        } catch (error) {
            console.error('[hweb-auth] Error on signIn:', error);
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
                try {
                    router.push(options.callbackUrl || '/');
                } catch (e) {
                    window.location.href = options.callbackUrl || '/';
                }
            }
        } catch (error) {
            console.error('[hweb-auth] Error on signOut:', error);
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
        throw new Error('useSession must be used inside a SessionProvider');
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
