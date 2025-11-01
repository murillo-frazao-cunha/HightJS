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


// Registra o ts-node para que o Node.js entenda TypeScript/TSX
require('ts-node').register();

// Registra loaders customizados para arquivos markdown, imagens, etc.
const { registerLoaders } = require('../loaders');
registerLoaders();

const { program } = require('commander');


program
    .version('1.0.0')
    .description('CLI to manage the application.');

// --- Comando DEV ---
const fs = require('fs');
const path = require('path');
// 'program' já deve estar definido no seu arquivo
// const { program } = require('commander');

/**
 * Função centralizada para iniciar a aplicação
 * @param {object} options - Opções vindas do commander
 * @param {boolean} isDev - Define se é modo de desenvolvimento
 */
function initializeApp(options, isDev) {
    const appOptions = {
        dev: isDev,
        port: options.port,
        hostname: options.hostname,
        framework: 'native',
        ssl: null, // Default
    };

    // 1. Verifica se a flag --ssl foi ativada
    if (options.ssl) {
        const C = require("../api/console")
        const { Levels } = C;
        const Console = C.default
        const sslDir = path.resolve(process.cwd(), 'certs');
        const keyPath = path.join(sslDir, 'key.pem'); // Padrão 1: key.pem
        const certPath = path.join(sslDir, 'cert.pem'); // Padrão 2: cert.pem
        // (Você pode mudar para 'cert.key' se preferir, apenas ajuste os nomes aqui)

        // 2. Verifica se os arquivos existem
        if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
            appOptions.ssl = {
                key: keyPath,
                cert: certPath
            };

            // 3. Adiciona a porta de redirecionamento (útil para o initNativeServer)
            appOptions.ssl.redirectPort = options.httpRedirectPort || 80;

        } else {
            Console.logWithout(Levels.ERROR, null, `Ensure that './certs/key.pem' and './certs/cert.pem' exist.`, `--ssl flag was used, but the files were not found.`)


            process.exit(1); // Encerra o processo com erro
        }
    }

    // 4. Inicia o helper com as opções
    const teste = require("../helpers");
    const t = teste.default(appOptions);
    t.init();
}

// --- Comando DEV ---
program
    .command('dev')
    .description('Starts the application in development mode.')
    .option('-p, --port <number>', 'Specifies the port to run on', '3000')
    .option('-H, --hostname <string>', 'Specifies the hostname to run on', '0.0.0.0')
    .option('--ssl', 'Activates HTTPS/SSL mode (requires ./ssl/key.pem and ./ssl/cert.pem)')
    .option('--http-redirect-port <number>', 'Port for HTTP->HTTPS redirection', '80')
    .action((options) => {
        initializeApp(options, true); // Chama a função com dev: true
    });

// --- Comando START (Produção) ---
program
    .command('start')
    .description('Starts the application in production mode.')
    .option('-p, --port <number>', 'Specifies the port to run on', '3000')
    .option('-H, --hostname <string>', 'Specifies the hostname to run on', '0.0.0.0')
    .option('--ssl', 'Activates HTTPS/SSL mode (requires ./ssl/key.pem and ./ssl/cert.pem)')
    .option('--http-redirect-port <number>', 'Port for HTTP->HTTPS redirection', '80')
    .action((options) => {
        initializeApp(options, false); // Chama a função com dev: false
    });

/**
 * Função corrigida para copiar diretórios recursivamente.
 * Ela agora verifica se um item é um arquivo ou um diretório.
 */
function copyDirRecursive(src, dest) {
    try {
        // Garante que o diretório de destino exista
        fs.mkdirSync(dest, { recursive: true });

        // Usamos { withFileTypes: true } para evitar uma chamada extra de fs.statSync
        const entries = fs.readdirSync(src, { withFileTypes: true });

        for (let entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);

            if (entry.isDirectory()) {
                // Se for um diretório, chama a si mesma (recursão)
                copyDirRecursive(srcPath, destPath);
            } else {
                // Se for um arquivo, apenas copia
                fs.copyFileSync(srcPath, destPath);
            }
        }
    } catch (error) {
        console.error(`❌ Erro ao copiar ${src} para ${dest}:`, error);
        // Lança o erro para parar o processo de exportação se a cópia falhar
        throw error;
    }
}


