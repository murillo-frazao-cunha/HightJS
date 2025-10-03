"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CredentialsProvider = CredentialsProvider;
/**
 * Provider para autenticação com credenciais (email/senha)
 */
function CredentialsProvider(config) {
    return {
        id: config.id || 'credentials',
        name: config.name || 'Credentials',
        type: 'credentials',
        authorize: config.authorize
    };
}
