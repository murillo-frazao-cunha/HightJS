"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorBoundary = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
class ErrorBoundary extends react_1.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError(error) {
        // Atualiza o state para que a próxima renderização mostre a UI de erro
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary capturou um erro:', error, errorInfo);
        this.setState({
            error,
            errorInfo
        });
    }
    render() {
        if (this.state.hasError) {
            return (0, jsx_runtime_1.jsx)(ErrorDisplay, { error: this.state.error, errorInfo: this.state.errorInfo });
        }
        return this.props.children;
    }
}
exports.ErrorBoundary = ErrorBoundary;
function ErrorDisplay({ error, errorInfo }) {
    const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return ((0, jsx_runtime_1.jsx)("div", { style: {
            fontFamily: 'system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            height: '100vh',
            padding: '20px',
            backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
            color: isDark ? '#fafafa' : '#171717',
            overflow: 'auto'
        }, children: (0, jsx_runtime_1.jsxs)("div", { style: {
                maxWidth: '800px',
                margin: '0 auto',
                paddingTop: '40px'
            }, children: [(0, jsx_runtime_1.jsxs)("div", { style: {
                        borderBottom: `1px solid ${isDark ? '#262626' : '#e5e5e5'}`,
                        paddingBottom: '20px',
                        marginBottom: '30px'
                    }, children: [(0, jsx_runtime_1.jsx)("h1", { style: {
                                fontSize: '24px',
                                fontWeight: '600',
                                margin: '0 0 10px 0',
                                color: '#dc2626'
                            }, children: "\u274C Erro na Aplica\u00E7\u00E3o" }), (0, jsx_runtime_1.jsx)("p", { style: {
                                fontSize: '16px',
                                margin: '0',
                                color: isDark ? '#a3a3a3' : '#737373'
                            }, children: "Ocorreu um erro inesperado na aplica\u00E7\u00E3o. Veja os detalhes abaixo:" })] }), (0, jsx_runtime_1.jsxs)("div", { style: {
                        backgroundColor: isDark ? '#1c1917' : '#fef2f2',
                        border: `1px solid ${isDark ? '#451a03' : '#fecaca'}`,
                        borderRadius: '8px',
                        padding: '20px',
                        marginBottom: '20px'
                    }, children: [(0, jsx_runtime_1.jsx)("h2", { style: {
                                fontSize: '18px',
                                fontWeight: '600',
                                margin: '0 0 10px 0',
                                color: '#dc2626'
                            }, children: "Mensagem do Erro:" }), (0, jsx_runtime_1.jsx)("p", { style: {
                                fontSize: '14px',
                                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                                backgroundColor: isDark ? '#0c0a09' : '#ffffff',
                                padding: '15px',
                                borderRadius: '6px',
                                border: `1px solid ${isDark ? '#292524' : '#e5e5e5'}`,
                                margin: '0',
                                whiteSpace: 'pre-wrap',
                                overflow: 'auto'
                            }, children: error?.message || 'Erro desconhecido' })] }), error?.stack && ((0, jsx_runtime_1.jsxs)("div", { style: {
                        backgroundColor: isDark ? '#0c0a09' : '#fafafa',
                        border: `1px solid ${isDark ? '#292524' : '#e5e5e5'}`,
                        borderRadius: '8px',
                        padding: '20px',
                        marginBottom: '20px'
                    }, children: [(0, jsx_runtime_1.jsx)("h2", { style: {
                                fontSize: '18px',
                                fontWeight: '600',
                                margin: '0 0 10px 0',
                                color: isDark ? '#fafafa' : '#171717'
                            }, children: "Stack Trace:" }), (0, jsx_runtime_1.jsx)("pre", { style: {
                                fontSize: '12px',
                                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                                backgroundColor: isDark ? '#1c1917' : '#ffffff',
                                padding: '15px',
                                borderRadius: '6px',
                                border: `1px solid ${isDark ? '#44403c' : '#d4d4d4'}`,
                                margin: '0',
                                overflow: 'auto',
                                whiteSpace: 'pre-wrap',
                                color: isDark ? '#e5e5e5' : '#525252'
                            }, children: error.stack })] })), errorInfo?.componentStack && ((0, jsx_runtime_1.jsxs)("div", { style: {
                        backgroundColor: isDark ? '#0c0a09' : '#fafafa',
                        border: `1px solid ${isDark ? '#292524' : '#e5e5e5'}`,
                        borderRadius: '8px',
                        padding: '20px',
                        marginBottom: '20px'
                    }, children: [(0, jsx_runtime_1.jsx)("h2", { style: {
                                fontSize: '18px',
                                fontWeight: '600',
                                margin: '0 0 10px 0',
                                color: isDark ? '#fafafa' : '#171717'
                            }, children: "Component Stack:" }), (0, jsx_runtime_1.jsx)("pre", { style: {
                                fontSize: '12px',
                                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                                backgroundColor: isDark ? '#1c1917' : '#ffffff',
                                padding: '15px',
                                borderRadius: '6px',
                                border: `1px solid ${isDark ? '#44403c' : '#d4d4d4'}`,
                                margin: '0',
                                overflow: 'auto',
                                whiteSpace: 'pre-wrap',
                                color: isDark ? '#e5e5e5' : '#525252'
                            }, children: errorInfo.componentStack })] })), (0, jsx_runtime_1.jsxs)("div", { style: {
                        display: 'flex',
                        gap: '10px',
                        marginTop: '30px'
                    }, children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => window.location.reload(), style: {
                                backgroundColor: '#2563eb',
                                color: '#ffffff',
                                border: 'none',
                                padding: '12px 20px',
                                borderRadius: '6px',
                                fontSize: '14px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s'
                            }, onMouseEnter: (e) => {
                                e.currentTarget.style.backgroundColor = '#1d4ed8';
                            }, onMouseLeave: (e) => {
                                e.currentTarget.style.backgroundColor = '#2563eb';
                            }, children: "\uD83D\uDD04 Recarregar P\u00E1gina" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => {
                                navigator.clipboard?.writeText(`
Erro: ${error?.message || 'Erro desconhecido'}

Stack Trace:
${error?.stack || 'N/A'}

Component Stack:
${errorInfo?.componentStack || 'N/A'}
                            `.trim());
                                alert('Detalhes do erro copiados para a área de transferência!');
                            }, style: {
                                backgroundColor: isDark ? '#374151' : '#f3f4f6',
                                color: isDark ? '#fafafa' : '#171717',
                                border: `1px solid ${isDark ? '#4b5563' : '#d1d5db'}`,
                                padding: '12px 20px',
                                borderRadius: '6px',
                                fontSize: '14px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s'
                            }, onMouseEnter: (e) => {
                                e.currentTarget.style.backgroundColor = isDark ? '#4b5563' : '#e5e7eb';
                            }, onMouseLeave: (e) => {
                                e.currentTarget.style.backgroundColor = isDark ? '#374151' : '#f3f4f6';
                            }, children: "\uD83D\uDCCB Copiar Detalhes" })] }), (0, jsx_runtime_1.jsxs)("div", { style: {
                        marginTop: '40px',
                        padding: '20px',
                        backgroundColor: isDark ? '#1e1b1a' : '#f8fafc',
                        border: `1px solid ${isDark ? '#3c2e2a' : '#e2e8f0'}`,
                        borderRadius: '8px'
                    }, children: [(0, jsx_runtime_1.jsx)("h3", { style: {
                                fontSize: '16px',
                                fontWeight: '600',
                                margin: '0 0 10px 0',
                                color: isDark ? '#fbbf24' : '#d97706'
                            }, children: "\uD83D\uDCA1 Para Desenvolvedores:" }), (0, jsx_runtime_1.jsxs)("ul", { style: {
                                fontSize: '14px',
                                margin: '0',
                                paddingLeft: '20px',
                                color: isDark ? '#d1d5db' : '#4b5563'
                            }, children: [(0, jsx_runtime_1.jsx)("li", { children: "Verifique o console do navegador para mais detalhes" }), (0, jsx_runtime_1.jsx)("li", { children: "Verifique se todos os arquivos foram buildados corretamente" }), (0, jsx_runtime_1.jsx)("li", { children: "Se for erro 404 em main.js, verifique se o servidor est\u00E1 rodando" }), (0, jsx_runtime_1.jsx)("li", { children: "Use as ferramentas de desenvolvimento do navegador para debugar" })] })] })] }) }));
}
