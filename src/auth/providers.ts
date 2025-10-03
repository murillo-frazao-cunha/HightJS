import type { AuthProvider, CredentialsConfig } from './types';

/**
 * Provider para autenticação com credenciais (email/senha)
 */
export function CredentialsProvider(config: CredentialsConfig): AuthProvider {
    return {
        id: config.id || 'credentials',
        name: config.name || 'Credentials',
        type: 'credentials',
        authorize: config.authorize
    };
}
