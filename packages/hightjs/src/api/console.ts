/*
 * This file is part of the HightJS Project.
 * Copyright (c) 2025 itsmuzin
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import boxen, { Options as BoxenOptions } from 'boxen';
import readline from 'node:readline';

/**
 * Um "handle" para uma linha dinâmica. As instâncias desta classe
 * são retornadas por `Console.dynamicLine()` e usadas para controlar
 * o conteúdo da linha.
 */
export class DynamicLine {
    // A ID é usada internamente pela classe Console para rastrear esta linha.
    private readonly _id = Symbol();

    constructor(initialContent: string) {
        // Registra esta nova linha na classe Console para que ela seja renderizada.
        Console['registerDynamicLine'](this._id, initialContent);
    }

    /**
     * Atualiza o conteúdo da linha no console.
     * @param newContent O novo texto a ser exibido.
     */
    update(newContent: string): void {
        Console['updateDynamicLine'](this._id, newContent);
    }

    /**
     * Finaliza a linha, opcionalmente com um texto final, e a torna estática.
     * @param finalContent O texto final a ser exibido.
     */
    end(finalContent: string): void {
        Console['endDynamicLine'](this._id, finalContent);
    }
}

export enum Colors {
    Reset = "\x1b[0m",
    Bright = "\x1b[1m",
    Dim = "\x1b[2m",
    Underscore = "\x1b[4m",
    Blink = "\x1b[5m",
    Reverse = "\x1b[7m",
    Hidden = "\x1b[8m",

    FgBlack = "\x1b[30m",
    FgRed = "\x1b[31m",
    FgGreen = "\x1b[32m",
    FgYellow = "\x1b[33m",
    FgBlue = "\x1b[34m",
    FgMagenta = "\x1b[35m",
    FgCyan = "\x1b[36m",
    FgWhite = "\x1b[37m",
    FgGray = "\x1b[90m",   // ← adicionado

    BgBlack = "\x1b[40m",
    BgRed = "\x1b[41m",
    BgGreen = "\x1b[42m",
    BgYellow = "\x1b[43m",
    BgBlue = "\x1b[44m",
    BgMagenta = "\x1b[45m",
    BgCyan = "\x1b[46m",
    BgWhite = "\x1b[47m",
    BgGray = "\x1b[100m",  // ← adicionado
}


export enum Levels {
    ERROR = "ERROR",
    WARN = "WARN",
    INFO = "INFO",
    DEBUG = "DEBUG",
    SUCCESS = "SUCCESS"
}

export default class Console {
    // Armazena o estado de todas as linhas dinâmicas ativas
    private static activeLines: { id: symbol; content: string }[] = [];

    // Quantas linhas foram efetivamente renderizadas na última operação.
    // Usamos esse contador para evitar off-by-one ao mover o cursor para
    // redesenhar o bloco dinâmico.
    private static lastRenderedLines = 0;

    // --- MÉTODOS PRIVADOS PARA GERENCIAR A RENDERIZAÇÃO ---

    /**
     * Limpa todas as linhas dinâmicas da tela e as redesenha com o conteúdo atualizado.
     * Observação: usamos lastRenderedLines para saber quantas linhas mover
     * o cursor para cima (isso evita mover para cima demais quando uma nova
     * linha foi registrada).
     */
    private static redrawDynamicLines(): void {
        const stream = process.stdout;

        // Se anteriormente renderizamos N linhas, movemos o cursor para cima N
        // para chegar ao topo do bloco dinâmico. Se N for 0, não movemos.
        if (this.lastRenderedLines > 0) {
            try {
                readline.moveCursor(stream, 0, -this.lastRenderedLines);
            } catch (_e) {
                // Em terminais estranhos a movimentação pode falhar — ignoramos.
            }
        }

        // Posiciona no início da linha e limpa tudo abaixo (removendo o bloco antigo).
        readline.cursorTo(stream, 0);
        readline.clearScreenDown(stream);

        // Reescreve as linhas com o conteúdo atualizado
        if (this.activeLines.length > 0) {
            stream.write(this.activeLines.map(l => l.content).join('\n') + '\n');
        }

        // Atualiza o contador de linhas que agora estão renderizadas.
        this.lastRenderedLines = this.activeLines.length;
    }

