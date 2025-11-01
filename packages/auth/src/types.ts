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

// Tipos para o sistema de autenticação
export type User = Record<string, any>;

export interface Session {
    user: User;
    expires: string;
    accessToken?: string;
}

// Client-side types
export interface SignInOptions {
    redirect?: boolean;
    callbackUrl?: string;
    [key: string]: any;
}

export interface SignInResult {
    error?: string;
    status?: number;
    ok?: boolean;
    url?: string;
}

export interface SessionContextType {
    data: Session | null;
    status: 'loading' | 'authenticated' | 'unauthenticated';
    signIn: (provider?: string, options?: SignInOptions) => Promise<SignInResult | undefined>;
    signOut: (options?: { callbackUrl?: string }) => Promise<void>;
    update: () => Promise<Session | null>;
}

export interface AuthRoute {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    path: string;
    handler: (req: any, params: any) => Promise<any>;
}

export interface AuthProviderClass {
    id: string;
    name: string;
    type: string;

    // Para providers OAuth - retorna URL de redirecionamento
    handleOauth?(credentials: Record<string, string>): Promise<string> | string;

    // Métodos principais
    handleSignIn(credentials: Record<string, string>): Promise<User | string | null>;
    handleSignOut?(): Promise<void>;

    // Rotas adicionais que o provider pode ter
    additionalRoutes?: AuthRoute[];

    // Configurações específicas do provider
    getConfig?(): any;
}

export interface AuthConfig {
    providers: AuthProviderClass[];
    pages?: {
        signIn?: string;
        signOut?: string;
        error?: string;
    };
    callbacks?: {
        signIn?: (user: User, account: any, profile: any) => boolean | Promise<boolean>;
        session?: ({session, user, provider}: {session: Session, user: User, provider: string}) => Session | Promise<Session>;
        jwt?: (token: any, user: User, account: any, profile: any) => any | Promise<any>;
    };
    session?: {
        strategy?: 'jwt' | 'database';
        maxAge?: number;
        updateAge?: number;
    };
    secret?: string;
    debug?: boolean;
    secureCookies?: boolean;
}



// Provider para credenciais
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
