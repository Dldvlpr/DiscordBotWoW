import dotenv from 'dotenv';
import { REST, Routes } from "discord.js";
import { CommandHandler } from "./handlers/CommandHandler";
import { Client, GatewayIntentBits } from "discord.js";
import configModule from "./config/config";
import { MusicPlayer } from './audio/MusicPlayer';

dotenv.config({ path: '.env.local' });

const env = (process.env.NODE_ENV || 'development') as 'development' | 'test' | 'production';
const config = configModule;

console.log("Configuration chargée:", env, config && typeof config === 'object');

const dummyClient = new Client({
    intents: [GatewayIntentBits.Guilds]
});

const musicPlayer = new MusicPlayer(dummyClient);
const commandHandler = new CommandHandler(dummyClient, musicPlayer);
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
        await musicPlayer.initialize();
        console.log("✅ MusicPlayer initialized successfully");

        await commandHandler.initialize();
        console.log("✅ CommandHandler initialized successfully");

        console.log("🔍 Récupération des commandes...");

        const commands = commandHandler.getCommands().map(cmd => {
            console.log(`- ${cmd.constructor.name}`);
            const uniqueCommands = new Map();

            if ('getSlashCommand' in cmd.constructor && typeof cmd.constructor.getSlashCommand === 'function') {
                const slash = cmd.constructor.getSlashCommand().toJSON();
                if (!uniqueCommands.has(slash.name)) {
                    uniqueCommands.set(slash.name, slash);
                }
            } else {
                // @ts-ignore
                const slash = cmd.getSlashCommand().toJSON();
                if (!uniqueCommands.has(slash.name)) {
                    uniqueCommands.set(slash.name, slash);
                }
            }

            return Array.from(uniqueCommands.values());
        }).flat();

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