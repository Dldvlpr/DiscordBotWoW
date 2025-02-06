import { Client, Events } from "discord.js";
import { CommandHandler } from "./CommandHandler";
// @ts-ignore
import { connectDB } from "../database/database";

export class EventHandler {
    constructor(private client: Client, private commandHandler: CommandHandler) {
        this.registerEvents();
    }

    private registerEvents() {
        this.client.once(Events.ClientReady, async () => {
            console.log(`✅ Bot connecté en tant que ${this.client.user?.tag}`);
            await connectDB();
        });

        this.client.on(Events.InteractionCreate, async (interaction) => {
            if (interaction.isChatInputCommand()) {
                await this.commandHandler.handle(interaction, this.client);
            }
        });
    }
}
