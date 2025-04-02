import { REST, Routes } from "discord.js";
import { CommandHandler } from "./handlers/CommandHandler";
import config from "./config/config";
import dotenv from 'dotenv';
import { Client, GatewayIntentBits } from "discord.js";
dotenv.config({ path: '.env.local' });

const env = (process.env.NODE_ENV || 'development') as 'development' | 'test' | 'production';

const dummyClient = new Client({
    intents: [GatewayIntentBits.Guilds]
});

const commandHandler = new CommandHandler(dummyClient);

const rest = new REST({ version: "10" }).setToken(config[env].discord.token);

(async () => {
    try {
        await commandHandler.initialize();

        console.log("🔍 Récupération des commandes...");

        const commands = commandHandler.getCommands().map(cmd => {
            return cmd.getSlashCommand().toJSON();
        });

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