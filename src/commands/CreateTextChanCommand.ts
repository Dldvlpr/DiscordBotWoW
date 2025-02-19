import { ChatInputCommandInteraction, Client, SlashCommandBuilder } from "discord.js";
import { Command } from "./Command";
import { CronJob } from "../models/cronJob";
import { GuildInstance } from "../models/guildInstance";

export class CreateTextChanCommand extends Command {

    async execute(interaction: ChatInputCommandInteraction, client: Client): Promise<void> {
        const day = interaction.options.getString("day", true);
        const interval = interaction.options.getInteger("interval", true);
        const channelNameOption = interaction.options.getString("channelname", false);

        const channelName = channelNameOption || new Date().toLocaleDateString();

        const dayLower = day.toLowerCase();
        const dayAbbrMap: { [key: string]: string } = {
            monday: "MON",
            tuesday: "TUE",
            wednesday: "WED",
            thursday: "THU",
            friday: "FRI",
            saturday: "SAT",
            sunday: "SUN",
        };
        let schedule = "";
        if (dayLower in dayAbbrMap) {
            schedule = `*/${interval} * * * ${dayAbbrMap[dayLower]}`;
        } else {
            schedule = `*/${interval} * * * *`;
        }

        if (!interaction.guildId) {
            await interaction.reply("This command can only be used in a guild.");
            return;
        }

        const guildInstance = await GuildInstance.findOne({ where: { guildId: interaction.guildId }});
        if (!guildInstance) {
            await interaction.reply("Guild configuration not found. Please set up your guild instance first.");
            return;
        }

        try {
            await CronJob.create({
                name: channelName,
                description: `Creates text channel on ${day}`,
                schedule: schedule,
                isActive: true,
                guildInstanceId: guildInstance.id
            });
            await interaction.reply(`Cron job created successfully with schedule: ${schedule}`);
        } catch (error) {
            console.error("Error creating cron job:", error);
            await interaction.reply("There was an error creating the cron job.");
        }
    }

    static getSlashCommand() {
        return new SlashCommandBuilder()
            .setName("createtextchan")
            .setDescription("Automatically creates text channels at regular intervals in a specified category.")
            .addStringOption(option =>
                option.setName("day")
                    .setDescription("Day of the week to create the channel (e.g., Monday)")
                    .setRequired(true)
            )
            .addIntegerOption(option =>
                option.setName("interval")
                    .setDescription("Interval in minutes for creating the channel")
                    .setRequired(true)
            )
            .addStringOption(option =>
                option.setName("channelname")
                    .setDescription("Optional channel name; defaults to the current date if not provided")
                    .setRequired(false)
            );
    }
}
