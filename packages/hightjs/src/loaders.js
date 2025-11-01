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

const fs = require('fs');

/**
 * Registra loaders customizados para Node.js
 * Permite importar arquivos não-JS diretamente no servidor
 */
function registerLoaders() {
    // Loader para arquivos Markdown (.md)
    require.extensions['.md'] = function (module, filename) {
        const content = fs.readFileSync(filename, 'utf8');
        module.exports = content;
    };

    // Loader para arquivos de texto (.txt)
    require.extensions['.txt'] = function (module, filename) {
        const content = fs.readFileSync(filename, 'utf8');
        module.exports = content;
    };

    // Loader para arquivos JSON (já existe nativamente, mas garantimos consistência)
    // require.extensions['.json'] já existe

    // Loader para imagens - retorna o caminho do arquivo
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.ico', '.bmp', '.svg'];

    imageExtensions.forEach(ext => {
        require.extensions[ext] = function (module, filename) {
            // No servidor, retornamos o caminho do arquivo
            // O frontend usará o plugin do esbuild para converter em base64
            module.exports = filename;
        };
    });
}

module.exports = { registerLoaders };

