"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DefaultNotFound;
const jsx_runtime_1 = require("react/jsx-runtime");
function DefaultNotFound() {
    return ((0, jsx_runtime_1.jsx)("div", { style: {
            fontFamily: 'system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
            height: '100vh',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
        }, children: (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("style", { dangerouslySetInnerHTML: {
                        __html: `
                        body {
    color: #000;
    /* Alterado de cor sólida para gradiente */
    background: linear-gradient(to bottom, #e9e9e9, #ffffff);
    margin: 0;
}

.next-error-h1 {
    border-right: 1px solid rgba(0, 0, 0, .3);
}

@media (prefers-color-scheme: dark) {
    body {
        color: #fff;
        /* Alterado de cor sólida para gradiente escuro */
        background: linear-gradient(to bottom, #222, #000);
    }

    .next-error-h1 {
        border-right: 1px solid rgba(255, 255, 255, .3);
    }
}
                    `
                    } }), (0, jsx_runtime_1.jsx)("h1", { className: "next-error-h1", style: {
                        display: 'inline-block',
                        margin: '0px 20px 0px 0px',
                        padding: '0px 23px 0px 0px',
                        fontSize: '24px',
                        fontWeight: '500',
                        verticalAlign: 'top',
                        lineHeight: '49px'
                    }, children: "404" }), (0, jsx_runtime_1.jsx)("div", { style: { display: 'inline-block' }, children: (0, jsx_runtime_1.jsx)("h2", { style: {
                            fontSize: '14px',
                            fontWeight: '400',
                            lineHeight: '49px',
                            margin: '0px'
                        }, children: "Esta p\u00E1gina n\u00E3o pode ser achada." }) })] }) }));
}
