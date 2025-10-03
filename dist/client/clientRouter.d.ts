export interface RouterEvents {
    beforeNavigate?: (url: string) => boolean | Promise<boolean>;
    afterNavigate?: (url: string) => void;
}
declare class Router {
    private events;
    private listeners;
    /**
     * Navega para uma nova rota
     */
    push(url: string): Promise<void>;
    /**
     * Substitui a entrada atual do histórico
     */
    replace(url: string): Promise<void>;
    /**
     * Volta uma página no histórico
     */
    back(): void;
    /**
     * Avança uma página no histórico
     */
    forward(): void;
    /**
     * Recarrega a página atual (re-renderiza o componente)
     */
    refresh(): void;
    /**
     * Obtém a URL atual
     */
    get pathname(): string;
    /**
     * Obtém os query parameters atuais
     */
    get query(): URLSearchParams;
    /**
     * Obtém a URL completa atual
     */
    get url(): string;
    /**
     * Adiciona event listeners para eventos de roteamento
     */
    on(events: RouterEvents): void;
    /**
     * Remove event listeners
     */
    off(): void;
    /**
     * Adiciona um listener para mudanças de rota
     */
    subscribe(listener: () => void): () => void;
    /**
     * Dispara evento de navegação para todos os listeners
     */
    private triggerNavigation;
}
export declare const router: Router;
export default router;
