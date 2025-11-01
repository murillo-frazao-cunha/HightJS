import {CredentialsProvider, createAuthRoutes, User, AuthConfig} from '@hightjs/auth';


export const authConfig: AuthConfig = {
    providers: [
        new CredentialsProvider({
            authorize(credentials: Record<string, string>): Promise<User | null> | User | null {
                if (credentials.username === 'jsmith' && credentials.password === 'password123') {
                    return {
                        id: '1',
                        name: 'John Smith',
                        email: 'john.smith@gmail.com'
                    }
                }
                return null;
            },
            credentials: {
                username: { label: "Username", type: "text", placeholder: "jsmith" },
                password: { label: "Password", type: "password" }
            }
        })
    ],

    session: {
        strategy: 'jwt',
        maxAge: 24 * 60 * 60, // 24 horas
    },

    pages: {
        signIn: '/login',
        signOut: '/'
    },
    callbacks: {
        async session({session, provider}) {
            return session;
        }
    },
    secret: 'hweb-test-secret-key-change-in-production'
};

export const authRoutes = createAuthRoutes(authConfig);
