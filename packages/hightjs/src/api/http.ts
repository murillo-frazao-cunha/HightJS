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
import { GenericRequest, GenericResponse, CookieOptions } from '../types/framework';

// Input validation and sanitization utilities
class SecurityUtils {
    static readonly MAX_HEADER_LENGTH = 8192;
    static readonly MAX_COOKIE_LENGTH = 4096;
    static readonly MAX_URL_LENGTH = 2048;
    static readonly MAX_BODY_SIZE = 10 * 1024 * 1024; // 10MB

    static sanitizeHeader(value: string | string[]): string | string[] {
        if (Array.isArray(value)) {
            return value.map(v => this.sanitizeString(v, this.MAX_HEADER_LENGTH));
        }
        return this.sanitizeString(value, this.MAX_HEADER_LENGTH);
    }

    static sanitizeString(str: string, maxLength: number): string {
        if (typeof str !== 'string') return '';

        // Remove null bytes and control characters except newline/tab
        let clean = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

        // Limit length
        if (clean.length > maxLength) {
            clean = clean.substring(0, maxLength);
        }

        return clean;
    }

    static isValidURL(url: string): boolean {
        if (!url || typeof url !== 'string') return false;
        if (url.length > this.MAX_URL_LENGTH) return false;

        // Basic URL validation - prevent dangerous protocols
        const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
        const lowerUrl = url.toLowerCase();

        return !dangerousProtocols.some(protocol => lowerUrl.startsWith(protocol));
    }

    static validateContentLength(length: number): boolean {
        return length >= 0 && length <= this.MAX_BODY_SIZE;
    }
}

/**
 * Abstração sobre a requisição HTTP de entrada.
 * Funciona com qualquer framework web (Express, Fastify, etc.)
 */
export class HightJSRequest {
    /** A requisição genérica parseada pelo adapter */
    private readonly _req: GenericRequest;

    constructor(req: GenericRequest) {
        // Validate and sanitize request data
        this._req = this.validateAndSanitizeRequest(req);
    }

    private validateAndSanitizeRequest(req: GenericRequest): GenericRequest {
        // Validate URL
        if (!SecurityUtils.isValidURL(req.url)) {
            throw new Error('Invalid URL format');
        }

        // Sanitize headers
        const sanitizedHeaders: Record<string, string | string[]> = {};
        for (const [key, value] of Object.entries(req.headers || {})) {
            const cleanKey = SecurityUtils.sanitizeString(key.toLowerCase(), 100);
            if (cleanKey && value) {
                sanitizedHeaders[cleanKey] = SecurityUtils.sanitizeHeader(value);
            }
        }

        // Validate content length
        const contentLength = req.headers['content-length'];
        if (contentLength) {
            const length = parseInt(Array.isArray(contentLength) ? contentLength[0] : contentLength, 10);
            if (!SecurityUtils.validateContentLength(length)) {
                throw new Error('Request too large');
            }
        }

        // Sanitize cookies
        const sanitizedCookies: Record<string, string> = {};
        for (const [key, value] of Object.entries(req.cookies || {})) {
            const cleanKey = SecurityUtils.sanitizeString(key, 100);
            const cleanValue = SecurityUtils.sanitizeString(value, SecurityUtils.MAX_COOKIE_LENGTH);
            if (cleanKey && cleanValue) {
                sanitizedCookies[cleanKey] = cleanValue;
            }
        }

        return {
            ...req,
            headers: sanitizedHeaders,
            cookies: sanitizedCookies,
            url: SecurityUtils.sanitizeString(req.url, SecurityUtils.MAX_URL_LENGTH)
        };
    }

    /**
     * Retorna o método HTTP da requisição (GET, POST, etc.)
     */
    get method(): string {
        return this._req.method;
    }

    /**
     * Retorna a URL completa da requisição
     */
    get url(): string {
        return this._req.url;
    }

    /**
     * Retorna todos os headers da requisição
     */
    get headers(): Record<string, string | string[]> {
        return this._req.headers;
    }

    /**
     * Retorna um header específico com validação
     */
    header(name: string): string | string[] | undefined {
        if (!name || typeof name !== 'string') return undefined;
        const cleanName = SecurityUtils.sanitizeString(name.toLowerCase(), 100);
        return this._req.headers[cleanName];
    }

    /**
     * Retorna todos os query parameters
     */
    get query(): Record<string, any> {
        return this._req.query || {};
    }

    /**
     * Retorna todos os parâmetros de rota
     */
    get params(): Record<string, string> {
        return this._req.params || {};
    }

