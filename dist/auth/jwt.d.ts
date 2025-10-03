import type { User, Session } from './types';
export declare class JWTManager {
    private secret;
    constructor(secret?: string);
    private generateSecret;
    /**
     * Cria um JWT token simples (sem biblioteca externa)
     */
    sign(payload: any, expiresIn?: number): string;
    /**
     * Verifica e decodifica um JWT token
     */
    verify(token: string): any | null;
    private base64UrlEncode;
    private base64UrlDecode;
    private createSignature;
}
export declare class SessionManager {
    private jwtManager;
    private maxAge;
    constructor(secret?: string, maxAge?: number);
    /**
     * Cria uma nova sessão
     */
    createSession(user: User): {
        session: Session;
        token: string;
    };
    /**
     * Verifica uma sessão a partir do token
     */
    verifySession(token: string): Session | null;
    /**
     * Atualiza uma sessão existente
     */
    updateSession(token: string): {
        session: Session;
        token: string;
    } | null;
}
