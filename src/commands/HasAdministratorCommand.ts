import {Command} from "./Command";
import {ChatInputCommandInteraction, Client, PermissionFlagsBits, SlashCommandBuilder} from "discord.js";
import {Error} from "sequelize";

export class HasAdministratorCommand extends Command
{
    constructor() {
        super("HasAdministratorCommand");
    }

    async execute(interaction: ChatInputCommandInteraction, client: Client): Promise<void> {
        try {
            if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
                await interaction.reply({
                    content: "Vous devez être administrateur pour utiliser cette commande.",
                    ephemeral: true
                });
                return;
            }

            if (!interaction.guildId) {
                await interaction.reply({
                    content: "Cette commande ne peut être utilisée que sur un serveur.",
                    ephemeral: true
                });
                return;
            }


        } catch (error) {
            await this.handleError(interaction, error as Error);
        }
    }

    getSlashCommand(): SlashCommandBuilder {
        return new SlashCommandBuilder()
            .setName('hasadmin')
            .setDescription('Vérifie si un utilisateur a les permissions administrateur.');
    }
}