import type { AuthProviderClass, User, AuthRoute } from '../types';
import { HightJSRequest, HightJSResponse } from '../../api/http';

export interface CredentialsConfig {
    id?: string;
    name?: string;
    credentials: Record<string, {
        label: string;
        type: string;
        placeholder?: string;
    }>;
    authorize: (credentials: Record<string, string>) => Promise<User | null> | User | null;
}

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
export class CredentialsProvider implements AuthProviderClass {
    public readonly id: string;
    public readonly name: string;
    public readonly type: string = 'credentials';

    private config: CredentialsConfig;

    constructor(config: CredentialsConfig) {
        this.config = config;
        this.id = config.id || 'credentials';
        this.name = config.name || 'Credentials';
    }

    /**
     * Método principal para autenticar usuário com credenciais
     */
    async handleSignIn(credentials: Record<string, string>): Promise<User | null> {
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

        } catch (error) {
            console.error(`[${this.id} Provider] Error during sign in:`, error);
            return null;
        }
    }

    /**
     * Método opcional para logout (pode ser sobrescrito se necessário)
     */
    async handleSignOut?(): Promise<void> {
        // Credentials provider não precisa fazer nada específico no logout
        // O core já cuida de limpar cookies e tokens
        console.log(`[${this.id} Provider] User signed out`);
    }

    /**
     * Rotas adicionais específicas do provider (opcional)
     */
    public additionalRoutes?: AuthRoute[] = [
        {
            method: 'GET',
            path: '/api/auth/credentials/config',
            handler: async (req: HightJSRequest, params: any) => {
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
                    }, {} as Record<string, any>)
                };

                return HightJSResponse.json({ config: safeConfig });
            }
        }
    ];

    /**
     * Retorna configuração pública do provider
     */
    getConfig(): any {
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
    validateCredentials(credentials: Record<string, string>): boolean {
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
    private isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}
