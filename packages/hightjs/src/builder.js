/*
 * This file is part of the HightJS Project.
 * Copyright (c) 2025 itsmuzin
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const esbuild = require('esbuild');
const path = require('path');
const Console = require("./api/console").default
const fs = require('fs');
const {readdir, stat} = require("node:fs/promises");
const {rm} = require("fs-extra");
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
                                        Console.warn(`Unable to load plugin ${pluginName}:`, error.message);
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
                        Console.warn(`Error processing CSS with PostCSS:`, postcssError.message);
                        Console.warn(`Using raw CSS without processing.`);
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
 * Plugin para adicionar suporte a HMR (Hot Module Replacement)
 */
const hmrPlugin = {
    name: 'hmr-plugin',
    setup(build) {
        // Adiciona runtime de HMR para arquivos TSX/JSX
        build.onLoad({ filter: /\.(tsx|jsx)$/ }, async (args) => {
            // Ignora arquivos de node_modules
            if (args.path.includes('node_modules')) {
                return null;
            }

            const fs = require('fs');
            const contents = await fs.promises.readFile(args.path, 'utf8');

            // Adiciona código de HMR apenas em componentes de rota
            if (args.path.includes('/routes/') || args.path.includes('\\routes\\')) {
                const hmrCode = `
// HMR Runtime
if (typeof window !== 'undefined' && window.__HWEB_HMR__) {
    const moduleId = ${JSON.stringify(args.path)};
    if (!window.__HWEB_HMR_MODULES__) {
        window.__HWEB_HMR_MODULES__ = new Map();
    }
    window.__HWEB_HMR_MODULES__.set(moduleId, module.exports);
}
`;
                return {
                    contents: contents + '\n' + hmrCode,
                    loader: 'tsx'
                };
            }

            return null;
        });
    }
};

/**
 * Plugin para suportar importação de arquivos Markdown (.md)
 */
const markdownPlugin = {
    name: 'markdown-plugin',
    setup(build) {
        build.onLoad({ filter: /\.md$/ }, async (args) => {
            const fs = require('fs');
            const content = await fs.promises.readFile(args.path, 'utf8');

            return {
                contents: `export default ${JSON.stringify(content)};`,
                loader: 'js'
            };
        });
    }
};

/**
 * Plugin para suportar importação de arquivos de imagem e outros assets
 */
