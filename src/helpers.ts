// Helpers para integração com diferentes frameworks
import hweb, { FrameworkAdapterFactory } from './index';
import type { HightJSOptions } from './types';
import os from 'os';
import Console, {Colors} from "./api/console";


console.log(`${Colors.FgMagenta}
     _    _ _       _     _          _  _____ 
    | |  | (_)     | |   | |        | |/ ____|
    | |__| |_  __ _| |__ | |_       | | (___  
    |  __  | |/ _\` | '_ \\| __|  _   | |\\___ \\ 
    | |  | | | (_| | | | | |_  | |__| |____) |
    |_|  |_|_|\\__, |_| |_|\\__|  \\____/|_____/ 
               __/ |                          
              |___/                           ${Colors.Reset}`)

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


/**
 * Helper para integração com Express
 */
export function createExpressApp(options: HightJSOptions = {}) {
    // Força o uso do adapter Express
    FrameworkAdapterFactory.setFramework('express');

    const hwebApp = hweb(options);

    return {
        ...hwebApp,
        /**
         * Integra com uma aplicação Express existente
         */
        integrate: async (expressApp: any) => {
            await hwebApp.prepare();
            const handler = hwebApp.getRequestHandler();

            // Adiciona o handler do hweb como middleware final
            expressApp.use(handler);

            return expressApp;
        },

        /**
         * Cria um servidor Express standalone
         */
        listen: async (port?: number, hostname?: string) => {
            const msg = Console.dynamicLine(`  ${Colors.FgYellow}●  ${Colors.Reset}Iniciando o servidor Express`);
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

            const server = app.listen(port || 3000,hostname || "0.0.0.0", () => {
                sendBox({ ...options, port: port || 3000 });
                msg.end(`  ${Colors.FgGreen}●  ${Colors.Reset}Servidor Express iniciado com sucesso!`);
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
export function createFastifyApp(options: HightJSOptions = {}) {
    // Força o uso do adapter Fastify
    FrameworkAdapterFactory.setFramework('fastify');

    const hwebApp = hweb(options);

    return {
        ...hwebApp,
        /**
         * Integra com uma aplicação Fastify existente
         */
        integrate: async (fastifyApp: any) => {
            await hwebApp.prepare();
            const handler = hwebApp.getRequestHandler();

            // Registra o handler como um plugin universal
            await fastifyApp.register(async (fastify: any) => {
                fastify.all('*', handler);
            });

            return fastifyApp;
        },

        /**
         * Cria um servidor Fastify standalone
         */
        listen: async (port?: number, hostname?:string) => {
            const msg = Console.dynamicLine(`  ${Colors.FgYellow}●  ${Colors.Reset}Iniciando o servidor Fastify`);
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
            hwebApp.setupWebSocket(fastify)

            const address = await fastify.listen({ port: port || 3000, host: hostname || "0.0.0.0" });
            sendBox({ ...options, port: port || 3000 });
            msg.end(`  ${Colors.FgGreen}●  ${Colors.Reset}Servidor Fastify iniciado com sucesso!`);

            return fastify;
        }
    };
}
