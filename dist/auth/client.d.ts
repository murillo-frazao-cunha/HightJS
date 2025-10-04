import type { Session } from './types';
export declare function setBasePath(path: string): void;
/**
 * Função para obter a sessão atual (similar ao NextAuth getSession)
 */
export declare function getSession(): Promise<Session | null>;
/**
 * Função para obter token CSRF
 */
export declare function getCsrfToken(): Promise<string | null>;
/**
 * Função para obter providers disponíveis
 */
export declare function getProviders(): Promise<any[] | null>;
