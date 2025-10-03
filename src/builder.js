const esbuild = require('esbuild');
const path = require('path');
const Console = require("./api/console")

// Lista de módulos nativos do Node.js para marcar como externos (apenas os built-ins do Node)
const nodeBuiltIns = [
    'assert', 'buffer', 'child_process', 'cluster', 'crypto', 'dgram', 'dns', 
    'domain', 'events', 'fs', 'http', 'https', 'net', 'os', 'path', 'punycode', 
    'querystring', 'readline', 'stream', 'string_decoder', 'tls', 'tty', 'url', 
    'util', 'v8', 'vm', 'zlib', 'module', 'worker_threads', 'perf_hooks'
];

/**
 * Plugin para mapear React imports para variáveis globais
 */
const reactGlobalPlugin = {
    name: 'react-global',
    setup(build) {
        // Mapeia react para window.React
        build.onResolve({ filter: /^react$/ }, () => ({
            path: 'react',
            namespace: 'react-global'
        }));

        // Mapeia react-dom para window.ReactDOM
        build.onResolve({ filter: /^react-dom$/ }, () => ({
            path: 'react-dom',
            namespace: 'react-global'
        }));

        // Mapeia react-dom/client para window.ReactDOM
        build.onResolve({ filter: /^react-dom\/client$/ }, () => ({
            path: 'react-dom/client',
            namespace: 'react-global'
        }));

        // Mapeia react/jsx-runtime para window.React
        build.onResolve({ filter: /^react\/jsx-runtime$/ }, () => ({
            path: 'react/jsx-runtime',
            namespace: 'react-global'
        }));

        // Mapeia react/jsx-dev-runtime para window.React
        build.onResolve({ filter: /^react\/jsx-dev-runtime$/ }, () => ({
            path: 'react/jsx-dev-runtime',
            namespace: 'react-global'
        }));

        // Fornece o código que mapeia para as variáveis globais
        build.onLoad({ filter: /.*/, namespace: 'react-global' }, (args) => {
            if (args.path === 'react') {
                return {
                    contents: `
                        const React = window.React;
                        export default React;
                        export const { useState, useEffect, useContext, createContext, createElement, Component, Fragment, useCallback } = React;
                    `,
                    resolveDir: '.'
                };
            }
            if (args.path === 'react-dom' || args.path === 'react-dom/client') {
                return {
                    contents: `
                        const ReactDOM = window.ReactDOM;
                        export default ReactDOM;
                        export const { render, createRoot, hydrateRoot } = ReactDOM;
                    `,
                    resolveDir: '.'
                };
            }
            if (args.path === 'react/jsx-runtime' || args.path === 'react/jsx-dev-runtime') {
                return {
                    contents: `
                        const React = window.React;
                        export const jsx = React.createElement;
                        export const jsxs = React.createElement;
                        export const Fragment = React.Fragment;
                    `,
                    resolveDir: '.'
                };
            }
        });
    }
};

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
                                        } catch {
                                            // Fallback para require direto
                                            return require(plugin);
                                        }
                                    }
                                    return plugin;
                                }));
                            } else {
                                // Formato objeto: { tailwindcss: {}, autoprefixer: {} }
                                for (const [pluginName, pluginOptions] of Object.entries(postcssConfig.plugins)) {
                                    try {
                                        // Resolve o plugin do projeto
                                        const resolvedPath = require.resolve(pluginName, { paths: [projectDir] });
                                        const pluginModule = require(resolvedPath);
                                        plugins.push(pluginModule(pluginOptions || {}));
                                    } catch (error) {
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

                    } catch (postcssError) {
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

            } catch (error) {
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

            // Para dependências npm (axios, lodash, etc), deixa o esbuild resolver normalmente
            // Isso permite que sejam bundladas no frontend
            return null;
        });
    }
};

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
      plugins: [reactGlobalPlugin, postcssPlugin, npmDependenciesPlugin],
      format: 'iife',
      globalName: 'HwebApp',
      jsx: 'automatic',
      define: {
        'process.env.NODE_ENV': isProduction ? '"production"' : '"development"'
      },
      // CORRIGIDO: Não remove console.log nem debugger em produção para funcionalidade completa
      drop: [], // Remove apenas em casos específicos se necessário
      // Preserva nomes de funções e comportamento em produção
      keepNames: true,
    });

    if (!isProduction) {
      console.log(`Build finalizado com sucesso! Saída: \"${outfile}\".`);
    }
  } catch (error) {
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
            plugins: [reactGlobalPlugin, postcssPlugin, npmDependenciesPlugin],
            format: 'iife',
            globalName: 'HwebApp',
            jsx: 'automatic',
            define: {
                'process.env.NODE_ENV': '"development"'
            }
        });


        // Configura o watcher do esbuild
        await context.watch();
    } catch (error) {
        Console.error('Erro ao iniciar o modo watch:', error);
        throw error;
    }
}

module.exports = { build, watch };
