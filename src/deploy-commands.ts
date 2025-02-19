import { REST, Routes } from "discord.js";
import { CommandHandler } from "./handlers/CommandHandler";
import config from "./config/config";
import dotenv from 'dotenv';
dotenv.config();

const env = (process.env.NODE_ENV || 'development') as 'development' | 'test' | 'production';

// Création d'une instance de CommandHandler pour récupérer toutes les commandes
const commandHandler = new CommandHandler();

const rest = new REST({ version: "10" }).setToken(config[env].discord.token);

(async () => {
    try {
        console.log("🔍 Récupération des commandes...");
        const commands = commandHandler.getCommands().map(cmd =>
            (cmd.constructor as any).getSlashCommand().toJSON()
        );

        console.log("🚀 Déploiement des commandes...");
        await rest.put(
            Routes.applicationGuildCommands(
                config[env].discord.clientId,
                config[env].discord.guildId,
            ),
            { body: commands }
        );
        console.log("✅ Commandes déployées avec succès!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Erreur lors du déploiement des commandes:", error);
        process.exit(1);
    }
})();