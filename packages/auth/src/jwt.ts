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
import crypto from 'crypto';
import type { User, Session } from './types';

export class JWTManager {
    private secret: string;

    constructor(secret?: string) {
        if (!secret && !process.env.HWEB_AUTH_SECRET) {
            throw new Error('JWT secret is required. Set HWEB_AUTH_SECRET environment variable or provide secret parameter.');
        }

        this.secret = secret || process.env.HWEB_AUTH_SECRET!;

        if (this.secret.length < 32) {
            throw new Error('JWT secret must be at least 32 characters long for security.');
        }
    }

    /**
     * Cria um JWT token com validação de algoritmo
     */
    sign(payload: any, expiresIn: number = 86400): string {
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
    verify(token: string): any | null {
        try {
            if (!token || typeof token !== 'string') return null;

            const parts = token.split('.');
            if (parts.length !== 3) return null;

            const [headerEncoded, payloadEncoded, signature] = parts;

            // Decode and validate header
            const header = JSON.parse(this.base64UrlDecode(headerEncoded));
            if (header.alg !== 'HS256' || header.typ !== 'JWT') {
                return null; // Prevent algorithm confusion attacks
            }

            // Verifica a assinatura usando constant-time comparison
            const expectedSignature = this.createSignature(headerEncoded + '.' + payloadEncoded);
            if (!this.constantTimeEqual(signature, expectedSignature)) return null;

            // Decodifica o payload
            const decodedPayload = JSON.parse(this.base64UrlDecode(payloadEncoded));

            // Validate algorithm in payload matches header
            if (decodedPayload.alg !== 'HS256') return null;

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
        } catch (error) {
            return null;
        }
    }

    private sanitizePayload(payload: any): any {
        if (typeof payload !== 'object' || payload === null) {
            return {};
        }

        const sanitized: any = {};
        for (const [key, value] of Object.entries(payload)) {
            // Skip dangerous properties
            if (key.startsWith('__') || key === 'constructor' || key === 'prototype') {
                continue;
            }
            sanitized[key] = value;
        }
        return sanitized;
    }

    private constantTimeEqual(a: string, b: string): boolean {
        if (a.length !== b.length) return false;

        let result = 0;
        for (let i = 0; i < a.length; i++) {
            result |= a.charCodeAt(i) ^ b.charCodeAt(i);
        }
        return result === 0;
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