    /**
     * Envolve a escrita de texto estático (logs normais) para não interferir
     * com as linhas dinâmicas.
     */
    private static writeStatic(content: string): void {
        const stream = process.stdout;

        // Se há um bloco dinâmico na tela, removemos (limpamos) ele antes de
        // escrever o conteúdo estático — assim evitamos misturar a saída.
        if (this.lastRenderedLines > 0) {
            try {
                readline.moveCursor(stream, 0, -this.lastRenderedLines);
            } catch (_e) {}
            readline.cursorTo(stream, 0);
            readline.clearScreenDown(stream);
        }

        // Garante que o conteúdo termine com quebra de linha.
        if (!content.endsWith('\n')) content += '\n';
        stream.write(content);

        // Depois de escrever o log estático, redesenhamos o bloco dinâmico abaixo dele.
        if (this.activeLines.length > 0) {
            stream.write(this.activeLines.map(l => l.content).join('\n') + '\n');
            this.lastRenderedLines = this.activeLines.length;
        } else {
            this.lastRenderedLines = 0;
        }
    }

    // --- MÉTODOS CHAMADOS PELA CLASSE DynamicLine ---
    private static registerDynamicLine(id: symbol, content: string): void {
        // Adiciona a nova linha à lista de linhas ativas
        this.activeLines.push({ id, content });
        // Redesenha todo o bloco (usa lastRenderedLines internamente)
        this.redrawDynamicLines();
    }

    private static updateDynamicLine(id: symbol, newContent: string): void {
        const line = this.activeLines.find(l => l.id === id);
        if (line) {
            line.content = newContent;
            this.redrawDynamicLines();
        }
    }

    private static endDynamicLine(id: symbol, finalContent: string): void {
        const lineIndex = this.activeLines.findIndex(l => l.id === id);
        if (lineIndex > -1) {
            // Remove a linha da lista de ativas.
            this.activeLines.splice(lineIndex, 1);

            // Escreve o conteúdo final como uma linha estática.
            // writeStatic cuidará de limpar e redesenhar as linhas dinâmicas
            // restantes no lugar certo.
            this.writeStatic(finalContent + '\n');
        }
    }

    // --- MÉTODOS DE LOG PÚBLICOS (MODIFICADOS) ---
    static error(...args: any[]): void { this.log(Levels.ERROR, ...args); }
    static warn(...args: any[]): void { this.log(Levels.WARN, ...args); }
    static info(...args: any[]): void { this.log(Levels.INFO, ...args); }
    static success(...args: any[]): void { this.log(Levels.SUCCESS, ...args); }
    static debug(...args: any[]): void { this.log(Levels.DEBUG, ...args); }

    static logCustomLevel(levelName: string, without: boolean = true, color?: Colors, ...args: any[]): void {
        if (without) { this.logWithout(levelName as Levels, color, ...args); }
        else { this.log(levelName as Levels, color, ...args); }
    }

    static logWithout(level: Levels, colors?:Colors, ...args: any[]): void {

        const color = colors ? colors :  level === Levels.ERROR ? Colors.BgRed : level === Levels.WARN ? Colors.BgYellow : level === Levels.INFO ? Colors.BgMagenta : level === Levels.SUCCESS ? Colors.BgGreen : Colors.BgCyan;

        let output = "";
        for (const arg of args) {
            let msg = (arg instanceof Error) ? arg.stack : (typeof arg === 'string') ? arg : JSON.stringify(arg, null, 2);
            if (msg) output += `  ${color} ${level} ${Colors.Reset} ${msg}\n`;
        }
        this.writeStatic(output);
    }

