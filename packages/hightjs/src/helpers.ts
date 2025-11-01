#!/usr/bin/env node

/*
 * This file is part of the HightJS Project.
 * Copyright (c) 2025 itsmuzin
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Imports Nativos do Node.js (movidos para o topo)
import http, {IncomingMessage, Server, ServerResponse} from 'http';
import os from 'os';
import {URLSearchParams} from 'url'; // API moderna, substitui 'querystring'
import path from 'path';
// Helpers para integração com diferentes frameworks
import hweb, {FrameworkAdapterFactory} from './index'; // Importando o tipo
import type {HightJSOptions, HightConfig, HightConfigFunction} from './types';
import Console, {Colors} from "./api/console";
import https, { Server as HttpsServer } from 'https'; // <-- ADICIONAR
import fs from 'fs'; // <-- ADICIONAR
// --- Tipagem ---

/**
 * Interface para a instância principal do hweb, inferida pelo uso.
 */
interface HWebApp {
    prepare: () => Promise<void>;
    // O handler pode ter assinaturas diferentes dependendo do framework
    getRequestHandler: () => (req: any, res: any, next?: any) => Promise<void> | void;
    setupWebSocket: (server: Server | any) => void; // Aceita http.Server ou app (Express/Fastify)
    executeInstrumentation: () => void;
}

/**
 * Estende a request nativa do Node para incluir o body parseado.
 */
interface HWebIncomingMessage extends IncomingMessage {
    body?: object | string | null;
}

// --- Helpers ---

/**
 * Encontra o IP externo local (rede)
 */
function getLocalExternalIp(): string {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        const ifaceList = interfaces[name];
        if (ifaceList) {
            for (const iface of ifaceList) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    return iface.address;
                }
            }
        }
    }
    return 'localhost'; // Fallback
}

const sendBox = (options: HightJSOptions) => {
    const isDev = options.dev ? "Running in development mode" : null;

    // 1. Verifica se o SSL está ativado (baseado na mesma lógica do initNativeServer)
    const isSSL = options.ssl && options.ssl.key && options.ssl.cert;
    const protocol = isSSL ? 'https' : 'http';
    const localIp = getLocalExternalIp(); // Assume que getLocalExternalIp() existe

    // 2. Monta as mensagens com o protocolo correto
    const messages = [
        ` ${Colors.FgGray}┃${Colors.Reset} Local:    ${Colors.FgGreen}${protocol}://localhost:${options.port}${Colors.Reset}`,
    ];

    // Só adiciona a rede se o IP local for encontrado
    if (localIp) {
        messages.push(` ${Colors.FgGray}┃${Colors.Reset} Network:  ${Colors.FgGreen}${protocol}://${localIp}:${options.port}${Colors.Reset}`);
    }

    if (isDev) {
        messages.push(` ${Colors.FgGray}┃${Colors.Reset} ${isDev}`);
    }

    // Adiciona aviso de redirecionamento se estiver em modo SSL
    if (isSSL && options.ssl?.redirectPort) {
        messages.push(` ${Colors.FgGray}┃${Colors.Reset} HTTP (port ${options.ssl?.redirectPort}) is redirecting to HTTPS.`);
    }

    Console.box(messages.join("\n"), { title: "Access on:" });
}

/**
 * Carrega o arquivo de configuração hightjs.config.ts ou hightjs.config.js do projeto
 * @param projectDir Diretório raiz do projeto
 * @param phase Fase de execução ('development' ou 'production')
 * @returns Configuração mesclada com os valores padrão
 */
async function loadHightConfig(projectDir: string, phase: string): Promise<HightConfig> {
    const defaultConfig: HightConfig = {
        maxHeadersCount: 100,
        headersTimeout: 60000,
        requestTimeout: 30000,
        serverTimeout: 35000,
        individualRequestTimeout: 30000,
        maxUrlLength: 2048,
        accessLogging: true,
    };

    try {
        // Tenta primeiro .ts, depois .js
        const possiblePaths = [
            path.join(projectDir, 'hightjs.config.ts'),
            path.join(projectDir, 'hightjs.config.js'),
        ];

        let configPath: string | null = null;
        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                configPath = p;
                break;
            }
        }

        if (!configPath) {
            return defaultConfig;
        }

        // Remove do cache para permitir hot reload da configuração em dev
        delete require.cache[require.resolve(configPath)];

        const configModule = require(configPath);
        const configExport = configModule.default || configModule;

        let userConfig: HightConfig;

        if (typeof configExport === 'function') {
            // Suporta tanto função síncrona quanto assíncrona
            userConfig = await Promise.resolve(
                (configExport as HightConfigFunction)(phase, { defaultConfig })
            );
        } else {
            userConfig = configExport;
        }

        // Mescla a configuração do usuário com a padrão
        const mergedConfig = { ...defaultConfig, ...userConfig };

        const configFileName = path.basename(configPath);
        Console.info(`${Colors.FgCyan}[Config]${Colors.Reset} Loaded ${configFileName}`);

        return mergedConfig;
    } catch (error) {
        if (error instanceof Error) {
            Console.warn(`${Colors.FgYellow}[Config]${Colors.Reset} Error loading hightjs.config: ${error.message}`);
            Console.warn(`${Colors.FgYellow}[Config]${Colors.Reset} Using default configuration`);
        }
        return defaultConfig;
    }
}

