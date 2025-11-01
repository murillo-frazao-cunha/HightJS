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
// Tipos genéricos para abstrair diferentes frameworks web
export interface GenericRequest {
    method: string;
    url: string;
    headers: Record<string, string | string[]>;
    body?: any;
    query?: Record<string, any>;
    params?: Record<string, string>;
    cookies?: Record<string, string>;
    raw?: any; // Requisição original do framework
}

export interface GenericResponse {
    status(code: number): GenericResponse;
    header(name: string, value: string): GenericResponse;
    cookie(name: string, value: string, options?: CookieOptions): GenericResponse;
    clearCookie(name: string, options?: CookieOptions): GenericResponse;
    json(data: any): void;
    text(data: string): void;
    send(data: any): void;
    redirect(url: string): void;
    raw?: any; // Resposta original do framework
}

export interface CookieOptions {
    domain?: string;
    expires?: Date;
    httpOnly?: boolean;
    maxAge?: number;
    path?: string;
    secure?: boolean;
    signed?: boolean;
    sameSite?: boolean | 'lax' | 'strict' | 'none';
}

export type FrameworkType = 'express' | 'fastify' | 'native';

export interface FrameworkAdapter {
    type: FrameworkType;
    parseRequest(req: any): GenericRequest;
    createResponse(res: any): GenericResponse;
}
