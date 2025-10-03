import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { GenericRequest, GenericResponse, FrameworkAdapter } from '../types/framework';
export declare class ExpressAdapter implements FrameworkAdapter {
    type: "express";
    parseRequest(req: ExpressRequest): GenericRequest;
    createResponse(res: ExpressResponse): GenericResponse;
}
