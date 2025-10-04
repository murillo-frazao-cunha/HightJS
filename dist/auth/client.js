"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setBasePath = setBasePath;
exports.getSession = getSession;
exports.getCsrfToken = getCsrfToken;
exports.getProviders = getProviders;
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
