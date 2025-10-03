import { ReactNode } from 'react';
import type { SessionContextType, User } from './types';
interface SessionProviderProps {
    children: ReactNode;
    basePath?: string;
    refetchInterval?: number;
    refetchOnWindowFocus?: boolean;
}
export declare function SessionProvider({ children, basePath, refetchInterval, refetchOnWindowFocus }: SessionProviderProps): import("react/jsx-runtime").JSX.Element;
/**
 * Hook para acessar a sessão atual
 */
export declare function useSession(): SessionContextType;
/**
 * Hook para verificar se o usuário está autenticado
 */
export declare function useAuth(): {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
};
export {};
