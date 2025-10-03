#!/usr/bin/env node
"use strict";
// Registra o ts-node para que o Node.js entenda TypeScript/TSX
require('ts-node').register();
const { program } = require('commander');
program
    .version('1.0.0')
    .description('CLI para gerenciar a aplicação.');
// --- Comando DEV ---
program
    .command('dev')
    .description('Inicia a aplicação em modo de desenvolvimento.')
    .option('-p, --port <number>', 'Especifica a porta para rodar', '3000')
    .option('-H, --hostname <string>', 'Especifica o hostname para rodar', '0.0.0.0')
    .action((options) => {
    const { createFastifyApp } = require("../helpers"); // Ajuste o caminho se necessário
    const app = createFastifyApp({ dev: true }); // A diferença está aqui!
    app.listen(options.port, options.hostname);
});
// --- Comando START (Produção) ---
program
    .command('start')
    .description('Inicia a aplicação em modo de produção.')
    .option('-p, --port <number>', 'Especifica a porta para rodar', '3000')
    .option('-H, --hostname <string>', 'Especifica o hostname para rodar', '0.0.0.0')
    .action((options) => {
    const { createFastifyApp } = require("../helpers"); // Ajuste o caminho se necessário
    const app = createFastifyApp({ dev: false });
    app.listen(options.port, options.hostname);
});
// Faz o "parse" dos argumentos passados na linha de comando
program.parse(process.argv);