    static log(level: Levels, colors?: Colors, ...args: any[]): void {
        const color = colors || level === Levels.ERROR ? Colors.BgRed : level === Levels.WARN ? Colors.BgYellow : level === Levels.INFO ? Colors.BgMagenta : level === Levels.SUCCESS ? Colors.BgGreen : Colors.BgCyan;
        let output = "\n";
        for (const arg of args) {
            let msg = (arg instanceof Error) ? arg.stack : (typeof arg === 'string') ? arg : JSON.stringify(arg, null, 2);
            if (msg) output += `  ${color} ${level} ${Colors.Reset} ${msg}\n`;
        }
        this.writeStatic(output);
    }

    // --- OUTROS MÉTODOS ---
    static async ask(question: string, defaultValue?: string): Promise<string> {
        // Garantimos que o bloco dinâmico atual seja temporariamente removido
        // (redesenhado depois) para não poluir o prompt.
        const stream = process.stdout;
        if (this.lastRenderedLines > 0) {
            try { readline.moveCursor(stream, 0, -this.lastRenderedLines); } catch (_e) {}
            readline.cursorTo(stream, 0);
            readline.clearScreenDown(stream);
        }

        const readlineInterface = readline.createInterface({ input: process.stdin, output: process.stdout });
        const coloredQuestion = ` ${Colors.FgMagenta}${question}${Colors.Reset}`;
        const defaultValuePart = defaultValue ? ` [${Colors.Reset}${Colors.FgCyan}${defaultValue}${Colors.Reset}]` : '';
        const fullPrompt = `${coloredQuestion}${defaultValuePart}:\n > `;

        return new Promise(resolve => {
            readlineInterface.question(fullPrompt, ans => {
                readlineInterface.close();
                const value = ans.trim();
                // Redesenha as linhas dinâmicas após o prompt
                this.redrawDynamicLines();
                resolve(value === '' && defaultValue !== undefined ? defaultValue : value);
            });
        });
    }

    static async confirm(message: string, defaultYes = false): Promise<boolean> {
        const suffix = defaultYes ? 'yes' : 'no';
        while (true) {
            const ans = (await this.ask(message + " (yes/no)", suffix)).toLowerCase();
            if (!ans) return defaultYes;
            if (['y','yes'].includes(ans)) return true;
            if (['n','no'].includes(ans)) return false;
            this.warn('Resposta inválida, digite y ou n.');
        }
    }

    static table(data: Record<string, any> | Array<{ Field: string, Value: any }>): void {
        let rows: Array<{ Field: string, Value: any }>;
        if (Array.isArray(data)) {
            rows = data.map(row => ({ Field: String(row.Field), Value: String(row.Value) }));
        } else {
            rows = Object.entries(data).map(([Field, Value]) => ({ Field, Value: String(Value) }));
        }
        const fieldLen = Math.max(...rows.map(r => r.Field.length), 'Field'.length);
        const valueLen = Math.max(...rows.map(r => r.Value.length), 'Value'.length);
        const sep = `+${'-'.repeat(fieldLen+2)}+${'-'.repeat(valueLen+2)}+`;
        let output = sep + '\n';
        output += `| ${Colors.FgGreen}${'Field'.padEnd(fieldLen)}${Colors.Reset} | ${Colors.FgGreen}${'Value'.padEnd(valueLen)}${Colors.Reset} |\n`;
        output += sep + '\n';
        for (const row of rows) {
            output += `| ${row.Field.padEnd(fieldLen)} | ${row.Value.padEnd(valueLen)} |\n`;
        }
        output += sep + '\n';
        this.writeStatic(output);
    }

    static box(content: string, options?: BoxenOptions): void {
        const defaultOptions: BoxenOptions = {
            padding: 1,
            margin: 1,
            borderStyle: 'round',
            borderColor: 'whiteBright',
            titleAlignment: 'left',
        };
        const finalOptions = { ...defaultOptions, ...options };
        const boxedContent = boxen(content, finalOptions);
        this.writeStatic(boxedContent + '\n');
    }

    /**
     * Cria e retorna um controlador para uma linha dinâmica no console.
     * @param initialContent O conteúdo inicial a ser exibido.
     * @returns Uma instância de DynamicLine para controlar a linha.
     */
    static dynamicLine(initialContent: string): DynamicLine {
        return new DynamicLine(initialContent);
    }
}
