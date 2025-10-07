"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CredentialsProvider = void 0;
/**
 * Provider para autenticação com credenciais (email/senha)
 *
 * Este provider permite autenticação usando email/senha ou qualquer outro
 * sistema de credenciais customizado. Você define a função authorize
 * que será chamada para validar as credenciais.
 *
 * Exemplo de uso:
 * ```typescript
 * new CredentialsProvider({
 *   name: "Credentials",
 *   credentials: {
 *     email: { label: "Email", type: "email" },
 *     password: { label: "Password", type: "password" }
 *   },
 *   async authorize(credentials) {
 *     // Aqui você faz a validação com seu banco de dados
 *     const user = await validateUser(credentials.email, credentials.password);
 *     if (user) {
 *       return { id: user.id, name: user.name, email: user.email };
 *     }
 *     return null;
 *   }
 * })
 * ```
 */
class CredentialsProvider {
    constructor(config) {
        this.type = 'credentials';
        this.config = config;
        this.id = config.id || 'credentials';
        this.name = config.name || 'Credentials';
    }
    /**
     * Método principal para autenticar usuário com credenciais
     */
    async handleSignIn(credentials) {
        try {
            if (!this.config.authorize) {
                throw new Error('Authorize function not provided');
            }
            const user = await this.config.authorize(credentials);
            if (!user) {
                return null;
            }
            // Adiciona informações do provider ao usuário
            return {
                ...user,
                provider: this.id,
                providerId: user.id || user.email || 'unknown'
            };
        }
        catch (error) {
            console.error(`[${this.id} Provider] Error during sign in:`, error);
            return null;
        }
    }
    /**
     * Retorna configuração pública do provider
     */
    getConfig() {
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            credentials: this.config.credentials
        };
    }
    /**
     * Valida se as credenciais fornecidas são válidas
     */
    validateCredentials(credentials) {
        for (const [key, field] of Object.entries(this.config.credentials)) {
            if (!credentials[key]) {
                console.warn(`[${this.id} Provider] Missing required credential: ${key}`);
                return false;
            }
            // Validações básicas por tipo
            if (field.type === 'email' && !this.isValidEmail(credentials[key])) {
                console.warn(`[${this.id} Provider] Invalid email format: ${credentials[key]}`);
                return false;
            }
        }
        return true;
    }
    /**
     * Validação simples de email
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}
exports.CredentialsProvider = CredentialsProvider;
