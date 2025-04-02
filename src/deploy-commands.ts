// src/deploy-commands.ts
import dotenv from 'dotenv';
import { REST, Routes } from "discord.js";
import { CommandHandler } from "./handlers/CommandHandler";
import { Client, GatewayIntentBits } from "discord.js";
import configModule from "./config/config"; // Modifiez cette ligne

dotenv.config({ path: '.env.local' });

const env = (process.env.NODE_ENV || 'development') as 'development' | 'test' | 'production';
const config = configModule; // Assurez-vous que c'est la bonne structure

// Vérifiez d'abord que la configuration est chargée correctement
console.log("Configuration chargée:", env, config && typeof config === 'object');

const dummyClient = new Client({
    intents: [GatewayIntentBits.Guilds]
});

const commandHandler = new CommandHandler(dummyClient);

// Utilisez les valeurs d'environnement directement en cas de problème
const token = config?.[env]?.discord?.token || process.env.DISCORD_TOKEN;
const clientId = config?.[env]?.discord?.clientId || process.env.DISCORD_CLIENT_ID;
const guildId = config?.[env]?.discord?.guildId || process.env.DISCORD_GUILD_ID;

if (!token || !clientId || !guildId) {
    console.error("❌ Configuration manquante. Vérifiez vos variables d'environnement.");
    process.exit(1);
}

const rest = new REST({ version: "10" }).setToken(token);

(async () => {
    try {
        await commandHandler.initialize();

        console.log("🔍 Récupération des commandes...");

        const commands = commandHandler.getCommands().map(cmd => {
            return cmd.getSlashCommand().toJSON();
        });

        console.log("🚀 Déploiement des commandes...");
        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands }
        );
        console.log("✅ Commandes déployées avec succès!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Erreur lors du déploiement des commandes:", error);
        process.exit(1);
    }
})();