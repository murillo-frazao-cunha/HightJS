"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
function Home() {
    return ((0, jsx_runtime_1.jsx)("h1", { children: "OL\u00C1 MUNDINHO MEU AMIGUINHO, VAMOS TRANSA?" }));
}
exports.config = {
    pattern: '/',
    component: Home,
    generateMetadata: () => ({
        title: 'HightJS | Home'
    })
};
exports.default = exports.config;
