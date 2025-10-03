"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionManager = exports.JWTManager = void 0;
const crypto_1 = __importDefault(require("crypto"));
class JWTManager {
    constructor(secret) {
        this.secret = secret || process.env.HWEB_AUTH_SECRET || this.generateSecret();
    }
    generateSecret() {
        return crypto_1.default.randomBytes(32).toString('hex');
    }
    /**
     * Cria um JWT token simples (sem biblioteca externa)
     */
    sign(payload, expiresIn = 86400) {
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
    verify(token) {
        try {
            const parts = token.split('.');
            if (parts.length !== 3)
                return null;
            const [header, payload, signature] = parts;
            // Verifica a assinatura
            const expectedSignature = this.createSignature(header + '.' + payload);
            if (signature !== expectedSignature)
                return null;
            // Decodifica o payload
            const decodedPayload = JSON.parse(this.base64UrlDecode(payload));
            // Verifica expiração
            if (decodedPayload.exp && decodedPayload.exp < Math.floor(Date.now() / 1000)) {
                return null;
            }
            return decodedPayload;
        }
        catch (error) {
            return null;
        }
    }
    base64UrlEncode(str) {
        return Buffer.from(str)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }
    base64UrlDecode(str) {
        str += '='.repeat(4 - str.length % 4);
        return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
    }
    createSignature(data) {
        return crypto_1.default
            .createHmac('sha256', this.secret)
            .update(data)
            .digest('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }
}
exports.JWTManager = JWTManager;
class SessionManager {
    constructor(secret, maxAge = 86400) {
        this.jwtManager = new JWTManager(secret);
        this.maxAge = maxAge;
    }
    /**
     * Cria uma nova sessão
     */
    createSession(user) {
        const expires = new Date(Date.now() + this.maxAge * 1000).toISOString();
        console.log(user);
        const session = {
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
    verifySession(token) {
        try {
            const payload = this.jwtManager.verify(token);
            if (!payload)
                return null;
            const session = {
                user: payload,
                expires: new Date(payload.exp * 1000).toISOString()
            };
            return session;
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Atualiza uma sessão existente
     */
    updateSession(token) {
        const currentSession = this.verifySession(token);
        if (!currentSession)
            return null;
        return this.createSession(currentSession.user);
    }
}
exports.SessionManager = SessionManager;
