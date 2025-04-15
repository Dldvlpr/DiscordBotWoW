import {ChatInputCommandInteraction, Client, PermissionFlagsBits, SlashCommandBuilder} from "discord.js";
import { Command } from "./Command";

export class PingCommand extends Command {
    constructor() {
        super("ping");
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

            const sent = await interaction.deferReply({ fetchReply: true });
            const pingLatency = sent.createdTimestamp - interaction.createdTimestamp;

            const wsLatency = client.ws.ping;

            await interaction.editReply(`🏓 Pong!\nLatence API: ${pingLatency}ms\nLatence WebSocket: ${wsLatency}ms`);

            this.logger.debug(`Ping command executed by ${interaction.user.tag} with latency: API=${pingLatency}ms, WS=${wsLatency}ms`);
        } catch (error) {
            await this.handleError(interaction, error as Error);
        }
    }

    getSlashCommand() {
        return new SlashCommandBuilder()
            .setName("ping")
            .setDescription("Répond avec Pong et affiche la latence du bot");
    }
}