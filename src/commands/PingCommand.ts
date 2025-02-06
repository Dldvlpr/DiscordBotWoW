import { ChatInputCommandInteraction, Client, SlashCommandBuilder } from "discord.js";
import { Command } from "./Command";

export class PingCommand extends Command {
    constructor() {
        super("ping");
    }

    async execute(interaction: ChatInputCommandInteraction, client: Client): Promise<void> {
        await interaction.reply("🏓 Pong!");
    }

    static getSlashCommand() {
        return new SlashCommandBuilder()
            .setName("ping")
            .setDescription("Répond avec Pong!");
    }
}
