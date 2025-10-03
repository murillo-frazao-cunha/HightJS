"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpressAdapter = void 0;
class ExpressAdapter {
    constructor() {
        this.type = 'express';
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
    createResponse(res) {
        return new ExpressResponseWrapper(res);
    }
}
exports.ExpressAdapter = ExpressAdapter;
class ExpressResponseWrapper {
    constructor(res) {
        this.res = res;
    }
    get raw() {
        return this.res;
    }
    status(code) {
        this.res.status(code);
        return this;
    }
    header(name, value) {
        this.res.setHeader(name, value);
        return this;
    }
    cookie(name, value, options) {
        this.res.cookie(name, value, options || {});
        return this;
    }
    clearCookie(name, options) {
        // Filter out the deprecated 'expires' option to avoid Express deprecation warning
        const { expires, ...filteredOptions } = options || {};
        this.res.clearCookie(name, filteredOptions);
        return this;
    }
    json(data) {
        this.res.json(data);
    }
    text(data) {
        this.res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        this.res.send(data);
    }
    send(data) {
        this.res.send(data);
    }
    redirect(url) {
        this.res.redirect(url);
    }
}
