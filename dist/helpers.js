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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createExpressApp = createExpressApp;
exports.createFastifyApp = createFastifyApp;
// Helpers para integração com diferentes frameworks
const index_1 = __importStar(require("./index"));
const os_1 = __importDefault(require("os"));
const console_1 = __importStar(require("./api/console"));
console.log(`${console_1.Colors.FgMagenta}
     _    _ _       _     _          _  _____ 
    | |  | (_)     | |   | |        | |/ ____|
    | |__| |_  __ _| |__ | |_       | | (___  
    |  __  | |/ _\` | '_ \\| __|  _   | |\\___ \\ 
    | |  | | | (_| | | | | |_  | |__| |____) |
    |_|  |_|_|\\__, |_| |_|\\__|  \\____/|_____/ 
               __/ |                          
              |___/                           ${console_1.Colors.Reset}`);
function getLocalExternalIp() {
    const interfaces = os_1.default.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}
const sendBox = (options) => {
    const isDev = options.dev ? "Rodando em modo de desenvolvimento" : null;
    const messages = [
        ` ${console_1.Colors.FgMagenta}●  ${console_1.Colors.Reset}Local: ${console_1.Colors.FgGreen}http://localhost:${options.port}${console_1.Colors.Reset}`,
        ` ${console_1.Colors.FgMagenta}●  ${console_1.Colors.Reset}Rede: ${console_1.Colors.FgGreen}http://${getLocalExternalIp()}:${options.port}${console_1.Colors.Reset}`,
    ];
    if (isDev) {
        messages.push(` ${console_1.Colors.FgMagenta}●  ${console_1.Colors.Reset}${isDev}`);
    }
    console_1.default.box(messages.join("\n"), { title: "Acesse o HightJS em:" });
};
/**
 * Helper para integração com Express
 */
function createExpressApp(options = {}) {
    // Força o uso do adapter Express
    index_1.FrameworkAdapterFactory.setFramework('express');
    const hwebApp = (0, index_1.default)(options);
    return {
        ...hwebApp,
        /**
         * Integra com uma aplicação Express existente
         */
        integrate: async (expressApp) => {
            await hwebApp.prepare();
            const handler = hwebApp.getRequestHandler();
            // Adiciona o handler do hweb como middleware final
            expressApp.use(handler);
            return expressApp;
        },
        /**
         * Cria um servidor Express standalone
         */
        listen: async (port, hostname) => {
            const msg = console_1.default.dynamicLine(`  ${console_1.Colors.FgYellow}●  ${console_1.Colors.Reset}Iniciando o servidor Express`);
            const express = require('express');
            const app = express();
            // Middlewares básicos para Express
            app.use(express.json());
            app.use(express.urlencoded({ extended: true }));
            // Cookie parser se disponível
            try {
                const cookieParser = require('cookie-parser');
                app.use(cookieParser());
            }
            catch (e) {
                console_1.default.error("Não foi possivel achar cookie-parser");
            }
            await hwebApp.prepare();
            const handler = hwebApp.getRequestHandler();
            app.use(handler);
            const server = app.listen(port || 3000, hostname || "0.0.0.0", () => {
                sendBox({ ...options, port: port || 3000 });
                msg.end(`  ${console_1.Colors.FgGreen}●  ${console_1.Colors.Reset}Servidor Express iniciado com sucesso!`);
            });
            // Configura WebSocket para hot reload
            hwebApp.setupWebSocket(server);
            return server;
        }
    };
}
/**
 * Helper para integração com Fastify
 */
function createFastifyApp(options = {}) {
    // Força o uso do adapter Fastify
    index_1.FrameworkAdapterFactory.setFramework('fastify');
    const hwebApp = (0, index_1.default)(options);
    return {
        ...hwebApp,
        /**
         * Integra com uma aplicação Fastify existente
         */
        integrate: async (fastifyApp) => {
            await hwebApp.prepare();
            const handler = hwebApp.getRequestHandler();
            // Registra o handler como um plugin universal
            await fastifyApp.register(async (fastify) => {
                fastify.all('*', handler);
            });
            return fastifyApp;
        },
        /**
         * Cria um servidor Fastify standalone
         */
        listen: async (port, hostname) => {
            const msg = console_1.default.dynamicLine(`  ${console_1.Colors.FgYellow}●  ${console_1.Colors.Reset}Iniciando o servidor Fastify`);
            const fastify = require('fastify')({ logger: false });
            // Registra plugins básicos para Fastify
            try {
                await fastify.register(require('@fastify/cookie'));
            }
            catch (e) {
                console_1.default.error("Não foi possivel achar @fastify/cookie");
            }
            try {
                await fastify.register(require('@fastify/formbody'));
            }
            catch (e) {
                console_1.default.error("Não foi possivel achar @fastify/formbody");
            }
            await hwebApp.prepare();
            const handler = hwebApp.getRequestHandler();
            // Registra o handler do hweb
            await fastify.register(async (fastify) => {
                fastify.all('*', handler);
            });
            hwebApp.setupWebSocket(fastify);
            const address = await fastify.listen({ port: port || 3000, host: hostname || "0.0.0.0" });
            sendBox({ ...options, port: port || 3000 });
            msg.end(`  ${console_1.Colors.FgGreen}●  ${console_1.Colors.Reset}Servidor Fastify iniciado com sucesso!`);
            return fastify;
        }
    };
}
