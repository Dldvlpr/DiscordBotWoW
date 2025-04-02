import { ChatInputCommandInteraction, Client, SlashCommandBuilder, CategoryChannel, PermissionFlagsBits, PermissionsBitField } from "discord.js";
import { Command } from "./Command";
import { CronJob } from "../models/cronJob";
import guildInstance, { GuildInstance } from "../models/guildInstance";
import {Error} from "sequelize";

export class CreateTextChanCommand extends Command {
    constructor() {
        super('createtextchan');
    }

    async execute(interaction: ChatInputCommandInteraction, client: Client): Promise<void> {
        try {
            if (!interaction.guildId) {
                await interaction.reply({
                    content: "Cette commande ne peut être utilisée que sur un serveur.",
                    ephemeral: true
                });
                return;
            }

            const day = interaction.options.getString("day", true);
            const interval = interaction.options.getInteger("interval", true);
            const channelNameOption = interaction.options.getString("channelname", false);
            const categoryId = interaction.options.getString("categoryid", true);

            const guildInstance = await this.validateGuildInstance(interaction);
            if (!guildInstance) return;

            const category = await this.validateCategory(interaction, categoryId);
            if (!category) return;

            if (!await this.validateBotPermissions(interaction, category)) return;

            const channelName = channelNameOption || new Date().toLocaleDateString();
            const schedule = this.buildCronSchedule(day, interval);

            if (!await this.validateUniqueJob(interaction, guildInstance.id, channelName, schedule, categoryId)) return;

            await this.createCronJob(interaction, guildInstance.id, channelName, interval, schedule, categoryId);

        } catch (error) {
            await this.handleError(interaction, error as Error);
        }
    }

