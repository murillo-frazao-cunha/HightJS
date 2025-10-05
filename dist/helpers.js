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
exports.app = app;
// Helpers para integração com diferentes frameworks
const index_1 = __importStar(require("./index"));
const os_1 = __importDefault(require("os"));
const console_1 = __importStar(require("./api/console"));
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
exports.default = app;
function app(options = {}) {
    const framework = options.framework || 'native'; // Mudando o padrão para 'native'
    index_1.FrameworkAdapterFactory.setFramework(framework);
    const hwebApp = (0, index_1.default)(options);
    return {
        ...hwebApp,
        /**
         * Integra com uma aplicação de qualquer framework (Express, Fastify, etc)
         */
        integrate: async (serverApp) => {
            await hwebApp.prepare();
            const handler = hwebApp.getRequestHandler();
            if (framework === 'express') {
                // Express integration
                serverApp.use(handler);
                hwebApp.setupWebSocket(serverApp);
            }
            else if (framework === 'fastify') {
                // Fastify integration
                await serverApp.register(async (fastify) => {
                    fastify.all('*', handler);
                });
                hwebApp.setupWebSocket(serverApp);
            }
            else {
                // Generic integration - assume Express-like
                serverApp.use(handler);
                hwebApp.setupWebSocket(serverApp);
            }
            hwebApp.executeInstrumentation();
            return serverApp;
        },
        /**
         * Inicia um servidor HightJS fechado (o usuário não tem acesso ao framework)
         */
        init: async () => {
            console.log(`${console_1.Colors.FgMagenta}
     _    _ _       _     _          _  _____ 
    | |  | (_)     | |   | |        | |/ ____|
    | |__| |_  __ _| |__ | |_       | | (___  
    |  __  | |/ _\` | '_ \\| __|  _   | |\\___ \\ 
    | |  | | | (_| | | | | |_  | |__| |____) |
    |_|  |_|_|\\__, |_| |_|\\__|  \\____/|_____/ 
               __/ |                          
              |___/                           ${console_1.Colors.Reset}`);
            const actualPort = options.port || 3000;
            const actualHostname = options.hostname || "0.0.0.0";
            if (framework === 'express') {
                return await initExpressServer(hwebApp, options, actualPort, actualHostname);
            }
            else if (framework === 'fastify') {
                return await initFastifyServer(hwebApp, options, actualPort, actualHostname);
            }
            else {
                // Default to Native
                return await initNativeServer(hwebApp, options, actualPort, actualHostname);
            }
        }
    };
}
/**
 * Inicializa servidor Express fechado
 */
async function initExpressServer(hwebApp, options, port, hostname) {
    const msg = console_1.default.dynamicLine(`  ${console_1.Colors.FgCyan}●  ${console_1.Colors.Reset}Iniciando HightJS com Express...`);
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
    const server = app.listen(port, hostname, () => {
        sendBox({ ...options, port });
        msg.end(`  ${console_1.Colors.FgCyan}●  ${console_1.Colors.Reset}Servidor Express iniciado (compatibilidade)`);
    });
    // Configura WebSocket para hot reload
    hwebApp.setupWebSocket(server);
    hwebApp.executeInstrumentation();
    return server;
}
/**
 * Inicializa servidor Fastify fechado
 */
async function initFastifyServer(hwebApp, options, port, hostname) {
    const msg = console_1.default.dynamicLine(`  ${console_1.Colors.FgCyan}●  ${console_1.Colors.Reset}Iniciando HightJS com Fastify...`);
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
    const address = await fastify.listen({ port, host: hostname });
    sendBox({ ...options, port });
    msg.end(`  ${console_1.Colors.FgCyan}●  ${console_1.Colors.Reset}Servidor Fastify iniciado (compatibilidade)`);
    hwebApp.executeInstrumentation();
    return fastify;
}
/**
 * Inicializa servidor nativo do HightJS usando HTTP puro
 */
