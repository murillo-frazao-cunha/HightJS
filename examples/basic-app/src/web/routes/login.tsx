import {RouteConfig, router} from "hightjs/react";
import {GuestOnly, useSession} from "@hightjs/auth/react"
import React, {useState} from "react";
import LoginPage from "../components/LoginPage";



const wrapper = () => {
    const session = useSession()
    if (session.status === 'loading') {
        return <div>Loading...</div>;
    }
    if (session.status === 'authenticated') {
        router.push('/')
        return <div>Redirecting...</div>;
    }

    return (
        <LoginPage/>
    )
}

export const config: RouteConfig = {
    pattern: '/login',
    component: wrapper,
    generateMetadata: () => ({
        title: 'HightJS | Login'
    })
};
export default config