/**
 * Middleware para parsing do body com proteções de segurança (versão melhorada).
 * Rejeita a promise em caso de erro de parsing ou estouro de limite.
 */
const parseBody = (req: IncomingMessage): Promise<object | string | null> => {
    // Constantes para limites de segurança
    const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10MB limite total
    const MAX_JSON_SIZE = 1 * 1024 * 1024; // 1MB limite para JSON
    const BODY_TIMEOUT = 30000; // 30 segundos

    return new Promise((resolve, reject) => {
        if (req.method === 'GET' || req.method === 'HEAD') {
            resolve(null);
            return;
        }

        let body = '';
        let totalSize = 0;

        // Timeout para requisições lentas
        const timeout = setTimeout(() => {
            req.destroy();
            reject(new Error('Request body timeout'));
        }, BODY_TIMEOUT);

        req.on('data', (chunk: Buffer) => {
            totalSize += chunk.length;

            // Proteção contra DoS (Payload Too Large)
            if (totalSize > MAX_BODY_SIZE) {
                clearTimeout(timeout);
                req.destroy();
                reject(new Error('Request body too large'));
                return;
            }
            body += chunk.toString();
        });

        req.on('end', () => {
            clearTimeout(timeout);

            if (!body) {
                resolve(null);
                return;
            }

            try {
                const contentType = req.headers['content-type'] || '';

                if (contentType.includes('application/json')) {
                    if (body.length > MAX_JSON_SIZE) {
                        reject(new Error('JSON body too large'));
                        return;
                    }
                    // Rejeita promise se o JSON for inválido
                    try {
                        resolve(JSON.parse(body));
                    } catch (e) {
                        reject(new Error('Invalid JSON body'));
                    }
                } else if (contentType.includes('application/x-www-form-urlencoded')) {
                    // Usa API moderna URLSearchParams (segura contra prototype pollution)
                    resolve(Object.fromEntries(new URLSearchParams(body)));
                } else {
                    resolve(body); // Fallback para texto plano
                }
            } catch (error) {
                // Pega qualquer outro erro síncrono
                reject(error);
            }
        });

        req.on('error', (error: Error) => {
            clearTimeout(timeout);
            reject(error);
        });
    });
};

/**
 * Inicializa servidor nativo do HightJS usando HTTP ou HTTPS
 */
