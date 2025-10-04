#!/usr/bin/env node

// Registra o ts-node para que o Node.js entenda TypeScript/TSX
require('ts-node').register();

const { program } = require('commander');
const teste = require("../helpers");

program
    .version('1.0.0')
    .description('CLI para gerenciar a aplicação.');

// --- Comando DEV ---
program
    .command('dev')
    .description('Inicia a aplicação em modo de desenvolvimento.')
    .option('-p, --port <number>', 'Especifica a porta para rodar', '3000')
    .option('-H, --hostname <string>', 'Especifica o hostname para rodar', '0.0.0.0')
    .option('-f, --framework <string>', 'Especifica o framework a ser usado (native/express/fastify)', 'native')
    .action((options) => {
        const teste = require("../helpers");
        const t = teste.default({ dev: true, port: options.port, hostname: options.hostname, framework: options.framework });
        t.init()
    });

// --- Comando START (Produção) ---
program
    .command('start')
    .description('Inicia a aplicação em modo produção.')
    .option('-p, --port <number>', 'Especifica a porta para rodar', '3000')
    .option('-H, --hostname <string>', 'Especifica o hostname para rodar', '0.0.0.0')
    .option('-f, --framework <string>', 'Especifica o framework a ser usado (native/express/fastify)', 'native')
    .action((options) => {
        const teste = require("../helpers");
        const t = teste.default({ dev: false, port: options.port, hostname: options.hostname, framework: options.framework });
        t.init()
    });

// Faz o "parse" dos argumentos passados na linha de comando
program.parse(process.argv);