"use strict";
const esbuild = require('esbuild');
const path = require('path');
const Console = require("./api/console");
// Lista de módulos nativos do Node.js para marcar como externos (apenas os built-ins do Node)
const nodeBuiltIns = [
    'assert', 'buffer', 'child_process', 'cluster', 'crypto', 'dgram', 'dns',
    'domain', 'events', 'fs', 'http', 'https', 'net', 'os', 'path', 'punycode',
    'querystring', 'readline', 'stream', 'string_decoder', 'tls', 'tty', 'url',
    'util', 'v8', 'vm', 'zlib', 'module', 'worker_threads', 'perf_hooks'
];
/**
 * Plugin para processar CSS com PostCSS e Tailwind
 */
const postcssPlugin = {
    name: 'postcss-plugin',
    setup(build) {
        build.onLoad({ filter: /\.css$/ }, async (args) => {
            const fs = require('fs');
            const path = require('path');
            try {
                // Lê o CSS original
                let css = await fs.promises.readFile(args.path, 'utf8');
                // Verifica se tem PostCSS config no projeto
                const projectDir = process.cwd();
                const postcssConfigPath = path.join(projectDir, 'postcss.config.js');
                const postcssConfigMjsPath = path.join(projectDir, 'postcss.config.mjs');
                let processedCss = css;
                if (fs.existsSync(postcssConfigPath) || fs.existsSync(postcssConfigMjsPath)) {
                    try {
                        // Importa PostCSS do projeto (não do SDK)
                        const postcssPath = path.join(projectDir, 'node_modules', 'postcss');
                        const postcss = require(postcssPath);
                        // Carrega a config do PostCSS
                        const configPath = fs.existsSync(postcssConfigPath) ? postcssConfigPath : postcssConfigMjsPath;
                        delete require.cache[require.resolve(configPath)];
                        const config = require(configPath);
                        const postcssConfig = config.default || config;
                        // Resolve plugins do projeto
                        const plugins = [];
                        if (postcssConfig.plugins) {
                            if (Array.isArray(postcssConfig.plugins)) {
                                // Formato array: ["@tailwindcss/postcss"]
                                plugins.push(...postcssConfig.plugins.map(plugin => {
                                    if (typeof plugin === 'string') {
                                        try {
                                            // Tenta resolver do node_modules do projeto primeiro
                                            return require.resolve(plugin, { paths: [projectDir] });
                                        }
                                        catch {
                                            // Fallback para require direto
                                            return require(plugin);
                                        }
                                    }
                                    return plugin;
                                }));
                            }
                            else {
                                // Formato objeto: { tailwindcss: {}, autoprefixer: {} }
                                for (const [pluginName, pluginOptions] of Object.entries(postcssConfig.plugins)) {
                                    try {
                                        // Resolve o plugin do projeto
                                        const resolvedPath = require.resolve(pluginName, { paths: [projectDir] });
                                        const pluginModule = require(resolvedPath);
                                        plugins.push(pluginModule(pluginOptions || {}));
                                    }
                                    catch (error) {
                                        Console.warn(`Não foi possível carregar plugin ${pluginName}:`, error.message);
                                    }
                                }
                            }
                        }
                        // Processa o CSS com PostCSS
                        const result = await postcss(plugins)
                            .process(css, {
                            from: args.path,
                            to: args.path.replace(/\.css$/, '.processed.css')
                        });
                        processedCss = result.css;
                    }
                    catch (postcssError) {
                        Console.warn(`Erro ao processar CSS com PostCSS:`, postcssError.message);
                        Console.warn(`Usando CSS original sem processamento.`);
                    }
                }
                return {
                    contents: `
                        const css = ${JSON.stringify(processedCss)};
                        if (typeof document !== 'undefined') {
                            const style = document.createElement('style');
                            style.textContent = css;
                            document.head.appendChild(style);
                        }
                        export default css;
                    `,
                    loader: 'js'
                };
            }
            catch (error) {
                Console.error(`Erro ao processar CSS ${args.path}:`, error);
                return {
                    contents: `export default "";`,
                    loader: 'js'
                };
            }
        });
    }
};
/**
 * Plugin para resolver dependências npm no frontend
 */
