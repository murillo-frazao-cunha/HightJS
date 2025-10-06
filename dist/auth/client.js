"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setBasePath = setBasePath;
exports.getSession = getSession;
exports.getCsrfToken = getCsrfToken;
exports.getProviders = getProviders;
exports.signIn = signIn;
exports.signOut = signOut;
// Configuração global do client
let basePath = '/api/auth';
function setBasePath(path) {
    basePath = path;
}
/**
 * Função para obter a sessão atual (similar ao NextAuth getSession)
 */
async function getSession() {
    try {
        const response = await fetch(`${basePath}/session`, {
            credentials: 'include'
        });
        if (!response.ok) {
            return null;
        }
        const data = await response.json();
        return data.session || null;
    }
    catch (error) {
        console.error('[hweb-auth] Erro ao buscar sessão:', error);
        return null;
    }
}
/**
 * Função para obter token CSRF
 */
async function getCsrfToken() {
    try {
        const response = await fetch(`${basePath}/csrf`, {
            credentials: 'include'
        });
        if (!response.ok) {
            return null;
        }
        const data = await response.json();
        return data.csrfToken || null;
    }
    catch (error) {
        console.error('[hweb-auth] Erro ao buscar CSRF token:', error);
        return null;
    }
}
/**
 * Função para obter providers disponíveis
 */
async function getProviders() {
    try {
        const response = await fetch(`${basePath}/providers`, {
            credentials: 'include'
        });
        if (!response.ok) {
            return null;
        }
        const data = await response.json();
        return data.providers || [];
    }
    catch (error) {
        console.error('[hweb-auth] Erro ao buscar providers:', error);
        return null;
    }
}
/**
 * Função para fazer login (similar ao NextAuth signIn)
 */
async function signIn(provider = 'credentials', options = {}) {
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
}
/**
 * Função para fazer logout (similar ao NextAuth signOut)
 */
async function signOut(options = {}) {
    try {
        await fetch(`${basePath}/signout`, {
            method: 'POST',
            credentials: 'include'
        });
        if (typeof window !== 'undefined') {
            window.location.href = options.callbackUrl || '/';
        }
    }
    catch (error) {
        console.error('[hweb-auth] Erro no signOut:', error);
    }
}
