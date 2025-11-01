import React from "react";
import { useSession } from "@hightjs/auth/react";
import { Link } from "hightjs/react";

export default function App() {
    const { data: session, status, signOut } = useSession();

    return (
        <div className="font-sans flex items-center justify-center min-h-screen p-5 bg-gradient-to-b from-gray-200 to-white dark:bg-gradient-to-b dark:from-gray-900 dark:to-black text-black dark:text-white">

            <main className="w-full max-w-lg flex flex-col items-center gap-6 p-10 bg-white/15 dark:bg-white/5 backdrop-blur-lg border border-white/30 dark:border-white/10 shadow-lg dark:shadow-xl dark:shadow-black/30 rounded-2xl">

                <img
                    src="https://repository-images.githubusercontent.com/1069175740/e5c59d3a-e1fd-446c-a89f-785ed08f6a16"
                    alt="HightJS Logo"
                    className="w-16 h-16 mb-2"
                />

                <h1 className="text-3xl font-bold text-purple-400 [text-shadow:_0_0_12px_theme(colors.purple.500)]">
                    HightJS
                </h1>

                <div className="flex flex-col items-center gap-4 self-center">
                    {status === 'loading' && <p>Loading...</p>}
                    {status === 'authenticated' && session?.user && (
                        <>
                            <p className="text-lg text-center dark:text-gray-200 text-gray-800">
                                You are logged in as <span className="font-bold text-purple-400">{session.user.name}</span>!
                            </p>
                            <button
                                onClick={() => signOut({ callbackUrl: '/' })}
                                className="rounded-full border border-solid border-transparent transition-all duration-300 flex items-center justify-center bg-purple-600 text-white gap-2 hover:bg-purple-500 font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-40 shadow-[0_0_15px_-3px_theme(colors.purple.600)] hover:shadow-[0_0_25px_-3px_theme(colors.purple.500)]"
                            >
                                Sign Out
                            </button>
                        </>
                    )}
                    {status === 'unauthenticated' && (
                        <Link
                            href="/login"
                            className="rounded-full border border-solid border-transparent transition-all duration-300 flex items-center justify-center bg-purple-600 text-white gap-2 hover:bg-purple-500 font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-40 shadow-[0_0_15px_-3px_theme(colors.purple.600)] hover:shadow-[0_0_25px_-3px_theme(colors.purple.500)]"
                        >
                            Login
                        </Link>
                    )}
                </div>

                <ol className="font-mono list-inside list-decimal text-sm/6 text-center text-gray-600 dark:text-gray-400">
                    <li className="mb-2 tracking-[-.01em]">
                        Start by editing{" "}
                        <code className="bg-gray-700/50 dark:bg-gray-800 border border-gray-400/30 dark:border-gray-700 font-mono font-semibold px-1 py-0.5 rounded text-purple-500 dark:text-purple-400">
                            src/web/routes/index.tsx
                        </code>
                        .
                    </li>
                    <li className="tracking-[-.01em]">
                        Save and see your changes instantly.
                    </li>
                </ol>

                <div className="flex gap-4 items-center flex-col sm:flex-row pt-4 border-t border-white/20 dark:border-white/10 w-full justify-center">
                    <a
                        className="rounded-full border border-solid border-transparent transition-all duration-300 flex items-center justify-center bg-purple-600 text-white gap-2 hover:bg-purple-500 font-medium text-sm sm:text-base h-10 px-5 shadow-[0_0_15px_-3px_theme(colors.purple.600)] hover:shadow-[0_0_25px_-3px_theme(colors.purple.500)]"
                        href="#"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="lucide lucide-rocket"
                        >
                            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.33-.04-3.86l1.8-1.8c.44-.44.86-.92 1.22-1.44l-2.06-2.06c-.52.36-1 .78-1.44 1.22l-1.8-1.8c-1.53.74-3.02.73-3.86-.04Z" />
                            <path d="m12 15 5-5" />
                            <path d="M9 3h6v6h-6Z" />
                            <path d="M19.5 16.5c1.5-1.26 2-5 2-5s-3.74.5-5 2c-.71.84-.7 2.33.04 3.86l-1.8 1.8c-.44.44-.86.92-1.22 1.44l2.06 2.06c.52-.36 1-.78 1.44-1.22l1.8 1.8c1.53-.74 3.02-.73 3.86.04Z" />
                        </svg>
                        Deploy
                    </a>
                    <a
                        className="rounded-full border border-solid border-black/20 dark:border-white/20 transition-colors flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 hover:border-black/30 dark:hover:border-white/30 font-medium text-sm sm:text-base h-10 px-5 text-gray-700 dark:text-gray-300"
                        href="#"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Read the docs
                    </a>
                </div>
            </main>
        </div>
    );
}
