"use strict";
// Sistema de roteamento do lado do cliente para hweb-sdk
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
class Router {
    constructor() {
        this.events = {};
        this.listeners = new Set();
    }
    /**
     * Navega para uma nova rota
     */
    async push(url) {
        // Callback antes de navegar
        if (this.events.beforeNavigate) {
            const shouldProceed = await this.events.beforeNavigate(url);
            if (shouldProceed === false)
                return;
        }
        // Atualiza a URL na barra de endereço
        window.history.pushState({ path: url }, '', url);
        // Dispara evento para o roteador capturar
        this.triggerNavigation();
        // Callback após navegar
        if (this.events.afterNavigate) {
            this.events.afterNavigate(url);
        }
    }
    /**
     * Substitui a entrada atual do histórico
     */
    async replace(url) {
        // Callback antes de navegar
        if (this.events.beforeNavigate) {
            const shouldProceed = await this.events.beforeNavigate(url);
            if (shouldProceed === false)
                return;
        }
        // Substitui a URL atual no histórico
        window.history.replaceState({ path: url }, '', url);
        // Dispara evento para o roteador capturar
        this.triggerNavigation();
        // Callback após navegar
        if (this.events.afterNavigate) {
            this.events.afterNavigate(url);
        }
    }
    /**
     * Volta uma página no histórico
     */
    back() {
        window.history.back();
    }
    /**
     * Avança uma página no histórico
     */
    forward() {
        window.history.forward();
    }
    /**
     * Recarrega a página atual (re-renderiza o componente)
     */
    refresh() {
        this.triggerNavigation();
    }
    /**
     * Obtém a URL atual
     */
    get pathname() {
        return window.location.pathname;
    }
    /**
     * Obtém os query parameters atuais
     */
    get query() {
        return new URLSearchParams(window.location.search);
    }
    /**
     * Obtém a URL completa atual
     */
    get url() {
        return window.location.href;
    }
    /**
     * Adiciona event listeners para eventos de roteamento
     */
    on(events) {
        this.events = { ...this.events, ...events };
    }
    /**
     * Remove event listeners
     */
    off() {
        this.events = {};
    }
    /**
     * Adiciona um listener para mudanças de rota
     */
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    /**
     * Dispara evento de navegação para todos os listeners
     */
    triggerNavigation() {
        // Dispara o evento nativo para o roteador do hweb capturar
        window.dispatchEvent(new PopStateEvent('popstate'));
        // Notifica todos os listeners customizados
        this.listeners.forEach(listener => listener());
    }
}
// Instância singleton do router
exports.router = new Router();
// Para compatibilidade, também exporta como default
exports.default = exports.router;
