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
        console.error('[hweb-auth] Erro ao buscar sessão:', error);
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
        console.error('[hweb-auth] Erro ao buscar CSRF token:', error);
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
        console.error('[hweb-auth] Erro ao buscar providers:', error);
        return null;
    }
}
