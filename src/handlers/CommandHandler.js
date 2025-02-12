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
exports.CommandHandler = void 0;
const discord_js_1 = require("discord.js");
const PingCommand_1 = require("../commands/PingCommand");
class CommandHandler {
    constructor() {
        this.commands = new discord_js_1.Collection();
        this.loadCommands();
    }
    loadCommands() {
        const commandsArray = [new PingCommand_1.PingCommand()];
        for (const command of commandsArray) {
            this.commands.set(command.name, command);
        }
    }
    handle(interaction, client) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!interaction.isChatInputCommand())
                return;
            const command = this.commands.get(interaction.commandName);
            if (command) {
                yield command.execute(interaction, client);
            }
        });
    }
    getCommands() {
        return this.commands;
    }
}
exports.CommandHandler = CommandHandler;
