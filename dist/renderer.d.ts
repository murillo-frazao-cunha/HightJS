import { RouteConfig } from './types';
import type { GenericRequest } from './types/framework';
interface RenderOptions {
    req: GenericRequest;
    route: RouteConfig & {
        componentPath: string;
    };
    params: Record<string, string>;
    allRoutes: (RouteConfig & {
        componentPath: string;
    })[];
}
export declare function render({ req, route, params, allRoutes }: RenderOptions): Promise<string>;
export {};
