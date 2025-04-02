import { REST, Routes } from "discord.js";
import { CommandHandler } from "./handlers/CommandHandler";
import config from "./config/config";
import dotenv from 'dotenv';
import { Client, GatewayIntentBits } from "discord.js";
dotenv.config({ path: '.env.local' });

const env = (process.env.NODE_ENV || 'development') as 'development' | 'test' | 'production';

// Créer un client Discord temporaire pour l'initialisation des commandes
// C'est pour résoudre l'erreur TS2554: Expected 1 argument, but got 0
const dummyClient = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// Initialiser CommandHandler avec le client
const commandHandler = new CommandHandler(dummyClient);

const rest = new REST({ version: "10" }).setToken(config[env].discord.token);

(async () => {
    try {
        // S'assurer que CommandHandler est initialisé
        await commandHandler.initialize();

        console.log("🔍 Récupération des commandes...");

        // Utiliser directement les commandes et appliquer toJSON()
        const commands = commandHandler.getCommands().map(cmd => {
            // Utiliser la méthode getSlashCommand() et convertir en JSON
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