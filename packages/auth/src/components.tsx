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
import React, { ReactNode } from 'react';
import { useAuth } from './react';
import { router } from 'hightjs/react';
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
        return fallback || <div>Loading...</div>;
    }

    // Requer auth mas não está autenticado
    if (requireAuth && !isAuthenticated) {
        if (typeof window !== 'undefined' && redirectTo) {
            window.location.href = redirectTo;
            return null;
        }
        return fallback || <div>Unauthorized</div>;
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
