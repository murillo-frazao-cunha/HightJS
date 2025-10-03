"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProtectedRoute = ProtectedRoute;
exports.AuthGuard = AuthGuard;
exports.GuestOnly = GuestOnly;
exports.useAuthRedirect = useAuthRedirect;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = __importDefault(require("react"));
const react_2 = require("./react");
const clientRouter_1 = require("../client/clientRouter");
/**
 * Componente para proteger rotas que requerem autenticação
 */
function ProtectedRoute({ children, fallback, redirectTo = '/auth/signin', requireAuth = true }) {
    const { isAuthenticated, isLoading } = (0, react_2.useAuth)();
    // Ainda carregando
    if (isLoading) {
        return fallback || (0, jsx_runtime_1.jsx)("div", { children: "Carregando..." });
    }
    // Requer auth mas não está autenticado
    if (requireAuth && !isAuthenticated) {
        if (typeof window !== 'undefined' && redirectTo) {
            window.location.href = redirectTo;
            return null;
        }
        return fallback || (0, jsx_runtime_1.jsx)("div", { children: "N\u00E3o autorizado" });
    }
    // Não requer auth mas está autenticado (ex: página de login)
    if (!requireAuth && isAuthenticated && redirectTo) {
        if (typeof window !== 'undefined') {
            window.location.href = redirectTo;
            return null;
        }
    }
    return (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: children });
}
/**
 * Guard simples que só renderiza children se estiver autenticado
 */
function AuthGuard({ children, fallback, redirectTo }) {
    const { isAuthenticated, isLoading } = (0, react_2.useAuth)();
    if (redirectTo && !isLoading && !isAuthenticated) {
        clientRouter_1.router.push(redirectTo);
    }
    if (isLoading) {
        return fallback || (0, jsx_runtime_1.jsx)("div", {});
    }
    if (!isAuthenticated) {
        return fallback || null;
    }
    return (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: children });
}
/**
 * Componente para mostrar conteúdo apenas para usuários não autenticados
 */
function GuestOnly({ children, fallback, redirectTo }) {
    const { isAuthenticated, isLoading } = (0, react_2.useAuth)();
    if (redirectTo && !isLoading && isAuthenticated) {
        clientRouter_1.router.push(redirectTo);
    }
    if (isLoading || isAuthenticated) {
        return fallback || (0, jsx_runtime_1.jsx)("div", {});
    }
    return (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: children });
}
/**
 * Hook para redirecionar baseado no status de autenticação
 */
function useAuthRedirect(authenticatedRedirect, unauthenticatedRedirect) {
    const { isAuthenticated, isLoading } = (0, react_2.useAuth)();
    react_1.default.useEffect(() => {
        if (isLoading)
            return;
        if (isAuthenticated && authenticatedRedirect) {
            window.location.href = authenticatedRedirect;
        }
        else if (!isAuthenticated && unauthenticatedRedirect) {
            window.location.href = unauthenticatedRedirect;
        }
    }, [isAuthenticated, isLoading, authenticatedRedirect, unauthenticatedRedirect]);
}
