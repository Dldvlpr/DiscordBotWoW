import { Client, GatewayIntentBits } from "discord.js";
import { config } from "./config/config";
import { CommandHandler } from "./handlers/CommandHandler";
import { EventHandler } from "./handlers/EventHandler";
import { connectDB } from "./database/database";
import { loadCronJobs } from "./services/cronService";
import { sequelize } from "./models";

export class Bot {
    private readonly client: Client;
    private readonly commandHandler: CommandHandler;
    private eventHandler: EventHandler;

    constructor() {
        this.client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
        this.commandHandler = new CommandHandler();
        this.eventHandler = new EventHandler(this.client, this.commandHandler);
    }

    public async start(): Promise<void> {
        try {
            console.log("🔄 Connexion à la base de données...");
            await connectDB();
            console.log("✅ Connexion réussie.");

            console.log("🔄 Synchronisation des modèles...");
            await sequelize.sync({ alter: true }); // 🔥 S'assure que les tables sont créées
            console.log("✅ Synchronisation terminée.");

            console.log("⏳ Chargement des tâches cron...");
            await loadCronJobs();
            console.log("✅ Tâches cron chargées.");

            console.log("🤖 Connexion du bot...");
            await this.client.login(config.token);
            console.log("✅ Bot connecté avec succès !");
        } catch (err) {
            console.error("❌ Erreur au démarrage :", err);
        }
    }
}