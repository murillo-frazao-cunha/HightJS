"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.render = render;
const router_1 = require("./router");
// Funções para codificar/decodificar dados (disfarça o JSON no HTML)
function encodeInitialData(data) {
    // Converte para JSON, depois para base64, e adiciona um prefixo fake
    const jsonStr = JSON.stringify(data);
    const base64 = Buffer.from(jsonStr).toString('base64');
    return `hweb_${base64}_config`;
}
function createDecodeScript() {
    return `
    window.__HWEB_DECODE__ = function(encoded) {
        const base64 = encoded.replace('hweb_', '').replace('_config', '');
        const jsonStr = atob(base64);
        return JSON.parse(jsonStr);
    };
    `;
}
async function render({ req, route, params, allRoutes }) {
    const { generateMetadata } = route;
    // Pega a opção dev e hot reload manager do req
    const isProduction = !req.hwebDev;
    const hotReloadManager = req.hotReloadManager;
    // Pega o layout se existir
    const layout = (0, router_1.getLayout)();
    let metadata = { title: 'App hweb' };
    // Primeiro usa o metadata do layout se existir
    if (layout && layout.metadata) {
        metadata = { ...metadata, ...layout.metadata };
    }
    // Depois sobrescreve com metadata específico da rota se existir
    if (generateMetadata) {
        const routeMetadata = await Promise.resolve(generateMetadata(params, req));
        metadata = { ...metadata, ...routeMetadata };
    }
    // Prepara os dados para injetar na janela do navegador
    const initialData = {
        routes: allRoutes.map(r => ({ pattern: r.pattern, componentPath: r.componentPath })),
        initialComponentPath: route.componentPath,
        initialParams: params,
    };
    // Codifica os dados para disfarçar
    const encodedData = encodeInitialData(initialData);
    // Scripts do React servidos do node_modules em vez de CDN
    const reactScripts = `<!-- Scripts do React (Local) -->
      <script src="/hweb-react/react.js"></script>
      <script src="/hweb-react/react-dom.js"></script>`;
    // Script de hot reload apenas em desenvolvimento
    const hotReloadScript = !isProduction && hotReloadManager
        ? hotReloadManager.getClientScript()
        : '';
    // HTML base sem SSR - apenas o container e scripts para client-side rendering
    // O layout será renderizado no CLIENTE, não no servidor
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${metadata.title || 'App hweb'}</title>
  ${metadata.description ? `<meta name="description" content="${metadata.description}">` : ''}
</head>
<body>
  <!-- Container vazio - o React vai renderizar aqui no cliente -->
  <div id="root"></div>

  <!-- Dados iniciais codificados (disfarçados) -->
  <script>
    ${createDecodeScript()}
    window.__HWEB_INITIAL_DATA__ = window.__HWEB_DECODE__('${encodedData}');
  </script>

  ${reactScripts}

  <!-- Script principal - vai fazer o render inicial no cliente -->
  <script src="/hweb-dist/main.js"></script>

  ${hotReloadScript}
</body>
</html>`;
}
