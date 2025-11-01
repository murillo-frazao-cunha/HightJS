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
import type { IncomingMessage, ServerResponse } from 'http';
import { GenericRequest, GenericResponse, FrameworkAdapter, CookieOptions } from '../types/framework';
import { parse as parseUrl } from 'url';

// --- Funções Auxiliares de Segurança ---

/**
 * Remove caracteres de quebra de linha (\r, \n) de uma string para prevenir
 * ataques de HTTP Header Injection (CRLF Injection).
 * @param value O valor a ser sanitizado.
 * @returns A string sanitizada.
 */
function sanitizeHeaderValue(value: string | number | boolean): string {
    return String(value).replace(/[\r\n]/g, '');
}

/**
 * Valida se o nome de um cookie contém apenas caracteres permitidos pela RFC 6265.
 * Isso previne a criação de cookies com nomes inválidos ou maliciosos.
 * @param name O nome do cookie a ser validado.
 * @returns `true` se o nome for válido, `false` caso contrário.
 */
function isValidCookieName(name: string): boolean {
    // A RFC 6265 define 'token' como 1 ou mais caracteres que não são controle nem separadores.
    // Separadores: ( ) < > @ , ; : \ " / [ ] ? = { }
    const validCookieNameRegex = /^[a-zA-Z0-9!#$%&'*+-.^_`|~]+$/;
    return validCookieNameRegex.test(name);
}


export class NativeAdapter implements FrameworkAdapter {
    type = 'native' as const;

    parseRequest(req: IncomingMessage): GenericRequest {
        const url = parseUrl(req.url || '', true);

        return {
            method: req.method || 'GET',
            url: req.url || '/',
            headers: req.headers as Record<string, string | string[]>,
            // Adicionado fallback para null para maior segurança caso o body parser não tenha rodado.
            body: (req as any).body ?? null,
            // Tipo mais específico para a query.
            query: url.query as Record<string, string | string[]>,
            params: {}, // Será preenchido pelo roteador
            cookies: this.parseCookies(req.headers.cookie || ''),
            raw: req
        };
    }

    createResponse(res: ServerResponse): GenericResponse {
        return new NativeResponseWrapper(res);
    }

    private parseCookies(cookieHeader: string): Record<string, string> {
        const cookies: Record<string, string> = {};

        if (!cookieHeader) return cookies;

        cookieHeader.split(';').forEach(cookie => {
            const [name, ...rest] = cookie.trim().split('=');
            if (name && rest.length > 0) {
                try {
                    // Tenta decodificar o valor do cookie.
                    cookies[name] = decodeURIComponent(rest.join('='));
                } catch (e) {
                    // Prevenção de crash: Ignora cookies com valores malformados (e.g., URI inválida).
                    console.error(`Warning: Malformed cookie with name "${name}" was ignored.`);
                }
            }
        });

        return cookies;
    }
}

class NativeResponseWrapper implements GenericResponse {
    private statusCode = 200;
    private headers: Record<string, string | number> = {};
    private cookiesToSet: string[] = []; // Array para lidar corretamente com múltiplos cookies.
    private finished = false;

    constructor(private res: ServerResponse) {}

    get raw() {
        return this.res;
    }

    status(code: number): GenericResponse {
        this.statusCode = code;
        return this;
    }

    header(name: string, value: string): GenericResponse {
        // Medida de segurança CRÍTICA: Previne HTTP Header Injection (CRLF Injection).
        // Sanitiza tanto o nome quanto o valor do header para remover quebras de linha.
        const sanitizedName = sanitizeHeaderValue(name);
        const sanitizedValue = sanitizeHeaderValue(value);

        if (name !== sanitizedName || String(value) !== sanitizedValue) {
            console.warn(`Warning: Potential HTTP Header Injection attempt detected and sanitized. Original header: "${name}"`);
        }


        this.headers[sanitizedName] = sanitizedValue;
        return this;
    }

    cookie(name: string, value: string, options?: CookieOptions): GenericResponse {
        // Medida de segurança: Valida o nome do cookie.
        if (!isValidCookieName(name)) {
            console.error(`Error: Invalid cookie name "${name}". The cookie will not be set.`);
            return this;
        }

        let cookieString = `${name}=${encodeURIComponent(value)}`;

        if (options) {
            // Sanitiza as opções que são strings para prevenir Header Injection.
            if (options.domain) cookieString += `; Domain=${sanitizeHeaderValue(options.domain)}`;
            if (options.path) cookieString += `; Path=${sanitizeHeaderValue(options.path)}`;
            if (options.expires) cookieString += `; Expires=${options.expires.toUTCString()}`;
            if (options.maxAge) cookieString += `; Max-Age=${options.maxAge}`;
            if (options.httpOnly) cookieString += '; HttpOnly';
            if (options.secure) cookieString += '; Secure';
            if (options.sameSite) {
                const sameSiteValue = typeof options.sameSite === 'boolean' ? 'Strict' : options.sameSite;
                cookieString += `; SameSite=${sanitizeHeaderValue(sameSiteValue)}`;
            }
        }

        this.cookiesToSet.push(cookieString);
        return this;
    }

    clearCookie(name: string, options?: CookieOptions): GenericResponse {
        const clearOptions = { ...options, expires: new Date(0), maxAge: 0 };
        return this.cookie(name, '', clearOptions);
    }

    private writeHeaders(): void {
        if (this.finished) return;

        this.res.statusCode = this.statusCode;

        Object.entries(this.headers).forEach(([name, value]) => {
            this.res.setHeader(name, value);
        });

        // CORREÇÃO: Envia múltiplos cookies corretamente como headers 'Set-Cookie' separados.
        // O método antigo de juntar com vírgula estava incorreto.
        if (this.cookiesToSet.length > 0) {
            this.res.setHeader('Set-Cookie', this.cookiesToSet);
        }
    }

    json(data: any): void {
        if (this.finished) return;

        this.header('Content-Type', 'application/json; charset=utf-8');
        this.writeHeaders();

        const jsonString = JSON.stringify(data);
        this.res.end(jsonString);
        this.finished = true;
    }

    text(data: string): void {
        if (this.finished) return;

        this.header('Content-Type', 'text/plain; charset=utf-8');
        this.writeHeaders();

        this.res.end(data);
        this.finished = true;
    }

    send(data: any): void {
        if (this.finished) return;

        const existingContentType = this.headers['Content-Type'];

        if (typeof data === 'string') {
            if (!existingContentType) {
                this.header('Content-Type', 'text/plain; charset=utf-8');
            }
            this.writeHeaders();
            this.res.end(data);
        } else if (Buffer.isBuffer(data)) {
            this.writeHeaders();
            this.res.end(data);
        } else if (data !== null && typeof data === 'object') {
            this.json(data); // Reutiliza o método json para consistência
            return; // O método json já finaliza a resposta
        } else {
            if (!existingContentType) {
                this.header('Content-Type', 'text/plain; charset=utf-8');
            }
            this.writeHeaders();
            this.res.end(String(data));
        }

        this.finished = true;
    }

    redirect(url: string): void {
        if (this.finished) return;

        this.status(302);
        // A sanitização no método .header() previne que um URL manipulado
        // cause um ataque de Open Redirect via Header Injection.
        this.header('Location', url);
        this.writeHeaders();

        this.res.end();
        this.finished = true;
    }
}
