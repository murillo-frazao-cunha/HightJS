"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuestOnly = exports.AuthGuard = exports.ProtectedRoute = exports.SessionProvider = exports.useAuth = exports.useSession = exports.getSession = void 0;
// Exportações do frontend
__exportStar(require("../react"), exports);
__exportStar(require("../client"), exports);
__exportStar(require("../components"), exports);
// Re-exports das funções mais usadas para conveniência
var client_1 = require("../client");
Object.defineProperty(exports, "getSession", { enumerable: true, get: function () { return client_1.getSession; } });
var react_1 = require("../react");
Object.defineProperty(exports, "useSession", { enumerable: true, get: function () { return react_1.useSession; } });
Object.defineProperty(exports, "useAuth", { enumerable: true, get: function () { return react_1.useAuth; } });
Object.defineProperty(exports, "SessionProvider", { enumerable: true, get: function () { return react_1.SessionProvider; } });
var components_1 = require("../components");
Object.defineProperty(exports, "ProtectedRoute", { enumerable: true, get: function () { return components_1.ProtectedRoute; } });
Object.defineProperty(exports, "AuthGuard", { enumerable: true, get: function () { return components_1.AuthGuard; } });
Object.defineProperty(exports, "GuestOnly", { enumerable: true, get: function () { return components_1.GuestOnly; } });
