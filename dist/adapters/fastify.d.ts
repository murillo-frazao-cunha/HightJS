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
import { GenericRequest, GenericResponse, FrameworkAdapter } from '../types/framework';
export declare class FastifyAdapter implements FrameworkAdapter {
    type: "fastify";
    parseRequest(req: FastifyRequest): GenericRequest;
    createResponse(reply: FastifyReply): GenericResponse;
}
export {};
