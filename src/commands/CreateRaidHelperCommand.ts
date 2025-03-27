import { ChatInputCommandInteraction, Client, SlashCommandBuilder, TextChannel } from "discord.js";
import { Command } from "./Command";
import { CronJob } from "../models/cronJob";
import { GuildInstance } from "../models/guildInstance";
import { RaidHelperEvent } from "../models/raidHelperEvent";

export class CreateRaidHelperCommand extends Command {
    constructor() {
        super('CreateRaidHelper');
    }

    async execute(interaction: ChatInputCommandInteraction, client: Client): Promise<void> {
        const day = interaction.options.getString("day", true);
        const interval = interaction.options.getInteger("interval", true);
        const channelId = interaction.options.getChannel("channel", true).id;
        const raidName = interaction.options.getString("raidname", true);
        const raidDescription = interaction.options.getString("description", false);
        const raidTime = interaction.options.getString("time", true);
        const templateId = interaction.options.getString("templateid", false);

        if (!interaction.guildId) {
            await interaction.reply("Cette commande ne peut être utilisée que sur un serveur.");
            return;
        }

        const guildInstance = await GuildInstance.findOne({ where: { guildId: interaction.guildId }});
        if (!guildInstance) {
            await interaction.reply("Configuration du serveur non trouvée. Veuillez d'abord configurer votre instance de guilde.");
            return;
        }

        const channel = interaction.guild?.channels.cache.get(channelId);
        if (!channel || channel.type !== 0) {
            await interaction.reply("Canal invalide ou introuvable !");
            return;
        }

        const dayLower = day.toLowerCase();
        const dayAbbrMap: { [key: string]: string } = {
            monday: "1",
            tuesday: "2",
            wednesday: "3",
            thursday: "4",
            friday: "5",
            saturday: "6",
            sunday: "0",
            lundi: "1",
            mardi: "2",
            mercredi: "3",
            jeudi: "4",
            vendredi: "5",
            samedi: "6",
            dimanche: "0"
        };

        let schedule = "";
        if (dayLower in dayAbbrMap) {
            schedule = `0 0 12 */${interval} * ${dayAbbrMap[dayLower]}`;
        } else {
            schedule = `0 0 12 */${interval} * *`;
        }

        const existingJob = await CronJob.findOne({
            where: {
                guildInstanceId: guildInstance.id,
                name: raidName,
                schedule: schedule
            }
        });

        if (existingJob) {
            await interaction.reply("Une tâche planifiée avec ce nom et cette fréquence existe déjà !");
            return;
        }

        try {
            const newCronJob = await CronJob.create({
                name: raidName,
                description: `Crée automatiquement un événement RaidHelper pour ${raidName} tous les ${interval} jours`,
                schedule: schedule,
                isActive: true,
                guildInstanceId: guildInstance.id
            });

            await RaidHelperEvent.create({
                cronJobId: newCronJob.id,
                raidName: raidName,
                raidDescription: raidDescription || `Raid ${raidName}`,
                raidTime: raidTime,
                maxParticipants: 40,
                channelId: channelId,
                raidTemplateId: templateId
            });

            await interaction.reply(`✅ Événement RaidHelper créé avec succès ! Un événement sera créé tous les ${interval} jours pour le raid "${raidName}" à ${raidTime} dans le canal <#${channelId}>.`);

            if (interaction.options.getBoolean("test")) {
                const textChannel = await client.channels.fetch(channelId) as TextChannel;
                await textChannel.send(`Test de création d'événement RaidHelper : \`/raidhelper create template:${templateId || 'default'} title:${raidName} description:${raidDescription || `Raid ${raidName}`} time:${raidTime}\``);

                await interaction.followUp("💡 Commande de test envoyée dans le canal spécifié. N'oubliez pas que vous devez avoir invité RaidHelper sur votre serveur et lui avoir donné les permissions appropriées.");
            }
        } catch (error) {
            console.error("Erreur lors de la création de l'événement RaidHelper:", error);
            await interaction.reply("❌ Une erreur est survenue lors de la création de l'événement RaidHelper.");
        }
    }

    static getSlashCommand() {
        return new SlashCommandBuilder()
            .setName("createraidhelper")
            .setDescription("Crée automatiquement des événements RaidHelper à intervalles réguliers")
            .addChannelOption(option =>
                option.setName("channel")
                    .setDescription("Canal où envoyer les commandes RaidHelper")
                    .setRequired(true)
            )
            .addStringOption(option =>
                option.setName("day")
                    .setDescription("Jour de la semaine pour la création de l'événement (ex: Jeudi)")
                    .setRequired(true)
            )
            .addIntegerOption(option =>
                option.setName("interval")
                    .setDescription("Intervalle en jours pour la création de l'événement")
                    .setRequired(true)
            )
            .addStringOption(option =>
                option.setName("raidname")
                    .setDescription("Nom du raid (ex: Molten Core, BWL, etc.)")
                    .setRequired(true)
            )
            .addStringOption(option =>
                option.setName("time")
                    .setDescription("Heure du raid au format HH:MM")
                    .setRequired(true)
            )
            .addStringOption(option =>
                option.setName("description")
                    .setDescription("Description du raid")
                    .setRequired(false)
            )
            .addStringOption(option =>
                option.setName("templateid")
                    .setDescription("ID du template RaidHelper à utiliser")
                    .setRequired(false)
            )
            .addBooleanOption(option =>
                option.setName("test")
                    .setDescription("Envoyer immédiatement une commande de test?")
                    .setRequired(false)
            );
    }
}