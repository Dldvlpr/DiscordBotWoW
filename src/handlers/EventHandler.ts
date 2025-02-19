import { Client, Message, Events, GatewayIntentBits } from 'discord.js';
import { CommandHandler } from './CommandHandler';

export class EventHandler {
    constructor(private client: Client, private commandHandler: CommandHandler) {
        this.registerEvents();
    }

    private registerEvents(): void {
        this.client.once(Events.ClientReady, () => {
            console.log(`✅ Bot prêt ! Connecté en tant que ${this.client.user?.tag}`);
        });

        this.client.on(Events.MessageCreate, (message: Message) => {
            if (message.author.bot) return;

            const prefix = '!';
            if (!message.content.startsWith(prefix)) return;

            const [command, ...args] = message.content.slice(prefix.length).trim().split(/\s+/);
            this.commandHandler.handleCommand(command, args);
        });
    }
}