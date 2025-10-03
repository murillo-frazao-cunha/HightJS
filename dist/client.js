"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouterProvider = exports.useSearchParams = exports.usePathname = exports.useRouter = exports.router = exports.Link = void 0;
// Este arquivo exporta apenas código seguro para o cliente (navegador)
var Link_1 = require("./components/Link");
Object.defineProperty(exports, "Link", { enumerable: true, get: function () { return Link_1.Link; } });
var clientRouter_1 = require("./client/clientRouter");
Object.defineProperty(exports, "router", { enumerable: true, get: function () { return clientRouter_1.router; } });
var routerContext_1 = require("./client/routerContext");
Object.defineProperty(exports, "useRouter", { enumerable: true, get: function () { return routerContext_1.useRouter; } });
Object.defineProperty(exports, "usePathname", { enumerable: true, get: function () { return routerContext_1.usePathname; } });
Object.defineProperty(exports, "useSearchParams", { enumerable: true, get: function () { return routerContext_1.useSearchParams; } });
Object.defineProperty(exports, "RouterProvider", { enumerable: true, get: function () { return routerContext_1.RouterProvider; } });
