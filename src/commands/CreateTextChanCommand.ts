import { ChatInputCommandInteraction, Client, SlashCommandBuilder, CategoryChannel } from "discord.js";
import { Command } from "./Command";
import { CronJob } from "../models/cronJob";
import { GuildInstance } from "../models/guildInstance";

export class CreateTextChanCommand extends Command {
    constructor() {
        super('CreateTextChan');
    }

    async execute(interaction: ChatInputCommandInteraction, client: Client): Promise<void> {
        const day = interaction.options.getString("day", true);
        const interval = interaction.options.getInteger("interval", true);
        const channelNameOption = interaction.options.getString("channelname", false);
        const categoryId = interaction.options.getString("categoryid", true);
        if (!interaction.guildId) {
            await interaction.reply("This command can only be used in a server.");
            return;
        }

        const guildInstance = await GuildInstance.findOne({ where: { guildId: interaction.guildId }});
        if (!guildInstance) {
            await interaction.reply("Guild configuration not found. Please set up your guild instance first.");
            return;
        }

        const category = interaction.guild?.channels.cache.get(categoryId) as CategoryChannel;
        if (!category || category.type !== 4) {
            await interaction.reply("Invalid or missing category!");
            return;
        }

        // @ts-ignore
        if (!category.permissionsFor(interaction.guild.members.me!)?.has("ManageChannels")) {
            await interaction.reply("I do not have permission to create channels in this category!");
            return;
        }

        const channelName = channelNameOption || new Date().toLocaleDateString();
        const dayLower = day.toLowerCase();

        const dayAbbrMap: { [key: string]: string } = {
            monday: "1",
            tuesday: "2",
            wednesday: "3",
            thursday: "4",
            friday: "5",
            saturday: "6",
            sunday: "0",
        };

        let schedule = "";
        if (dayLower in dayAbbrMap) {
            schedule = `0 12 */${interval} * ${dayAbbrMap[dayLower]}`;
        } else {
            schedule = `0 12 */${interval} * *`;
        }

        const existingJob = await CronJob.findOne({
            where: {
                guildInstanceId: guildInstance.id,
                name: channelName,
                schedule: schedule,
                categoryId: categoryId,
            }
        });

        if (existingJob) {
            await interaction.reply("A scheduled task with this name and frequency already exists!");
            return;
        }

        try {
            await CronJob.create({
                name: channelName,
                description: `Automatically creates the channel every ${interval} days.`,
                schedule: schedule,
                isActive: true,
                guildInstanceId: guildInstance.id,
                categoryId: categoryId,
            });

            await interaction.reply(`Scheduled task created successfully! The channel will be created every ${interval} days at 12:00.`);
        } catch (error) {
            console.error("Error creating cron job:", error);
            await interaction.reply("An error occurred while adding the scheduled task.");
        }
    }

    static getSlashCommand() {
        return new SlashCommandBuilder()
            .setName("createtextchan")
            .setDescription("Automatically creates text channels at regular intervals in a specified category.")
            .addStringOption(option =>
                option.setName("categoryid")
                    .setDescription("ID of the category where the channel will be created")
                    .setRequired(true)
            )
            .addStringOption(option =>
                option.setName("day")
                    .setDescription("Day of the week for channel creation (e.g., Monday)")
                    .setRequired(true)
            )
            .addIntegerOption(option =>
                option.setName("interval")
                    .setDescription("Interval in days for channel creation")
                    .setRequired(true)
            )
            .addStringOption(option =>
                option.setName("channelname")
                    .setDescription("Optional channel name (defaults to current date)")
                    .setRequired(false)
            );
    }
}