import { GenericRequest, GenericResponse, CookieOptions } from '../types/framework';

/**
 * Abstração sobre a requisição HTTP de entrada.
 * Funciona com qualquer framework web (Express, Fastify, etc.)
 */
export class HightJSRequest {
    /** A requisição genérica parseada pelo adapter */
    private readonly _req: GenericRequest;

    constructor(req: GenericRequest) {
        this._req = req;
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
     * Retorna um header específico
     */
    header(name: string): string | string[] | undefined {
        return this._req.headers[name.toLowerCase()];
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
     * Retorna um cookie específico
     */
    cookie(name: string): string | undefined {
        return this._req.cookies?.[name];
    }

    /**
     * Retorna o corpo (body) da requisição, já parseado como JSON.
     */
    async json<T = any>(): Promise<T> {
        return this._req.body;
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
     * Retorna o IP do cliente
     */
    get ip(): string {
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

        // Envia o corpo se foi definido
        if (this._sent && this._body !== null) {
            if (this._headers['Content-Type']?.includes('application/json')) {
                res.json(JSON.parse(this._body));
            } else if (this._headers['Location']) {
                res.redirect(this._headers['Location']);
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
