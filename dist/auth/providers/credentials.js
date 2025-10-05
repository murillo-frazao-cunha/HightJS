"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CredentialsProvider = void 0;
const http_1 = require("../../api/http");
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
        /**
         * Rotas adicionais específicas do provider (opcional)
         */
        this.additionalRoutes = [
            {
                method: 'GET',
                path: '/api/auth/credentials/config',
                handler: async (req, params) => {
                    // Retorna configuração das credenciais (sem dados sensíveis)
                    const safeConfig = {
                        id: this.id,
                        name: this.name,
                        type: this.type,
                        credentials: Object.entries(this.config.credentials).reduce((acc, [key, field]) => {
                            acc[key] = {
                                label: field.label,
                                type: field.type,
                                placeholder: field.placeholder
                            };
                            return acc;
                        }, {})
                    };
                    return http_1.HightJSResponse.json({ config: safeConfig });
                }
            }
        ];
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
     * Método opcional para logout (pode ser sobrescrito se necessário)
     */
    async handleSignOut() {
        // Credentials provider não precisa fazer nada específico no logout
        // O core já cuida de limpar cookies e tokens
        console.log(`[${this.id} Provider] User signed out`);
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
