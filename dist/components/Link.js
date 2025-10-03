"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Link = Link;
const jsx_runtime_1 = require("react/jsx-runtime");
const clientRouter_1 = require("../client/clientRouter");
function Link({ href, children, ...props }) {
    const handleClick = async (e) => {
        e.preventDefault();
        // Usa o novo sistema de router
        await clientRouter_1.router.push(href);
    };
    return ((0, jsx_runtime_1.jsx)("a", { href: href, ...props, onClick: handleClick, children: children }));
}
