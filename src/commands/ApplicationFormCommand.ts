import {
    ChannelType,
    ChatInputCommandInteraction,
    Client,
    PermissionFlagsBits,
    Role,
    SlashCommandBuilder,
    TextChannel
} from "discord.js";
import {Command} from "./Command";
import {GuildInstance} from "../models/guildInstance";
import {ApplicationForm} from "../models/applicationForm";
import {FormQuestion} from "../models/formQuestion";
import * as console from "node:console";

export class ApplicationFormCommand extends Command {
    constructor() {
        super('applicationform');
    }

    async execute(interaction: ChatInputCommandInteraction, client: Client): Promise<void> {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
            await interaction.reply({
                content: "❌ Vous devez être administrateur pour gérer les formulaires de candidature.",
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
                await this.handleCreateForm(interaction);
                break;
            case 'addquestion':
                await this.handleAddQuestion(interaction);
                break;
            case 'list':
                await this.handleListForms(interaction);
                break;
            case 'view':
                await this.handleViewForm(interaction);
                break;
            case 'activate':
                await this.handleActivateForm(interaction, true);
                break;
            case 'deactivate':
                await this.handleActivateForm(interaction, false);
                break;
            case 'delete':
                await this.handleDeleteForm(interaction);
                break;
            default:
                await interaction.reply({
                    content: "Sous-commande inconnue.",
                    ephemeral: true
                });
        }
    }

    private async handleCreateForm(interaction: ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply({ ephemeral: true });

        try {
            const title = interaction.options.getString('title', true);
            const description = interaction.options.getString('description', false);
            const notificationChannel = interaction.options.getChannel('notification-channel', false);
            const applicationChannel = interaction.options.getChannel('application-channel', false);
            const reviewRole = interaction.options.getRole('review-role', false);

            if (notificationChannel && notificationChannel.type !== ChannelType.GuildText) {
                await interaction.editReply("Le canal de notification doit être un canal de texte.");
                return;
            }

            if (applicationChannel && applicationChannel.type !== ChannelType.GuildText) {
                await interaction.editReply("Le canal de candidature doit être un canal de texte.");
                return;
            }

            if (!interaction.guildId) {
                await interaction.editReply("Cette commande ne peut être utilisée que sur un serveur.");
                return;
            }

            let guildInstance = await GuildInstance.findOne({
                where: { guildId: interaction.guildId as string }
            });

            if (!guildInstance) {
                guildInstance = await GuildInstance.create({
                    guildId: interaction.guildId,
                    guildName: interaction.guild?.name
                });
            }

            const existingForm = await ApplicationForm.findOne({
                where: {
                    guildInstanceId: guildInstance.id,
                    title: title
                }
            });

            if (existingForm) {
                await interaction.editReply(`Un formulaire avec le titre "${title}" existe déjà.`);
                return;
            }

            const newForm = await ApplicationForm.create({
                guildInstanceId: guildInstance.id,
                title: title,
                description: description || undefined,
                isActive: true,
                notificationChannelId: notificationChannel?.id,
                applicationChannelId: applicationChannel?.id,
                reviewRoleId: reviewRole?.id
            });

            await interaction.editReply({
                content: `✅ Formulaire de candidature "${title}" créé avec succès! ID: \`${newForm.id}\`\n\nUtilisez \`/applicationform addquestion\` pour ajouter des questions à votre formulaire.`
            });

        } catch (error) {
            console.error("Erreur lors de la création du formulaire:", error);
            await interaction.editReply("❌ Une erreur est survenue lors de la création du formulaire de candidature.");
        }
    }

    private async handleAddQuestion(interaction: ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply({ ephemeral: true });

        try {
            const formId = interaction.options.getString('form-id', true);
            const questionText = interaction.options.getString('question', true);
            const questionType = interaction.options.getString('type', true) as 'text' | 'select' | 'checkbox' | 'number';
            const required = interaction.options.getBoolean('required', false) ?? true;
            const options = interaction.options.getString('options', false);

            const form = await ApplicationForm.findByPk(formId);
            if (!form) {
                await interaction.editReply(`Formulaire avec l'ID \`${formId}\` non trouvé.`);
                return;
            }

            if (!interaction.guildId) {
                await interaction.editReply("Cette commande ne peut être utilisée que sur un serveur.");
                return;
            }

            const guildInstance = await GuildInstance.findOne({
                where: { guildId: interaction.guildId as string }
            });

            if (!guildInstance || form.guildInstanceId !== guildInstance.id) {
                await interaction.editReply("Ce formulaire n'appartient pas à ce serveur.");
                return;
            }

            let parsedOptions: string[] = [];
            if ((questionType === 'select' || questionType === 'checkbox') && options) {
                const trimmedOptions = options.trim();
                if (trimmedOptions !== '') {
                    parsedOptions = trimmedOptions.split(',').map(opt => opt.trim());

                    if (parsedOptions.length < 2) {
                        await interaction.editReply("Vous devez fournir au moins 2 options séparées par des virgules.");
                        return;
                    }
                }
            }

            const highestOrder = await FormQuestion.max('order', {
                where: { applicationFormId: formId }
            }) as number | null;

            const order = (highestOrder || 0) + 1;

            await FormQuestion.create({
                applicationFormId: formId,
                questionText: questionText,
                questionType: questionType,
                options: parsedOptions,
                isRequired: required,
                order: order
            });

            await interaction.editReply(`✅ Question ajoutée avec succès au formulaire "${form.title}"!`);

        } catch (error) {
            console.error("Erreur lors de l'ajout de la question:", error);
            await interaction.editReply("❌ Une erreur est survenue lors de l'ajout de la question.");
        }
    }

    private async handleListForms(interaction: ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply({ ephemeral: true });

        try {
            if (!interaction.guildId) {
                await interaction.editReply("Cette commande ne peut être utilisée que sur un serveur.");
                return;
            }

            const guildInstance = await GuildInstance.findOne({
                where: { guildId: interaction.guildId as string }
            });

            if (!guildInstance) {
                await interaction.editReply("Aucune configuration n'a été trouvée pour ce serveur.");
                return;
            }

            const forms = await ApplicationForm.findAll({
                where: { guildInstanceId: guildInstance.id },
                order: [['createdAt', 'DESC']]
            });

            if (forms.length === 0) {
                await interaction.editReply("Aucun formulaire n'a été configuré pour ce serveur.");
                return;
            }

            const formList = forms.map((form, index) => {
                return `${index + 1}. \`${form.id}\` - **${form.title}** (${form.isActive ? '✅ Actif' : '❌ Inactif'})`;
            }).join('\n');

            await interaction.editReply({
                content: `**Formulaires de candidature disponibles:**\n\n${formList}\n\nUtilisez \`/applicationform view\` pour voir les détails d'un formulaire.`
            });

        } catch (error) {
            console.error("Erreur lors de la récupération des formulaires:", error);
            await interaction.editReply("❌ Une erreur est survenue lors de la récupération des formulaires.");
        }
    }

    private async handleViewForm(interaction: ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply({ ephemeral: true });

        try {
            const formId = interaction.options.getString('form-id', true);

            const form = await ApplicationForm.findByPk(formId, {
                include: [{
                    model: FormQuestion,
                    as: 'questions',
                    order: [['order', 'ASC']]
                }]
            });

            if (!form) {
                await interaction.editReply(`Formulaire avec l'ID \`${formId}\` non trouvé.`);
                return;
            }

            if (!interaction.guildId) {
                await interaction.editReply("Cette commande ne peut être utilisée que sur un serveur.");
                return;
            }

            const guildInstance = await GuildInstance.findOne({
                where: { guildId: interaction.guildId as string }
            });

            if (!guildInstance || form.guildInstanceId !== guildInstance.id) {
                await interaction.editReply("Ce formulaire n'appartient pas à ce serveur.");
                return;
            }

            let notificationChannel: TextChannel | null = null;
            if (form.notificationChannelId) {
                try {
                    const fetchedChannel = await interaction.guild?.channels.fetch(form.notificationChannelId);
                    if (fetchedChannel && fetchedChannel.type === ChannelType.GuildText) {
                        notificationChannel = fetchedChannel as TextChannel;
                    }
                } catch (e) {
                    console.error("Canal de notification introuvable:", e);
                }
            }

            let applicationChannel: TextChannel | null = null;
            if (form.applicationChannelId) {
                try {
                    const fetchedChannel = await interaction.guild?.channels.fetch(form.applicationChannelId);
                    if (fetchedChannel && fetchedChannel.type === ChannelType.GuildText) {
                        applicationChannel = fetchedChannel as TextChannel;
                    }
                } catch (e) {
                    console.error("Canal d'application introuvable:", e);
                }
            }

            let reviewRole: Role | null = null;
            if (form.reviewRoleId) {
                try {
                    const fetchedRole = await interaction.guild?.roles.fetch(form.reviewRoleId);
                    if (fetchedRole) {
                        reviewRole = fetchedRole;
                    }
                } catch (e) {
                    console.error("Rôle de révision introuvable:", e);
                }
            }

            const questions = form.questions ? form.questions.map((q, index) => {
                let optionsText = '';
                if (q.options && (q.questionType === 'select' || q.questionType === 'checkbox')) {
                    optionsText = `\n   Options: ${q.options.join(', ')}`;
                }
                return `${index + 1}. **${q.questionText}** (${q.questionType})${optionsText} ${q.isRequired ? '(obligatoire)' : '(optionnel)'}`;
            }).join('\n') : 'Aucune question configurée.';

            const formDetails = [
                `**Titre:** ${form.title}`,
                `**Description:** ${form.description || 'Non définie'}`,
                `**Statut:** ${form.isActive ? '✅ Actif' : '❌ Inactif'}`,
                `**Canal de notification:** ${notificationChannel ? `<#${notificationChannel.id}>` : 'Non défini'}`,
                `**Canal de candidature:** ${applicationChannel ? `<#${applicationChannel.id}>` : 'Non défini'}`,
                `**Rôle de révision:** ${reviewRole ? `<@&${reviewRole.id}>` : 'Non défini'}`,
                `**ID:** \`${form.id}\``,
                `**Créé le:** ${form.createdAt.toLocaleDateString()}`,
                '',
                '**Questions:**',
                questions
            ].join('\n');

            await interaction.editReply({
                content: formDetails
            });

        } catch (error) {
            console.error("Erreur lors de la récupération du formulaire:", error);
            await interaction.editReply("❌ Une erreur est survenue lors de la récupération du formulaire.");
        }
    }

    private async handleActivateForm(interaction: ChatInputCommandInteraction, activate: boolean): Promise<void> {
        await interaction.deferReply({ ephemeral: true });

        try {
            const formId = interaction.options.getString('form-id', true);

            const form = await ApplicationForm.findByPk(formId);
            if (!form) {
                await interaction.editReply(`Formulaire avec l'ID \`${formId}\` non trouvé.`);
                return;
            }

            if (!interaction.guildId) {
                await interaction.editReply("Cette commande ne peut être utilisée que sur un serveur.");
                return;
            }

            const guildInstance = await GuildInstance.findOne({
                where: { guildId: interaction.guildId as string }
            });

            if (!guildInstance || form.guildInstanceId !== guildInstance.id) {
                await interaction.editReply("Ce formulaire n'appartient pas à ce serveur.");
                return;
            }

            await form.update({ isActive: activate });

            await interaction.editReply({
                content: `✅ Formulaire "${form.title}" ${activate ? 'activé' : 'désactivé'} avec succès!`
            });

        } catch (error) {
            console.error(`Erreur lors de l'${activate ? 'activation' : 'désactivation'} du formulaire:`, error);
            await interaction.editReply(`❌ Une erreur est survenue lors de l'${activate ? 'activation' : 'désactivation'} du formulaire.`);
        }
    }

    private async handleDeleteForm(interaction: ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply({ ephemeral: true });

        try {
            const formId = interaction.options.getString('form-id', true);
            const confirmation = interaction.options.getString('confirmation', true);

            if (confirmation.toLowerCase() !== 'confirmer') {
                await interaction.editReply("Opération annulée. Veuillez taper 'confirmer' pour confirmer la suppression.");
                return;
            }

            const form = await ApplicationForm.findByPk(formId);
            if (!form) {
                await interaction.editReply(`Formulaire avec l'ID \`${formId}\` non trouvé.`);
                return;
            }

            if (!interaction.guildId) {
                await interaction.editReply("Cette commande ne peut être utilisée que sur un serveur.");
                return;
            }

            const guildInstance = await GuildInstance.findOne({
                where: { guildId: interaction.guildId as string }
            });

            if (!guildInstance || form.guildInstanceId !== guildInstance.id) {
                await interaction.editReply("Ce formulaire n'appartient pas à ce serveur.");
                return;
            }

            const formTitle = form.title;

            await form.destroy();

            await interaction.editReply({
                content: `✅ Formulaire "${formTitle}" supprimé avec succès!`
            });

        } catch (error) {
            console.error("Erreur lors de la suppression du formulaire:", error);
            await interaction.editReply("❌ Une erreur est survenue lors de la suppression du formulaire.");
        }
    }

    getSlashCommand(): ReturnType<typeof SlashCommandBuilder.prototype.setName> | undefined {
        return new SlashCommandBuilder()
            .setName("applicationform")
            .setDescription("Gérer les formulaires de candidature")
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
    }

    static getSlashCommand() {
        return new SlashCommandBuilder()
            .setName("applicationform")
            .setDescription("Gérer les formulaires de candidature")
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
            .addSubcommand(subcommand =>
                subcommand
                    .setName("create")
                    .setDescription("Créer un nouveau formulaire de candidature")
                    .addStringOption(option =>
                        option.setName("title")
                            .setDescription("Titre du formulaire de candidature")
                            .setRequired(true)
                    )
                    .addStringOption(option =>
                        option.setName("description")
                            .setDescription("Description du formulaire de candidature")
                            .setRequired(false)
                    )
                    .addChannelOption(option =>
                        option.setName("notification-channel")
                            .setDescription("Canal où les notifications de nouvelles candidatures seront envoyées")
                            .addChannelTypes(ChannelType.GuildText)
                            .setRequired(false)
                    )
                    .addChannelOption(option =>
                        option.setName("application-channel")
                            .setDescription("Canal où les candidatures seront soumises")
                            .addChannelTypes(ChannelType.GuildText)
                            .setRequired(false)
                    )
                    .addRoleOption(option =>
                        option.setName("review-role")
                            .setDescription("Rôle autorisé à examiner les candidatures")
                            .setRequired(false)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName("addquestion")
                    .setDescription("Ajouter une question au formulaire de candidature")
                    .addStringOption(option =>
                        option.setName("form-id")
                            .setDescription("ID du formulaire de candidature")
                            .setRequired(true)
                    )
                    .addStringOption(option =>
                        option.setName("question")
                            .setDescription("Texte de la question")
                            .setRequired(true)
                    )
                    .addStringOption(option =>
                        option.setName("type")
                            .setDescription("Type de question")
                            .setRequired(true)
                            .addChoices(
                                { name: "Texte", value: "text" },
                                { name: "Sélection unique", value: "select" },
                                { name: "Cases à cocher", value: "checkbox" },
                                { name: "Nombre", value: "number" }
                            )
                    )
                    .addBooleanOption(option =>
                        option.setName("required")
                            .setDescription("La question est-elle obligatoire?")
                            .setRequired(false)
                    )
                    .addStringOption(option =>
                        option.setName("options")
                            .setDescription("Options pour les questions de type sélection ou cases à cocher (séparées par des virgules)")
                            .setRequired(false)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName("list")
                    .setDescription("Lister tous les formulaires de candidature")
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName("view")
                    .setDescription("Voir les détails d'un formulaire de candidature")
                    .addStringOption(option =>
                        option.setName("form-id")
                            .setDescription("ID du formulaire de candidature")
                            .setRequired(true)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName("activate")
                    .setDescription("Activer un formulaire de candidature")
                    .addStringOption(option =>
                        option.setName("form-id")
                            .setDescription("ID du formulaire de candidature")
                            .setRequired(true)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName("deactivate")
                    .setDescription("Désactiver un formulaire de candidature")
                    .addStringOption(option =>
                        option.setName("form-id")
                            .setDescription("ID du formulaire de candidature")
                            .setRequired(true)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName("delete")
                    .setDescription("Supprimer un formulaire de candidature")
                    .addStringOption(option =>
                        option.setName("form-id")
                            .setDescription("ID du formulaire de candidature")
                            .setRequired(true)
                    )
                    .addStringOption(option =>
                        option.setName("confirmation")
                            .setDescription("Tapez 'confirmer' pour confirmer la suppression")
                            .setRequired(true)
                    )
            );
    }
}