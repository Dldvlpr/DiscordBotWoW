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
exports.EventHandler = void 0;
const discord_js_1 = require("discord.js");
// @ts-ignore
const database_1 = require("../database/database");
class EventHandler {
    constructor(client, commandHandler) {
        this.client = client;
        this.commandHandler = commandHandler;
        this.registerEvents();
    }
    registerEvents() {
        this.client.once(discord_js_1.Events.ClientReady, () => __awaiter(this, void 0, void 0, function* () {
            var _a;
            console.log(`✅ Bot connecté en tant que ${(_a = this.client.user) === null || _a === void 0 ? void 0 : _a.tag}`);
            yield (0, database_1.connectDB)();
        }));
        this.client.on(discord_js_1.Events.InteractionCreate, (interaction) => __awaiter(this, void 0, void 0, function* () {
            if (interaction.isChatInputCommand()) {
                yield this.commandHandler.handle(interaction, this.client);
            }
        }));
    }
}
exports.EventHandler = EventHandler;
