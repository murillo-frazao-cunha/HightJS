"use strict";
/**
 * TypeScript Plugin: require-use-client
 * Integra a validação "use client" diretamente no TypeScript
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = createPlugin;
const defaultConfig = {
    enabled: true,
    severity: 'error'
};
function isReactImport(node) {
    if (!node.moduleSpecifier || node.moduleSpecifier.kind !== 10) { // StringLiteral = 10
        return false;
    }
    const moduleName = node.moduleSpecifier.text;
    return moduleName === 'react' || moduleName === 'react/jsx-runtime';
}
function hasReactHooks(node) {
    if (!isReactImport(node) || !node.importClause) {
        return false;
    }
    const reactHooks = [
        'useState', 'useEffect', 'useContext', 'useReducer',
        'useCallback', 'useMemo', 'useRef', 'useImperativeHandle',
        'useLayoutEffect', 'useDebugValue', 'useDeferredValue',
        'useTransition', 'useId', 'useSyncExternalStore',
        'useInsertionEffect'
    ];
    if (node.importClause.namedBindings && node.importClause.namedBindings.kind === 271) { // NamedImports = 271
        return node.importClause.namedBindings.elements.some((element) => reactHooks.includes(element.name.text));
    }
    return false;
}
function hasUseClientDirective(sourceFile) {
    // Verifica se a primeira statement é uma expressão "use client"
    if (sourceFile.statements.length === 0)
        return false;
    const firstStatement = sourceFile.statements[0];
    if (firstStatement.kind === 233 && // ExpressionStatement = 233
        firstStatement.expression.kind === 10) { // StringLiteral = 10
        const value = firstStatement.expression.text;
        return value === 'use client';
    }
    return false;
}
function isBackendFile(fileName) {
    // Verifica se o arquivo está no diretório backend
    return fileName.includes('/backend/') || fileName.includes('\\backend\\');
}
function isFrontendFile(fileName) {
    // Verifica se é um arquivo frontend (não backend e dentro de src/web)
    const isInWebDir = fileName.includes('/src/web/') || fileName.includes('\\src\\web\\');
    const isNotBackend = !isBackendFile(fileName);
    const isReactFile = fileName.endsWith('.tsx') || fileName.endsWith('.jsx');
    return isInWebDir && isNotBackend && isReactFile;
}
function createDiagnostic(sourceFile, severity, start = 0, length = 1) {
    const category = severity === 'error' ? 1 : 0; // Error = 1, Warning = 0
    return {
        file: sourceFile,
        start,
        length,
        messageText: 'Arquivos que importam React ou hooks devem começar com "use client"',
        category,
        code: 9001, // Código customizado para o plugin HightJS
        source: 'hightjs'
    };
}
function createPlugin(info) {
    const config = { ...defaultConfig, ...info.config };
    if (!config.enabled) {
        return info.languageService;
    }
    const proxy = Object.create(null);
    // Proxy todas as funções do language service
    for (let k of Object.keys(info.languageService)) {
        const x = info.languageService[k];
        proxy[k] = (...args) => x.apply(info.languageService, args);
    }
    // Sobrescreve getSemanticDiagnostics para adicionar nossa validação
    proxy.getSemanticDiagnostics = (fileName) => {
        const originalDiagnostics = info.languageService.getSemanticDiagnostics(fileName);
        // Só valida arquivos frontend
        if (!isFrontendFile(fileName)) {
            return originalDiagnostics;
        }
        const sourceFile = info.languageService.getProgram()?.getSourceFile(fileName);
        if (!sourceFile) {
            return originalDiagnostics;
        }
        let hasReactImportOrHooks = false;
        // Verifica se há imports do React ou hooks
        function visitNode(node) {
            if (node.kind === 270) { // ImportDeclaration = 270
                if (isReactImport(node) || hasReactHooks(node)) {
                    hasReactImportOrHooks = true;
                }
            }
            node.forEachChild?.(visitNode);
        }
        visitNode(sourceFile);
        // Se usa React mas não tem "use client", adiciona diagnóstico
        if (hasReactImportOrHooks && !hasUseClientDirective(sourceFile)) {
            const diagnostic = createDiagnostic(sourceFile, config.severity, 0, 1);
            return [...originalDiagnostics, diagnostic];
        }
        return originalDiagnostics;
    };
    return proxy;
}
// Para compatibilidade com diferentes versões do TypeScript
module.exports = createPlugin;
