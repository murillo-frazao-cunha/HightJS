import React, { ReactNode } from 'react';
import { useAuth } from './react';
import { router } from '../client/clientRouter';
interface ProtectedRouteProps {
    children: ReactNode;
    fallback?: ReactNode;
    redirectTo?: string;
    requireAuth?: boolean;
}

/**
 * Componente para proteger rotas que requerem autenticação
 */
export function ProtectedRoute({
    children,
    fallback,
    redirectTo = '/auth/signin',
    requireAuth = true
}: ProtectedRouteProps) {
    const { isAuthenticated, isLoading } = useAuth();

    // Ainda carregando
    if (isLoading) {
        return fallback || <div>Carregando...</div>;
    }

    // Requer auth mas não está autenticado
    if (requireAuth && !isAuthenticated) {
        if (typeof window !== 'undefined' && redirectTo) {
            window.location.href = redirectTo;
            return null;
        }
        return fallback || <div>Não autorizado</div>;
    }

    // Não requer auth mas está autenticado (ex: página de login)
    if (!requireAuth && isAuthenticated && redirectTo) {
        if (typeof window !== 'undefined') {
            window.location.href = redirectTo;
            return null;
        }
    }

    return <>{children}</>;
}

interface GuardProps {
    children: ReactNode;
    fallback?: ReactNode;
    redirectTo?: string;
}

/**
 * Guard simples que só renderiza children se estiver autenticado
 */
export function AuthGuard({ children, fallback, redirectTo }: GuardProps) {
    const { isAuthenticated, isLoading } = useAuth();

    if(redirectTo && !isLoading && !isAuthenticated) {
        router.push(redirectTo);
    }

    if (isLoading) {
        return fallback || <div></div>;
    }

    if (!isAuthenticated) {
        return fallback || null;
    }

    return <>{children}</>;
}

/**
 * Componente para mostrar conteúdo apenas para usuários não autenticados
 */
export function GuestOnly({ children, fallback, redirectTo }: GuardProps) {
    const { isAuthenticated, isLoading } = useAuth();

    if(redirectTo && !isLoading && isAuthenticated) {
        router.push(redirectTo);
    }

    if (isLoading || isAuthenticated) {
        return fallback || <div></div>;
    }

    return <>{children}</>;
}

/**
 * Hook para redirecionar baseado no status de autenticação
 */
export function useAuthRedirect(
    authenticatedRedirect?: string,
    unauthenticatedRedirect?: string
) {
    const { isAuthenticated, isLoading } = useAuth();

    React.useEffect(() => {
        if (isLoading) return;

        if (isAuthenticated && authenticatedRedirect) {
            window.location.href = authenticatedRedirect;
        } else if (!isAuthenticated && unauthenticatedRedirect) {
            window.location.href = unauthenticatedRedirect;
        }
    }, [isAuthenticated, isLoading, authenticatedRedirect, unauthenticatedRedirect]);
}