const npmDependenciesPlugin = {
    name: 'npm-dependencies',
    setup(build) {
        // Permite que dependências npm sejam bundladas (não marcadas como external)
        build.onResolve({ filter: /^[^./]/ }, (args) => {
            // Se for um módulo built-in do Node.js, marca como external
            if (nodeBuiltIns.includes(args.path)) {
                return { path: args.path, external: true };
            }
            // Para dependências npm (axios, lodash, react, react-dom, etc), deixa o esbuild resolver normalmente
            // Isso permite que sejam bundladas no frontend
            return null;
        });
    }
};
/**
 * Plugin para garantir que React seja corretamente resolvido
 */
const reactResolvePlugin = {
    name: 'react-resolve',
    setup(build) {
        // Força o uso de uma única instância do React do projeto
        build.onResolve({ filter: /^react$/ }, (args) => {
            const reactPath = require.resolve('react', { paths: [process.cwd()] });
            return {
                path: reactPath
            };
        });
        build.onResolve({ filter: /^react-dom$/ }, (args) => {
            const reactDomPath = require.resolve('react-dom', { paths: [process.cwd()] });
            return {
                path: reactDomPath
            };
        });
        build.onResolve({ filter: /^react\/jsx-runtime$/ }, (args) => {
            const jsxRuntimePath = require.resolve('react/jsx-runtime', { paths: [process.cwd()] });
            return {
                path: jsxRuntimePath
            };
        });
        // Também resolve react-dom/client para React 18+
        build.onResolve({ filter: /^react-dom\/client$/ }, (args) => {
            const clientPath = require.resolve('react-dom/client', { paths: [process.cwd()] });
            return {
                path: clientPath
            };
        });
    }
};
/**
 * Builds with code splitting into multiple chunks based on module types.
 * @param {string} entryPoint - The path to the entry file.
 * @param {string} outdir - The directory for output files.
 * @param {boolean} isProduction - Se está em modo produção ou não.
 * @returns {Promise<void>}
 */
async function buildWithChunks(entryPoint, outdir, isProduction = false) {
    if (!isProduction) {
        console.log(`Iniciando o build com chunks de \"${entryPoint}\"...`);
    }
    try {
        await esbuild.build({
            entryPoints: [entryPoint],
            bundle: true,
            minify: isProduction,
            sourcemap: !isProduction,
            platform: 'browser',
            outdir: outdir,
            loader: { '.js': 'jsx', '.ts': 'tsx' },
            external: nodeBuiltIns,
            plugins: [postcssPlugin, npmDependenciesPlugin, reactResolvePlugin],
            format: 'esm', // ESM suporta melhor o code splitting
            jsx: 'automatic',
            define: {
                'process.env.NODE_ENV': isProduction ? '"production"' : '"development"'
            },
            conditions: ['development'],
            mainFields: ['browser', 'module', 'main'],
            resolveExtensions: ['.tsx', '.ts', '.jsx', '.js'],
            splitting: true,
            chunkNames: 'chunks/[name]-[hash]',
            // Força o nome do entry para main(.js) ou main-[hash].js em prod
            entryNames: isProduction ? 'main-[hash]' : 'main',
            keepNames: true,
            treeShaking: true,
        });
        if (!isProduction) {
            console.log(`Build com chunks finalizado! Saída: \"${outdir}\".`);
        }
    }
    catch (error) {
        console.error('Ocorreu um erro durante o build com chunks:', error);
        process.exit(1);
    }
}
/**
 * Watches with code splitting enabled
 * @param {string} entryPoint - The path to the entry file.
 * @param {string} outdir - The directory for output files.
 * @param {Object} hotReloadManager - Manager de hot reload (opcional).
 * @returns {Promise<void>}
 */
