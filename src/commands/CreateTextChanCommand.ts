import {
    ChatInputCommandInteraction,
    Client,
    SlashCommandBuilder,
    CategoryChannel,
    PermissionFlagsBits,
    PermissionsBitField,
    EmbedBuilder,
    SlashCommandSubcommandsOnlyBuilder
} from "discord.js";
import { Command } from "./Command";
import { CronJob } from "../models/cronJob";
import { GuildInstance } from "../models/guildInstance";
import { Error, Op, WhereOptions } from "sequelize";
import { format, parse, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CronJobInterface } from "../interfaces/cronJob.interface";

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

    private async handleCreate(interaction: ChatInputCommandInteraction): Promise<void> {
        const day = interaction.options.getString("day", true);
        const interval = interaction.options.getInteger("interval", true);
        const channelNameOption = interaction.options.getString("channelname", false);
        const categoryId = interaction.options.getString("categoryid", true);
        const includeDateOption = interaction.options.getBoolean("includedate", false) ?? true;
        const dateFormatOption = interaction.options.getString("dateformat", false) || "yyyy-MM-dd";
        const startDateOption = interaction.options.getString("startdate", false);
        const timeOption = interaction.options.getString("time", false);

        // Vérification du serveur
        const guildInstance = await this.getOrCreateGuildInstance(interaction);
        if (!guildInstance) return;

        // Vérification de la catégorie
        const category = await this.getCategory(interaction, categoryId);
        if (!category) return;

        // Vérification des permissions
        if (!await this.checkBotPermissions(interaction, category)) return;

        // Formatage des options
        let startDate = new Date();
        let hasCustomStartDate = false;
        if (startDateOption) {
            const parsedDate = parse(startDateOption, 'dd/MM/yyyy', new Date());
            if (!isValid(parsedDate)) {
                await interaction.reply({
                    content: "❌ Format de date de début invalide. Utilisez le format JJ/MM/AAAA (ex: 20/05/2025).",
                    ephemeral: true
                });
                return;
            }

            startDate = parsedDate;
            hasCustomStartDate = true;
        }

        // Analyse de l'heure (par défaut 12:00)
        let hour = 12;
        let minute = 0;
        if (timeOption) {
            const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
            if (!timeRegex.test(timeOption)) {
                await interaction.reply({
                    content: "❌ Format d'heure invalide. Utilisez le format HH:MM (ex: 14:30).",
                    ephemeral: true
                });
                return;
            }

            const [hourStr, minuteStr] = timeOption.split(':');
            hour = parseInt(hourStr);
            minute = parseInt(minuteStr);
        }

        const baseChannelName = channelNameOption || "discussion";

        // Options de formatage stockées en JSON
        const formatOptions = {
            includeDate: includeDateOption,
            dateFormat: dateFormatOption,
            baseChannelName: baseChannelName,
            startDate: hasCustomStartDate ? startDate.toISOString() : null,
            hour: hour,
            minute: minute
        };

        // Création de l'expression cron
        const schedule = this.buildCronSchedule(day, interval, hour, minute);

        // Vérification de duplicatas
        if (!await this.isJobUnique(interaction, guildInstance.id, baseChannelName, schedule, categoryId)) return;

        // Création de la tâche cron
        await this.createCronJob(
            interaction,
            guildInstance.id,
            baseChannelName,
            interval,
            schedule,
            categoryId,
            JSON.stringify(formatOptions)
        );
    }

    private async handleList(interaction: ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply();

        const guildInstance = await this.getOrCreateGuildInstance(interaction);
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

            // Extraction des informations de formatage
            let formatInfo = "";
            try {
                if (job.description && job.description.startsWith("{")) {
                    const formatOptions = JSON.parse(job.description);
                    formatInfo = formatOptions.includeDate
                        ? `\nFormat: ${job.name}-${formatOptions.dateFormat}`
                        : `\nSans date`;

                    if (formatOptions.startDate) {
                        const startDate = new Date(formatOptions.startDate);
                        formatInfo += `\nDébut: ${format(startDate, 'dd/MM/yyyy', { locale: fr })}`;
                    }

                    const hour = formatOptions.hour || 12;
                    const minute = formatOptions.minute || 0;
                    formatInfo += `\nHeure: ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                }
            } catch (error) {
                this.logger.debug(`Could not parse description for job ${job.id}`);
            }

            embed.addFields({
                name: `${job.name} (ID: ${job.id})`,
                value: `**État**: ${status}\n**Programme**: ${job.schedule}\n**Catégorie**: <#${job.categoryId}>${formatInfo}`
            });
        }

        await interaction.editReply({ embeds: [embed] });
    }

    private async handleInfo(interaction: ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply();

        const jobId = interaction.options.getString("id", true);

        // Validation de l'ID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(jobId)) {
            await interaction.editReply({
                content: `❌ L'ID \`${jobId}\` n'est pas un identifiant de tâche valide.\nUtilisez \`/createtextchan list\` pour voir la liste des tâches disponibles.`
            });
            return;
        }

        const job = await CronJob.findByPk(jobId);
        if (!job) {
            await interaction.editReply(`⚠️ Aucune tâche avec l'ID \`${jobId}\` n'a été trouvée.`);
            return;
        }

        const guildInstance = await this.getOrCreateGuildInstance(interaction);
        if (!guildInstance || job.guildInstanceId !== guildInstance.id) {
            await interaction.editReply("⚠️ Cette tâche n'appartient pas à ce serveur.");
            return;
        }

        if (!job.categoryId) {
            await interaction.editReply("⚠️ Cette tâche n'est pas une tâche de création de canal.");
            return;
        }

        // Vérification de la catégorie
        let categoryName = "Catégorie inconnue ou supprimée";
        let categoryExists = false;
        try {
            const category = await interaction.guild?.channels.fetch(job.categoryId);
            if (category) {
                categoryName = category.name;
                categoryExists = true;
            }
        } catch (error) {
            this.logger.debug(`Catégorie non trouvée: ${job.categoryId}`);
        }

        // Extraction des informations de cron
        const cronParts = job.schedule.split(' ');
        const minute = cronParts[0];
        const hour = cronParts[1];
        const interval = cronParts[2].includes('/') ? cronParts[2].split('/')[1] : '1';
        const dayNumber = cronParts[5];

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
        const frequencyText = `Tous les ${interval} jours (${day}) à ${hour}:${minute.padStart(2, '0')}`;

        // Extraction des options de formatage
        let channelNameFormat = job.name;
        let includesDate = false;
        let dateFormat = "yyyy-MM-dd";
        let startDate: Date | null = null;
        let jobHour = parseInt(hour);
        let jobMinute = parseInt(minute);

        try {
            if (job.description && job.description.startsWith("{")) {
                const formatOptions = JSON.parse(job.description);
                channelNameFormat = formatOptions.baseChannelName || job.name;
                includesDate = formatOptions.includeDate || false;
                dateFormat = formatOptions.dateFormat || "yyyy-MM-dd";

                if (formatOptions.startDate) {
                    startDate = new Date(formatOptions.startDate);
                }

                jobHour = formatOptions.hour || parseInt(hour);
                jobMinute = formatOptions.minute || parseInt(minute);
            }
        } catch (error) {
            this.logger.debug(`Could not parse description for job ${job.id}`);
        }

        // Création de l'embed
        const embed = new EmbedBuilder()
            .setTitle(`Détails de la tâche: ${job.name}`)
            .setColor(job.isActive ? (categoryExists ? "#00ff00" : "#ff9900") : "#ff0000")
            .setDescription(`Format de nom: ${includesDate ? `${channelNameFormat}-${dateFormat}` : channelNameFormat}`)
            .addFields(
                { name: "ID", value: job.id, inline: true },
                { name: "État", value: job.isActive ? "✅ Actif" : "❌ Inactif", inline: true },
                { name: "Inclut la date", value: includesDate ? "✅ Oui" : "❌ Non", inline: true }
            );

        if (startDate) {
            embed.addFields({
                name: "Date de début",
                value: format(startDate, 'dd/MM/yyyy', { locale: fr }),
                inline: true
            });
        }

        embed.addFields(
            { name: "Heure de création", value: `${jobHour.toString().padStart(2, '0')}:${jobMinute.toString().padStart(2, '0')}`, inline: true },
            { name: "Catégorie", value: categoryExists
                    ? `${categoryName} (<#${job.categoryId}>)`
                    : `⚠️ ${categoryName} (ID: ${job.categoryId})`,
                inline: false },
            { name: "Fréquence", value: frequencyText, inline: true },
            { name: "Programme Cron", value: `\`${job.schedule}\``, inline: true },
            { name: "Créé le", value: format(job.createdAt, 'dd/MM/yyyy HH:mm', { locale: fr }), inline: true },
            { name: "Dernière modification", value: format(job.updatedAt, 'dd/MM/yyyy HH:mm', { locale: fr }), inline: true }
        )
            .setFooter({ text: `Utilisez /createtextchan edit ${job.id} pour modifier cette tâche` });

        await interaction.editReply({ embeds: [embed] });
    }

    private async handleEdit(interaction: ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply();

        const jobId = interaction.options.getString("id", true);
        const day = interaction.options.getString("day", false);
        const interval = interaction.options.getInteger("interval", false);
        const channelName = interaction.options.getString("channelname", false);
        const categoryId = interaction.options.getString("categoryid", false);
        const isActive = interaction.options.getBoolean("active", false);
        const includeDateOption = interaction.options.getBoolean("includedate", false);
        const dateFormatOption = interaction.options.getString("dateformat", false);
        const startDateOption = interaction.options.getString("startdate", false);
        const timeOption = interaction.options.getString("time", false);

        const job = await CronJob.findByPk(jobId);
        if (!job) {
            await interaction.editReply(`Aucune tâche avec l'ID ${jobId} n'a été trouvée.`);
            return;
        }

        const guildInstance = await this.getOrCreateGuildInstance(interaction);
        if (!guildInstance || job.guildInstanceId !== guildInstance.id) {
            await interaction.editReply("Cette tâche n'appartient pas à ce serveur.");
            return;
        }

        if (!job.categoryId) {
            await interaction.editReply("Cette tâche n'est pas une tâche de création de canal.");
            return;
        }

        // Modification de la catégorie
        let newCategoryId = job.categoryId;
        if (categoryId) {
            const category = await this.getCategory(interaction, categoryId);
            if (!category) return;
            if (!await this.checkBotPermissions(interaction, category)) return;
            newCategoryId = categoryId;
        }

        // Extraction des options de formatage existantes
        let formatOptions = {
            baseChannelName: job.name,
            includeDate: true,
            dateFormat: "yyyy-MM-dd",
            startDate: null as string | null,
            hour: 12,
            minute: 0
        };

        try {
            if (job.description && job.description.startsWith("{")) {
                formatOptions = JSON.parse(job.description);
            }
        } catch (error) {
            this.logger.debug(`Could not parse description for job ${job.id}`);
        }

        // Mise à jour de l'heure si fournie
        let hour = formatOptions.hour;
        let minute = formatOptions.minute;
        if (timeOption) {
            const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
            if (!timeRegex.test(timeOption)) {
                await interaction.editReply("❌ Format d'heure invalide. Utilisez le format HH:MM (ex: 14:30).");
                return;
            }

            const [hourStr, minuteStr] = timeOption.split(':');
            hour = parseInt(hourStr);
            minute = parseInt(minuteStr);
        }

        // Mise à jour de la date de début si fournie
        if (startDateOption) {
            const parsedDate = parse(startDateOption, 'dd/MM/yyyy', new Date());
            if (!isValid(parsedDate)) {
                await interaction.editReply("❌ Format de date de début invalide. Utilisez le format JJ/MM/AAAA (ex: 20/05/2025).");
                return;
            }

            formatOptions.startDate = parsedDate.toISOString();
        }

        // Mise à jour du programme cron si nécessaire
        let newSchedule = job.schedule;
        if (day || interval !== null || timeOption) {
            const currentParts = job.schedule.split(' ');
            let currentInterval = 1;
            if (currentParts[2].includes('/')) {
                currentInterval = parseInt(currentParts[2].split('/')[1]);
            }
            const currentDay = currentParts[5];

            const newDay = day ? day.toLowerCase() : this.getDayFromCronValue(currentDay);
            const newInterval = interval !== null ? interval : currentInterval;

            newSchedule = this.buildCronSchedule(newDay, newInterval, hour, minute);
        }

        // Mise à jour des options de formatage
        if (channelName !== null) formatOptions.baseChannelName = channelName;
        if (includeDateOption !== null) formatOptions.includeDate = includeDateOption;
        if (dateFormatOption !== null) formatOptions.dateFormat = dateFormatOption;
        formatOptions.hour = hour;
        formatOptions.minute = minute;

        // Préparation des données à mettre à jour
        let updateData: Partial<CronJob> = {};
        updateData.name = formatOptions.baseChannelName;
        updateData.description = JSON.stringify(formatOptions);

        if (newSchedule !== job.schedule) updateData.schedule = newSchedule;
        if (newCategoryId !== job.categoryId) updateData.categoryId = newCategoryId;
        if (isActive !== null) updateData.isActive = isActive;

        // Vérification des duplicatas
        if (channelName && newSchedule !== job.schedule) {
            if (!await this.isJobUnique(interaction, guildInstance.id, formatOptions.baseChannelName, newSchedule, newCategoryId, job.id)) {
                return;
            }
        }

        // Enregistrement des modifications
        try {
            await job.update(updateData);

            const updatedDetails: string[] = [];
            if (channelName) updatedDetails.push(`Nom de base: "${channelName}"`);
            if (includeDateOption !== null) updatedDetails.push(`Inclut la date: ${includeDateOption ? "Oui" : "Non"}`);
            if (dateFormatOption) updatedDetails.push(`Format de date: ${dateFormatOption}`);
            if (startDateOption) updatedDetails.push(`Date de début: ${startDateOption}`);
            if (timeOption) updatedDetails.push(`Heure: ${timeOption}`);
            if (day || interval !== null) updatedDetails.push(`Fréquence: ${this.describeCronSchedule(newSchedule)}`);
            if (categoryId) updatedDetails.push(`Catégorie: <#${categoryId}>`);
            if (isActive !== null) updatedDetails.push(`État: ${isActive ? "Actif" : "Inactif"}`);

            await interaction.editReply(`✅ Tâche mise à jour avec succès!\nModifications: ${updatedDetails.join(', ')}`);
        } catch (error) {
            this.logger.error("Erreur lors de la mise à jour de la tâche:", error);
            await interaction.editReply("Une erreur est survenue lors de la mise à jour de la tâche.");
        }
    }

    private async handleDelete(interaction: ChatInputCommandInteraction): Promise<void> {
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

        const guildInstance = await this.getOrCreateGuildInstance(interaction);
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

    private async handleTest(interaction: ChatInputCommandInteraction): Promise<void> {
        const categoryId = interaction.options.getString("categoryid", true);
        const channelNameOption = interaction.options.getString("channelname", false);
        const includeDateOption = interaction.options.getBoolean("includedate", false) ?? true;
        const dateFormatOption = interaction.options.getString("dateformat", false) || "yyyy-MM-dd";
        const startDateOption = interaction.options.getString("startdate", false);

        const category = await this.getCategory(interaction, categoryId);
        if (!category) return;

        if (!await this.checkBotPermissions(interaction, category)) return;

        try {
            await interaction.deferReply();

            const baseChannelName = channelNameOption || "test-discussion";

            // Utiliser la date spécifiée pour le test
            let customDate: Date | undefined;
            if (startDateOption) {
                const parsedDate = parse(startDateOption, 'dd/MM/yyyy', new Date());
                if (isValid(parsedDate)) {
                    customDate = parsedDate;
                }
            }

            const channelName = this.formatChannelName(baseChannelName, includeDateOption, dateFormatOption, customDate);

            const newChannel = await interaction.guild?.channels.create({
                name: channelName,
                type: 0,
                parent: categoryId
            });

            let testInfo = "";
            if (customDate) {
                testInfo = `\nTest avec date simulée: ${format(customDate, 'dd/MM/yyyy', { locale: fr })}`;
            }

            await interaction.editReply(`✅ Canal de test créé avec succès : <#${newChannel?.id}>${testInfo}`);
        } catch (error) {
            this.logger.error("Erreur lors de la création du canal test:", error);
            await interaction.editReply("❌ Une erreur est survenue lors de la création du canal test.");
        }
    }

    // Méthodes utilitaires
    private formatChannelName(baseName: string, includeDate: boolean, dateFormat: string, customDate?: Date): string {
        if (!includeDate) {
            return baseName;
        }

        try {
            const dateToFormat = customDate || new Date();
            const formattedDate = format(dateToFormat, dateFormat, { locale: fr });
            return `${baseName}-${formattedDate}`;
        } catch (error) {
            this.logger.error("Error formatting date:", error);
            return `${baseName}-${new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')}`;
        }
    }

    private buildCronSchedule(day: string, interval: number, hour: number = 12, minute: number = 0): string {
        const dayLower = day.toLowerCase();
        const dayAbbrMap: { [key: string]: string } = {
            monday: "1", tuesday: "2", wednesday: "3", thursday: "4", friday: "5", saturday: "6", sunday: "0", everyday: "*",
            lundi: "1", mardi: "2", mercredi: "3", jeudi: "4", vendredi: "5", samedi: "6", dimanche: "0"
        };

        const dayValue = dayLower in dayAbbrMap ? dayAbbrMap[dayLower] : "*";
        return `${minute} ${hour} */${interval} * ${dayValue}`;
    }

    private describeCronSchedule(schedule: string): string {
        const parts = schedule.split(' ');
        const interval = parts[2].includes('/') ? parseInt(parts[2].split('/')[1]) : 1;
        const dayValue = parts[5];
        const hour = parseInt(parts[1]) || 12;
        const minute = parseInt(parts[0]) || 0;

        const dayMap: { [key: string]: string } = {
            "0": "dimanche", "1": "lundi", "2": "mardi", "3": "mercredi", "4": "jeudi", "5": "vendredi", "6": "samedi", "*": "tous les jours"
        };

        const day = dayMap[dayValue] || "jour inconnu";
        return `Tous les ${interval} jours (${day}) à ${hour}:${minute.toString().padStart(2, '0')}`;
    }

    private getDayFromCronValue(cronDayValue: string): string {
        const dayMap: { [key: string]: string } = {
            "0": "sunday", "1": "monday", "2": "tuesday", "3": "wednesday", "4": "thursday", "5": "friday", "6": "saturday", "*": "everyday"
        };

        return dayMap[cronDayValue] || "everyday";
    }

    private async getOrCreateGuildInstance(interaction: ChatInputCommandInteraction): Promise<GuildInstance | null> {
        if (!interaction.guildId) {
            await interaction.reply({
                content: "Cette commande ne peut être utilisée que sur un serveur.",
                ephemeral: true
            });
            return null;
        }

        let guildInstance = await GuildInstance.findOne({
            where: { guildId: interaction.guildId }
        });

        if (!guildInstance) {
            guildInstance = await GuildInstance.create({
                guildId: interaction.guildId,
                guildName: interaction.guild?.name
            });
        }

        return guildInstance;
    }

    private async getCategory(interaction: ChatInputCommandInteraction, categoryId: string): Promise<CategoryChannel | null> {
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

    private async checkBotPermissions(interaction: ChatInputCommandInteraction, category: CategoryChannel): Promise<boolean> {
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

    private async isJobUnique(
        interaction: ChatInputCommandInteraction,
        guildInstanceId: string,
        name: string,
        schedule: string,
        categoryId: string,
        excludeId?: string
    ): Promise<boolean> {
        const whereClause: any = {
            guildInstanceId: guildInstanceId,
            categoryId: categoryId,
        };

        if (excludeId) {
            whereClause.id = { [Op.ne]: excludeId };
        }

        const existingJobs = await CronJob.findAll({
            where: whereClause
        });

        if (existingJobs && existingJobs.length > 0) {
            for (const job of existingJobs) {
                try {
                    if (job.description && job.description.startsWith('{')) {
                        const formatOptions = JSON.parse(job.description);
                        if (formatOptions.baseChannelName === name && job.schedule === schedule) {
                            await interaction.reply({
                                content: "Une tâche planifiée avec ce nom et cette fréquence existe déjà !",
                                ephemeral: true
                            });
                            return false;
                        }
                    } else if (job.name === name && job.schedule === schedule) {
                        // Fallback pour les tâches sans options de formatage
                        await interaction.reply({
                            content: "Une tâche planifiée avec ce nom et cette fréquence existe déjà !",
                            ephemeral: true
                        });
                        return false;
                    }
                } catch (error) {
                    // En cas d'erreur, vérifier juste le nom et le planning
                    if (job.name === name && job.schedule === schedule) {
                        await interaction.reply({
                            content: "Une tâche planifiée avec ce nom et cette fréquence existe déjà !",
                            ephemeral: true
                        });
                        return false;
                    }
                }
            }
        }

        return true;
    }

    private async createCronJob(
        interaction: ChatInputCommandInteraction,
        guildInstanceId: string,
        name: string,
        interval: number,
        schedule: string,
        categoryId: string,
        formatDescription: string
    ): Promise<void> {
        try {
            const newJob = await CronJob.create({
                name: name,
                description: formatDescription,
                schedule: schedule,
                isActive: true,
                guildInstanceId: guildInstanceId,
                categoryId: categoryId,
            });

            this.logger.info(`Created cron job: ${newJob.id} for guild: ${guildInstanceId}`);

            const formatOptions = JSON.parse(formatDescription);
            const exampleName = this.formatChannelName(
                formatOptions.baseChannelName,
                formatOptions.includeDate,
                formatOptions.dateFormat
            );

            let dateFormatInfo = "";
            if (formatOptions.includeDate) {
                dateFormatInfo = `\nLe format de date utilisé sera: \`${formatOptions.dateFormat}\``;
                dateFormatInfo += `\nExemple de nom de canal: \`${exampleName}\``;
            } else {
                dateFormatInfo = "\nLes canaux seront créés sans date dans le nom.";
            }

            let startDateInfo = "";
            if (formatOptions.startDate) {
                const startDate = new Date(formatOptions.startDate);
                startDateInfo = `\nDate de début: ${format(startDate, 'dd/MM/yyyy', { locale: fr })}`;
            }

            const timeInfo = `\nHeure de création: ${formatOptions.hour.toString().padStart(2, '0')}:${formatOptions.minute.toString().padStart(2, '0')}`;

            await interaction.reply({
                content: `✅ Tâche planifiée créée avec succès ! Le canal sera créé tous les ${interval} jours.${dateFormatInfo}${startDateInfo}${timeInfo}\nID de la tâche: \`${newJob.id}\``,
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

    getSlashCommand(): ReturnType<typeof SlashCommandBuilder.prototype.setName> | SlashCommandSubcommandsOnlyBuilder {
        return new SlashCommandBuilder()
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
                            .setDescription("Nom de base du canal (sans la date)")
                            .setRequired(false)
                    )
                    .addBooleanOption(option =>
                        option.setName("includedate")
                            .setDescription("Inclure la date dans le nom du canal?")
                            .setRequired(false)
                    )
                    .addStringOption(option =>
                        option.setName("dateformat")
                            .setDescription("Format de date (ex: yyyy-MM-dd)")
                            .setRequired(false)
                    )
                    .addStringOption(option =>
                        option.setName("startdate")
                            .setDescription("Date de début (format JJ/MM/AAAA)")
                            .setRequired(false)
                    )
                    .addStringOption(option =>
                        option.setName("time")
                            .setDescription("Heure de création (format HH:MM)")
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
                            .setDescription("Nouveau nom de base du canal")
                            .setRequired(false)
                    )
                    .addBooleanOption(option =>
                        option.setName("includedate")
                            .setDescription("Inclure la date dans le nom du canal?")
                            .setRequired(false)
                    )
                    .addStringOption(option =>
                        option.setName("dateformat")
                            .setDescription("Format de date (ex: yyyy-MM-dd)")
                            .setRequired(false)
                    )
                    .addStringOption(option =>
                        option.setName("startdate")
                            .setDescription("Date de début (format JJ/MM/AAAA)")
                            .setRequired(false)
                    )
                    .addStringOption(option =>
                        option.setName("time")
                            .setDescription("Heure de création (format HH:MM)")
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
                            .setDescription("Nom de base du canal (sans la date)")
                            .setRequired(false)
                    )
                    .addBooleanOption(option =>
                        option.setName("includedate")
                            .setDescription("Inclure la date dans le nom du canal?")
                            .setRequired(false)
                    )
                    .addStringOption(option =>
                        option.setName("dateformat")
                            .setDescription("Format de date (ex: yyyy-MM-dd)")
                            .setRequired(false)
                    )
                    .addStringOption(option =>
                        option.setName("startdate")
                            .setDescription("Date de test (format JJ/MM/AAAA)")
                            .setRequired(false)
                    )
            );
    }}