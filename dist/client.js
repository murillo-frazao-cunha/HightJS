"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = exports.Link = void 0;
// Este arquivo exporta apenas código seguro para o cliente (navegador)
var Link_1 = require("./components/Link");
Object.defineProperty(exports, "Link", { enumerable: true, get: function () { return Link_1.Link; } });
var clientRouter_1 = require("./client/clientRouter");
Object.defineProperty(exports, "router", { enumerable: true, get: function () { return clientRouter_1.router; } });
