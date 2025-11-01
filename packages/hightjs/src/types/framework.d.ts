export interface GenericRequest {
    method: string;
    url: string;
    headers: Record<string, string | string[]>;
    body?: any;
    query?: Record<string, any>;
    params?: Record<string, string>;
    cookies?: Record<string, string>;
    raw?: any;
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
    raw?: any;
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
