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
import type { SignInOptions, SignInResult, Session } from './types';
// Configuração global do client
let basePath = '/api/auth';

export function setBasePath(path: string) {
    basePath = path;
}

/**
 * Função para obter a sessão atual (similar ao NextAuth getSession)
 */
export async function getSession(): Promise<Session | null> {
    try {
        const response = await fetch(`${basePath}/session`, {
            credentials: 'include'
        });

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        return data.session || null;
    } catch (error) {
        console.error('[hweb-auth] Error fetching session:', error);
        return null;
    }
}

/**
 * Função para obter token CSRF
 */
export async function getCsrfToken(): Promise<string | null> {
    try {
        const response = await fetch(`${basePath}/csrf`, {
            credentials: 'include'
        });

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        return data.csrfToken || null;
    } catch (error) {
        console.error('[hweb-auth] Error fetching CSRF token:', error);
        return null;
    }
}

/**
 * Função para obter providers disponíveis
 */
export async function getProviders(): Promise<any[] | null> {
    try {
        const response = await fetch(`${basePath}/providers`, {
            credentials: 'include'
        });

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        return data.providers || [];
    } catch (error) {
        console.error('[hweb-auth] Error searching for providers:', error);
        return null;
    }
}

/**
 * Função para fazer login (similar ao NextAuth signIn)
 */
export async function signIn(
    provider: string = 'credentials',
    options: SignInOptions = {}
): Promise<SignInResult | undefined> {
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
}

/**
 * Função para fazer logout (similar ao NextAuth signOut)
 */
export async function signOut(options: { callbackUrl?: string } = {}): Promise<void> {
    try {
        await fetch(`${basePath}/signout`, {
            method: 'POST',
            credentials: 'include'
        });

        if (typeof window !== 'undefined') {
            window.location.href = options.callbackUrl || '/';
        }
    } catch (error) {
        console.error('[hweb-auth] Error on signOut:', error);
    }
}
