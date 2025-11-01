/*
 * This file is part of the HightJS Project.
 * Copyright (c) 2025 itsmuzin
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
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