// --- INÍCIO DO SEU CÓDIGO (AGORA CORRIGIDO) ---

program
    .command('export')
    .description('Exports the application as static HTML to the "exported" folder.')
    .option('-o, --output <path>', 'Specifies the output directory', 'exported')
    .action(async (options) => {
        const projectDir = process.cwd();
        // Usar path.resolve é mais seguro para garantir um caminho absoluto
        const exportDir = path.resolve(projectDir, options.output);

        console.log('🚀 Starting export...\n');

        try {
            // 1. Cria a pasta exported (limpa se já existir)
            if (fs.existsSync(exportDir)) {
                console.log('🗑️  Cleaning existing export folder...');
                fs.rmSync(exportDir, { recursive: true, force: true });
            }
            fs.mkdirSync(exportDir, { recursive: true });
            console.log('✅ Export folder created\n');

            // 2. Inicializa e prepara o build
            console.log('🔨 Building application...');
            // ATENÇÃO: Ajuste o caminho deste 'require' conforme a estrutura do seu projeto!
            const teste = require("../helpers");
            const app = teste.default({ dev: false, port: 3000, hostname: '0.0.0.0', framework: 'native' });
            await app.prepare();
            console.log('✅ Build complete\n');

            // 3. Copia a pasta .hight para exported (*** CORRIGIDO ***)
            const distDir = path.join(projectDir, '.hight');
            if (fs.existsSync(distDir)) {
                console.log('📦 Copying JavaScript files...');
                const exportDistDir = path.join(exportDir, '.hight');

                // --- Lógica de cópia substituída ---
                // A função copyDirRecursive agora lida com tudo (arquivos e subpastas)
                copyDirRecursive(distDir, exportDistDir);
                // --- Fim da substituição ---

                console.log('✅ JavaScript files copied\n');
            }

            // 4. Copia a pasta public se existir (*** CORRIGIDO ***)
            const publicDir = path.join(projectDir, 'public');
            if (fs.existsSync(publicDir)) {
                console.log('📁 Copying public files...');
                const exportPublicDir = path.join(exportDir, 'public');

                // --- Lógica de cópia substituída ---
                // Reutilizamos a mesma função corrigida
                copyDirRecursive(publicDir, exportPublicDir);
                // --- Fim da substituição ---

                console.log('✅ Public files copied\n');
            }

            // 5. Gera o index.html
            console.log('📝 Generating index.html...');
            // ATENÇÃO: Ajuste os caminhos destes 'requires' conforme a estrutura do seu projeto!
            const { render } = require('../renderer');
            const { loadRoutes, loadLayout, loadNotFound } = require('../router');

            // Carrega as rotas para gerar o HTML
            const userWebDir = path.join(projectDir, 'src', 'web');
            const userWebRoutesDir = path.join(userWebDir, 'routes');

            const routes = loadRoutes(userWebRoutesDir);
            loadLayout(userWebDir);
            loadNotFound(userWebDir);

            // Gera HTML para a rota raiz
            const rootRoute = routes.find(r => r.pattern === '/') || routes[0];

            if (rootRoute) {
                const mockReq = {
                    url: '/',
                    method: 'GET',
                    headers: { host: 'localhost' },
                    hwebDev: false,
                    hotReloadManager: null
                };

                const html = await render({
                    req: mockReq,
                    route: rootRoute,
                    params: {},
                    allRoutes: routes
                });
                const scriptReplaced = html.replace('/_hight/', './.hight/');
                const indexPath = path.join(exportDir, 'index.html');
                fs.writeFileSync(indexPath, scriptReplaced, 'utf8');
                console.log('✅ index.html generated\n');
            }

            console.log('🎉 Export completed successfully!');
            console.log(`📂 Files exported to: ${exportDir}\n`);

        } catch (error) {
            // Logar o erro completo (com stack trace) é mais útil
            console.error('❌ Error during export:', error);
            process.exit(1);
        }
    });

// Faz o "parse" dos argumentos passados na linha de comando
program.parse(process.argv);
