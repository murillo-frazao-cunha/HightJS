// Tipos para o sistema de autenticação
export type User = Record<string, any>;

export interface Session {
    user: User;
    expires: string;
    accessToken?: string;
}

export interface AuthConfig {
    providers: AuthProvider[];
    pages?: {
        signIn?: string;
        signOut?: string;
        error?: string;
    };
    callbacks?: {
        signIn?: (user: User, account: any, profile: any) => boolean | Promise<boolean>;
        session?: (session: Session, user: User) => Session | Promise<Session>;
        jwt?: (token: any, user: User, account: any, profile: any) => any | Promise<any>;
    };
    session?: {
        strategy?: 'jwt' | 'database';
        maxAge?: number;
        updateAge?: number;
    };
    secret?: string;
    debug?: boolean;
}

export interface AuthProvider {
    id: string;
    name: string;
    type: 'credentials';
    authorize?: (credentials: Record<string, string>) => Promise<User | null> | User | null;
}

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




