import React from 'react';
interface RouterContextType {
    pathname: string;
    query: URLSearchParams;
    push: (url: string) => Promise<void>;
    replace: (url: string) => Promise<void>;
    back: () => void;
    forward: () => void;
    refresh: () => void;
}
export declare function RouterProvider({ children }: {
    children: React.ReactNode;
}): import("react/jsx-runtime").JSX.Element;
/**
 * Hook para acessar o router dentro de componentes React
 */
export declare function useRouter(): RouterContextType;
/**
 * Hook para acessar apenas o pathname atual
 */
export declare function usePathname(): string;
/**
 * Hook para acessar apenas os query parameters
 */
export declare function useSearchParams(): URLSearchParams;
export {};
