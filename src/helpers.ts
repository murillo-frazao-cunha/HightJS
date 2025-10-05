// Helpers para integração com diferentes frameworks
import hweb, { FrameworkAdapterFactory } from './index';
import type { HightJSOptions } from './types';
import os from 'os';
import Console, {Colors} from "./api/console";




function getLocalExternalIp() {

    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]!) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

const sendBox = (options:HightJSOptions) => {
    const isDev = options.dev ? "Rodando em modo de desenvolvimento" : null;
    const messages = [
        ` ${Colors.FgMagenta}●  ${Colors.Reset}Local: ${Colors.FgGreen}http://localhost:${options.port}${Colors.Reset}`,
        ` ${Colors.FgMagenta}●  ${Colors.Reset}Rede: ${Colors.FgGreen}http://${getLocalExternalIp()}:${options.port}${Colors.Reset}`,
    ]
    if(isDev) {
        messages.push(` ${Colors.FgMagenta}●  ${Colors.Reset}${isDev}`)
    }
    Console.box(messages.join("\n"), {title: "Acesse o HightJS em:"})
}


export default app
export function app(options: HightJSOptions = {}) {
    const framework = options.framework || 'native'; // Mudando o padrão para 'native'
    FrameworkAdapterFactory.setFramework(framework)

    const hwebApp = hweb(options);
    return {
        ...hwebApp,

        /**
         * Integra com uma aplicação de qualquer framework (Express, Fastify, etc)
         */
        integrate: async (serverApp: any) => {
            await hwebApp.prepare();
            const handler = hwebApp.getRequestHandler();

            if (framework === 'express') {
                // Express integration
                serverApp.use(handler);
                hwebApp.setupWebSocket(serverApp);
            } else if (framework === 'fastify') {
                // Fastify integration
                await serverApp.register(async (fastify: any) => {
                    fastify.all('*', handler);
                });
                hwebApp.setupWebSocket(serverApp);
            } else {
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
            console.log(`${Colors.FgMagenta}
     _    _ _       _     _          _  _____ 
    | |  | (_)     | |   | |        | |/ ____|
    | |__| |_  __ _| |__ | |_       | | (___  
    |  __  | |/ _\` | '_ \\| __|  _   | |\\___ \\ 
    | |  | | | (_| | | | | |_  | |__| |____) |
    |_|  |_|_|\\__, |_| |_|\\__|  \\____/|_____/ 
               __/ |                          
              |___/                           ${Colors.Reset}`)
            const actualPort = options.port || 3000;
            const actualHostname = options.hostname || "0.0.0.0";

            if (framework === 'express') {
                return await initExpressServer(hwebApp, options, actualPort, actualHostname);
            } else if (framework === 'fastify') {
                return await initFastifyServer(hwebApp, options, actualPort, actualHostname);
            } else  {
                // Default to Native
                return await initNativeServer(hwebApp, options, actualPort, actualHostname);
            }
        }
    }
}

/**
 * Inicializa servidor Express fechado
 */
async function initExpressServer(hwebApp: any, options: HightJSOptions, port: number, hostname: string) {
    const msg = Console.dynamicLine(`  ${Colors.FgCyan}●  ${Colors.Reset}Iniciando HightJS com Express...`);
    const express = require('express');
    const app = express();

    // Middlewares básicos para Express
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Cookie parser se disponível
    try {
        const cookieParser = require('cookie-parser');
        app.use(cookieParser());
    } catch (e) {
        Console.error("Não foi possivel achar cookie-parser")
    }

    await hwebApp.prepare();
    const handler = hwebApp.getRequestHandler();

    app.use(handler);

    const server = app.listen(port, hostname, () => {
        sendBox({ ...options, port });
        msg.end(`  ${Colors.FgCyan}●  ${Colors.Reset}Servidor Express iniciado (compatibilidade)`);
    });

    // Configura WebSocket para hot reload
    hwebApp.setupWebSocket(server);
    hwebApp.executeInstrumentation();
    return server;
}

/**
 * Inicializa servidor Fastify fechado
 */
async function initFastifyServer(hwebApp: any, options: HightJSOptions, port: number, hostname: string) {
    const msg = Console.dynamicLine(`  ${Colors.FgCyan}●  ${Colors.Reset}Iniciando HightJS com Fastify...`);
    const fastify = require('fastify')({ logger: false });

    // Registra plugins básicos para Fastify
    try {
        await fastify.register(require('@fastify/cookie'));
    } catch (e) {
        Console.error("Não foi possivel achar @fastify/cookie")
    }

    try {
        await fastify.register(require('@fastify/formbody'));
    } catch (e) {
        Console.error("Não foi possivel achar @fastify/formbody")
    }

    await hwebApp.prepare();
    const handler = hwebApp.getRequestHandler();

    // Registra o handler do hweb
    await fastify.register(async (fastify: any) => {
        fastify.all('*', handler);
    });
    hwebApp.setupWebSocket(fastify);

    const address = await fastify.listen({ port, host: hostname });
    sendBox({ ...options, port });
    msg.end(`  ${Colors.FgCyan}●  ${Colors.Reset}Servidor Fastify iniciado (compatibilidade)`);
    hwebApp.executeInstrumentation();
    return fastify;
}

/**
 * Inicializa servidor nativo do HightJS usando HTTP puro
 */
async function initNativeServer(hwebApp: any, options: HightJSOptions, port: number, hostname: string) {
    const msg = Console.dynamicLine(`  ${Colors.FgMagenta}⚡  ${Colors.Reset}${Colors.Bright}Iniciando HightJS em modo NATIVO${Colors.Reset}`);

    const http = require('http');
    const { parse: parseUrl } = require('url');
    const { parse: parseQuery } = require('querystring');

    await hwebApp.prepare();
    const handler = hwebApp.getRequestHandler();

    // Middleware para parsing do body com proteções de segurança
    const parseBody = (req: any): Promise<any> => {
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

            req.on('data', (chunk: Buffer) => {
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
                    } else if (contentType.includes('application/x-www-form-urlencoded')) {
                        resolve(parseQuery(body));
                    } else {
                        resolve(body);
                    }
                } catch (error) {
                    resolve(body); // Fallback para string se parsing falhar
                }
            });

            req.on('error', (error: Error) => {
                clearTimeout(timeout);
                reject(error);
            });
        });
    };

    // Cria o servidor HTTP nativo com configurações de segurança
    const server = http.createServer(async (req: any, res: any) => {
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
        } catch (error) {
            Console.error('Erro no servidor nativo:', error);

            if (!res.headersSent) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'text/plain');

                if (error instanceof Error) {
                    if (error.message.includes('too large')) {
                        res.statusCode = 413; // Payload Too Large
                        res.end('Request too large');
                    } else if (error.message.includes('timeout')) {
                        res.statusCode = 408; // Request Timeout
                        res.end('Request timeout');
                    } else {
                        res.end('Internal server error');
                    }
                } else {
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
        msg.end(`  ${Colors.FgGreen}⚡  ${Colors.Reset}${Colors.Bright}Servidor HightJS NATIVO ativo!${Colors.Reset}`);
    });

    // Configura WebSocket para hot reload
    hwebApp.setupWebSocket(server);
    hwebApp.executeInstrumentation();
    return server;
}
