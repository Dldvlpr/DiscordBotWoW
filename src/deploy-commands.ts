import { REST, Routes } from "discord.js";
import { PingCommand } from "./commands/PingCommand";
import config from "./config/config";

const env = (process.env.NODE_ENV || 'development') as 'development' | 'test' | 'production';
const commands = [PingCommand.getSlashCommand().toJSON()];

const rest = new REST({ version: "10" }).setToken(config[env].discord.token);

(async () => {
    try {
        console.log("🚀 Déploiement des commandes...");
        await rest.put(Routes.applicationCommands(config[env].discord.clientId), { body: commands });
        console.log("✅ Commandes déployées avec succès!");
    } catch (error) {
        console.error("❌ Erreur lors du déploiement des commandes:", error);
    }
})();