    async canExecute(interaction: ChatInputCommandInteraction): Promise<boolean> {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
            await interaction.reply({
                content: "Vous devez avoir la permission de gérer les canaux pour utiliser cette commande.",
                ephemeral: true
            });
            return false;
        }
        return true;
    }

    getSlashCommand() {
        const command = new SlashCommandBuilder()
            .setName("createtextchan")
            .setDescription("Crée automatiquement des canaux textuels à intervalles réguliers dans une catégorie spécifiée.")
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
            .addStringOption(option =>
                option.setName("categoryid")
                    .setDescription("ID de la catégorie où le canal sera créé")
                    .setRequired(true)
            )
            .addStringOption(option =>
                option.setName("day")
                    .setDescription("Jour de la semaine pour la création du canal (ex: Lundi)")
                    .setRequired(true)
                    .addChoices(
                        { name: "Lundi", value: "monday" },
                        { name: "Mardi", value: "tuesday" },
                        { name: "Mercredi", value: "wednesday" },
                        { name: "Jeudi", value: "thursday" },
                        { name: "Vendredi", value: "friday" },
                        { name: "Samedi", value: "saturday" },
                        { name: "Dimanche", value: "sunday" },
                        { name: "Tous les jours", value: "everyday" }
                    )
            )
            .addIntegerOption(option =>
                option.setName("interval")
                    .setDescription("Intervalle en jours pour la création du canal")
                    .setRequired(true)
                    .setMinValue(1)
                    .setMaxValue(30)
            )
            .addStringOption(option =>
                option.setName("channelname")
                    .setDescription("Nom du canal (par défaut: date actuelle)")
                    .setRequired(false)
            );

        return command as SlashCommandBuilder;
    }
    static getSlashCommand() {
        const command = new SlashCommandBuilder();

        command.setName("createtextchan")
            .setDescription("Crée automatiquement des canaux textuels à intervalles réguliers dans une catégorie spécifiée.")
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
            .addStringOption(option =>
                option.setName("categoryid")
                    .setDescription("ID de la catégorie où le canal sera créé")
                    .setRequired(true)
            )
            .addStringOption(option =>
                option.setName("day")
                    .setDescription("Jour de la semaine pour la création du canal (ex: Lundi)")
                    .setRequired(true)
                    .addChoices(
                        { name: "Lundi", value: "monday" },
                        { name: "Mardi", value: "tuesday" },
                        { name: "Mercredi", value: "wednesday" },
                        { name: "Jeudi", value: "thursday" },
                        { name: "Vendredi", value: "friday" },
                        { name: "Samedi", value: "saturday" },
                        { name: "Dimanche", value: "sunday" },
                        { name: "Tous les jours", value: "everyday" }
                    )
            )
            .addIntegerOption(option =>
                option.setName("interval")
                    .setDescription("Intervalle en jours pour la création du canal")
                    .setRequired(true)
                    .setMinValue(1)
                    .setMaxValue(30)
            )
            .addStringOption(option =>
                option.setName("channelname")
                    .setDescription("Nom du canal (par défaut: date actuelle)")
                    .setRequired(false)
            );

        return command;
    }
    private async validateGuildInstance(interaction: ChatInputCommandInteraction): Promise<GuildInstance | null> {
        if (!interaction.guildId) {
            await interaction.reply({
                content: "Cette commande ne peut être utilisée que sur un serveur.",
                ephemeral: true
            });
            return null;
        }

        const guildInstance = await GuildInstance.findOne({
            where: { guildId: interaction.guildId as string }
        });

        if (!guildInstance) {
            await interaction.reply({
                content: "Configuration du serveur non trouvée. Veuillez d'abord configurer votre instance de guilde.",
                ephemeral: true
            });
            return null;
        }

        return guildInstance;
    }

    private async validateCategory(interaction: ChatInputCommandInteraction, categoryId: string): Promise<CategoryChannel | null> {
        const category = interaction.guild?.channels.cache.get(categoryId) as CategoryChannel;

        if (!category || category.type !== 4) {
            await interaction.reply({
                content: "Catégorie invalide ou introuvable !",
                ephemeral: true
            });
            return null;
        }

        return category;
    }

    private async validateBotPermissions(interaction: ChatInputCommandInteraction, category: CategoryChannel): Promise<boolean> {
        const botMember = interaction.guild?.members.me;

        if (!botMember) {
            await interaction.reply({
                content: "Impossible de récupérer les informations du bot dans ce serveur.",
                ephemeral: true
            });
            return false;
        }

        const requiredPermissions = new PermissionsBitField([PermissionFlagsBits.ManageChannels]);
        const permissions = category.permissionsFor(botMember);

        if (!permissions || !permissions.has(requiredPermissions)) {
            await interaction.reply({
                content: "Je n'ai pas la permission de créer des canaux dans cette catégorie !",
                ephemeral: true
            });
            return false;
        }

        return true;
    }

    private buildCronSchedule(day: string, interval: number): string {
        const dayLower = day.toLowerCase();
        const dayAbbrMap: { [key: string]: string } = {
            monday: "1",
            tuesday: "2",
            wednesday: "3",
            thursday: "4",
            friday: "5",
            saturday: "6",
            sunday: "0",
            everyday: "*"
        };

        if (dayLower in dayAbbrMap) {
            return `0 12 */${interval} * ${dayAbbrMap[dayLower]}`;
        } else {
            return `0 12 */${interval} * *`;
        }
    }

    private async validateUniqueJob(
        interaction: ChatInputCommandInteraction,
        guildInstanceId: string,
        name: string,
        schedule: string,
        categoryId: string
    ): Promise<boolean> {
        const existingJob = await CronJob.findOne({
            where: {
                guildInstanceId: guildInstanceId,
                name: name,
                schedule: schedule,
                categoryId: categoryId,
            }
        });

        if (existingJob) {
            await interaction.reply({
                content: "Une tâche planifiée avec ce nom et cette fréquence existe déjà !",
                ephemeral: true
            });
            return false;
        }

        return true;
    }

    private async createCronJob(
        interaction: ChatInputCommandInteraction,
        guildInstanceId: string,
        name: string,
        interval: number,
        schedule: string,
        categoryId: string
    ): Promise<void> {
        try {
            const newJob = await CronJob.create({
                name: name,
                description: `Crée automatiquement le canal ${name} tous les ${interval} jours.`,
                schedule: schedule,
                isActive: true,
                guildInstanceId: guildInstanceId,
                categoryId: categoryId,
            });

            this.logger.info(`Created cron job: ${newJob.id} for guild: ${guildInstanceId}`);

            await interaction.reply({
                content: `✅ Tâche planifiée créée avec succès ! Le canal sera créé tous les ${interval} jours à 12:00.`,
                ephemeral: false
            });
        } catch (error) {
            this.logger.error("Error creating cron job:", error);
            await interaction.reply({
                content: "❌ Une erreur est survenue lors de l'ajout de la tâche planifiée.",
                ephemeral: true
            });
        }
    }
}