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
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { GenericRequest, GenericResponse, FrameworkAdapter, CookieOptions } from '../types/framework';

export class ExpressAdapter implements FrameworkAdapter {
    type = 'express' as const;

    parseRequest(req: ExpressRequest): GenericRequest {

        return {
            method: req.method,
            url: req.url,
            headers: req.headers as Record<string, string | string[]>,
            body: req.body,
            query: req.query as Record<string, any>,
            params: req.params,
            cookies: req.cookies || {},
            raw: req,
        };
    }

    createResponse(res: ExpressResponse): GenericResponse {
        return new ExpressResponseWrapper(res);
    }
}

class ExpressResponseWrapper implements GenericResponse {
    constructor(private res: ExpressResponse) {}

    get raw() {
        return this.res;
    }

    status(code: number): GenericResponse {
        this.res.status(code);
        return this;
    }

    header(name: string, value: string): GenericResponse {
        this.res.setHeader(name, value);
        return this;
    }

    cookie(name: string, value: string, options?: CookieOptions): GenericResponse {
        this.res.cookie(name, value, options || {});
        return this;
    }

    clearCookie(name: string, options?: CookieOptions): GenericResponse {
        // Filter out the deprecated 'expires' option to avoid Express deprecation warning
        const { expires, ...filteredOptions } = options || {};
        this.res.clearCookie(name, filteredOptions);
        return this;
    }

    json(data: any): void {
        this.res.json(data);
    }

    text(data: string): void {
        this.res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        this.res.send(data);
    }

    send(data: any): void {
        this.res.send(data);
    }

    redirect(url: string): void {
        this.res.redirect(url);
    }
}
