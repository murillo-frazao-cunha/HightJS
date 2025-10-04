import type { IncomingMessage, ServerResponse } from 'http';
import { GenericRequest, GenericResponse, FrameworkAdapter } from '../types/framework';
export declare class NativeAdapter implements FrameworkAdapter {
    type: "native";
    parseRequest(req: IncomingMessage): GenericRequest;
    createResponse(res: ServerResponse): GenericResponse;
    private parseCookies;
}
