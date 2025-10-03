"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FastifyAdapter = void 0;
class FastifyAdapter {
    constructor() {
        this.type = 'fastify';
    }
    parseRequest(req) {
        return {
            method: req.method,
            url: req.url,
            headers: req.headers,
            body: req.body,
            query: req.query,
            params: req.params,
            cookies: req.cookies || {},
            raw: req
        };
    }
    createResponse(reply) {
        return new FastifyResponseWrapper(reply);
    }
}
exports.FastifyAdapter = FastifyAdapter;
class FastifyResponseWrapper {
    constructor(reply) {
        this.reply = reply;
    }
    get raw() {
        return this.reply;
    }
    status(code) {
        this.reply.status(code);
        return this;
    }
    header(name, value) {
        this.reply.header(name, value);
        return this;
    }
    cookie(name, value, options) {
        this.reply.setCookie(name, value, options);
        return this;
    }
    clearCookie(name, options) {
        this.reply.clearCookie(name, options);
        return this;
    }
    json(data) {
        this.reply.send(data);
    }
    text(data) {
        this.reply.type('text/plain; charset=utf-8');
        this.reply.send(data);
    }
    send(data) {
        this.reply.send(data);
    }
    redirect(url) {
        this.reply.redirect(url);
    }
}
