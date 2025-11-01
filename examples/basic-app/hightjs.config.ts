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
    };

    // You can customize settings based on the phase
    if (phase === 'development') {
        // In development, you might want longer timeouts for debugging
        config.requestTimeout = 60000;
        config.individualRequestTimeout = 60000;
    }

    if (phase === 'production') {
        // In production, you might want stricter limits
        config.maxHeadersCount = 50;
        config.maxUrlLength = 1024;
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

