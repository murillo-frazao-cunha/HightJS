/**
 * Builds a single entry point into a single output file.
 * @param {string} entryPoint - The path to the entry file.
 * @param {string} outfile - The full path to the output file.
 * @param {boolean} isProduction - Se está em modo produção ou não.
 * @returns {Promise<void>}
 */
export function build(entryPoint: string, outfile: string, isProduction?: boolean): Promise<void>;
/**
 * Watches an entry point and its dependencies, rebuilding to a single output file.
 * @param {string} entryPoint - The path to the entry file.
 * @param {string} outfile - The full path to the output file.
 * @param {Object} hotReloadManager - Manager de hot reload (opcional).
 * @returns {Promise<void>}
 */
export function watch(entryPoint: string, outfile: string, hotReloadManager?: Object): Promise<void>;
/**
 * Builds with code splitting into multiple chunks based on module types.
 * @param {string} entryPoint - The path to the entry file.
 * @param {string} outdir - The directory for output files.
 * @param {boolean} isProduction - Se está em modo produção ou não.
 * @returns {Promise<void>}
 */
export function buildWithChunks(entryPoint: string, outdir: string, isProduction?: boolean): Promise<void>;
/**
 * Watches with code splitting enabled
 * @param {string} entryPoint - The path to the entry file.
 * @param {string} outdir - The directory for output files.
 * @param {Object} hotReloadManager - Manager de hot reload (opcional).
 * @returns {Promise<void>}
 */
export function watchWithChunks(entryPoint: string, outdir: string, hotReloadManager?: Object): Promise<void>;
