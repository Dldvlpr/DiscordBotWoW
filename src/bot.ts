import dotenv from 'dotenv';
dotenv.config();

import { Client, GatewayIntentBits } from 'discord.js';
import { config } from './config/config';
import { CommandHandler } from './handlers/CommandHandler';
import { EventHandler } from './handlers/EventHandler';
import { loadCronJobs } from './services/cronService';
import { sequelize } from './database/sequelize';
import {initDatabase} from "./database";
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
            intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
        });

        this.commandHandler = new CommandHandler();
        this.eventHandler = new EventHandler(this.client, this.commandHandler);
    }

    public async start(): Promise<void> {
        try {
            console.log("🔍 Vérification et création de la base de données si nécessaire...");
            await initDatabase(this.dbName);
            console.log("✅ Base de données vérifiée ou créée avec succès.");

            console.log("🔄 Connexion à la base de données...");
            await sequelize.authenticate();
            console.log("✅ Connexion à la base de données réussie.");

            console.log("📦 Synchronisation des modèles avec la base de données...");
            await sequelize.sync({ alter: true });
            console.log("✅ Synchronisation des modèles terminée.");

            console.log("⏳ Chargement des tâches cron...");
            await loadCronJobs();
            console.log("✅ Tâches cron chargées.");

            console.log("🤖 Connexion du bot Discord...");
            await this.client.login(config.discord.token);
            console.log("✅ Bot connecté avec succès !");
        } catch (error) {
            console.error("❌ Erreur au démarrage :", error);
            process.exit(1);
        }
    }
}