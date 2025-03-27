import { ChatInputCommandInteraction, Client, SlashCommandBuilder } from "discord.js";
import { Command } from "./Command";
import { GuildInstance } from "../models/guildInstance";
import { WelcomeMessage } from "../models/welcomeMessage";

export class WelcomeCommand extends Command {
    constructor() {
        super("welcome");
    }

    async execute(interaction: ChatInputCommandInteraction, client: Client): Promise<void> {
        if (!interaction.guildId) {
            await interaction.reply("Cette commande ne peut être utilisée que sur un serveur.");
            return;
        }

        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case "set":
                await this.setWelcomeMessage(interaction);
                break;
            case "disable":
                await this.disableWelcomeMessage(interaction);
                break;
            case "enable":
                await this.enableWelcomeMessage(interaction);
                break;
            case "test":
                await this.testWelcomeMessage(interaction, client);
                break;
            default:
                await interaction.reply("Sous-commande inconnue.");
        }
    }

    private async setWelcomeMessage(interaction: ChatInputCommandInteraction): Promise<void> {
        const message = interaction.options.getString("message", true);

        let guildInstance = await GuildInstance.findOne({ where: { guildId: interaction.guildId } });

        if (!guildInstance) {
            guildInstance = await GuildInstance.create({
                guildId: interaction.guildId,
                guildName: interaction.guild?.name
            });
        }

        let welcomeMessage = await WelcomeMessage.findOne({
            where: { guildInstanceId: guildInstance.id }
        });

        if (welcomeMessage) {
            await welcomeMessage.update({
                message,
                isEnabled: true
            });
            await interaction.reply("✅ Message de bienvenue mis à jour avec succès ! Il sera envoyé en message privé aux nouveaux membres.");
        } else {
            await WelcomeMessage.create({
                guildInstanceId: guildInstance.id,
                message,
                isEnabled: true
            });
            await interaction.reply("✅ Message de bienvenue configuré avec succès ! Il sera envoyé en message privé aux nouveaux membres.");
        }
    }

    private async disableWelcomeMessage(interaction: ChatInputCommandInteraction): Promise<void> {
        const guildInstance = await GuildInstance.findOne({ where: { guildId: interaction.guildId } });

        if (!guildInstance) {
            await interaction.reply("⚠️ Aucune configuration trouvée pour ce serveur.");
            return;
        }

        const welcomeMessage = await WelcomeMessage.findOne({
            where: { guildInstanceId: guildInstance.id }
        });

        if (!welcomeMessage) {
            await interaction.reply("⚠️ Aucun message de bienvenue configuré pour ce serveur.");
            return;
        }

        await welcomeMessage.update({ isEnabled: false });
        await interaction.reply("✅ Message de bienvenue désactivé.");
    }

    private async enableWelcomeMessage(interaction: ChatInputCommandInteraction): Promise<void> {
        const guildInstance = await GuildInstance.findOne({ where: { guildId: interaction.guildId } });

        if (!guildInstance) {
            await interaction.reply("⚠️ Aucune configuration trouvée pour ce serveur.");
            return;
        }

        const welcomeMessage = await WelcomeMessage.findOne({
            where: { guildInstanceId: guildInstance.id }
        });

        if (!welcomeMessage) {
            await interaction.reply("⚠️ Aucun message de bienvenue configuré pour ce serveur.");
            return;
        }

        await welcomeMessage.update({ isEnabled: true });
        await interaction.reply("✅ Message de bienvenue activé.");
    }

    private async testWelcomeMessage(interaction: ChatInputCommandInteraction, client: Client): Promise<void> {
        const guildInstance = await GuildInstance.findOne({ where: { guildId: interaction.guildId } });

        if (!guildInstance) {
            await interaction.reply("⚠️ Aucune configuration trouvée pour ce serveur.");
            return;
        }

        const welcomeMessage = await WelcomeMessage.findOne({
            where: { guildInstanceId: guildInstance.id }
        });

        if (!welcomeMessage || !welcomeMessage.isEnabled) {
            await interaction.reply("⚠️ Aucun message de bienvenue actif pour ce serveur.");
            return;
        }

        try {
            const formattedMessage = welcomeMessage.message
                .replace(/{user}/g, interaction.user.username)
                .replace(/{usermention}/g, `<@${interaction.user.id}>`)
                .replace(/{server}/g, interaction.guild?.name || "le serveur");

            await interaction.user.send(formattedMessage);
            await interaction.reply("✅ Test du message de bienvenue envoyé dans vos messages privés !");
        } catch (error) {
            console.error("Erreur lors du test du message de bienvenue:", error);
            await interaction.reply("❌ Impossible d'envoyer un message privé. Vérifiez que vous avez activé les messages privés pour ce serveur.");
        }
    }

    static getSlashCommand() {
        return new SlashCommandBuilder()
            .setName("welcome")
            .setDescription("Gère les messages de bienvenue")
            .addSubcommand(subcommand =>
                subcommand
                    .setName("set")
                    .setDescription("Configure le message de bienvenue (envoyé en MP)")
                    .addStringOption(option =>
                        option.setName("message")
                            .setDescription("Message de bienvenue. Utilisez {user} pour le nom, {usermention} pour mentionner et {server} pour le serveur")
                            .setRequired(true)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName("disable")
                    .setDescription("Désactive le message de bienvenue")
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName("enable")
                    .setDescription("Active le message de bienvenue")
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName("test")
                    .setDescription("Teste le message de bienvenue (vous recevrez un MP)")
            );
    }
}