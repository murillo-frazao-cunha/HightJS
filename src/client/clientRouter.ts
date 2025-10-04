// Sistema de roteamento do lado do cliente para hweb-sdk

export interface RouterEvents {
    beforeNavigate?: (url: string) => boolean | Promise<boolean>;
    afterNavigate?: (url: string) => void;
}

class Router {
    private events: RouterEvents = {};
    private listeners: Set<() => void> = new Set();

    /**
     * Navega para uma nova rota
     */
    async push(url: string): Promise<void> {
        // Callback antes de navegar
        if (this.events.beforeNavigate) {
            const shouldProceed = await this.events.beforeNavigate(url);
            if (shouldProceed === false) return;
        }

        // Atualiza a URL na barra de endereço
        window.history.pushState({ path: url }, '', url);

        // Dispara evento para o roteador capturar de forma assíncrona
        setTimeout(() => this.triggerNavigation(), 0);

        // Callback após navegar
        if (this.events.afterNavigate) {
            this.events.afterNavigate(url);
        }
    }

    /**
     * Substitui a entrada atual do histórico
     */
    async replace(url: string): Promise<void> {
        // Callback antes de navegar
        if (this.events.beforeNavigate) {
            const shouldProceed = await this.events.beforeNavigate(url);
            if (shouldProceed === false) return;
        }

        // Substitui a URL atual no histórico
        window.history.replaceState({ path: url }, '', url);

        // Dispara evento para o roteador capturar de forma assíncrona
        setTimeout(() => this.triggerNavigation(), 0);

        // Callback após navegar
        if (this.events.afterNavigate) {
            this.events.afterNavigate(url);
        }
    }

    /**
     * Volta uma página no histórico
     */
    back(): void {
        window.history.back();
    }

    /**
     * Avança uma página no histórico
     */
    forward(): void {
        window.history.forward();
    }

    /**
     * Recarrega a página atual (re-renderiza o componente)
     */
    refresh(): void {
        setTimeout(() => this.triggerNavigation(), 0);
    }

    /**
     * Obtém a URL atual
     */
    get pathname(): string {
        return window.location.pathname;
    }

    /**
     * Obtém os query parameters atuais
     */
    get query(): URLSearchParams {
        return new URLSearchParams(window.location.search);
    }

    /**
     * Obtém a URL completa atual
     */
    get url(): string {
        return window.location.href;
    }

    /**
     * Adiciona event listeners para eventos de roteamento
     */
    on(events: RouterEvents): void {
        this.events = { ...this.events, ...events };
    }

    /**
     * Remove event listeners
     */
    off(): void {
        this.events = {};
    }

    /**
     * Adiciona um listener para mudanças de rota
     */
    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    /**
     * Dispara evento de navegação para todos os listeners
     */
    private triggerNavigation(): void {
        // Dispara o evento nativo para o roteador do hweb capturar
        window.dispatchEvent(new PopStateEvent('popstate'));

        // Notifica todos os listeners customizados
        this.listeners.forEach(listener => listener());
    }

}

// Instância singleton do router
export const router = new Router();

// Para compatibilidade, também exporta como default
export default router;
