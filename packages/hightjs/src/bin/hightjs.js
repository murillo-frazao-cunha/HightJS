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

// --- Comando EXPORT ---
program
    .command('export')
    .description('Exports the application as static HTML to the "exported" folder.')
    .option('-o, --output <path>', 'Specifies the output directory', 'exported')
    .action(async (options) => {
        const projectDir = process.cwd();
        const exportDir = path.join(projectDir, options.output);

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
            const teste = require("../helpers");
            const app = teste.default({ dev: false, port: 3000, hostname: '0.0.0.0', framework: 'native' });
            await app.prepare();
            console.log('✅ Build complete\n');

            // 3. Copia a pasta .hight para exported
            const distDir = path.join(projectDir, '.hight');
            if (fs.existsSync(distDir)) {
                console.log('📦 Copying JavaScript files...');
                const exportDistDir = path.join(exportDir, '.hight');
                fs.mkdirSync(exportDistDir, { recursive: true });

                const files = fs.readdirSync(distDir);
                files.forEach(file => {
                    fs.copyFileSync(
                        path.join(distDir, file),
                        path.join(exportDistDir, file)
                    );
                });
                console.log('✅ JavaScript files copied\n');
            }

            // 4. Copia a pasta public se existir
            const publicDir = path.join(projectDir, 'public');
            if (fs.existsSync(publicDir)) {
                console.log('📁 Copying public files...');
                const exportPublicDir = path.join(exportDir, 'public');

                function copyRecursive(src, dest) {
                    if (fs.statSync(src).isDirectory()) {
                        fs.mkdirSync(dest, { recursive: true });
                        fs.readdirSync(src).forEach(file => {
                            copyRecursive(path.join(src, file), path.join(dest, file));
                        });
                    } else {
                        fs.copyFileSync(src, dest);
                    }
                }

                copyRecursive(publicDir, exportPublicDir);
                console.log('✅ Public files copied\n');
            }

            // 5. Gera o index.html
            console.log('📝 Generating index.html...');
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

                const indexPath = path.join(exportDir, 'index.html');
                fs.writeFileSync(indexPath, html, 'utf8');
                console.log('✅ index.html generated\n');
            }

            console.log('🎉 Export completed successfully!');
            console.log(`📂 Files exported to: ${exportDir}\n`);

        } catch (error) {
            console.error('❌ Error during export:', error.message);
            process.exit(1);
        }
    });


// Faz o "parse" dos argumentos passados na linha de comando
program.parse(process.argv);
