"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HightJSResponse = exports.HightJSRequest = void 0;
/**
 * Abstração sobre a requisição HTTP de entrada.
 * Funciona com qualquer framework web (Express, Fastify, etc.)
 */
class HightJSRequest {
    constructor(req) {
        this._req = req;
    }
    /**
     * Retorna o método HTTP da requisição (GET, POST, etc.)
     */
    get method() {
        return this._req.method;
    }
    /**
     * Retorna a URL completa da requisição
     */
    get url() {
        return this._req.url;
    }
    /**
     * Retorna todos os headers da requisição
     */
    get headers() {
        return this._req.headers;
    }
    /**
     * Retorna um header específico
     */
    header(name) {
        return this._req.headers[name.toLowerCase()];
    }
    /**
     * Retorna todos os query parameters
     */
    get query() {
        return this._req.query || {};
    }
    /**
     * Retorna todos os parâmetros de rota
     */
    get params() {
        return this._req.params || {};
    }
    /**
     * Retorna todos os cookies
     */
    get cookies() {
        return this._req.cookies || {};
    }
    /**
     * Retorna um cookie específico
     */
    cookie(name) {
        return this._req.cookies?.[name];
    }
    /**
     * Retorna o corpo (body) da requisição, já parseado como JSON.
     */
    async json() {
        return this._req.body;
    }
    /**
     * Retorna o corpo da requisição como texto
     */
    async text() {
        if (typeof this._req.body === 'string') {
            return this._req.body;
        }
        return JSON.stringify(this._req.body);
    }
    /**
     * Retorna o corpo da requisição como FormData (para uploads)
     */
    async formData() {
        return this._req.body;
    }
    /**
     * Retorna a requisição original do framework
     */
    get raw() {
        return this._req.raw;
    }
    /**
     * Verifica se a requisição tem um content-type específico
     */
    is(type) {
        const contentType = this.header('content-type');
        if (!contentType)
            return false;
        const ct = Array.isArray(contentType) ? contentType[0] : contentType;
        return ct.toLowerCase().includes(type.toLowerCase());
    }
    /**
     * Verifica se a requisição é AJAX/XHR
     */
    get isAjax() {
        const xhr = this.header('x-requested-with');
        return xhr === 'XMLHttpRequest';
    }
    /**
     * Retorna o IP do cliente
     */
    get ip() {
        const forwarded = this.header('x-forwarded-for');
        if (forwarded) {
            const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
            return ips.split(',')[0].trim();
        }
        const realIp = this.header('x-real-ip');
        if (realIp) {
            return Array.isArray(realIp) ? realIp[0] : realIp;
        }
        return 'unknown';
    }
    /**
     * Retorna o User-Agent
     */
    get userAgent() {
        const ua = this.header('user-agent');
        return Array.isArray(ua) ? ua[0] : ua;
    }
}
exports.HightJSRequest = HightJSRequest;
/**
 * Abstração para construir a resposta HTTP.
 * Funciona com qualquer framework web (Express, Fastify, etc.)
 */
class HightJSResponse {
    constructor() {
        this._status = 200;
        this._headers = {};
        this._cookies = [];
        this._body = null;
        this._sent = false;
    }
    /**
     * Define o status HTTP da resposta
     */
    status(code) {
        this._status = code;
        return this;
    }
    /**
     * Define um header da resposta
     */
    header(name, value) {
        this._headers[name] = value;
        return this;
    }
    /**
     * Define múltiplos headers
     */
    headers(headers) {
        Object.assign(this._headers, headers);
        return this;
    }
    /**
     * Define um cookie
     */
    cookie(name, value, options) {
        this._cookies.push({ name, value, options });
        return this;
    }
    /**
     * Remove um cookie
     */
    clearCookie(name, options) {
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
    json(data) {
        this._headers['Content-Type'] = 'application/json';
        this._body = JSON.stringify(data);
        this._sent = true;
        return this;
    }
    /**
     * Envia resposta de texto
     */
    text(data) {
        this._headers['Content-Type'] = 'text/plain; charset=utf-8';
        this._body = data;
        this._sent = true;
        return this;
    }
    /**
     * Envia resposta HTML
     */
    html(data) {
        this._headers['Content-Type'] = 'text/html; charset=utf-8';
        this._body = data;
        this._sent = true;
        return this;
    }
    /**
     * Envia qualquer tipo de dados
     */
    send(data) {
        this._body = data;
        this._sent = true;
        return this;
    }
    /**
     * Redireciona para uma URL
     */
    redirect(url, status = 302) {
        this._status = status;
        this._headers['Location'] = url;
        this._sent = true;
        return this;
    }
    /**
     * Método interno para aplicar a resposta ao objeto de resposta do framework
     */
    _applyTo(res) {
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
            }
            else {
                res.cookie(name, value, options);
            }
        });
        // Envia o corpo se foi definido
        if (this._sent && this._body !== null) {
            if (this._headers['Content-Type']?.includes('application/json')) {
                res.json(JSON.parse(this._body));
            }
            else if (this._headers['Location']) {
                res.redirect(this._headers['Location']);
            }
            else {
                res.send(this._body);
            }
        }
    }
    /**
     * Método de compatibilidade com versão anterior (Express)
     */
    _send(res) {
        // Assume que é Express se tem os métodos específicos
        if (res.set && res.status && res.send) {
            res.set(this._headers).status(this._status);
            this._cookies.forEach(({ name, value, options }) => {
                if (options?.expires && options.expires.getTime() === 0) {
                    res.clearCookie(name, options);
                }
                else {
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
    static json(data, options) {
        const response = new HightJSResponse();
        if (options?.status)
            response.status(options.status);
        if (options?.headers)
            response.headers(options.headers);
        return response.json(data);
    }
    /**
     * Cria uma resposta de texto
     */
    static text(data, options) {
        const response = new HightJSResponse();
        if (options?.status)
            response.status(options.status);
        if (options?.headers)
            response.headers(options.headers);
        return response.text(data);
    }
    /**
     * Cria uma resposta HTML
     */
    static html(data, options) {
        const response = new HightJSResponse();
        if (options?.status)
            response.status(options.status);
        if (options?.headers)
            response.headers(options.headers);
        return response.html(data);
    }
    /**
     * Cria um redirecionamento
     */
    static redirect(url, status = 302) {
        return new HightJSResponse().redirect(url, status);
    }
    /**
     * Cria uma resposta 404
     */
    static notFound(message = 'Not Found') {
        return HightJSResponse.text(message, { status: 404 });
    }
    /**
     * Cria uma resposta 500
     */
    static error(message = 'Internal Server Error') {
        return HightJSResponse.text(message, { status: 500 });
    }
    /**
     * Cria uma resposta 400
     */
    static badRequest(message = 'Bad Request') {
        return HightJSResponse.text(message, { status: 400 });
    }
    /**
     * Cria uma resposta 401
     */
    static unauthorized(message = 'Unauthorized') {
        return HightJSResponse.text(message, { status: 401 });
    }
    /**
     * Cria uma resposta 403
     */
    static forbidden(message = 'Forbidden') {
        return HightJSResponse.text(message, { status: 403 });
    }
}
exports.HightJSResponse = HightJSResponse;
