import dotenv from 'dotenv';
dotenv.config();

import { Client, GatewayIntentBits } from 'discord.js';
import config from './config/config';
import { CommandHandler } from './handlers/CommandHandler';
import { EventHandler } from './handlers/EventHandler';
import { loadCronJobs } from './services/cronService';
import db from './models';

const env = (process.env.NODE_ENV as 'development' | 'test' | 'production') || 'development';

export class Bot {
    private readonly client: Client;
    private readonly commandHandler: CommandHandler;
    private readonly eventHandler: EventHandler;
    private readonly dbName: string;

    constructor() {
        if (!process.env.DB_NAME) {
            console.error("❌ ERREUR : La variable d'environnement DB_NAME est manquante.");
            process.exit(1);
        }
        this.dbName = process.env.DB_NAME;

        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
            ]
        });

        this.commandHandler = new CommandHandler();
        this.eventHandler = new EventHandler(this.client, this.commandHandler);
    }

    public async start(): Promise<void> {
        try {
            console.log("🔄 Connexion à la base de données...");
            await db.sequelize.authenticate();
            console.log("✅ Connexion à la base de données réussie.");

            console.log("📦 Synchronisation des modèles avec la base de données...");
            await db.sequelize.sync({ alter: true });
            console.log("✅ Synchronisation des modèles terminée.");

            console.log("🤖 Connexion du bot Discord...");
            await this.client.login(config[env].discord.token);
            console.log("✅ Bot connecté avec succès !");
        } catch (error) {
            console.error("❌ Erreur au démarrage :", error);
            process.exit(1);
        }
    }
}