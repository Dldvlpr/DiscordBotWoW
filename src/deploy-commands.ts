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

// Utiliser tous les intents nécessaires pour être cohérent avec Bot.ts
const dummyClient = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
    ]
});

// Create a MusicPlayer instance for the CommandHandler
const musicPlayer = new MusicPlayer(dummyClient);

// Pass the MusicPlayer to the CommandHandler
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
        console.log("🔄 Initialisation du MusicPlayer...");

        // Initialiser le MusicPlayer avec un timeout pour éviter de bloquer indéfiniment
        // Si l'initialisation prend trop de temps, on continue quand même
        try {
            await Promise.race([
                musicPlayer.initialize(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Timeout d'initialisation du MusicPlayer")), 10000)
                )
            ]);
            console.log("✅ MusicPlayer initialisé avec succès");
        } catch (error) {
            console.warn("⚠️ L'initialisation du MusicPlayer a échoué ou a pris trop de temps:", error.message);
            console.warn("⚠️ Continuation du déploiement des commandes sans MusicPlayer complètement initialisé");
            // On continue quand même pour déployer les commandes
        }

        // Puis initialiser le CommandHandler
        await commandHandler.initialize();
        console.log("✅ CommandHandler initialisé avec succès");

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

        console.log(`🚀 Déploiement de ${commands.length} commandes...`);

        const result = await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands }
        );

        // @ts-ignore
        console.log(`✅ ${result.length} commandes déployées avec succès!`);

        try {
            musicPlayer.destroy();
        } catch (e) {
            console.warn("⚠️ Erreur lors de la destruction du MusicPlayer:", e.message);
        }

        process.exit(0);
    } catch (error) {
        console.error("❌ Erreur lors du déploiement des commandes:", error);
        process.exit(1);
    }
})();