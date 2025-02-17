import { Client, Message } from 'discord.js';
import { CommandHandler } from './CommandHandler';

export class EventHandler {
    constructor(private client: Client, private commandHandler: CommandHandler) {
        this.registerEvents();
    }

    private registerEvents(): void {
        this.client.on('messageCreate', (message: Message) => {
            if (message.author.bot) return;

            const prefix = '!';
            if (!message.content.startsWith(prefix)) return;

            const [command, ...args] = message.content.slice(prefix.length).trim().split(/\s+/);
            this.commandHandler.handleCommand(command, args);
        });
    }
}