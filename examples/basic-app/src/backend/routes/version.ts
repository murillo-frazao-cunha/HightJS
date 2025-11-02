import {BackendRouteConfig, HightJSResponse} from "hightjs";
import auth from "./auth";

const route: BackendRouteConfig = {
    pattern: "/api/version",
    GET: async (request, params): Promise<HightJSResponse> => {
        const session = await auth.auth.getSession(request);
        if (session != null) {
            console.log(`User ID: ${session.user.id}`);
        }
        return HightJSResponse.json({
            success: true,
            version: "1.0.0",
            name: "HightJS Example"
        })
    },
    middleware: []
}
export default route;