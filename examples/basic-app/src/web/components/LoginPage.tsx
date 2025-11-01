import React, { useState } from "react";
import { useSession } from "@hightjs/auth/react";
import { router } from "hightjs/react";

export default function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { signIn } = useSession();

    const [error, setError] = useState<string | null>(null); // Type annotation removed for generic JSX compatibility

    const handleLogin = async (e: { preventDefault: () => void; }) => { // Type annotation removed for generic JSX compatibility
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const result = await signIn('credentials', {
                redirect: false,
                username: username,
                password: password,
                callbackUrl: '/'
            });
            console.log(result);
            if (!result || result.error) {
                setError('Invalid credentials. Please check your username and password.');
                setIsLoading(false);
                return;
            }
            router.push("/");

        } catch (err) {
            setError('An unexpected error occurred. Please try again.');
            setIsLoading(false);
        }
    };

    return (
        <div className="font-sans flex items-center justify-center min-h-screen p-5 bg-gradient-to-b from-gray-200 to-white dark:bg-gradient-to-b dark:from-gray-900 dark:to-black text-black dark:text-white">

            <div className="w-full max-w-md">

                <div className="w-full max-w-md flex flex-col items-center gap-6 p-8 sm:p-10 bg-white/15 dark:bg-white/5 backdrop-blur-lg border border-white/30 dark:border-white/10 shadow-lg dark:shadow-xl dark:shadow-black/30 rounded-2xl">

                    {/* HightJS Logo */}
                    <img
                        src="https://repository-images.githubusercontent.com/1069175740/e5c59d3a-e1fd-446c-a89f-785ed08f6a16"
                        alt="HightJS Logo"
                        className="w-16 h-16 mb-2"
                    />

                    {/* Header */}
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-purple-400 [text-shadow:_0_0_12px_theme(colors.purple.500)] mb-1">Welcome Back</h1>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Log in to your account</p>
                    </div>

                    {/* Error message */}
                    {error && (
                        <div className="w-full p-3 text-sm text-center text-red-800 dark:text-red-300 bg-red-200 dark:bg-red-900/50 border border-red-300 dark:border-red-500/50 rounded-lg" role="alert">
                            {error}
                        </div>
                    )}

                    {/* Form content */}
                    <form onSubmit={handleLogin} className="w-full space-y-5">
                        {/* Username field */}
                        <div className="space-y-2">
                            <label htmlFor="username" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Username
                            </label>
                            <input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-3 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-gray-900 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 focus:outline-none backdrop-blur-sm transition-all duration-300"
                                required
                            />
                        </div>

                        {/* Password field */}
                        <div className="space-y-2">
                            <label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-gray-900 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 focus:outline-none backdrop-blur-sm transition-all duration-300"
                                required
                            />
                        </div>

                        {/* Remember me and forgot password */}
                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center text-gray-600 dark:text-gray-400 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="mr-2 rounded border-black/20 dark:border-white/20 bg-black/5 dark:bg-white/5 text-purple-500 focus:ring-purple-500/20"
                                />
                                Remember me
                            </label>
                            <a href="#" className="text-purple-500 dark:text-purple-400 hover:text-purple-600 dark:hover:text-purple-300 transition-colors hover:underline">
                                Forgot password?
                            </a>
                        </div>

                        {/* Login button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-medium py-3 px-4 rounded-xl transition-all duration-300 shadow-[0_0_15px_-3px_theme(colors.purple.600)] hover:shadow-[0_0_25px_-3px_theme(colors.purple.500)] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Logging in...
                                </div>
                            ) : (
                                'Login'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

