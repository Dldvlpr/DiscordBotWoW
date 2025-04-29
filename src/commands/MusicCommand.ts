import {
    ChatInputCommandInteraction,
    Client,
    SlashCommandBuilder,
    VoiceChannel,
    TextChannel,
    GuildMember,
    ChannelType,
    EmbedBuilder
} from "discord.js";
import { Command } from "./Command";
import { MusicPlayer } from "../audio/MusicPlayer";

export class MusicCommand extends Command {
    private musicPlayer: MusicPlayer;
    private initialized: boolean = false;

    constructor(client: Client) {
        super("music");
        this.musicPlayer = new MusicPlayer(client);
    }

    async initialize(): Promise<void> {
        try {
            await this.musicPlayer.initialize();
            this.initialized = true;
            this.logger.info("Music command initialized successfully");
        } catch (error) {
            this.logger.error("Failed to initialize music command:", error);
            throw error;
        }
    }

    async execute(interaction: ChatInputCommandInteraction, client: Client): Promise<void> {
        try {
            if (!this.initialized) {
                await interaction.reply({
                    content: "Le système de musique est en cours d'initialisation. Veuillez réessayer dans quelques instants.",
                    ephemeral: true
                });
                return;
            }

            const member = interaction.member;
            if (!member || !(member instanceof GuildMember) || !member.voice.channel) {
                await interaction.reply({
                    content: "Vous devez être dans un canal vocal pour utiliser cette commande.",
                    ephemeral: true
                });
                return;
            }

            const voiceChannel = member.voice.channel;
            if (voiceChannel.type !== ChannelType.GuildVoice) {
                await interaction.reply({
                    content: "Le canal doit être un canal vocal.",
                    ephemeral: true
                });
                return;
            }

            const subcommand = interaction.options.getSubcommand();

            switch (subcommand) {
                case 'play':
                    await this.handlePlay(interaction, voiceChannel);
                    break;
                case 'skip':
                    await this.handleSkip(interaction);
                    break;
                case 'stop':
                    await this.handleStop(interaction);
                    break;
                case 'pause':
                    await this.handlePause(interaction);
                    break;
                case 'resume':
                    await this.handleResume(interaction);
                    break;
                case 'queue':
                    await this.handleQueue(interaction);
                    break;
                case 'volume':
                    await this.handleVolume(interaction);
                    break;
                default:
                    await interaction.reply({
                        content: "Sous-commande inconnue.",
                        ephemeral: true
                    });
            }
        } catch (error) {
            this.logger.error(`Erreur dans l'exécution de la commande music: ${error}`);
            await interaction.reply({
                content: `Une erreur est survenue: ${error instanceof Error ? error.message : String(error)}`,
                ephemeral: true
            });
        }
    }