async function watchWithChunks(entryPoint, outdir, hotReloadManager = null) {
    try {
        const context = await esbuild.context({
            entryPoints: [entryPoint],
            bundle: true,
            minify: false,
            sourcemap: true,
            platform: 'browser',
            outdir: outdir,
            loader: { '.js': 'jsx', '.ts': 'tsx' },
            external: nodeBuiltIns,
            plugins: [postcssPlugin, npmDependenciesPlugin, reactResolvePlugin],
            format: 'esm',
            jsx: 'automatic',
            define: {
                'process.env.NODE_ENV': '"development"'
            },
            conditions: ['development'],
            mainFields: ['browser', 'module', 'main'],
            resolveExtensions: ['.tsx', '.ts', '.jsx', '.js'],
            splitting: true,
            chunkNames: 'chunks/[name]-[hash]',
            entryNames: 'main',
            keepNames: true,
            treeShaking: true,
        });
        await context.watch();
    }
    catch (error) {
        console.error(error);
        Console.error('Erro ao iniciar o modo watch com chunks:', error);
        throw error;
    }
}
/**
 * Builds a single entry point into a single output file.
 * @param {string} entryPoint - The path to the entry file.
 * @param {string} outfile - The full path to the output file.
 * @param {boolean} isProduction - Se está em modo produção ou não.
 * @returns {Promise<void>}
 */
async function build(entryPoint, outfile, isProduction = false) {
    if (!isProduction) {
        console.log(`Iniciando o build de \"${entryPoint}\"...`);
    }
    try {
        await esbuild.build({
            entryPoints: [entryPoint],
            bundle: true,
            minify: isProduction,
            sourcemap: !isProduction, // Só gera sourcemap em dev
            platform: 'browser',
            outfile: outfile,
            loader: { '.js': 'jsx', '.ts': 'tsx' },
            external: nodeBuiltIns,
            plugins: [postcssPlugin, npmDependenciesPlugin, reactResolvePlugin],
            format: 'iife',
            globalName: 'HwebApp',
            jsx: 'automatic',
            define: {
                'process.env.NODE_ENV': isProduction ? '"production"' : '"development"'
            },
            // Configurações específicas para React 19
            conditions: ['development'],
            mainFields: ['browser', 'module', 'main'],
            resolveExtensions: ['.tsx', '.ts', '.jsx', '.js'],
            // Garante que não há duplicação de dependências
            splitting: false,
            // Preserva nomes de funções e comportamento
            keepNames: true,
            // Remove otimizações que podem causar problemas com hooks
            treeShaking: true,
            drop: [], // Não remove nada automaticamente
        });
        if (!isProduction) {
            console.log(`Build finalizado com sucesso! Saída: \"${outfile}\".`);
        }
    }
    catch (error) {
        console.error('Ocorreu um erro durante o build:', error);
        process.exit(1);
    }
}
/**
 * Watches an entry point and its dependencies, rebuilding to a single output file.
 * @param {string} entryPoint - The path to the entry file.
 * @param {string} outfile - The full path to the output file.
 * @param {Object} hotReloadManager - Manager de hot reload (opcional).
 * @returns {Promise<void>}
 */
async function watch(entryPoint, outfile, hotReloadManager = null) {
    try {
        const context = await esbuild.context({
            entryPoints: [entryPoint],
            bundle: true,
            minify: false,
            sourcemap: true,
            platform: 'browser',
            outfile: outfile,
            loader: { '.js': 'jsx', '.ts': 'tsx' },
            external: nodeBuiltIns,
            plugins: [postcssPlugin, npmDependenciesPlugin, reactResolvePlugin],
            format: 'iife',
            globalName: 'HwebApp',
            jsx: 'automatic',
            define: {
                'process.env.NODE_ENV': '"development"'
            },
            // Configurações específicas para React 19 (mesmo que no build)
            conditions: ['development'],
            mainFields: ['browser', 'module', 'main'],
            resolveExtensions: ['.tsx', '.ts', '.jsx', '.js'],
            // Garante que não há duplicação de dependências
            splitting: false,
            // Preserva nomes de funções e comportamento
            keepNames: true,
            // Remove otimizações que podem causar problemas com hooks
            treeShaking: true,
        });
        // Configura o watcher do esbuild
        await context.watch();
    }
    catch (error) {
        Console.error('Erro ao iniciar o modo watch:', error);
        throw error;
    }
}
module.exports = { build, watch, buildWithChunks, watchWithChunks };