async function initNativeServer(hwebApp, options, port, hostname) {
    const msg = console_1.default.dynamicLine(`  ${console_1.Colors.FgMagenta}⚡  ${console_1.Colors.Reset}${console_1.Colors.Bright}Iniciando HightJS em modo NATIVO${console_1.Colors.Reset}`);
    const http = require('http');
    const { parse: parseUrl } = require('url');
    const { parse: parseQuery } = require('querystring');
    await hwebApp.prepare();
    const handler = hwebApp.getRequestHandler();
    // Middleware para parsing do body com proteções de segurança
    const parseBody = (req) => {
        return new Promise((resolve, reject) => {
            if (req.method === 'GET' || req.method === 'HEAD') {
                resolve(null);
                return;
            }
            let body = '';
            let totalSize = 0;
            const maxBodySize = 10 * 1024 * 1024; // 10MB limite
            // Timeout para requisições que demoram muito
            const timeout = setTimeout(() => {
                req.destroy();
                reject(new Error('Request timeout'));
            }, 30000); // 30 segundos
            req.on('data', (chunk) => {
                totalSize += chunk.length;
                // Proteção contra ataques de DoS por body muito grande
                if (totalSize > maxBodySize) {
                    clearTimeout(timeout);
                    req.destroy();
                    reject(new Error('Request body too large'));
                    return;
                }
                body += chunk.toString();
            });
            req.on('end', () => {
                clearTimeout(timeout);
                try {
                    const contentType = req.headers['content-type'] || '';
                    if (contentType.includes('application/json')) {
                        // Validação adicional para JSON
                        if (body.length > 1024 * 1024) { // 1MB limite para JSON
                            reject(new Error('JSON body too large'));
                            return;
                        }
                        resolve(JSON.parse(body));
                    }
                    else if (contentType.includes('application/x-www-form-urlencoded')) {
                        resolve(parseQuery(body));
                    }
                    else {
                        resolve(body);
                    }
                }
                catch (error) {
                    resolve(body); // Fallback para string se parsing falhar
                }
            });
            req.on('error', (error) => {
                clearTimeout(timeout);
                reject(error);
            });
        });
    };
    // Cria o servidor HTTP nativo com configurações de segurança
    const server = http.createServer(async (req, res) => {
        // Configurações de segurança básicas
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        // Timeout para requisições
        req.setTimeout(30000, () => {
            res.statusCode = 408; // Request Timeout
            res.end('Request timeout');
        });
        try {
            // Validação básica de URL para prevenir ataques
            const url = req.url || '/';
            if (url.length > 2048) {
                res.statusCode = 414; // URI Too Long
                res.end('URL too long');
                return;
            }
            // Parse do body com proteções
            req.body = await parseBody(req);
            // Adiciona host se não existir
            req.headers.host = req.headers.host || `localhost:${port}`;
            // Chama o handler do HightJS
            await handler(req, res);
        }
        catch (error) {
            console_1.default.error('Erro no servidor nativo:', error);
            if (!res.headersSent) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'text/plain');
                if (error instanceof Error) {
                    if (error.message.includes('too large')) {
                        res.statusCode = 413; // Payload Too Large
                        res.end('Request too large');
                    }
                    else if (error.message.includes('timeout')) {
                        res.statusCode = 408; // Request Timeout
                        res.end('Request timeout');
                    }
                    else {
                        res.end('Internal server error');
                    }
                }
                else {
                    res.end('Internal server error');
                }
            }
        }
    });
    // Configurações de segurança do servidor
    server.setTimeout(35000); // Timeout geral do servidor
    server.maxHeadersCount = 100; // Limita número de headers
    server.headersTimeout = 60000; // Timeout para headers
    server.requestTimeout = 30000; // Timeout para requisições
    server.listen(port, hostname, () => {
        sendBox({ ...options, port });
        msg.end(`  ${console_1.Colors.FgGreen}⚡  ${console_1.Colors.Reset}${console_1.Colors.Bright}Servidor HightJS NATIVO ativo!${console_1.Colors.Reset}`);
    });
    // Configura WebSocket para hot reload
    hwebApp.setupWebSocket(server);
    hwebApp.executeInstrumentation();
    return server;
}
