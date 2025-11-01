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
import { FrameworkAdapter } from '../types/framework';
import { ExpressAdapter } from './express';
import { FastifyAdapter } from './fastify';
import { NativeAdapter } from './native';
import Console, { Colors} from "../api/console"
/**
 * Factory para criar o adapter correto baseado no framework detectado
 */
export class FrameworkAdapterFactory {
    private static adapter: FrameworkAdapter | null = null;

    /**
     * Detecta automaticamente o framework baseado na requisição/resposta
     */
    static detectFramework(req: any, res: any): FrameworkAdapter {
        // Se já detectamos antes, retorna o mesmo adapter
        if (this.adapter) {
            return this.adapter;
        }
        const msg = Console.dynamicLine(`  ${Colors.FgYellow}●  ${Colors.Reset}Detecting web framework...`);

        // Detecta Express
        if (req.app && req.route && res.locals !== undefined) {
            msg.end(`  ${Colors.FgGreen}●  ${Colors.Reset}Framework detected: Express`);
            this.adapter = new ExpressAdapter();
            return this.adapter;
        }

        // Detecta Fastify
        if (req.server && req.routerPath !== undefined && res.request) {
            msg.end(`  ${Colors.FgGreen}●  ${Colors.Reset}Framework detected: Fastify`);
            this.adapter = new FastifyAdapter();
            return this.adapter;
        }

        // Detecta HTTP nativo do Node.js
        if (req.method !== undefined && req.url !== undefined && req.headers !== undefined &&
            res.statusCode !== undefined && res.setHeader !== undefined && res.end !== undefined) {
            msg.end(`  ${Colors.FgGreen}●  ${Colors.Reset}Framework detected: HightJS Native (HTTP)`);
            this.adapter = new NativeAdapter();
            return this.adapter;
        }

        // Fallback mais específico para Express
        if (res.status && res.send && res.json && res.cookie) {
            msg.end(`  ${Colors.FgGreen}●  ${Colors.Reset}Framework detected: Express (fallback)`);
            this.adapter = new ExpressAdapter();
            return this.adapter;
        }

        // Fallback mais específico para Fastify
        if (res.code && res.send && res.type && res.setCookie) {
            msg.end(`  ${Colors.FgGreen}●  ${Colors.Reset}Framework detected: Fastify (fallback)`);
            this.adapter = new FastifyAdapter();
            return this.adapter;
        }

        // Default para HightJS Native se não conseguir detectar
        msg.end(`  ${Colors.FgYellow}●  ${Colors.Reset}Unable to detect framework. Using HightJS Native as default.`);
        this.adapter = new NativeAdapter();
        return this.adapter;
    }

    /**
     * Força o uso de um framework específico
     */
    static setFramework(framework: 'express' | 'fastify' | 'native'): void {
        switch (framework) {
            case 'express':
                this.adapter = new ExpressAdapter();
                break;
            case 'fastify':
                this.adapter = new FastifyAdapter();
                break;
            case 'native':
                this.adapter = new NativeAdapter();
                break;
            default:
                throw new Error(`Unsupported framework: ${framework}`);
        }
    }

    /**
     * Reset do adapter (útil para testes)
     */
    static reset(): void {
        this.adapter = null;
    }

    /**
     * Retorna o adapter atual (se já foi detectado)
     */
    static getCurrentAdapter(): FrameworkAdapter | null {
        return this.adapter;
    }
}
