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
// Tipos para Fastify (sem import direto para evitar dependência obrigatória)
interface FastifyRequest {
    method: string;
    url: string;
    headers: Record<string, string | string[]>;
    body?: any;
    query?: Record<string, any>;
    params?: Record<string, string>;
    cookies?: Record<string, string>;
}

interface FastifyReply {
    status(code: number): FastifyReply;
    header(name: string, value: string): FastifyReply;
    setCookie(name: string, value: string, options?: any): FastifyReply;
    clearCookie(name: string, options?: any): FastifyReply;
    type(contentType: string): FastifyReply;
    send(data: any): void;
    redirect(url: string): void;
}

import { GenericRequest, GenericResponse, FrameworkAdapter, CookieOptions } from '../types/framework';

export class FastifyAdapter implements FrameworkAdapter {
    type = 'fastify' as const;

    parseRequest(req: FastifyRequest): GenericRequest {
        return {
            method: req.method,
            url: req.url,
            headers: req.headers as Record<string, string | string[]>,
            body: req.body,
            query: req.query as Record<string, any>,
            params: req.params as Record<string, string>,
            cookies: req.cookies || {},
            raw: req
        };
    }

    createResponse(reply: FastifyReply): GenericResponse {
        return new FastifyResponseWrapper(reply);
    }
}

class FastifyResponseWrapper implements GenericResponse {
    constructor(private reply: FastifyReply) {}

    get raw() {
        return this.reply;
    }

    status(code: number): GenericResponse {
        this.reply.status(code);
        return this;
    }

    header(name: string, value: string): GenericResponse {
        this.reply.header(name, value);
        return this;
    }

    cookie(name: string, value: string, options?: CookieOptions): GenericResponse {
        this.reply.setCookie(name, value, options);
        return this;
    }

    clearCookie(name: string, options?: CookieOptions): GenericResponse {
        this.reply.clearCookie(name, options);
        return this;
    }

    json(data: any): void {
        this.reply.send(data);
    }

    text(data: string): void {
        this.reply.type('text/plain; charset=utf-8');
        this.reply.send(data);
    }

    send(data: any): void {
        this.reply.send(data);
    }

    redirect(url: string): void {
        this.reply.redirect(url);
    }
}