    private async handlePlay(interaction: ChatInputCommandInteraction, voiceChannel: VoiceChannel): Promise<void> {
        const query = interaction.options.getString("query", true);

        await interaction.deferReply();

        try {
            if (!interaction.channel || interaction.channel.type !== ChannelType.GuildText) {
                await interaction.editReply("Cette commande doit être utilisée dans un canal textuel d'un serveur.");
                return;
            }

            const track = await this.musicPlayer.play(
                voiceChannel,
                query,
                interaction.channel as TextChannel
            );

            await interaction.editReply(`✅ Ajouté à la file d'attente: **${track.title}**`);
        } catch (error) {
            await interaction.editReply(`❌ Erreur: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async handleSkip(interaction: ChatInputCommandInteraction): Promise<void> {
        if (!interaction.guildId) {
            await interaction.reply({
                content: "Cette commande ne peut être utilisée que sur un serveur.",
                ephemeral: true
            });
            return;
        }

        const success = this.musicPlayer.skip(interaction.guildId);

        if (success) {
            await interaction.reply("⏭️ Morceau suivant !");
        } else {
            await interaction.reply({
                content: "Aucune musique n'est en cours de lecture.",
                ephemeral: true
            });
        }
    }

    private async handleStop(interaction: ChatInputCommandInteraction): Promise<void> {
        if (!interaction.guildId) {
            await interaction.reply({
                content: "Cette commande ne peut être utilisée que sur un serveur.",
                ephemeral: true
            });
            return;
        }

        const success = this.musicPlayer.stop(interaction.guildId);

        if (success) {
            await interaction.reply("⏹️ Lecture arrêtée et file d'attente vidée.");
        } else {
            await interaction.reply({
                content: "Aucune musique n'est en cours de lecture.",
                ephemeral: true
            });
        }
    }

    private async handlePause(interaction: ChatInputCommandInteraction): Promise<void> {
        if (!interaction.guildId) {
            await interaction.reply({
                content: "Cette commande ne peut être utilisée que sur un serveur.",
                ephemeral: true
            });
            return;
        }

        const success = this.musicPlayer.pause(interaction.guildId);

        if (success) {
            await interaction.reply("⏸️ Lecture mise en pause.");
        } else {
            await interaction.reply({
                content: "Aucune musique n'est en cours de lecture.",
                ephemeral: true
            });
        }
    }

    private async handleResume(interaction: ChatInputCommandInteraction): Promise<void> {
        if (!interaction.guildId) {
            await interaction.reply({
                content: "Cette commande ne peut être utilisée que sur un serveur.",
                ephemeral: true
            });
            return;
        }

        const success = this.musicPlayer.resume(interaction.guildId);

        if (success) {
            await interaction.reply("▶️ Lecture reprise.");
        } else {
            await interaction.reply({
                content: "La musique n'est pas en pause.",
                ephemeral: true
            });
        }
    }

    private async handleQueue(interaction: ChatInputCommandInteraction): Promise<void> {
        if (!interaction.guildId) {
            await interaction.reply({
                content: "Cette commande ne peut être utilisée que sur un serveur.",
                ephemeral: true
            });
            return;
        }

        const queueInfo = this.musicPlayer.getQueue(interaction.guildId);

        if (!queueInfo || !queueInfo.currentTrack) {
            await interaction.reply({
                content: "Aucune musique n'est en cours de lecture.",
                ephemeral: true
            });
            return;
        }

        const currentTrack = queueInfo.currentTrack;
        const tracks = queueInfo.tracks.slice(0, 10);

        const embed = new EmbedBuilder()
            .setTitle("🎵 File d'attente")
            .setColor(0x3498db);

        let queueText = `**En cours:** [${currentTrack.title}](${currentTrack.url}) | ${currentTrack.duration}\n\n`;

        if (tracks.length > 0) {
            queueText += "**À venir:**\n";
            tracks.forEach((track, i) => {
                queueText += `${i + 1}. [${track.title}](${track.url}) | ${track.duration}\n`;
            });

            if (queueInfo.tracks.length > 10) {
                queueText += `\n... et ${queueInfo.tracks.length - 10} autres pistes`;
            }

            queueText += `\n\n**Durée totale:** ${queueInfo.totalDuration}`;
        } else {
            queueText += "*Aucune piste en attente*";
        }

        embed.setDescription(queueText);
        await interaction.reply({ embeds: [embed] });
    }

    private async handleVolume(interaction: ChatInputCommandInteraction): Promise<void> {
        if (!interaction.guildId) {
            await interaction.reply({
                content: "Cette commande ne peut être utilisée que sur un serveur.",
                ephemeral: true
            });
            return;
        }

        const volume = interaction.options.getInteger("level", true);

        if (volume < 0 || volume > 100) {
            await interaction.reply({
                content: "Le volume doit être entre 0 et 100.",
                ephemeral: true
            });
            return;
        }

        const success = this.musicPlayer.setVolume(interaction.guildId, volume);

        if (success) {
            await interaction.reply(`🔊 Volume réglé à ${volume}%`);
        } else {
            await interaction.reply({
                content: "Aucune musique n'est en cours de lecture.",
                ephemeral: true
            });
        }
    }

    getSlashCommand() {
        return new SlashCommandBuilder()
            .setName("music")
            .setDescription("Commandes de musique")
            .addSubcommand(subcommand =>
                subcommand
                    .setName("play")
                    .setDescription("Joue une musique")
                    .addStringOption(option =>
                        option.setName("query")
                            .setDescription("URL ou terme de recherche")
                            .setRequired(true)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand.setName("skip")
                    .setDescription("Passe à la piste suivante")
            )
            .addSubcommand(subcommand =>
                subcommand.setName("stop")
                    .setDescription("Arrête la lecture et quitte le canal vocal")
            )
            .addSubcommand(subcommand =>
                subcommand.setName("pause")
                    .setDescription("Met en pause la lecture")
            )
            .addSubcommand(subcommand =>
                subcommand.setName("resume")
                    .setDescription("Reprend la lecture")
            )
            .addSubcommand(subcommand =>
                subcommand.setName("queue")
                    .setDescription("Affiche la file d'attente")
            )
            .addSubcommand(subcommand =>
                subcommand.setName("volume")
                    .setDescription("Change le volume de lecture")
                    .addIntegerOption(option =>
                        option.setName("level")
                            .setDescription("Niveau de volume (0-100)")
                            .setRequired(true)
                            .setMinValue(0)
                            .setMaxValue(100)
                    )
            );
    }
}