const assetsPlugin = {
    name: 'assets-plugin',
    setup(build) {
        // Suporte para imagens (PNG, JPG, JPEG, GIF, SVG, WEBP, etc)
        build.onLoad({ filter: /\.(png|jpe?g|gif|webp|avif|ico|bmp|tiff?)$/i }, async (args) => {
            const fs = require('fs');
            const buffer = await fs.promises.readFile(args.path);
            const base64 = buffer.toString('base64');
            const ext = path.extname(args.path).slice(1).toLowerCase();

            // Mapeamento de extensões para MIME types
            const mimeTypes = {
                'png': 'image/png',
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'gif': 'image/gif',
                'webp': 'image/webp',
                'avif': 'image/avif',
                'ico': 'image/x-icon',
                'bmp': 'image/bmp',
                'tif': 'image/tiff',
                'tiff': 'image/tiff'
            };

            const mimeType = mimeTypes[ext] || 'application/octet-stream';

            return {
                contents: `export default "data:${mimeType};base64,${base64}";`,
                loader: 'js'
            };
        });

        // Suporte especial para SVG (pode ser usado como string ou data URL)
        build.onLoad({ filter: /\.svg$/i }, async (args) => {
            const fs = require('fs');
            const content = await fs.promises.readFile(args.path, 'utf8');
            const base64 = Buffer.from(content).toString('base64');

            return {
                contents: `
                    export default "data:image/svg+xml;base64,${base64}";
                    export const svgContent = ${JSON.stringify(content)};
                `,
                loader: 'js'
            };
        });

        // Suporte para arquivos JSON
        build.onLoad({ filter: /\.json$/i }, async (args) => {
            const fs = require('fs');
            const content = await fs.promises.readFile(args.path, 'utf8');

            return {
                contents: `export default ${content};`,
                loader: 'js'
            };
        });

        // Suporte para arquivos de texto (.txt)
        build.onLoad({ filter: /\.txt$/i }, async (args) => {
            const fs = require('fs');
            const content = await fs.promises.readFile(args.path, 'utf8');

            return {
                contents: `export default ${JSON.stringify(content)};`,
                loader: 'js'
            };
        });

        // Suporte para arquivos de fonte (WOFF, WOFF2, TTF, OTF, EOT)
        build.onLoad({ filter: /\.(woff2?|ttf|otf|eot)$/i }, async (args) => {
            const fs = require('fs');
            const buffer = await fs.promises.readFile(args.path);
            const base64 = buffer.toString('base64');
            const ext = path.extname(args.path).slice(1).toLowerCase();

            const mimeTypes = {
                'woff': 'font/woff',
                'woff2': 'font/woff2',
                'ttf': 'font/ttf',
                'otf': 'font/otf',
                'eot': 'application/vnd.ms-fontobject'
            };

            const mimeType = mimeTypes[ext] || 'application/octet-stream';

            return {
                contents: `export default "data:${mimeType};base64,${base64}";`,
                loader: 'js'
            };
        });

        // Suporte para arquivos de áudio (MP3, WAV, OGG, etc)
        build.onLoad({ filter: /\.(mp3|wav|ogg|m4a|aac|flac)$/i }, async (args) => {
            const fs = require('fs');
            const buffer = await fs.promises.readFile(args.path);
            const base64 = buffer.toString('base64');
            const ext = path.extname(args.path).slice(1).toLowerCase();

            const mimeTypes = {
                'mp3': 'audio/mpeg',
                'wav': 'audio/wav',
                'ogg': 'audio/ogg',
                'm4a': 'audio/mp4',
                'aac': 'audio/aac',
                'flac': 'audio/flac'
            };

            const mimeType = mimeTypes[ext] || 'audio/mpeg';

            return {
                contents: `export default "data:${mimeType};base64,${base64}";`,
                loader: 'js'
            };
        });

        // Suporte para arquivos de vídeo (MP4, WEBM, OGV)
        build.onLoad({ filter: /\.(mp4|webm|ogv)$/i }, async (args) => {
            const fs = require('fs');
            const buffer = await fs.promises.readFile(args.path);
            const base64 = buffer.toString('base64');
            const ext = path.extname(args.path).slice(1).toLowerCase();

            const mimeTypes = {
                'mp4': 'video/mp4',
                'webm': 'video/webm',
                'ogv': 'video/ogg'
            };

            const mimeType = mimeTypes[ext] || 'video/mp4';

            return {
                contents: `export default "data:${mimeType};base64,${base64}";`,
                loader: 'js'
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
    // limpar diretorio, menos a pasta temp
    await cleanDirectoryExcept(outdir, 'temp');

  try {
    await esbuild.build({
      entryPoints: [entryPoint],
      bundle: true,
      minify: isProduction,
      sourcemap: !isProduction,
      platform: 'browser',
      outdir: outdir,
      loader: { '.js': 'js', '.ts': 'tsx' },
      external: nodeBuiltIns,
      plugins: [postcssPlugin, npmDependenciesPlugin, reactResolvePlugin, markdownPlugin, assetsPlugin],
      format: 'esm', // ESM suporta melhor o code splitting
      jsx: 'automatic',
      define: {
        'process.env.NODE_ENV': isProduction ? '"production"' : '"development"'
      },
      conditions: ['development'],
      mainFields: ['browser', 'module', 'main'],
      resolveExtensions: ['.tsx', '.ts', '.js'],
      splitting: true,
      chunkNames: 'chunks/[name]-[hash]',
      // Força o nome do entry para main(.js) ou main-[hash].js em prod
      entryNames: isProduction ? 'main-[hash]' : 'main',
      keepNames: true,
      treeShaking: true,
    });

  } catch (error) {
    console.error('An error occurred while building:', error);
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
    // limpar diretorio
    await cleanDirectoryExcept(outdir, 'temp');
    try {
        // Plugin para notificar quando o build termina
        const buildCompletePlugin = {
            name: 'build-complete',
            setup(build) {
                let isFirstBuild = true;
                build.onEnd((result) => {
                    if (hotReloadManager) {
                        if (isFirstBuild) {
                            isFirstBuild = false;
                            hotReloadManager.onBuildComplete(true);
                        } else {
                            // Notifica o hot reload manager que o build foi concluído
                            hotReloadManager.onBuildComplete(result.errors.length === 0);
                        }
                    }
                });
            }
        };

        const context = await esbuild.context({
            entryPoints: [entryPoint],
            bundle: true,
            minify: false,
            sourcemap: true,
            platform: 'browser',
            outdir: outdir,
            loader: { '.js': 'js', '.ts': 'tsx' },
            external: nodeBuiltIns,
            plugins: [postcssPlugin, npmDependenciesPlugin, reactResolvePlugin, hmrPlugin, buildCompletePlugin, markdownPlugin, assetsPlugin],
            format: 'esm',
            jsx: 'automatic',
            define: {
                'process.env.NODE_ENV': '"development"'
            },
            conditions: ['development'],
            mainFields: ['browser', 'module', 'main'],
            resolveExtensions: ['.tsx', '.ts', '.js'],
            splitting: true,
            chunkNames: 'chunks/[name]-[hash]',
            entryNames: 'main',
            keepNames: true,
            treeShaking: true,
        });

        await context.watch();
    } catch (error) {
        console.error(error)
        Console.error('Error starting watch mode with chunks:', error);
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
    // limpar diretorio do outfile
    const outdir = path.dirname(outfile);
    await cleanDirectoryExcept(outdir, 'temp');

  try {
    await esbuild.build({
      entryPoints: [entryPoint],
      bundle: true,
      minify: isProduction,
      sourcemap: !isProduction, // Só gera sourcemap em dev
      platform: 'browser',
      outfile: outfile,
      loader: { '.js': 'js', '.ts': 'tsx' },
      external: nodeBuiltIns,
      plugins: [postcssPlugin, npmDependenciesPlugin, reactResolvePlugin, markdownPlugin, assetsPlugin],
      format: 'iife',
      globalName: 'HwebApp',
      jsx: 'automatic',
      define: {
        'process.env.NODE_ENV': isProduction ? '"production"' : '"development"'
      },
      // Configurações específicas para React 19
      conditions: ['development'],
      mainFields: ['browser', 'module', 'main'],
      resolveExtensions: ['.tsx', '.ts', '.js'],
      // Garante que não há duplicação de dependências
      splitting: false,
      // Preserva nomes de funções e comportamento
      keepNames: true,
      // Remove otimizações que podem causar problemas com hooks
      treeShaking: true,
      drop: [], // Não remove nada automaticamente
    });

  } catch (error) {
    console.error('An error occurred during build:', error);
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
        // Plugin para notificar quando o build termina
        const buildCompletePlugin = {
            name: 'build-complete',
            setup(build) {
                let isFirstBuild = true;
                build.onEnd((result) => {
                    if (hotReloadManager) {
                        if (isFirstBuild) {
                            isFirstBuild = false;
                            hotReloadManager.onBuildComplete(true);
                        } else {
                            // Notifica o hot reload manager que o build foi concluído
                            hotReloadManager.onBuildComplete(result.errors.length === 0);
                        }
                    }
                });
            }
        };

        const context = await esbuild.context({
            entryPoints: [entryPoint],
            bundle: true,
            minify: false,
            sourcemap: true,
            platform: 'browser',
            outfile: outfile,
            loader: { '.js': 'js', '.ts': 'tsx' },
            external: nodeBuiltIns,
            format: 'iife',
            globalName: 'HwebApp',
            jsx: 'automatic',
            define: {
                'process.env.NODE_ENV': '"development"'
            },
            // Configurações específicas para React 19 (mesmo que no build)
            conditions: ['development'],
            mainFields: ['browser', 'module', 'main'],
            resolveExtensions: ['.tsx', '.ts', '.js'],
            // Garante que não há duplicação de dependências
            splitting: false,
            // Preserva nomes de funções e comportamento
            keepNames: true,
            // Remove otimizações que podem causar problemas com hooks
            treeShaking: true,
        });

        // Configura o watcher do esbuild
        await context.watch();
    } catch (error) {
        Console.error('Error starting watch mode:', error);
        throw error;
    }
}
/**
 * Remove todo o conteúdo de um diretório,
 * exceto a pasta (ou pastas) especificada(s) em excludeFolder.
 *
 * @param {string} dirPath - Caminho do diretório a limpar
 * @param {string|string[]} excludeFolder - Nome ou nomes das pastas a manter
 */
async function cleanDirectoryExcept(dirPath, excludeFolder) {
    const excludes = Array.isArray(excludeFolder) ? excludeFolder : [excludeFolder];

    const items = await readdir(dirPath);

    for (const item of items) {
        if (excludes.includes(item)) continue; // pula as pastas excluídas

        const itemPath = path.join(dirPath, item);
        const info = await stat(itemPath);

        await rm(itemPath, { recursive: info.isDirectory(), force: true });
    }
}
module.exports = { build, watch, buildWithChunks, watchWithChunks };
