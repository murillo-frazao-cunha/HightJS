import React, { createContext, useContext, useEffect, useState } from 'react';
import { router } from './clientRouter';

interface RouterContextType {
    pathname: string;
    query: URLSearchParams;
    push: (url: string) => Promise<void>;
    replace: (url: string) => Promise<void>;
    back: () => void;
    forward: () => void;
    refresh: () => void;
}

const RouterContext = createContext<RouterContextType | null>(null);

export function RouterProvider({ children }: { children: React.ReactNode }) {
    const [pathname, setPathname] = useState(router.pathname);
    const [query, setQuery] = useState(router.query);

    useEffect(() => {
        const updateRoute = () => {
            setPathname(router.pathname);
            setQuery(router.query);
        };

        // Subscribe to router changes
        const unsubscribe = router.subscribe(updateRoute);

        // Also listen to browser back/forward
        window.addEventListener('popstate', updateRoute);

        return () => {
            unsubscribe();
            window.removeEventListener('popstate', updateRoute);
        };
    }, []);

    const value: RouterContextType = {
        pathname,
        query,
        push: router.push.bind(router),
        replace: router.replace.bind(router),
        back: router.back.bind(router),
        forward: router.forward.bind(router),
        refresh: router.refresh.bind(router),
    };

    return (
        <RouterContext.Provider value={value}>
            {children}
        </RouterContext.Provider>
    );
}

/**
 * Hook para acessar o router dentro de componentes React
 */
export function useRouter(): RouterContextType {
    const context = useContext(RouterContext);
    if (!context) {
        throw new Error('useRouter deve ser usado dentro de um RouterProvider');
    }
    return context;
}

/**
 * Hook para acessar apenas o pathname atual
 */
export function usePathname(): string {
    const { pathname } = useRouter();
    return pathname;
}

/**
 * Hook para acessar apenas os query parameters
 */
export function useSearchParams(): URLSearchParams {
    const { query } = useRouter();
    return query;
}
