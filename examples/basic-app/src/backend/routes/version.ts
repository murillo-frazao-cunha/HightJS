import {BackendRouteConfig, HightJSResponse} from "hightjs";

const route: BackendRouteConfig = {
    pattern: "/api/version",
    GET: (request, params): HightJSResponse => {
        return HightJSResponse.json({
            success: true,
            version: "1.0.0",
            name: "HightJS Example"
        })
    },
    middleware: []
}
export default route;