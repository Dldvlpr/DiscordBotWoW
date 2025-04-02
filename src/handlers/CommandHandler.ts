import { ChatInputCommandInteraction, Client, SlashCommandBuilder } from "discord.js";
import { Logger } from "../utils/Logger";

export abstract class CommandHandler {
    public readonly name: string;
    protected logger: Logger;

    protected constructor(name: string) {
        this.name = name;
        this.logger = new Logger(`Command:${name}`);
    }

    /**
     * Execute the command based on the interaction received
     * @param interaction The Discord interaction that triggered this command
     * @param client The Discord client instance
     */
    abstract execute(interaction: ChatInputCommandInteraction, client: Client): Promise<void>;

    /**
     * Get the SlashCommandBuilder instance for this command
     * This is used to register the command with Discord
     *
     * Modification: Changement du type de retour pour utiliser un type plus générique
     * qui est compatible avec tous les types de builders de commandes Slash
     */
    abstract getSlashCommand(): SlashCommandBuilder;

    /**
     * Check if the command can be executed in the current context
     * Override this method to add custom permission checks
     *
     * @param interaction The Discord interaction to check
     * @returns true if the command can be executed, false otherwise
     */
    async canExecute(interaction: ChatInputCommandInteraction): Promise<boolean> {
        return true;
    }

    /**
     * Handle errors that occur during command execution
     * @param interaction The Discord interaction where the error occurred
     * @param error The error that was thrown
     */
    async handleError(interaction: ChatInputCommandInteraction, error: Error): Promise<void> {
        this.logger.error(`Error executing command:`, error);

        try {
            const content = 'Une erreur est survenue lors de l\'exécution de la commande.';

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content, ephemeral: true });
            } else {
                await interaction.reply({ content, ephemeral: true });
            }
        } catch (replyError) {
            this.logger.error('Failed to send error message:', replyError);
        }
    }
}