    /**
     * Retorna todos os cookies
     */
    get cookies(): Record<string, string> {
        return this._req.cookies || {};
    }

    /**
     * Retorna um cookie específico com validação
     */
    cookie(name: string): string | undefined {
        if (!name || typeof name !== 'string') return undefined;
        const cleanName = SecurityUtils.sanitizeString(name, 100);
        return this._req.cookies?.[cleanName];
    }

    /**
     * Retorna o corpo (body) da requisição, já parseado como JSON com validação
     */
    async json<T = any>(): Promise<T> {
        try {
            const body = this._req.body;

            // Validate JSON structure
            if (typeof body === 'string') {
                // Check for potential JSON bombs
                if (body.length > SecurityUtils.MAX_BODY_SIZE) {
                    throw new Error('Request body too large');
                }
                return JSON.parse(body);
            }

            return body;
        } catch (error) {
            if (error instanceof SyntaxError) {
                throw new Error('Invalid JSON format');
            }
            throw error;
        }
    }

    /**
     * Retorna o corpo da requisição como texto
     */
    async text(): Promise<string> {
        if (typeof this._req.body === 'string') {
            return this._req.body;
        }
        return JSON.stringify(this._req.body);
    }

    /**
     * Retorna o corpo da requisição como FormData (para uploads)
     */
    async formData(): Promise<any> {
        return this._req.body;
    }

    /**
     * Retorna a requisição original do framework
     */
    get raw(): any {
        return this._req.raw;
    }

    /**
     * Verifica se a requisição tem um content-type específico
     */
    is(type: string): boolean {
        const contentType = this.header('content-type');
        if (!contentType) return false;

        const ct = Array.isArray(contentType) ? contentType[0] : contentType;
        return ct.toLowerCase().includes(type.toLowerCase());
    }

    /**
     * Verifica se a requisição é AJAX/XHR
     */
    get isAjax(): boolean {
        const xhr = this.header('x-requested-with');
        return xhr === 'XMLHttpRequest';
    }

    /**
     * Retorna o IP do cliente com validação melhorada
     */
    get ip(): string {
        // Check X-Forwarded-For with validation
        const forwarded = this.header('x-forwarded-for');
        if (forwarded) {
            const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
            const firstIp = ips.split(',')[0].trim();

            // Basic IP validation
            if (this.isValidIP(firstIp)) {
                return firstIp;
            }
        }

        // Check X-Real-IP
        const realIp = this.header('x-real-ip');
        if (realIp) {
            const ip = Array.isArray(realIp) ? realIp[0] : realIp;
            if (this.isValidIP(ip)) {
                return ip;
            }
        }

        return 'unknown';
    }

    private isValidIP(ip: string): boolean {
        if (!ip || typeof ip !== 'string') return false;

        // Basic IPv4 validation
        const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
        if (ipv4Regex.test(ip)) {
            const parts = ip.split('.');
            return parts.every(part => {
                const num = parseInt(part, 10);
                return num >= 0 && num <= 255;
            });
        }

        // Basic IPv6 validation (simplified)
        const ipv6Regex = /^([0-9a-fA-F]{0,4}:){1,7}[0-9a-fA-F]{0,4}$/;
        return ipv6Regex.test(ip);
    }

    /**
     * Retorna o User-Agent
     */
    get userAgent(): string | undefined {
        const ua = this.header('user-agent');
        return Array.isArray(ua) ? ua[0] : ua;
    }
}

/**
 * Abstração para construir a resposta HTTP.
 * Funciona com qualquer framework web (Express, Fastify, etc.)
 */
export class HightJSResponse {
    private _status: number = 200;
    private _headers: Record<string, string> = {};
    private _cookies: Array<{ name: string; value: string; options?: CookieOptions }> = [];
    private _body: any = null;
    private _sent: boolean = false;

    /**
     * Define o status HTTP da resposta
     */
    status(code: number): HightJSResponse {
        this._status = code;
        return this;
    }

    /**
     * Define um header da resposta
     */
    header(name: string, value: string): HightJSResponse {
        this._headers[name] = value;
        return this;
    }

    /**
     * Define múltiplos headers
     */
    headers(headers: Record<string, string>): HightJSResponse {
        Object.assign(this._headers, headers);
        return this;
    }

    /**
     * Define um cookie
     */
    cookie(name: string, value: string, options?: CookieOptions): HightJSResponse {
        this._cookies.push({ name, value, options });
        return this;
    }

    /**
     * Remove um cookie
     */
    clearCookie(name: string, options?: CookieOptions): HightJSResponse {
        this._cookies.push({
            name,
            value: '',
            options: { ...options, expires: new Date(0) }
        });
        return this;
    }

