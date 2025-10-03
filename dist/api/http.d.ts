import { GenericRequest, GenericResponse, CookieOptions } from '../types/framework';
/**
 * Abstração sobre a requisição HTTP de entrada.
 * Funciona com qualquer framework web (Express, Fastify, etc.)
 */
export declare class HightJSRequest {
    /** A requisição genérica parseada pelo adapter */
    private readonly _req;
    constructor(req: GenericRequest);
    /**
     * Retorna o método HTTP da requisição (GET, POST, etc.)
     */
    get method(): string;
    /**
     * Retorna a URL completa da requisição
     */
    get url(): string;
    /**
     * Retorna todos os headers da requisição
     */
    get headers(): Record<string, string | string[]>;
    /**
     * Retorna um header específico
     */
    header(name: string): string | string[] | undefined;
    /**
     * Retorna todos os query parameters
     */
    get query(): Record<string, any>;
    /**
     * Retorna todos os parâmetros de rota
     */
    get params(): Record<string, string>;
    /**
     * Retorna todos os cookies
     */
    get cookies(): Record<string, string>;
    /**
     * Retorna um cookie específico
     */
    cookie(name: string): string | undefined;
    /**
     * Retorna o corpo (body) da requisição, já parseado como JSON.
     */
    json<T = any>(): Promise<T>;
    /**
     * Retorna o corpo da requisição como texto
     */
    text(): Promise<string>;
    /**
     * Retorna o corpo da requisição como FormData (para uploads)
     */
    formData(): Promise<any>;
    /**
     * Retorna a requisição original do framework
     */
    get raw(): any;
    /**
     * Verifica se a requisição tem um content-type específico
     */
    is(type: string): boolean;
    /**
     * Verifica se a requisição é AJAX/XHR
     */
    get isAjax(): boolean;
    /**
     * Retorna o IP do cliente
     */
    get ip(): string;
    /**
     * Retorna o User-Agent
     */
    get userAgent(): string | undefined;
}
/**
 * Abstração para construir a resposta HTTP.
 * Funciona com qualquer framework web (Express, Fastify, etc.)
 */
export declare class HightJSResponse {
    private _status;
    private _headers;
    private _cookies;
    private _body;
    private _sent;
    /**
     * Define o status HTTP da resposta
     */
    status(code: number): HightJSResponse;
    /**
     * Define um header da resposta
     */
    header(name: string, value: string): HightJSResponse;
    /**
     * Define múltiplos headers
     */
    headers(headers: Record<string, string>): HightJSResponse;
    /**
     * Define um cookie
     */
    cookie(name: string, value: string, options?: CookieOptions): HightJSResponse;
    /**
     * Remove um cookie
     */
    clearCookie(name: string, options?: CookieOptions): HightJSResponse;
    /**
     * Envia resposta JSON
     */
    json(data: any): HightJSResponse;
    /**
     * Envia resposta de texto
     */
    text(data: string): HightJSResponse;
    /**
     * Envia resposta HTML
     */
    html(data: string): HightJSResponse;
    /**
     * Envia qualquer tipo de dados
     */
    send(data: any): HightJSResponse;
    /**
     * Redireciona para uma URL
     */
    redirect(url: string, status?: number): HightJSResponse;
    /**
     * Método interno para aplicar a resposta ao objeto de resposta do framework
     */
    _applyTo(res: GenericResponse): void;
    /**
     * Método de compatibilidade com versão anterior (Express)
     */
    _send(res: any): void;
    /**
     * Cria uma resposta JSON
     */
    static json(data: any, options?: {
        status?: number;
        headers?: Record<string, string>;
    }): HightJSResponse;
    /**
     * Cria uma resposta de texto
     */
    static text(data: string, options?: {
        status?: number;
        headers?: Record<string, string>;
    }): HightJSResponse;
    /**
     * Cria uma resposta HTML
     */
    static html(data: string, options?: {
        status?: number;
        headers?: Record<string, string>;
    }): HightJSResponse;
    /**
     * Cria um redirecionamento
     */
    static redirect(url: string, status?: number): HightJSResponse;
    /**
     * Cria uma resposta 404
     */
    static notFound(message?: string): HightJSResponse;
    /**
     * Cria uma resposta 500
     */
    static error(message?: string): HightJSResponse;
    /**
     * Cria uma resposta 400
     */
    static badRequest(message?: string): HightJSResponse;
    /**
     * Cria uma resposta 401
     */
    static unauthorized(message?: string): HightJSResponse;
    /**
     * Cria uma resposta 403
     */
    static forbidden(message?: string): HightJSResponse;
}
