import { FrameworkAdapter } from '../types/framework';
/**
 * Factory para criar o adapter correto baseado no framework detectado
 */
export declare class FrameworkAdapterFactory {
    private static adapter;
    /**
     * Detecta automaticamente o framework baseado na requisição/resposta
     */
    static detectFramework(req: any, res: any): FrameworkAdapter;
    /**
     * Força o uso de um framework específico
     */
    static setFramework(framework: 'express' | 'fastify'): void;
    /**
     * Reset do adapter (útil para testes)
     */
    static reset(): void;
    /**
     * Retorna o adapter atual (se já foi detectado)
     */
    static getCurrentAdapter(): FrameworkAdapter | null;
}
