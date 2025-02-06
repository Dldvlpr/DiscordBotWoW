import { Client, GatewayIntentBits } from "discord.js";
import { config } from "./config/config";
import { CommandHandler } from "./handlers/CommandHandler";
import { EventHandler } from "./handlers/EventHandler";
import { connectDB, syncDatabase } from "./database/database";

export class Bot {
    private client: Client;
    private commandHandler: CommandHandler;
    private eventHandler: EventHandler;

    constructor() {
        this.client = new Client({ intents: [GatewayIntentBits.Guilds] });
        this.commandHandler = new CommandHandler();
        this.eventHandler = new EventHandler(this.client, this.commandHandler);
    }

    public async start(): Promise<void> {
        try {
            await connectDB();
            await syncDatabase();

            await this.client.login(config.token);
            console.log("✅ Bot connecté avec succès !");
        } catch (err) {
            console.error("❌ Erreur au démarrage :", err);
        }
    }
}
