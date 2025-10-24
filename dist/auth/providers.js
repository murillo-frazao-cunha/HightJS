"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleProvider = exports.DiscordProvider = exports.CredentialsProvider = void 0;
// Exportações dos providers
var credentials_1 = require("./providers/credentials");
Object.defineProperty(exports, "CredentialsProvider", { enumerable: true, get: function () { return credentials_1.CredentialsProvider; } });
var discord_1 = require("./providers/discord");
Object.defineProperty(exports, "DiscordProvider", { enumerable: true, get: function () { return discord_1.DiscordProvider; } });
var google_1 = require("./providers/google");
Object.defineProperty(exports, "GoogleProvider", { enumerable: true, get: function () { return google_1.GoogleProvider; } });
