"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Bot = void 0;
const discord_js_1 = require("discord.js");
const config_1 = require("./config/config");
const CommandHandler_1 = require("./handlers/CommandHandler");
const EventHandler_1 = require("./handlers/EventHandler");
const database_1 = require("./database/database");
class Bot {
    constructor() {
        this.client = new discord_js_1.Client({ intents: [discord_js_1.GatewayIntentBits.Guilds] });
        this.commandHandler = new CommandHandler_1.CommandHandler();
        this.eventHandler = new EventHandler_1.EventHandler(this.client, this.commandHandler);
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield (0, database_1.connectDB)();
                yield (0, database_1.syncDatabase)();
                yield this.client.login(config_1.config.token);
                console.log("✅ Bot connecté avec succès !");
            }
            catch (err) {
                console.error("❌ Erreur au démarrage :", err);
            }
        });
    }
}
exports.Bot = Bot;
