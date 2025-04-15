import { ChatInputCommandInteraction, Client, SlashCommandBuilder, CategoryChannel, PermissionFlagsBits, PermissionsBitField, EmbedBuilder } from "discord.js";
import { Command } from "./Command";
import { CronJob } from "../models/cronJob";
import { GuildInstance } from "../models/guildInstance";
import {Error, Op, WhereOptions} from "sequelize";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {CronJobInterface} from "../interfaces/cronJob.interface";

export class CreateTextChanCommand extends Command {
    constructor() {
        super('createtextchan');
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

            const subcommand = interaction.options.getSubcommand();

            switch (subcommand) {
                case 'create':
                    await this.handleCreate(interaction);
                    break;
                case 'list':
                    await this.handleList(interaction);
                    break;
                case 'info':
                    await this.handleInfo(interaction);
                    break;
                case 'edit':
                    await this.handleEdit(interaction);
                    break;
                case 'delete':
                    await this.handleDelete(interaction);
                    break;
                case 'test':
                    await this.handleTest(interaction);
                    break;
                default:
                    await interaction.reply({
                        content: "Sous-commande inconnue.",
                        ephemeral: true
                    });
            }
        } catch (error) {
            await this.handleError(interaction, error as Error);
        }
    }
    async handleCreate(interaction: ChatInputCommandInteraction): Promise<void> {
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
    }

    async handleList(interaction: ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply();

        const guildInstance = await this.validateGuildInstance(interaction);
        if (!guildInstance) return;

        const whereCondition = {
            guildInstanceId: guildInstance.id,
            categoryId: {
                [Op.ne]: null
            }
        } as WhereOptions<CronJobInterface>;

        const jobs = await CronJob.findAll({
            where: whereCondition,
            order: [['createdAt', 'DESC']]
        });

        if (jobs.length === 0) {
            await interaction.editReply("Aucune tâche de création de canal planifiée n'a été trouvée sur ce serveur.");
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle("Tâches planifiées de création de canaux")
            .setColor("#0099ff")
            .setDescription(`${jobs.length} tâche(s) trouvée(s)`)
            .setFooter({ text: `Utilisez /createtextchan info <id> pour plus de détails` });

        for (const job of jobs) {
            const status = job.isActive ? "✅ Actif" : "❌ Inactif";
            embed.addFields({
                name: `${job.name} (ID: ${job.id})`,
                value: `**État**: ${status}\n**Programme**: ${job.schedule}\n**Catégorie**: <#${job.categoryId}>`
            });
        }

        await interaction.editReply({ embeds: [embed] });
    }

    async handleInfo(interaction: ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply();

        const jobId = interaction.options.getString("id", true);
        const job = await CronJob.findByPk(jobId);

        if (!job) {
            await interaction.editReply(`Aucune tâche avec l'ID ${jobId} n'a été trouvée.`);
            return;
        }

        const guildInstance = await this.validateGuildInstance(interaction);
        if (!guildInstance || job.guildInstanceId !== guildInstance.id) {
            await interaction.editReply("Cette tâche n'appartient pas à ce serveur.");
            return;
        }

        if (!job.categoryId) {
            await interaction.editReply("Cette tâche n'est pas une tâche de création de canal.");
            return;
        }

        let categoryName = "Catégorie inconnue ou supprimée";
        try {
            const category = await interaction.guild?.channels.fetch(job.categoryId);
            if (category) {
                categoryName = category.name;
            }
        } catch (error) {
            this.logger.error(`Erreur lors de la récupération de la catégorie:`, error);
        }

        const cronParts = job.schedule.split(' ');
        let frequencyText = "Programme personnalisé";

        try {
            const dayNumber = cronParts[5];
            const interval = cronParts[2].replace('*/', '');

            const dayMap: { [key: string]: string } = {
                "0": "dimanche",
                "1": "lundi",
                "2": "mardi",
                "3": "mercredi",
                "4": "jeudi",
                "5": "vendredi",
                "6": "samedi",
                "*": "tous les jours"
            };

            const day = dayMap[dayNumber] || "jour inconnu";
            frequencyText = `Tous les ${interval} jours (${day})`;
        } catch (error) {
            this.logger.error(`Erreur lors de l'analyse du programme:`, error);
        }

        const embed = new EmbedBuilder()
            .setTitle(`Détails de la tâche: ${job.name}`)
            .setColor(job.isActive ? "#00ff00" : "#ff0000")
            .setDescription(job.description || "Aucune description")
            .addFields(
                { name: "ID", value: job.id, inline: true },
                { name: "État", value: job.isActive ? "✅ Actif" : "❌ Inactif", inline: true },
                { name: "Catégorie", value: `${categoryName} (ID: ${job.categoryId})`, inline: true },
                { name: "Fréquence", value: frequencyText, inline: true },
                { name: "Programme Cron", value: `\`${job.schedule}\``, inline: true },
                { name: "Créé le", value: format(job.createdAt, 'dd/MM/yyyy HH:mm', { locale: fr }), inline: true },
                { name: "Dernière modification", value: format(job.updatedAt, 'dd/MM/yyyy HH:mm', { locale: fr }), inline: true }
            );

        await interaction.editReply({ embeds: [embed] });
    }

    async handleEdit(interaction: ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply();

        const jobId = interaction.options.getString("id", true);
        const day = interaction.options.getString("day", false);
        const interval = interaction.options.getInteger("interval", false);
        const channelName = interaction.options.getString("channelname", false);
        const categoryId = interaction.options.getString("categoryid", false);
        const isActive = interaction.options.getBoolean("active", false);

        const job = await CronJob.findByPk(jobId);

        if (!job) {
            await interaction.editReply(`Aucune tâche avec l'ID ${jobId} n'a été trouvée.`);
            return;
        }

        const guildInstance = await this.validateGuildInstance(interaction);
        if (!guildInstance || job.guildInstanceId !== guildInstance.id) {
            await interaction.editReply("Cette tâche n'appartient pas à ce serveur.");
            return;
        }

        if (!job.categoryId) {
            await interaction.editReply("Cette tâche n'est pas une tâche de création de canal.");
            return;
        }

        let newCategoryId = job.categoryId;
        if (categoryId) {
            const category = await this.validateCategory(interaction, categoryId);
            if (!category) return;
            if (!await this.validateBotPermissions(interaction, category)) return;
            newCategoryId = categoryId;
        }

        let newSchedule = job.schedule;
        if (day || interval !== null) {
            const currentParts = job.schedule.split(' ');
            let currentInterval = 1;
            if (currentParts[2].includes('/')) {
                currentInterval = parseInt(currentParts[2].split('/')[1]);
            } else if (interval !== null) {
                currentInterval = interval;
            }
            const currentDay = currentParts[5];

            const newDay = day ? day.toLowerCase() : this.getDayFromCronValue(currentDay);
            const newInterval = interval !== null ? interval : currentInterval;

            newSchedule = this.buildCronSchedule(newDay, newInterval);
        }

        let updateData: Partial<CronJob> = {};

        if (channelName) updateData.name = channelName;
        if (newSchedule !== job.schedule) updateData.schedule = newSchedule;
        if (newCategoryId !== job.categoryId) updateData.categoryId = newCategoryId;
        if (isActive !== null) updateData.isActive = isActive;

        if (channelName && newSchedule !== job.schedule) {
            if (!await this.validateUniqueJob(interaction, guildInstance.id, channelName, newSchedule, newCategoryId, job.id)) return;
        }

        try {
            await job.update(updateData);

            const updatedDetails: string[] = [];
            if (channelName) updatedDetails.push(`Nom: "${channelName}"`);
            if (day || interval !== null) updatedDetails.push(`Fréquence: ${this.describeSchedule(newSchedule)}`);
            if (categoryId) updatedDetails.push(`Catégorie: <#${categoryId}>`);
            if (isActive !== null) updatedDetails.push(`État: ${isActive ? "Actif" : "Inactif"}`);

            await interaction.editReply(`✅ Tâche mise à jour avec succès!\nModifications: ${updatedDetails.join(', ')}`);
        } catch (error) {
            this.logger.error("Erreur lors de la mise à jour de la tâche:", error);
            await interaction.editReply("Une erreur est survenue lors de la mise à jour de la tâche.");
        }
    }

    async handleDelete(interaction: ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply();

        const jobId = interaction.options.getString("id", true);
        const confirmation = interaction.options.getString("confirmation", true);

        if (confirmation.toLowerCase() !== "confirmer") {
            await interaction.editReply("Suppression annulée. Veuillez saisir 'confirmer' pour confirmer la suppression.");
            return;
        }

        const job = await CronJob.findByPk(jobId);

        if (!job) {
            await interaction.editReply(`Aucune tâche avec l'ID ${jobId} n'a été trouvée.`);
            return;
        }

        const guildInstance = await this.validateGuildInstance(interaction);
        if (!guildInstance || job.guildInstanceId !== guildInstance.id) {
            await interaction.editReply("Cette tâche n'appartient pas à ce serveur.");
            return;
        }

        if (!job.categoryId) {
            await interaction.editReply("Cette tâche n'est pas une tâche de création de canal.");
            return;
        }

        try {
            const jobName = job.name;
            await job.destroy();
            await interaction.editReply(`✅ Tâche "${jobName}" supprimée avec succès!`);
        } catch (error) {
            this.logger.error("Erreur lors de la suppression de la tâche:", error);
            await interaction.editReply("Une erreur est survenue lors de la suppression de la tâche.");
        }
    }

    async handleTest(interaction: ChatInputCommandInteraction): Promise<void> {
        const categoryId = interaction.options.getString("categoryid", true);
        const channelNameOption = interaction.options.getString("channelname", false);

        const category = await this.validateCategory(interaction, categoryId);
        if (!category) return;

        if (!await this.validateBotPermissions(interaction, category)) return;

        try {
            await interaction.deferReply();

            const today = new Date();
            const channelName = channelNameOption || `test-${today.toLocaleDateString().replace(/\//g, '-')}`;

            const newChannel = await interaction.guild?.channels.create({
                name: channelName,
                type: 0,
                parent: categoryId
            });

            await interaction.editReply(`✅ Canal de test créé avec succès : <#${newChannel?.id}>`);
        } catch (error) {
            this.logger.error("Erreur lors de la création du canal test:", error);
            await interaction.editReply("❌ Une erreur est survenue lors de la création du canal test.");
        }
    }

    async canExecute(interaction: ChatInputCommandInteraction): Promise<boolean> {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
            await interaction.reply({
                content: "Vous devez être administrateur pour utiliser cette commande.",
                ephemeral: true
            });
            return false;
        }
        return true;
    }

    private describeSchedule(schedule: string): string {
        const parts = schedule.split(' ');
        const interval = parts[2].includes('/') ? parseInt(parts[2].split('/')[1]) : 1;
        const dayValue = parts[5];

        const dayMap: { [key: string]: string } = {
            "0": "dimanche",
            "1": "lundi",
            "2": "mardi",
            "3": "mercredi",
            "4": "jeudi",
            "5": "vendredi",
            "6": "samedi",
            "*": "tous les jours"
        };

        const day = dayMap[dayValue] || "jour inconnu";
        return `Tous les ${interval} jours (${day})`;
    }

    private getDayFromCronValue(cronDayValue: string): string {
        const dayMap: { [key: string]: string } = {
            "0": "sunday",
            "1": "monday",
            "2": "tuesday",
            "3": "wednesday",
            "4": "thursday",
            "5": "friday",
            "6": "saturday",
            "*": "everyday"
        };

        return dayMap[cronDayValue] || "everyday";
    }

    getSlashCommand() {
        const command = new SlashCommandBuilder()
            .setName("createtextchan")
            .setDescription("Gère les créations automatiques de canaux textuels")
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
            .addSubcommand(subcommand =>
                subcommand.setName("create")
                    .setDescription("Crée automatiquement des canaux textuels à intervalles réguliers")
                    .addStringOption(option =>
                        option.setName("categoryid")
                            .setDescription("ID de la catégorie où le canal sera créé")
                            .setRequired(true)
                    )
                    .addStringOption(option =>
                        option.setName("day")
                            .setDescription("Jour de la semaine pour la création du canal")
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
                    )
            )
            .addSubcommand(subcommand =>
                subcommand.setName("list")
                    .setDescription("Liste toutes les tâches de création de canaux planifiées")
            )
            .addSubcommand(subcommand =>
                subcommand.setName("info")
                    .setDescription("Affiche les détails d'une tâche planifiée")
                    .addStringOption(option =>
                        option.setName("id")
                            .setDescription("ID de la tâche planifiée")
                            .setRequired(true)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand.setName("edit")
                    .setDescription("Modifie une tâche planifiée existante")
                    .addStringOption(option =>
                        option.setName("id")
                            .setDescription("ID de la tâche planifiée")
                            .setRequired(true)
                    )
                    .addStringOption(option =>
                        option.setName("channelname")
                            .setDescription("Nouveau nom de canal")
                            .setRequired(false)
                    )
                    .addStringOption(option =>
                        option.setName("day")
                            .setDescription("Jour de la semaine pour la création du canal")
                            .setRequired(false)
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
                            .setRequired(false)
                            .setMinValue(1)
                            .setMaxValue(30)
                    )
                    .addStringOption(option =>
                        option.setName("categoryid")
                            .setDescription("ID de la nouvelle catégorie")
                            .setRequired(false)
                    )
                    .addBooleanOption(option =>
                        option.setName("active")
                            .setDescription("Activer ou désactiver la tâche")
                            .setRequired(false)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand.setName("delete")
                    .setDescription("Supprime une tâche planifiée")
                    .addStringOption(option =>
                        option.setName("id")
                            .setDescription("ID de la tâche planifiée")
                            .setRequired(true)
                    )
                    .addStringOption(option =>
                        option.setName("confirmation")
                            .setDescription("Tapez 'confirmer' pour confirmer la suppression")
                            .setRequired(true)
                    )
            );

        return command as SlashCommandBuilder;
    }

    static getSlashCommand() {
        const command = new SlashCommandBuilder();

        command.setName("createtextchan")
            .setDescription("Gère les créations automatiques de canaux textuels")
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
            .addSubcommand(subcommand =>
                subcommand.setName("create")
                    .setDescription("Crée automatiquement des canaux textuels à intervalles réguliers")
                    .addStringOption(option =>
                        option.setName("categoryid")
                            .setDescription("ID de la catégorie où le canal sera créé")
                            .setRequired(true)
                    )
                    .addStringOption(option =>
                        option.setName("day")
                            .setDescription("Jour de la semaine pour la création du canal")
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
                    )
            )
            .addSubcommand(subcommand =>
                subcommand.setName("list")
                    .setDescription("Liste toutes les tâches de création de canaux planifiées")
            )
            .addSubcommand(subcommand =>
                subcommand.setName("info")
                    .setDescription("Affiche les détails d'une tâche planifiée")
                    .addStringOption(option =>
                        option.setName("id")
                            .setDescription("ID de la tâche planifiée")
                            .setRequired(true)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand.setName("edit")
                    .setDescription("Modifie une tâche planifiée existante")
                    .addStringOption(option =>
                        option.setName("id")
                            .setDescription("ID de la tâche planifiée")
                            .setRequired(true)
                    )
                    .addStringOption(option =>
                        option.setName("channelname")
                            .setDescription("Nouveau nom de canal")
                            .setRequired(false)
                    )
                    .addStringOption(option =>
                        option.setName("day")
                            .setDescription("Jour de la semaine pour la création du canal")
                            .setRequired(false)
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
                            .setRequired(false)
                            .setMinValue(1)
                            .setMaxValue(30)
                    )
                    .addStringOption(option =>
                        option.setName("categoryid")
                            .setDescription("ID de la nouvelle catégorie")
                            .setRequired(false)
                    )
                    .addBooleanOption(option =>
                        option.setName("active")
                            .setDescription("Activer ou désactiver la tâche")
                            .setRequired(false)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand.setName("delete")
                    .setDescription("Supprime une tâche planifiée")
                    .addStringOption(option =>
                        option.setName("id")
                            .setDescription("ID de la tâche planifiée")
                            .setRequired(true)
                    )
                    .addStringOption(option =>
                        option.setName("confirmation")
                            .setDescription("Tapez 'confirmer' pour confirmer la suppression")
                            .setRequired(true)
                    )
            )

            .addSubcommand(subcommand =>
                subcommand.setName("test")
                    .setDescription("Teste la création immédiate d'un canal dans une catégorie")
                    .addStringOption(option =>
                        option.setName("categoryid")
                            .setDescription("ID de la catégorie où le canal sera créé")
                            .setRequired(true)
                    )
                    .addStringOption(option =>
                        option.setName("channelname")
                            .setDescription("Nom du canal (par défaut: date actuelle)")
                            .setRequired(false)
                    )
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
        categoryId: string,
        excludeId?: string
    ): Promise<boolean> {
        const whereClause: any = {
            guildInstanceId: guildInstanceId,
            name: name,
            schedule: schedule,
            categoryId: categoryId,
        };

        if (excludeId) {
            whereClause.id = { [Op.ne]: excludeId };
        }

        const existingJob = await CronJob.findOne({
            where: whereClause
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
                content: `✅ Tâche planifiée créée avec succès ! Le canal sera créé tous les ${interval} jours à 12:00.\nID de la tâche: \`${newJob.id}\``,
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