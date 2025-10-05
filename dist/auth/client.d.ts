import type { SignInOptions, SignInResult, Session } from './types';
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
/**
 * Função para fazer login (similar ao NextAuth signIn)
 */
export declare function signIn(provider?: string, options?: SignInOptions): Promise<SignInResult | undefined>;
/**
 * Função para fazer logout (similar ao NextAuth signOut)
 */
export declare function signOut(options?: {
    callbackUrl?: string;
}): Promise<void>;
