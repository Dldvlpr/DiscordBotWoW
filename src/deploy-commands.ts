import { REST, Routes } from "discord.js";
// @ts-ignore
import { config } from "./config/config";
import { PingCommand } from "./commands/PingCommand";

const commands = [PingCommand.getSlashCommand().toJSON()];

const rest = new REST({ version: "10" }).setToken(config.token);

(async () => {
    try {
        console.log("🚀 Déploiement des commandes...");
        await rest.put(Routes.applicationCommands("TON_APPLICATION_ID"), { body: commands });
        console.log("✅ Commandes déployées avec succès!");
    } catch (error) {
        console.error("❌ Erreur lors du déploiement des commandes:", error);
    }
})();
