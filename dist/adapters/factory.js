"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FrameworkAdapterFactory = void 0;
const express_1 = require("./express");
const fastify_1 = require("./fastify");
const console_1 = __importStar(require("../api/console"));
/**
 * Factory para criar o adapter correto baseado no framework detectado
 */
class FrameworkAdapterFactory {
    /**
     * Detecta automaticamente o framework baseado na requisição/resposta
     */
    static detectFramework(req, res) {
        // Se já detectamos antes, retorna o mesmo adapter
        if (this.adapter) {
            return this.adapter;
        }
        const msg = console_1.default.dynamicLine(`  ${console_1.Colors.FgYellow}●  ${console_1.Colors.Reset}Detectando framework web...`);
        // Detecta Express
        if (req.app && req.route && res.locals !== undefined) {
            msg.end(`  ${console_1.Colors.FgGreen}●  ${console_1.Colors.Reset}Framework detectado: Express`);
            this.adapter = new express_1.ExpressAdapter();
            return this.adapter;
        }
        // Detecta Fastify
        if (req.server && req.routerPath !== undefined && res.request) {
            msg.end(`  ${console_1.Colors.FgGreen}●  ${console_1.Colors.Reset}Framework detectado: Fastify`);
            this.adapter = new fastify_1.FastifyAdapter();
            return this.adapter;
        }
        // Fallback mais específico para Express
        if (res.status && res.send && res.json && res.cookie) {
            msg.end(`  ${console_1.Colors.FgGreen}●  ${console_1.Colors.Reset}Framework detectado: Express (fallback)`);
            this.adapter = new express_1.ExpressAdapter();
            return this.adapter;
        }
        // Fallback mais específico para Fastify
        if (res.code && res.send && res.type && res.setCookie) {
            msg.end(`  ${console_1.Colors.FgGreen}●  ${console_1.Colors.Reset}Framework detectado: Fastify (fallback)`);
            this.adapter = new fastify_1.FastifyAdapter();
            return this.adapter;
        }
        // Default para Express se não conseguir detectar
        msg.end(`  ${console_1.Colors.FgYellow}●  ${console_1.Colors.Reset}Não foi possível detectar o framework. Usando Express como padrão.`);
        this.adapter = new express_1.ExpressAdapter();
        return this.adapter;
    }
    /**
     * Força o uso de um framework específico
     */
    static setFramework(framework) {
        switch (framework) {
            case 'express':
                this.adapter = new express_1.ExpressAdapter();
                break;
            case 'fastify':
                this.adapter = new fastify_1.FastifyAdapter();
                break;
            default:
                throw new Error(`Framework não suportado: ${framework}`);
        }
    }
    /**
     * Reset do adapter (útil para testes)
     */
    static reset() {
        this.adapter = null;
    }
    /**
     * Retorna o adapter atual (se já foi detectado)
     */
    static getCurrentAdapter() {
        return this.adapter;
    }
}
exports.FrameworkAdapterFactory = FrameworkAdapterFactory;
FrameworkAdapterFactory.adapter = null;
