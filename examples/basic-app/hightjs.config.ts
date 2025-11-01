import type { HightConfig, HightConfigFunction } from 'hightjs';

/**
 * HightJS Configuration File
 *
 * This file allows you to customize server settings for your HightJS application.
 * You can export either a static configuration object or a function that returns the configuration.
 *
 * In a real project, you would import from 'hightjs' instead:
 * import type { HightConfig, HightConfigFunction } from 'hightjs';
 */
const hightConfig: HightConfigFunction = (phase, { defaultConfig }) => {
    const config: HightConfig = {
        /**
         * Maximum number of HTTP headers allowed per request
         * Default: 100
         * Increase this if you need to support requests with many headers
         */
        maxHeadersCount: 100,

        /**
         * Timeout in milliseconds for receiving HTTP headers
         * Default: 60000 (60 seconds)
         */
        headersTimeout: 60000,

        /**
         * Timeout in milliseconds for a complete request
         * Default: 30000 (30 seconds)
         */
        requestTimeout: 30000,

        /**
         * General server timeout in milliseconds
         * Default: 35000 (35 seconds)
         */
        serverTimeout: 35000,

        /**
         * Timeout per individual request in milliseconds
         * Default: 30000 (30 seconds)
         */
        individualRequestTimeout: 30000,

        /**
         * Maximum URL length in characters
         * Default: 2048
         */
        maxUrlLength: 2048,

        /**
         * Enable HTTP access logging (e.g., GET /api/users 200 15ms)
         * Default: false
         */
        accessLogging: true,

        /**
         * CORS (Cross-Origin Resource Sharing) Configuration
         * Enable this to allow requests from different origins
         */
        cors: {
            /**
             * Enable CORS
             * Default: false
             */
            enabled: true,

            /**
             * Allowed origins
             * Options:
             * - '*' - Allow all origins (not recommended for production)
             * - 'https://example.com' - Allow specific origin
             * - ['https://example.com', 'https://app.example.com'] - Allow multiple origins
             * - (origin) => origin.endsWith('.example.com') - Dynamic validation
             */
            origin: 'http://localhost:63342', // For development. In production, specify your domain(s)

            /**
             * Allowed HTTP methods
             * Default: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
             */
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],

            /**
             * Allowed request headers
             * Default: ['Content-Type', 'Authorization']
             */
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],

            /**
             * Headers exposed to the client
             * Default: []
             */
            exposedHeaders: ['X-Total-Count', 'X-Page-Count'],

            /**
             * Allow credentials (cookies, authorization headers)
             * Default: false
             * Note: Cannot be used with origin: '*'
             */
            credentials: true,

            /**
             * Preflight cache duration in seconds
             * Default: 86400 (24 hours)
             */
            maxAge: 86400,
        },
    };

    // You can customize settings based on the phase
    if (phase === 'development') {
        // In development, you might want longer timeouts for debugging
        config.requestTimeout = 60000;
        config.individualRequestTimeout = 60000;

        // In development, allow all origins
        if (config.cors) {
            config.cors.origin = 'http://localhost:63342';
            config.cors.credentials = true;
        }
    }

    if (phase === 'production') {
        // In production, you might want stricter limits
        config.maxHeadersCount = 50;
        config.maxUrlLength = 1024;

        // In production, specify your actual domain(s)
        if (config.cors) {
            config.cors.origin = ['http://localhost:63342', 'https://app.yourdomain.com'];
            config.cors.credentials = true; // Enable if you need to send cookies
        }
    }

    return config;
};

export default hightConfig;

// You can also export a static object instead of a function:
// const staticConfig: HightConfig = {
//     maxHeadersCount: 100,
//     headersTimeout: 60000,
//     requestTimeout: 30000,
//     serverTimeout: 35000,
//     individualRequestTimeout: 30000,
//     maxUrlLength: 2048,
// };
//
// export default staticConfig;

