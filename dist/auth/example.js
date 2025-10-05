"use strict";
/**
 * Exemplo de como usar os novos providers baseados em classes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const routes_1 = require("./routes");
const providers_1 = require("./providers");
// Exemplo de configuração com os novos providers
const authConfig = {
    providers: [
        // Provider de credenciais customizado
        new providers_1.CredentialsProvider({
            name: "Login com Email",
            credentials: {
                email: {
                    label: "Email",
                    type: "email",
                    placeholder: "seu@email.com"
                },
                password: {
                    label: "Senha",
                    type: "password"
                }
            },
            async authorize(credentials) {
                // Aqui você faz a validação com seu banco de dados
                const { email, password } = credentials;
                // Exemplo de validação (substitua pela sua lógica)
                if (email === "admin@example.com" && password === "123456") {
                    return {
                        id: "1",
                        name: "Admin User",
                        email: email,
                        role: "admin"
                    };
                }
                // Retorna null se credenciais inválidas
                return null;
            }
        }),
        // Provider do Discord
        new providers_1.DiscordProvider({
            clientId: process.env.DISCORD_CLIENT_ID,
            clientSecret: process.env.DISCORD_CLIENT_SECRET,
            callbackUrl: "http://localhost:3000/api/auth/callback/discord"
        })
    ],
    secret: process.env.HWEB_AUTH_SECRET || "seu-super-secret-aqui-32-chars-min",
    session: {
        strategy: 'jwt',
        maxAge: 86400 // 24 horas
    },
    pages: {
        signIn: '/auth/signin',
        signOut: '/auth/signout'
    },
    callbacks: {
        async signIn(user, account, profile) {
            // Lógica customizada antes do login
            console.log(`Usuário ${user.email} fazendo login via ${account.provider}`);
            return true; // permitir login
        },
        async session(session, user) {
            // Adicionar dados customizados à sessão
            return {
                ...session,
                user: {
                    ...session.user,
                    customData: "dados extras"
                }
            };
        }
    }
};
// Criar as rotas de autenticação
exports.authRoutes = (0, routes_1.createAuthRoutes)(authConfig);
/**
 * Como usar em suas rotas API:
 *
 * // arquivo: /api/auth/[...value].ts
 * import { authRoutes } from '../../../src/auth/example';
 *
 * export const GET = authRoutes.GET;
 * export const POST = authRoutes.POST;
 */
/**
 * Rotas disponíveis automaticamente:
 *
 * Core routes:
 * - GET  /api/auth/session - Obter sessão atual
 * - GET  /api/auth/providers - Listar providers
 * - GET  /api/auth/csrf - Obter token CSRF
 * - POST /api/auth/signin - Login
 * - POST /api/auth/signout - Logout
 *
 * Provider específico (CredentialsProvider):
 * - GET  /api/auth/credentials/config - Config do provider
 *
 * Provider específico (DiscordProvider):
 * - GET  /api/auth/signin/discord - Iniciar OAuth Discord
 * - GET  /api/auth/callback/discord - Callback OAuth Discord
 * - GET  /api/auth/discord/config - Config do provider Discord
 */