async function initNativeServer(hwebApp: HWebApp, options: HightJSOptions, port: number, hostname: string) {
    const time = Date.now();

    await hwebApp.prepare();

    // Carrega a configuração do arquivo hightjs.config.js
    const projectDir = options.dir || process.cwd();
    const phase = options.dev ? 'development' : 'production';
    const hightConfig = await loadHightConfig(projectDir, phase);

    const handler = hwebApp.getRequestHandler();
    const msg = Console.dynamicLine(`    ${Colors.BgYellow} ready ${Colors.Reset}  ${Colors.Bright}Starting HightJS on port ${options.port}${Colors.Reset}`);

    // --- LÓGICA DO LISTENER (REUTILIZÁVEL) ---
    // Extraímos a lógica principal para uma variável
    // para que possa ser usada tanto pelo servidor HTTP quanto HTTPS.
    const requestListener = async (req: HWebIncomingMessage, res: ServerResponse) => {
        const requestStartTime = Date.now();
        const method = req.method || 'GET';
        const url = req.url || '/';

        // Configurações de segurança básicas
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

        // IMPORTANTE: Adiciona HSTS (Strict-Transport-Security) se estiver em modo SSL
        // Isso força o navegador a usar HTTPS no futuro.
        if (options.ssl) {
            res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        // Timeout por requisição (usa configuração personalizada)
        req.setTimeout(hightConfig.individualRequestTimeout || 30000, () => {
            res.statusCode = 408; // Request Timeout
            res.end('Request timeout');

            // Log de timeout
            if (hightConfig.accessLogging) {
                const duration = Date.now() - requestStartTime;
                Console.info(`${Colors.FgYellow}${method}${Colors.Reset} ${url} ${Colors.FgRed}408${Colors.Reset} ${Colors.FgGray}${duration}ms${Colors.Reset}`);
            }
        });

        // Intercepta o método end() para logar quando a resposta for enviada
        const originalEnd = res.end.bind(res);
        let hasEnded = false;

        res.end = function(this: ServerResponse, ...args: any[]): any {
            if (!hasEnded && hightConfig.accessLogging) {
                hasEnded = true;
                const duration = Date.now() - requestStartTime;
                const statusCode = res.statusCode || 200;

                // Define cor baseada no status code
                let statusColor = Colors.FgGreen; // 2xx
                if (statusCode >= 500) statusColor = Colors.FgRed; // 5xx
                else if (statusCode >= 400) statusColor = Colors.FgYellow; // 4xx
                else if (statusCode >= 300) statusColor = Colors.FgCyan; // 3xx

                // Formata o método com cor
                let methodColor = Colors.BgCyan;
                if (method === 'POST') methodColor = Colors.BgGreen;
                else if (method === 'PUT') methodColor = Colors.BgYellow;
                else if (method === 'DELETE') methodColor = Colors.BgRed;
                else if (method === 'PATCH') methodColor = Colors.BgMagenta;
                Console.logCustomLevel(method, true, methodColor, `${url} ${statusColor}${statusCode}${Colors.Reset} ${Colors.FgGray}${duration}ms${Colors.Reset}`);
            }
            // @ts-ignore
            return originalEnd.apply(this, args);
        } as any;

        try {
            // Validação básica de URL (usa configuração personalizada)
            const maxUrlLength = hightConfig.maxUrlLength || 2048;
            if (url.length > maxUrlLength) {
                res.statusCode = 414; // URI Too Long
                res.end('URL too long');
                return;
            }

            // Parse do body com proteções
            req.body = await parseBody(req); // Assumindo que parseBody existe

            // Adiciona host se não existir (necessário para `new URL`)
            req.headers.host = req.headers.host || `localhost:${port}`;

            // Chama o handler do HightJS
            await handler(req, res);

        } catch (error) {
            // Log do erro no servidor
            if (error instanceof Error) {
                Console.error(`Native server error: ${error.message}`);
            } else {
                Console.error('Unknown native server error:', error);
            }

            // Tratamento de erro (idêntico ao seu original)
            if (!res.headersSent) {
                res.setHeader('Content-Type', 'text/plain');
                if (error instanceof Error) {
                    if (error.message.includes('too large')) {
                        res.statusCode = 413; // Payload Too Large
                        res.end('Request too large');
                    } else if (error.message.includes('timeout')) {
                        res.statusCode = 408; // Request Timeout
                        res.end('Request timeout');
                    } else if (error.message.includes('Invalid JSON')) {
                        res.statusCode = 400; // Bad Request
                        res.end('Invalid JSON body');
                    } else {
                        res.statusCode = 500;
                        res.end('Internal server error');
                    }
                } else {
                    res.statusCode = 500;
                    res.end('Internal server error');
                }
            }
        }
    };
    // --- FIM DO LISTENER ---

    let server: Server | HttpsServer; // O tipo do servidor pode variar
    const isSSL = options.ssl && options.ssl.key && options.ssl.cert;

    if (isSSL && options.ssl) {

        const sslOptions = {
            key: fs.readFileSync(options.ssl.key),
            cert: fs.readFileSync(options.ssl.cert),
            ca: options.ssl.ca ? fs.readFileSync(options.ssl.ca) : undefined
        };

        // 1. Cria o servidor HTTPS principal
        server = https.createServer(sslOptions, requestListener as any); // (any para contornar HWebIncomingMessage)

        // 2. Cria o servidor de REDIRECIONAMENTO (HTTP -> HTTPS)
        const httpRedirectPort = options.ssl.redirectPort;
        http.createServer((req, res) => {
            const host = req.headers['host'] || hostname;
            // Remove a porta do host (ex: meusite.com:80)
            const hostWithoutPort = host.split(':')[0];

            // Monta a URL de redirecionamento
            let redirectUrl = `https://${hostWithoutPort}`;
            // Adiciona a porta HTTPS apenas se não for a padrão (443)
            if (port !== 443) {
                redirectUrl += `:${port}`;
            }
            redirectUrl += req.url || '/';

            res.writeHead(301, { 'Location': redirectUrl });
            res.end();
        }).listen(httpRedirectPort, hostname, () => {});

    } else {
        // --- MODO HTTP (Original) ---
        // Cria o servidor HTTP nativo
        server = http.createServer(requestListener as any); // (any para contornar HWebIncomingMessage)
    }

    // Configurações de segurança do servidor (usa configuração personalizada)
    server.setTimeout(hightConfig.serverTimeout || 35000); // Timeout geral do servidor
    server.maxHeadersCount = hightConfig.maxHeadersCount || 100; // Limita número de headers
    server.headersTimeout = hightConfig.headersTimeout || 60000; // Timeout para headers
    server.requestTimeout = hightConfig.requestTimeout || 30000; // Timeout para requisições

    server.listen(port, hostname, () => {
        sendBox({ ...options, port });
        msg.end(`  ${Colors.BgGreen} ready ${Colors.Reset}    ${Colors.Bright}Ready on port ${Colors.BgGreen} ${options.port} ${Colors.Reset}${Colors.Bright} in ${Date.now() - time}ms${Colors.Reset}\n`);
    });

    // Configura WebSocket para hot reload (Comum a ambos)
    hwebApp.setupWebSocket(server);
    hwebApp.executeInstrumentation();
    return server;
}

// --- Função Principal ---

export function app(options: HightJSOptions = {}) {
    const framework = options.framework || 'native';
    FrameworkAdapterFactory.setFramework(framework)

    // Tipando a app principal do hweb
    const hwebApp: HWebApp = hweb(options);

    return {
        ...hwebApp,

        /**
         * Integra com uma aplicação de qualquer framework (Express, Fastify, etc)
         * O 'serverApp: any' é mantido para flexibilidade, já que pode ser de tipos diferentes.
         */
        integrate: async (serverApp: any) => {
            await hwebApp.prepare();
            const handler = hwebApp.getRequestHandler();

            // O framework é setado nas opções do hweb, que deve
            // retornar o handler correto em getRequestHandler()
            // A lógica de integração original parece correta.

            if (framework === 'express') {
                const express = require('express');
                try {
                    const cookieParser = require('cookie-parser');
                    serverApp.use(cookieParser());
                } catch (e) {
                    Console.error("Could not find cookie-parser");
                }
                serverApp.use(express.json());
                serverApp.use(express.urlencoded({ extended: true }));
                serverApp.use(handler);
                hwebApp.setupWebSocket(serverApp);

            } else if (framework === 'fastify') {
                try {
                    await serverApp.register(require('@fastify/cookie'));
                } catch (e) {
                    Console.error("Could not find @fastify/cookie");
                }
                try {
                    await serverApp.register(require('@fastify/formbody'));
                } catch (e) {
                    Console.error("Could not find @fastify/formbody");
                }
                await serverApp.register(async (fastify: any) => {
                    fastify.all('*', handler);
                });
                hwebApp.setupWebSocket(serverApp);

            } else {
                // Generic integration (assume Express-like)
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
            const currentVersion = require('../package.json').version;

            async function verifyVersion(): Promise<string> {
                // node fetch
                try {
                    const response = await fetch('https://registry.npmjs.org/hightjs/latest');
                    const data = await response.json();
                    return data.version;
                } catch (error) {
                    Console.error('Could not check for the latest HightJS version:', error);
                    return currentVersion; // Retorna a versão atual em caso de erro
                }
            }
            const latestVersion = await verifyVersion();
            const isUpToDate = latestVersion === currentVersion;
            let message;
            if (!isUpToDate) {
                message = `${Colors.FgGreen}   A new version is available (v${latestVersion})${Colors.FgMagenta}`
            } else {
                message = `${Colors.FgGreen}   You are on the latest version${Colors.FgMagenta}`
            }
            console.log(`${Colors.FgMagenta}
            __       ___ ${Colors.FgGreen}      __  ${Colors.FgMagenta}
    |__| | / _\` |__|  |  ${Colors.FgGreen}   | /__\` ${Colors.FgMagenta}   ${Colors.FgMagenta}HightJS ${Colors.FgGray}(v${require('../package.json').version}) - itsmuzin${Colors.FgMagenta}
    |  | | \\__> |  |  |  ${Colors.FgGreen}\\__/ .__/ ${message}        
              ${Colors.Reset}`);

            const actualPort = options.port || 3000;
            const actualHostname = options.hostname || "0.0.0.0";

            if (framework !== 'native') {
                Console.warn(`The "${framework}" framework was selected, but the init() method only works with the "native" framework. Starting native server...`);
            }



            return await initNativeServer(hwebApp, options, actualPort, actualHostname);
        }
    }
}

// Exporta a função 'app' como nomeada e também como padrão
export default app;
