"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Levels = exports.Colors = exports.DynamicLine = void 0;
const boxen_1 = __importDefault(require("boxen"));
const node_readline_1 = __importDefault(require("node:readline"));
/**
 * Um "handle" para uma linha dinâmica. As instâncias desta classe
 * são retornadas por `Console.dynamicLine()` e usadas para controlar
 * o conteúdo da linha.
 */
class DynamicLine {
    constructor(initialContent) {
        // A ID é usada internamente pela classe Console para rastrear esta linha.
        this._id = Symbol();
        // Registra esta nova linha na classe Console para que ela seja renderizada.
        Console['registerDynamicLine'](this._id, initialContent);
    }
    /**
     * Atualiza o conteúdo da linha no console.
     * @param newContent O novo texto a ser exibido.
     */
    update(newContent) {
        Console['updateDynamicLine'](this._id, newContent);
    }
    /**
     * Finaliza a linha, opcionalmente com um texto final, e a torna estática.
     * @param finalContent O texto final a ser exibido.
     */
    end(finalContent) {
        Console['endDynamicLine'](this._id, finalContent);
    }
}
exports.DynamicLine = DynamicLine;
var Colors;
(function (Colors) {
    Colors["Reset"] = "\u001B[0m";
    Colors["Bright"] = "\u001B[1m";
    Colors["Dim"] = "\u001B[2m";
    Colors["Underscore"] = "\u001B[4m";
    Colors["Blink"] = "\u001B[5m";
    Colors["Reverse"] = "\u001B[7m";
    Colors["Hidden"] = "\u001B[8m";
    Colors["FgBlack"] = "\u001B[30m";
    Colors["FgRed"] = "\u001B[31m";
    Colors["FgGreen"] = "\u001B[32m";
    Colors["FgYellow"] = "\u001B[33m";
    Colors["FgBlue"] = "\u001B[34m";
    Colors["FgMagenta"] = "\u001B[35m";
    Colors["FgCyan"] = "\u001B[36m";
    Colors["FgWhite"] = "\u001B[37m";
    Colors["BgBlack"] = "\u001B[40m";
    Colors["BgRed"] = "\u001B[41m";
    Colors["BgGreen"] = "\u001B[42m";
    Colors["BgYellow"] = "\u001B[43m";
    Colors["BgBlue"] = "\u001B[44m";
    Colors["BgMagenta"] = "\u001B[45m";
    Colors["BgCyan"] = "\u001B[46m";
    Colors["BgWhite"] = "\u001B[47m";
})(Colors || (exports.Colors = Colors = {}));
var Levels;
(function (Levels) {
    Levels["ERROR"] = "ERROR";
    Levels["WARN"] = "WARN";
    Levels["INFO"] = "INFO";
    Levels["DEBUG"] = "DEBUG";
    Levels["SUCCESS"] = "SUCCESS";
})(Levels || (exports.Levels = Levels = {}));
class Console {
    // --- MÉTODOS PRIVADOS PARA GERENCIAR A RENDERIZAÇÃO ---
    /**
     * Limpa todas as linhas dinâmicas da tela e as redesenha com o conteúdo atualizado.
     * Observação: usamos lastRenderedLines para saber quantas linhas mover
     * o cursor para cima (isso evita mover para cima demais quando uma nova
     * linha foi registrada).
     */
    static redrawDynamicLines() {
        const stream = process.stdout;
        // Se anteriormente renderizamos N linhas, movemos o cursor para cima N
        // para chegar ao topo do bloco dinâmico. Se N for 0, não movemos.
        if (this.lastRenderedLines > 0) {
            try {
                node_readline_1.default.moveCursor(stream, 0, -this.lastRenderedLines);
            }
            catch (_e) {
                // Em terminais estranhos a movimentação pode falhar — ignoramos.
            }
        }
        // Posiciona no início da linha e limpa tudo abaixo (removendo o bloco antigo).
        node_readline_1.default.cursorTo(stream, 0);
        node_readline_1.default.clearScreenDown(stream);
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
    static writeStatic(content) {
        const stream = process.stdout;
        // Se há um bloco dinâmico na tela, removemos (limpamos) ele antes de
        // escrever o conteúdo estático — assim evitamos misturar a saída.
        if (this.lastRenderedLines > 0) {
            try {
                node_readline_1.default.moveCursor(stream, 0, -this.lastRenderedLines);
            }
            catch (_e) { }
            node_readline_1.default.cursorTo(stream, 0);
            node_readline_1.default.clearScreenDown(stream);
        }
        // Garante que o conteúdo termine com quebra de linha.
        if (!content.endsWith('\n'))
            content += '\n';
        stream.write(content);
        // Depois de escrever o log estático, redesenhamos o bloco dinâmico abaixo dele.
        if (this.activeLines.length > 0) {
            stream.write(this.activeLines.map(l => l.content).join('\n') + '\n');
            this.lastRenderedLines = this.activeLines.length;
        }
        else {
            this.lastRenderedLines = 0;
        }
    }
    // --- MÉTODOS CHAMADOS PELA CLASSE DynamicLine ---
    static registerDynamicLine(id, content) {
        // Adiciona a nova linha à lista de linhas ativas
        this.activeLines.push({ id, content });
        // Redesenha todo o bloco (usa lastRenderedLines internamente)
        this.redrawDynamicLines();
    }
    static updateDynamicLine(id, newContent) {
        const line = this.activeLines.find(l => l.id === id);
        if (line) {
            line.content = newContent;
            this.redrawDynamicLines();
        }
    }
    static endDynamicLine(id, finalContent) {
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
    static error(...args) { this.log(Levels.ERROR, ...args); }
    static warn(...args) { this.log(Levels.WARN, ...args); }
    static info(...args) { this.log(Levels.INFO, ...args); }
    static success(...args) { this.log(Levels.SUCCESS, ...args); }
    static debug(...args) { this.log(Levels.DEBUG, ...args); }
    static logCustomLevel(levelName, without = true, ...args) {
        if (without) {
            this.logWithout(levelName, ...args);
        }
        else {
            this.log(levelName, ...args);
        }
    }
    static logWithout(level, ...args) {
        const color = level === Levels.ERROR ? Colors.FgRed : level === Levels.WARN ? Colors.FgYellow : level === Levels.INFO ? Colors.FgMagenta : level === Levels.SUCCESS ? Colors.FgGreen : Colors.FgCyan;
        let output = "";
        for (const arg of args) {
            let msg = (arg instanceof Error) ? arg.stack : (typeof arg === 'string') ? arg : JSON.stringify(arg, null, 2);
            if (msg)
                output += `  ${color}${level}  ${Colors.Reset}${msg}\n`;
        }
        this.writeStatic(output);
    }
    static log(level, ...args) {
        const color = level === Levels.ERROR ? Colors.FgRed : level === Levels.WARN ? Colors.FgYellow : level === Levels.INFO ? Colors.FgMagenta : level === Levels.SUCCESS ? Colors.FgGreen : Colors.FgCyan;
        let output = "\n";
        for (const arg of args) {
            let msg = (arg instanceof Error) ? arg.stack : (typeof arg === 'string') ? arg : JSON.stringify(arg, null, 2);
            if (msg)
                output += `  ${color}${level}  ${Colors.Reset}${msg}\n`;
        }
        this.writeStatic(output);
    }
    // --- OUTROS MÉTODOS ---
    static async ask(question, defaultValue) {
        // Garantimos que o bloco dinâmico atual seja temporariamente removido
        // (redesenhado depois) para não poluir o prompt.
        const stream = process.stdout;
        if (this.lastRenderedLines > 0) {
            try {
                node_readline_1.default.moveCursor(stream, 0, -this.lastRenderedLines);
            }
            catch (_e) { }
            node_readline_1.default.cursorTo(stream, 0);
            node_readline_1.default.clearScreenDown(stream);
        }
        const readlineInterface = node_readline_1.default.createInterface({ input: process.stdin, output: process.stdout });
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
    static async confirm(message, defaultYes = false) {
        const suffix = defaultYes ? 'yes' : 'no';
        while (true) {
            const ans = (await this.ask(message + " (yes/no)", suffix)).toLowerCase();
            if (!ans)
                return defaultYes;
            if (['y', 'yes'].includes(ans))
                return true;
            if (['n', 'no'].includes(ans))
                return false;
            this.warn('Resposta inválida, digite y ou n.');
        }
    }
    static table(data) {
        let rows;
        if (Array.isArray(data)) {
            rows = data.map(row => ({ Field: String(row.Field), Value: String(row.Value) }));
        }
        else {
            rows = Object.entries(data).map(([Field, Value]) => ({ Field, Value: String(Value) }));
        }
        const fieldLen = Math.max(...rows.map(r => r.Field.length), 'Field'.length);
        const valueLen = Math.max(...rows.map(r => r.Value.length), 'Value'.length);
        const sep = `+${'-'.repeat(fieldLen + 2)}+${'-'.repeat(valueLen + 2)}+`;
        let output = sep + '\n';
        output += `| ${Colors.FgGreen}${'Field'.padEnd(fieldLen)}${Colors.Reset} | ${Colors.FgGreen}${'Value'.padEnd(valueLen)}${Colors.Reset} |\n`;
        output += sep + '\n';
        for (const row of rows) {
            output += `| ${row.Field.padEnd(fieldLen)} | ${row.Value.padEnd(valueLen)} |\n`;
        }
        output += sep + '\n';
        this.writeStatic(output);
    }
    static box(content, options) {
        const defaultOptions = {
            padding: 1,
            margin: 1,
            borderStyle: 'round',
            borderColor: 'whiteBright',
            titleAlignment: 'left',
        };
        const finalOptions = { ...defaultOptions, ...options };
        const boxedContent = (0, boxen_1.default)(content, finalOptions);
        this.writeStatic(boxedContent + '\n');
    }
    /**
     * Cria e retorna um controlador para uma linha dinâmica no console.
     * @param initialContent O conteúdo inicial a ser exibido.
     * @returns Uma instância de DynamicLine para controlar a linha.
     */
    static dynamicLine(initialContent) {
        return new DynamicLine(initialContent);
    }
}
// Armazena o estado de todas as linhas dinâmicas ativas
Console.activeLines = [];
// Quantas linhas foram efetivamente renderizadas na última operação.
// Usamos esse contador para evitar off-by-one ao mover o cursor para
// redesenhar o bloco dinâmico.
Console.lastRenderedLines = 0;
exports.default = Console;
