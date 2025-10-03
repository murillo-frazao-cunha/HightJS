import crypto from 'crypto';
import type { User, Session } from './types';

export class JWTManager {
    private secret: string;

    constructor(secret?: string) {
        this.secret = secret || process.env.HWEB_AUTH_SECRET || this.generateSecret();
    }

    private generateSecret(): string {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Cria um JWT token simples (sem biblioteca externa)
     */
    sign(payload: any, expiresIn: number = 86400): string {
        const header = { alg: 'HS256', typ: 'JWT' };
        const now = Math.floor(Date.now() / 1000);

        const tokenPayload = {
            ...payload,
            iat: now,
            exp: now + expiresIn
        };

        const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
        const encodedPayload = this.base64UrlEncode(JSON.stringify(tokenPayload));

        const signature = this.createSignature(encodedHeader + '.' + encodedPayload);

        return `${encodedHeader}.${encodedPayload}.${signature}`;
    }

    /**
     * Verifica e decodifica um JWT token
     */
    verify(token: string): any | null {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) return null;

            const [header, payload, signature] = parts;

            // Verifica a assinatura
            const expectedSignature = this.createSignature(header + '.' + payload);
            if (signature !== expectedSignature) return null;

            // Decodifica o payload
            const decodedPayload = JSON.parse(this.base64UrlDecode(payload));

            // Verifica expiração
            if (decodedPayload.exp && decodedPayload.exp < Math.floor(Date.now() / 1000)) {
                return null;
            }

            return decodedPayload;
        } catch (error) {
            return null;
        }
    }

    private base64UrlEncode(str: string): string {
        return Buffer.from(str)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }

    private base64UrlDecode(str: string): string {
        str += '='.repeat(4 - str.length % 4);
        return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
    }

    private createSignature(data: string): string {
        return crypto
            .createHmac('sha256', this.secret)
            .update(data)
            .digest('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }
}

export class SessionManager {
    private jwtManager: JWTManager;
    private maxAge: number;

    constructor(secret?: string, maxAge: number = 86400) {
        this.jwtManager = new JWTManager(secret);
        this.maxAge = maxAge;
    }

    /**
     * Cria uma nova sessão
     */
    createSession(user: User): { session: Session; token: string } {
        const expires = new Date(Date.now() + this.maxAge * 1000).toISOString();
        console.log(user)
        const session: Session = {
            user,
            expires
        };

        const token = this.jwtManager.sign({
            ...user
        }, this.maxAge);

        return { session, token };
    }

    /**
     * Verifica uma sessão a partir do token
     */
    verifySession(token: string): Session | null {
        try {
            const payload = this.jwtManager.verify(token);
            if (!payload) return null;

            const session: Session = {
                user: payload,
                expires: new Date(payload.exp * 1000).toISOString()
            };

            return session;
        } catch (error) {
            return null;
        }
    }

    /**
     * Atualiza uma sessão existente
     */
    updateSession(token: string): { session: Session; token: string } | null {
        const currentSession = this.verifySession(token);
        if (!currentSession) return null;

        return this.createSession(currentSession.user);
    }
}
