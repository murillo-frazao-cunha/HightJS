"use strict";
const useClientRule = require('./use-client-rule');
module.exports = {
    rules: {
        'require-use-client': useClientRule,
    },
    configs: {
        recommended: {
            plugins: ['hightjs'],
            rules: {
                'hightjs/require-use-client': 'error',
            },
        },
    },
};
