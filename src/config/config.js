"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
var dotenv = require("dotenv");
dotenv.config({ path: '.env.local' });
var commonDBConfig = {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || null,
    host: process.env.DB_HOST || '127.0.0.1',
    dialect: process.env.DB_DIALECT || 'postgres',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
};
var discordConfig = {
    token: process.env.DISCORD_TOKEN || '',
    clientId: process.env.DISCORD_CLIENT_ID || '',
    guildId: process.env.DISCORD_GUILD_ID || '',
};
var config = {
    development: __assign(__assign({}, commonDBConfig), { database: process.env.DB_NAME || 'discordBot', discord: discordConfig }),
    test: __assign(__assign({}, commonDBConfig), { database: process.env.DB_NAME ? "".concat(process.env.DB_NAME, "_test") : 'discordBot_test', discord: discordConfig }),
    production: __assign(__assign({}, commonDBConfig), { database: process.env.DB_NAME ? "".concat(process.env.DB_NAME, "_production") : 'discordBot_production', discord: discordConfig }),
};
module.exports = config;
exports.default = config;
