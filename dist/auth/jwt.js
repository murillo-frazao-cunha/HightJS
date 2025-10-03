"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionManager = exports.JWTManager = void 0;
const crypto_1 = __importDefault(require("crypto"));
class JWTManager {
    constructor(secret) {
        if (!secret && !process.env.HWEB_AUTH_SECRET) {
            throw new Error('JWT secret is required. Set HWEB_AUTH_SECRET environment variable or provide secret parameter.');
        }
        this.secret = secret || process.env.HWEB_AUTH_SECRET;
        if (this.secret.length < 32) {
            throw new Error('JWT secret must be at least 32 characters long for security.');
        }
    }
    /**
     * Cria um JWT token com validação de algoritmo
     */
    sign(payload, expiresIn = 86400) {
        const header = { alg: 'HS256', typ: 'JWT' };
        const now = Math.floor(Date.now() / 1000);
        // Sanitize payload to prevent injection
        const sanitizedPayload = this.sanitizePayload(payload);
        const tokenPayload = {
            ...sanitizedPayload,
            iat: now,
            exp: now + expiresIn,
            alg: 'HS256' // Prevent algorithm confusion attacks
        };
        const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
        const encodedPayload = this.base64UrlEncode(JSON.stringify(tokenPayload));
        const signature = this.createSignature(encodedHeader + '.' + encodedPayload);
        return `${encodedHeader}.${encodedPayload}.${signature}`;
    }
    /**
     * Verifica e decodifica um JWT token com validação rigorosa
     */
    verify(token) {
        try {
            if (!token || typeof token !== 'string')
                return null;
            const parts = token.split('.');
            if (parts.length !== 3)
                return null;
            const [headerEncoded, payloadEncoded, signature] = parts;
            // Decode and validate header
            const header = JSON.parse(this.base64UrlDecode(headerEncoded));
            if (header.alg !== 'HS256' || header.typ !== 'JWT') {
                return null; // Prevent algorithm confusion attacks
            }
            // Verifica a assinatura usando constant-time comparison
            const expectedSignature = this.createSignature(headerEncoded + '.' + payloadEncoded);
            if (!this.constantTimeEqual(signature, expectedSignature))
                return null;
            // Decodifica o payload
            const decodedPayload = JSON.parse(this.base64UrlDecode(payloadEncoded));
            // Validate algorithm in payload matches header
            if (decodedPayload.alg !== 'HS256')
                return null;
            // Verifica expiração com margem de erro de 30 segundos
            const now = Math.floor(Date.now() / 1000);
            if (decodedPayload.exp && decodedPayload.exp < (now - 30)) {
                return null;
            }
            // Validate issued at time (not too far in future)
            if (decodedPayload.iat && decodedPayload.iat > (now + 300)) {
                return null;
            }
            return decodedPayload;
        }
        catch (error) {
            return null;
        }
    }
    sanitizePayload(payload) {
        if (typeof payload !== 'object' || payload === null) {
            return {};
        }
        const sanitized = {};
        for (const [key, value] of Object.entries(payload)) {
            // Skip dangerous properties
            if (key.startsWith('__') || key === 'constructor' || key === 'prototype') {
                continue;
            }
            sanitized[key] = value;
        }
        return sanitized;
    }
    constantTimeEqual(a, b) {
        if (a.length !== b.length)
            return false;
        let result = 0;
        for (let i = 0; i < a.length; i++) {
            result |= a.charCodeAt(i) ^ b.charCodeAt(i);
        }
        return result === 0;
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
