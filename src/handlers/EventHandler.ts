import { Client, Events, Interaction } from 'discord.js';
import { CommandHandler } from './CommandHandler';

export class EventHandler {
    constructor(private client: Client, private commandHandler: CommandHandler) {
        this.registerEvents();
    }

    private registerEvents(): void {
        this.client.once(Events.ClientReady, () => {
            console.log(`✅ Bot prêt ! Connecté en tant que ${this.client.user?.tag}`);
        });

        this.client.on(Events.InteractionCreate, async (interaction) => {
            if (!interaction.isChatInputCommand()) return;

            const command = this.commandHandler.getCommand(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction, this.client);
            } catch (error) {
                console.error(error);
                await interaction.reply({
                    content: 'Une erreur est survenue lors de l\'exécution de la commande.',
                    ephemeral: true
                });
            }
        });
    }
}