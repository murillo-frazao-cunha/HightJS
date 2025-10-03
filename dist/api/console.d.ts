import { Options as BoxenOptions } from 'boxen';
/**
 * Um "handle" para uma linha dinâmica. As instâncias desta classe
 * são retornadas por `Console.dynamicLine()` e usadas para controlar
 * o conteúdo da linha.
 */
export declare class DynamicLine {
    private readonly _id;
    constructor(initialContent: string);
    /**
     * Atualiza o conteúdo da linha no console.
     * @param newContent O novo texto a ser exibido.
     */
    update(newContent: string): void;
    /**
     * Finaliza a linha, opcionalmente com um texto final, e a torna estática.
     * @param finalContent O texto final a ser exibido.
     */
    end(finalContent: string): void;
}
export declare enum Colors {
    Reset = "\u001B[0m",
    Bright = "\u001B[1m",
    Dim = "\u001B[2m",
    Underscore = "\u001B[4m",
    Blink = "\u001B[5m",
    Reverse = "\u001B[7m",
    Hidden = "\u001B[8m",
    FgBlack = "\u001B[30m",
    FgRed = "\u001B[31m",
    FgGreen = "\u001B[32m",
    FgYellow = "\u001B[33m",
    FgBlue = "\u001B[34m",
    FgMagenta = "\u001B[35m",
    FgCyan = "\u001B[36m",
    FgWhite = "\u001B[37m",
    BgBlack = "\u001B[40m",
    BgRed = "\u001B[41m",
    BgGreen = "\u001B[42m",
    BgYellow = "\u001B[43m",
    BgBlue = "\u001B[44m",
    BgMagenta = "\u001B[45m",
    BgCyan = "\u001B[46m",
    BgWhite = "\u001B[47m"
}
export declare enum Levels {
    ERROR = "ERROR",
    WARN = "WARN",
    INFO = "INFO",
    DEBUG = "DEBUG",
    SUCCESS = "SUCCESS"
}
export default class Console {
    private static activeLines;
    private static lastRenderedLines;
    /**
     * Limpa todas as linhas dinâmicas da tela e as redesenha com o conteúdo atualizado.
     * Observação: usamos lastRenderedLines para saber quantas linhas mover
     * o cursor para cima (isso evita mover para cima demais quando uma nova
     * linha foi registrada).
     */
    private static redrawDynamicLines;
    /**
     * Envolve a escrita de texto estático (logs normais) para não interferir
     * com as linhas dinâmicas.
     */
    private static writeStatic;
    private static registerDynamicLine;
    private static updateDynamicLine;
    private static endDynamicLine;
    static error(...args: any[]): void;
    static warn(...args: any[]): void;
    static info(...args: any[]): void;
    static success(...args: any[]): void;
    static debug(...args: any[]): void;
    static logCustomLevel(levelName: string, without?: boolean, ...args: any[]): void;
    static logWithout(level: Levels, ...args: any[]): void;
    static log(level: Levels, ...args: any[]): void;
    static ask(question: string, defaultValue?: string): Promise<string>;
    static confirm(message: string, defaultYes?: boolean): Promise<boolean>;
    static table(data: Record<string, any> | Array<{
        Field: string;
        Value: any;
    }>): void;
    static box(content: string, options?: BoxenOptions): void;
    /**
     * Cria e retorna um controlador para uma linha dinâmica no console.
     * @param initialContent O conteúdo inicial a ser exibido.
     * @returns Uma instância de DynamicLine para controlar a linha.
     */
    static dynamicLine(initialContent: string): DynamicLine;
}
