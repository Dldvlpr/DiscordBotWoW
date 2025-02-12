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
const discord_js_1 = require("discord.js");
// @ts-ignore
const config_1 = require("./config/config");
const PingCommand_1 = require("./commands/PingCommand");
const commands = [PingCommand_1.PingCommand.getSlashCommand().toJSON()];
const rest = new discord_js_1.REST({ version: "10" }).setToken(config_1.config.token);
(() => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("🚀 Déploiement des commandes...");
        yield rest.put(discord_js_1.Routes.applicationCommands("TON_APPLICATION_ID"), { body: commands });
        console.log("✅ Commandes déployées avec succès!");
    }
    catch (error) {
        console.error("❌ Erreur lors du déploiement des commandes:", error);
    }
}))();
