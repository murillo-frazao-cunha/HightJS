import type { AuthProviderClass, User, AuthRoute } from '../types';
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
export declare class CredentialsProvider implements AuthProviderClass {
    readonly id: string;
    readonly name: string;
    readonly type: string;
    private config;
    constructor(config: CredentialsConfig);
    /**
     * Método principal para autenticar usuário com credenciais
     */
    handleSignIn(credentials: Record<string, string>): Promise<User | null>;
    /**
     * Método opcional para logout (pode ser sobrescrito se necessário)
     */
    handleSignOut?(): Promise<void>;
    /**
     * Rotas adicionais específicas do provider (opcional)
     */
    additionalRoutes?: AuthRoute[];
    /**
     * Retorna configuração pública do provider
     */
    getConfig(): any;
    /**
     * Valida se as credenciais fornecidas são válidas
     */
    validateCredentials(credentials: Record<string, string>): boolean;
    /**
     * Validação simples de email
     */
    private isValidEmail;
}
