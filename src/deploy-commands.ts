import { REST, Routes } from "discord.js";
import { config } from "./config/config";
import { PingCommand } from "./commands/PingCommand";

const commands = [PingCommand.getSlashCommand().toJSON()];

const rest = new REST({ version: "10" }).setToken(config.discord.token);

(async () => {
    try {
        console.log("🚀 Déploiement des commandes...");
        await rest.put(Routes.applicationCommands(<string> config.discord.clientId), { body: commands });
        console.log("✅ Commandes déployées avec succès!");
    } catch (error) {
        console.error("❌ Erreur lors du déploiement des commandes:", error);
    }
})();
