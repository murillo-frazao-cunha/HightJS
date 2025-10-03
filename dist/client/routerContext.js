"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouterProvider = RouterProvider;
exports.useRouter = useRouter;
exports.usePathname = usePathname;
exports.useSearchParams = useSearchParams;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const clientRouter_1 = require("./clientRouter");
const RouterContext = (0, react_1.createContext)(null);
function RouterProvider({ children }) {
    const [pathname, setPathname] = (0, react_1.useState)(clientRouter_1.router.pathname);
    const [query, setQuery] = (0, react_1.useState)(clientRouter_1.router.query);
    (0, react_1.useEffect)(() => {
        const updateRoute = () => {
            setPathname(clientRouter_1.router.pathname);
            setQuery(clientRouter_1.router.query);
        };
        // Subscribe to router changes
        const unsubscribe = clientRouter_1.router.subscribe(updateRoute);
        // Also listen to browser back/forward
        window.addEventListener('popstate', updateRoute);
        return () => {
            unsubscribe();
            window.removeEventListener('popstate', updateRoute);
        };
    }, []);
    const value = {
        pathname,
        query,
        push: clientRouter_1.router.push.bind(clientRouter_1.router),
        replace: clientRouter_1.router.replace.bind(clientRouter_1.router),
        back: clientRouter_1.router.back.bind(clientRouter_1.router),
        forward: clientRouter_1.router.forward.bind(clientRouter_1.router),
        refresh: clientRouter_1.router.refresh.bind(clientRouter_1.router),
    };
    return ((0, jsx_runtime_1.jsx)(RouterContext.Provider, { value: value, children: children }));
}
/**
 * Hook para acessar o router dentro de componentes React
 */
function useRouter() {
    const context = (0, react_1.useContext)(RouterContext);
    if (!context) {
        throw new Error('useRouter deve ser usado dentro de um RouterProvider');
    }
    return context;
}
/**
 * Hook para acessar apenas o pathname atual
 */
function usePathname() {
    const { pathname } = useRouter();
    return pathname;
}
/**
 * Hook para acessar apenas os query parameters
 */
function useSearchParams() {
    const { query } = useRouter();
    return query;
}
