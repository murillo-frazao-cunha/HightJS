"use strict";
/**
 * ESLint rule: require-use-client
 * Força o uso de "use client" quando React ou hooks são importados
 */
module.exports = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Require "use client" directive when importing React or React hooks',
            category: 'Best Practices',
            recommended: true,
        },
        fixable: 'code',
        schema: [],
        messages: {
            missingUseClient: 'Arquivos que importam React ou hooks devem começar com "use client"',
        },
    },
    create(context) {
        let hasReactImport = false;
        let hasReactHooks = false;
        let hasUseClient = false;
        let firstNode = null;
        // Lista de hooks do React que requerem "use client"
        const reactHooks = [
            'useState', 'useEffect', 'useContext', 'useReducer',
            'useCallback', 'useMemo', 'useRef', 'useImperativeHandle',
            'useLayoutEffect', 'useDebugValue', 'useDeferredValue',
            'useTransition', 'useId', 'useSyncExternalStore',
            'useInsertionEffect'
        ];
        return {
            Program(node) {
                firstNode = node;
                // Verifica se já tem "use client" no início do arquivo
                const sourceCode = context.getSourceCode();
                const firstToken = sourceCode.getFirstToken(node);
                if (firstToken && firstToken.type === 'String') {
                    const value = firstToken.value;
                    if (value === '"use client"' || value === "'use client'") {
                        hasUseClient = true;
                    }
                }
                // Também verifica comentários
                const comments = sourceCode.getAllComments();
                if (comments.length > 0) {
                    const firstComment = comments[0];
                    if (firstComment.value.trim() === 'use client') {
                        hasUseClient = true;
                    }
                }
            },
            ImportDeclaration(node) {
                const source = node.source.value;
                // Verifica se importa do React
                if (source === 'react' || source === 'react/jsx-runtime') {
                    hasReactImport = true;
                    // Verifica se importa hooks específicos
                    if (node.specifiers) {
                        for (const specifier of node.specifiers) {
                            if (specifier.type === 'ImportSpecifier' &&
                                reactHooks.includes(specifier.imported.name)) {
                                hasReactHooks = true;
                                break;
                            }
                        }
                    }
                }
            },
            CallExpression(node) {
                // Verifica se usa hooks do React diretamente
                if (node.callee.type === 'Identifier' &&
                    reactHooks.includes(node.callee.name)) {
                    hasReactHooks = true;
                }
                // Verifica se usa React.useState, React.useEffect, etc.
                if (node.callee.type === 'MemberExpression' &&
                    node.callee.object.name === 'React' &&
                    reactHooks.includes(node.callee.property.name)) {
                    hasReactHooks = true;
                }
            },
            'Program:exit'() {
                // Se importa React ou usa hooks mas não tem "use client"
                if ((hasReactImport || hasReactHooks) && !hasUseClient) {
                    context.report({
                        node: firstNode,
                        messageId: 'missingUseClient',
                        fix(fixer) {
                            // Auto-fix: adiciona "use client" no início do arquivo
                            return fixer.insertTextBefore(firstNode, '"use client";\n\n');
                        }
                    });
                }
            }
        };
    },
};
