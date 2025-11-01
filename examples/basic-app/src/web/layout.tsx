import React from 'react';
import {Metadata, router} from "hightjs/react"
import './globals.css';
import {AnimatePresence, motion} from "framer-motion";
import {SessionProvider} from "@hightjs/auth/react";

interface LayoutProps {
    children: React.ReactNode;
}


export const metadata: Metadata = {
    title: "Hight JS | The Fast and Simple Web Framework for React",
    description: "The fastest and simplest web framework for React! Start building high-performance web applications today with Hight JS.",
    keywords: ["Hight JS", "web framework", "React", "JavaScript", "TypeScript", "web development", "fast", "simple", "SSR", "frontend"],
    author: "Hight JS Team",
    favicon: "/favicon.ico",

    viewport: "width=device-width, initial-scale=1.0",
    themeColor: "#0A0A0A",

    canonical: "https://hightjs.com",
    robots: "index, follow",

    openGraph: {
        title: "Hight JS | The Fast and Simple Web Framework for React",
        description: "Discover Hight JS — the web framework focused on performance and simplicity for your React applications.",
        type: "website",
        url: "https://hightjs.com",
        image: "https://hightjs.com/og-image.png",
        siteName: "Hight JS",
        locale: "en_US",
    },

    twitter: {
        card: "summary_large_image",
        site: "@hightjs_team",
        creator: "@your_creator",
        title: "Hight JS | The Fast and Simple Web Framework for React",
        description: "Tired of complexity? Meet Hight JS and build faster, lighter React websites.",
        image: "https://hightjs.com/twitter-image.png",
        imageAlt: "Logo and slogan of the Hight JS framework",
    },

    appleTouchIcon: "/apple-touch-icon.png",

    language: "en-US",
    charset: "UTF-8",
    other: {
        "X-UA-Compatible": "IE=edge"
    }
};

export default function Layout({ children }: LayoutProps) {
    const variants = {
        hidden: { opacity: 0, y: 15 },
        enter: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -15 },
    };

    return (
        <SessionProvider basePath="http://localhost/api/auth">
            <AnimatePresence
                mode="wait"
                onExitComplete={() => window.scrollTo(0, 0)}
            >
                <motion.div
                    key={router.pathname}
                    variants={variants}
                    initial="hidden"
                    animate="enter"
                    exit="exit"
                    transition={{ type: 'tween', ease: 'easeInOut', duration: 0.4 }}
                >
                    {children}
                </motion.div>
            </AnimatePresence>
        </SessionProvider>
    );
}