    /**
     * Envia resposta JSON
     */
    json(data: any): HightJSResponse {
        this._headers['Content-Type'] = 'application/json';
        this._body = JSON.stringify(data);
        this._sent = true;
        return this;
    }

    /**
     * Envia resposta de texto
     */
    text(data: string): HightJSResponse {
        this._headers['Content-Type'] = 'text/plain; charset=utf-8';
        this._body = data;
        this._sent = true;
        return this;
    }

    /**
     * Envia resposta HTML
     */
    html(data: string): HightJSResponse {
        this._headers['Content-Type'] = 'text/html; charset=utf-8';
        this._body = data;
        this._sent = true;
        return this;
    }

    /**
     * Envia qualquer tipo de dados
     */
    send(data: any): HightJSResponse {
        this._body = data;
        this._sent = true;
        return this;
    }

    /**
     * Redireciona para uma URL
     */
    redirect(url: string, status: number = 302): HightJSResponse {
        this._status = status;
        this._headers['Location'] = url;
        this._sent = true;
        return this;
    }

    /**
     * Método interno para aplicar a resposta ao objeto de resposta do framework
     */
    public _applyTo(res: GenericResponse): void {
        // Aplica status
        res.status(this._status);

        // Aplica headers
        Object.entries(this._headers).forEach(([name, value]) => {
            res.header(name, value);
        });

        // Aplica cookies
        this._cookies.forEach(({ name, value, options }) => {
            if (options?.expires && options.expires.getTime() === 0) {
                res.clearCookie(name, options);
            } else {
                res.cookie(name, value, options);
            }
        });

        // Handle redirects specifically
        if (this._headers['Location']) {
            res.redirect(this._headers['Location']);
            return;
        }

        // Envia o corpo se foi definido
        if (this._sent && this._body !== null) {
            if (this._headers['Content-Type']?.includes('application/json')) {
                res.json(JSON.parse(this._body));
            } else {
                res.send(this._body);
            }
        }
    }

    /**
     * Método de compatibilidade com versão anterior (Express)
     */
    public _send(res: any): void {
        // Assume que é Express se tem os métodos específicos
        if (res.set && res.status && res.send) {
            res.set(this._headers).status(this._status);

            this._cookies.forEach(({ name, value, options }) => {
                if (options?.expires && options.expires.getTime() === 0) {
                    res.clearCookie(name, options);
                } else {
                    res.cookie(name, value, options);
                }
            });

            res.send(this._body);
        }
    }

    // === MÉTODOS ESTÁTICOS DE CONVENIÊNCIA ===

    /**
     * Cria uma resposta JSON
     */
    static json(data: any, options?: { status?: number, headers?: Record<string, string> }): HightJSResponse {
        const response = new HightJSResponse();
        if (options?.status) response.status(options.status);
        if (options?.headers) response.headers(options.headers);
        return response.json(data);
    }

    /**
     * Cria uma resposta de texto
     */
    static text(data: string, options?: { status?: number, headers?: Record<string, string> }): HightJSResponse {
        const response = new HightJSResponse();
        if (options?.status) response.status(options.status);
        if (options?.headers) response.headers(options.headers);
        return response.text(data);
    }

    /**
     * Cria uma resposta HTML
     */
    static html(data: string, options?: { status?: number, headers?: Record<string, string> }): HightJSResponse {
        const response = new HightJSResponse();
        if (options?.status) response.status(options.status);
        if (options?.headers) response.headers(options.headers);
        return response.html(data);
    }

    /**
     * Cria um redirecionamento
     */
    static redirect(url: string, status: number = 302): HightJSResponse {
        return new HightJSResponse().redirect(url, status);
    }

    /**
     * Cria uma resposta 404
     */
    static notFound(message: string = 'Not Found'): HightJSResponse {
        return HightJSResponse.text(message, { status: 404 });
    }

    /**
     * Cria uma resposta 500
     */
    static error(message: string = 'Internal Server Error'): HightJSResponse {
        return HightJSResponse.text(message, { status: 500 });
    }

    /**
     * Cria uma resposta 400
     */
    static badRequest(message: string = 'Bad Request'): HightJSResponse {
        return HightJSResponse.text(message, { status: 400 });
    }

    /**
     * Cria uma resposta 401
     */
    static unauthorized(message: string = 'Unauthorized'): HightJSResponse {
        return HightJSResponse.text(message, { status: 401 });
    }

    /**
     * Cria uma resposta 403
     */
    static forbidden(message: string = 'Forbidden'): HightJSResponse {
        return HightJSResponse.text(message, { status: 403 });
    }
}
