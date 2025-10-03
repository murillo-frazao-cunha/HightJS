import React, { ReactNode } from 'react';
interface ProtectedRouteProps {
    children: ReactNode;
    fallback?: ReactNode;
    redirectTo?: string;
    requireAuth?: boolean;
}
/**
 * Componente para proteger rotas que requerem autenticação
 */
export declare function ProtectedRoute({ children, fallback, redirectTo, requireAuth }: ProtectedRouteProps): string | number | true | Iterable<React.ReactNode> | import("react/jsx-runtime").JSX.Element | null;
interface GuardProps {
    children: ReactNode;
    fallback?: ReactNode;
    redirectTo?: string;
}
/**
 * Guard simples que só renderiza children se estiver autenticado
 */
export declare function AuthGuard({ children, fallback, redirectTo }: GuardProps): string | number | true | Iterable<React.ReactNode> | import("react/jsx-runtime").JSX.Element | null;
/**
 * Componente para mostrar conteúdo apenas para usuários não autenticados
 */
export declare function GuestOnly({ children, fallback, redirectTo }: GuardProps): string | number | true | Iterable<React.ReactNode> | import("react/jsx-runtime").JSX.Element;
/**
 * Hook para redirecionar baseado no status de autenticação
 */
export declare function useAuthRedirect(authenticatedRedirect?: string, unauthenticatedRedirect?: string): void;
export {};
