import {RouteConfig} from "hightjs/react";
import Home from "../components/Home";



export const config: RouteConfig = {
    pattern: '/',
    component: Home,
    generateMetadata: () => ({
        title: 'HightJS | Home'
    })
};
export default config
