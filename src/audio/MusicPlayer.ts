import {
    Client,
    VoiceChannel,
    TextChannel,
    EmbedBuilder,
    GuildResolvable,
    Guild
} from 'discord.js';
import { Player, QueryType, Track, GuildQueue } from 'discord-player';
import { Logger } from '../utils/Logger';
import { DefaultExtractors } from '@discord-player/extractor';

interface GuildMusicCache {
    currentTrack: Track | null;
    nextTrack: Track | null;
    currentUrlIndex: Map<string, number>;
    lastActivity: number;
}

interface QueueInfo {
    currentTrack: Track | null;
    tracks: Track[];
    totalDuration: string;
}

/**
 * Service gérant la lecture audio via Discord Player
 */
export class MusicPlayer {
    private initialized = false;
    private readonly player: Player;
    private readonly logger: Logger;
    private readonly guildCache: Map<string, GuildMusicCache> = new Map();
    private readonly inactivityCleanupInterval: NodeJS.Timeout;
    private initializationPromise: Promise<void> | null = null;

    private readonly INACTIVITY_CLEANUP_MS = 15 * 60 * 1000; // 15 minutes
    private readonly DEFAULT_VOLUME = 80;

    constructor(client: Client) {
        this.logger = new Logger('MusicPlayer');
        this.player = new Player(client);
        this.setupEventListeners();

        this.inactivityCleanupInterval = setInterval(() => {
            this.cleanupInactiveGuilds();
        }, 5 * 60 * 1000); // Nettoyage toutes les 5 minutes
    }

    /**
     * Vérifie si le MusicPlayer est initialisé
     */
    public isInitialized(): boolean {
        return this.initialized;
    }

    /**
     * Initialise le MusicPlayer et ses extracteurs
     */
    public async initialize(): Promise<void> {
        if (this.initialized) return;

        if (this.initializationPromise) {
            await this.initializationPromise;
            return;
        }

        this.initializationPromise = this._initialize();

        try {
            await this.initializationPromise;
        } finally {
            this.initializationPromise = null;
        }
    }

    /**
     * Méthode privée d'initialisation
     */
    private async _initialize(): Promise<void> {
        try {
            this.logger.info("Initialisation du lecteur audio...");

            // Enregistrement des extracteurs
            try {
                // Discord Player a l'extracteur YouTube intégré par défaut
                // Tentative d'utiliser loadDefault pour charger les extracteurs intégrés
                await this.player.extractors.loadMulti(DefaultExtractors);
                this.initialized = true;
                this.logger.info("Extracteurs par défaut chargés avec succès");
            } catch (error) {
                this.logger.warn(`Erreur lors du chargement des extracteurs par défaut: ${error}`);

                // Si loadDefault échoue, essayons d'enregistrer des extracteurs supplémentaires
                try {
                    // Importation des extracteurs disponibles dans @discord-player/extractor
                    const { SpotifyExtractor, SoundCloudExtractor } = await import('@discord-player/extractor');

                    // Enregistrement des extracteurs disponibles
                    await this.player.extractors.register(SpotifyExtractor, {});
                    this.logger.info("SpotifyExtractor enregistré avec succès");

                    await this.player.extractors.register(SoundCloudExtractor, {});
                    this.logger.info("SoundCloudExtractor enregistré avec succès");

                } catch (importError) {
                    this.logger.error(`Échec de l'importation des extracteurs supplémentaires: ${importError}`);
                    this.logger.info("Le lecteur fonctionnera avec une fonctionnalité réduite");
                }
            }

            this.initialized = true;
            this.logger.info("MusicPlayer initialisé avec succès");
        } catch (error) {
            this.logger.error('Erreur critique lors de l\'initialisation:', error);
            throw new Error(`Échec de l'initialisation: ${(error as Error).message || 'Erreur inconnue'}`);
        }
    }

    private setupEventListeners(): void {
        // Écoute les événements de Discord Player
        this.player.events.on('playerStart', (queue, track) => {
            this.updateActivity(queue.guild.id);
            this.sendNowPlayingMessage(queue, track);

            const cache = this.getGuildCache(queue.guild.id);
            cache.currentUrlIndex.set(track.id, 0);
        });

        this.player.events.on('audioTrackAdd', (queue, track) => {
            this.logger.debug(`Piste ajoutée dans ${queue.guild.id}: ${track.title}`);
            const metadata = queue.metadata as { channel: TextChannel } | undefined;

            if (metadata?.channel && queue.tracks.data.length === 1 && !queue.node.isPlaying()) {
                metadata.channel.send(`🎵 Ajouté à la file d'attente: **${track.title}**`).catch(err => {
                    this.logger.error('Erreur lors de l\'envoi du message:', err);
                });
            }
        });

        this.player.events.on('playerSkip', (queue, track) => {
            this.logger.debug(`Piste ignorée dans ${queue.guild.id}: ${track.title}`);
            this.updateActivity(queue.guild.id);
        });

        this.player.events.on('audioTracksAdd', (queue, tracks) => {
            this.logger.debug(`${tracks.length} pistes ajoutées dans ${queue.guild.id}`);
            const metadata = queue.metadata as { channel: TextChannel } | undefined;

            if (metadata?.channel) {
                metadata.channel.send(`🎵 ${tracks.length} pistes ajoutées à la file d'attente`).catch(err => {
                    this.logger.error('Erreur lors de l\'envoi du message:', err);
                });
            }
        });

        this.player.events.on('disconnect', (queue) => {
            this.logger.debug(`Déconnecté du canal vocal dans ${queue.guild.id}`);
            this.cleanupGuildCache(queue.guild.id);
        });

        this.player.events.on('emptyQueue', (queue) => {
            this.logger.debug(`File d'attente vide pour ${queue.guild.id}`);
            const metadata = queue.metadata as { channel: TextChannel } | undefined;

            if (metadata?.channel) {
                metadata.channel.send('📭 La file d\'attente est maintenant vide.').catch(err => {
                    this.logger.error('Erreur lors de l\'envoi du message:', err);
                });
            }
        });

        this.player.events.on('emptyChannel', (queue) => {
            this.logger.debug(`Canal vocal vide pour ${queue.guild.id}`);
            this.cleanupGuildCache(queue.guild.id);
        });

        this.player.events.on('error', (queue, error) => {
            this.logger.error(`Erreur dans ${queue.guild.id}: ${error.message}`);

            const metadata = queue.metadata as { channel: TextChannel } | undefined;
            if (metadata?.channel) {
                metadata.channel.send(`⚠️ Erreur de lecture: ${error.message}`).catch(err => {
                    this.logger.error('Erreur lors de l\'envoi du message:', err);
                });
            }
        });
    }

    private getGuildCache(guildId: string): GuildMusicCache {
        if (!this.guildCache.has(guildId)) {
            this.guildCache.set(guildId, {
                currentTrack: null,
                nextTrack: null,
                currentUrlIndex: new Map(),
                lastActivity: Date.now()
            });
        }

        return this.guildCache.get(guildId) as GuildMusicCache;
    }

    private updateActivity(guildId: string): void {
        const cache = this.getGuildCache(guildId);
        cache.lastActivity = Date.now();
    }

    private async preloadNextTrack(queue: GuildQueue): Promise<void> {
        if (!queue || queue.tracks.size === 0) return;

        const nextTrack = queue.tracks.data[0];
        if (!nextTrack) return;

        const cache = this.getGuildCache(queue.guild.id);
        cache.nextTrack = nextTrack;
    }

    private sendNowPlayingMessage(queue: GuildQueue, track: Track): void {
        try {
            const metadata = queue.metadata as { channel: TextChannel } | undefined;
            if (!metadata || !metadata.channel) {
                this.logger.warn("Impossible d'envoyer le message 'Now Playing' - métadonnées manquantes");
                return;
            }

            const textChannel = metadata.channel;

            const embed = new EmbedBuilder()
                .setTitle('🎵 Lecture en cours')
                .setDescription(`**[${track.title}](${track.url})**`)
                .addFields([
                    { name: 'Durée', value: track.duration || 'Inconnue', inline: true },
                    { name: 'Demandé par', value: track.requestedBy ? track.requestedBy.username : 'Inconnu', inline: true }
                ])
                .setColor('#3498db');

            if (track.thumbnail) {
                embed.setThumbnail(track.thumbnail);
            }

            textChannel.send({ embeds: [embed] }).catch(err => {
                this.logger.error(`Erreur lors de l'envoi du message: ${err}`);
            });
        } catch (error) {
            this.logger.error(`Erreur lors de l'envoi du message de lecture: ${error}`);
        }
    }

    private cleanupGuildCache(guildId: string): void {
        this.guildCache.delete(guildId);
        this.logger.debug(`Cache nettoyé pour le serveur ${guildId}`);
    }

    private cleanupInactiveGuilds(): void {
        const now = Date.now();
        let cleanedCount = 0;

        for (const [guildId, cache] of this.guildCache.entries()) {
            const timeSinceLastActivity = now - cache.lastActivity;

            if (timeSinceLastActivity > this.INACTIVITY_CLEANUP_MS) {
                const queue = this.player.nodes.get(guildId);
                if (!queue || !queue.node.isPlaying()) {
                    this.cleanupGuildCache(guildId);
                    cleanedCount++;
                }
            }
        }

        if (cleanedCount > 0) {
            this.logger.info(`Nettoyage périodique: ${cleanedCount} serveurs inactifs nettoyés`);
        }
    }

    /**
     * Détruit l'instance du MusicPlayer et libère les ressources
     */
    public destroy(): void {
        clearInterval(this.inactivityCleanupInterval);
        this.guildCache.clear();
        this.player.destroy();
        this.logger.info('Ressources du lecteur musical libérées');
    }

    /**
     * Joue un morceau audio dans un canal vocal
     * @param voiceChannel Le canal vocal où jouer la musique
     * @param query L'URL ou le terme de recherche
     * @param textChannel Le canal textuel pour les messages
     * @returns La piste ajoutée
     */
    public async play(voiceChannel: VoiceChannel, query: string, textChannel: TextChannel): Promise<Track> {
        if (!this.isInitialized()) {
            try {
                await this.initialize();
            } catch (error) {
                throw new Error(`Le lecteur de musique n'est pas initialisé: ${(error as Error).message || 'Erreur inconnue'}`);
            }
        }

        if (!voiceChannel || !textChannel) {
            throw new Error('Canal vocal ou textuel non spécifié');
        }

        this.updateActivity(voiceChannel.guild.id);

        try {
            // Utilisation de la méthode standard pour rechercher et jouer
            const result = await this.player.play(voiceChannel, query, {
                nodeOptions: {
                    metadata: {
                        channel: textChannel
                    },
                    // Configuration des options de qualité audio et du comportement
                    leaveOnEmpty: true,
                    leaveOnEmptyCooldown: 300000, // 5 minutes
                    leaveOnEnd: false,
                    selfDeaf: true,
                    volume: this.DEFAULT_VOLUME,
                    bufferingTimeout: 30000, // 30 secondes
                    connectionTimeout: 30000 // 30 secondes
                },
                searchEngine: QueryType.AUTO,
                requestedBy: textChannel.client.user
            });

            if (!result || !result.track) {
                throw new Error(`Aucun résultat trouvé pour "${query}"`);
            }

            const cache = this.getGuildCache(voiceChannel.guild.id);
            cache.currentTrack = result.track;

            const queue = this.player.nodes.get(voiceChannel.guild.id);
            if (queue) {
                await this.preloadNextTrack(queue);
            }

            return result.track;
        } catch (error) {
            this.logger.error(`Erreur de lecture: ${error}`);
            throw new Error(`Impossible de lire cette piste. ${(error as Error).message}`);
        }
    }

    /**
     * Met en pause la lecture
     * @param guildId L'ID du serveur
     * @returns true si la pause a réussi, false sinon
     */
    public pause(guildId: GuildResolvable): boolean {
        if (!this.isInitialized()) return false;

        const stringGuildId = guildId instanceof Guild ? guildId.id : String(guildId);
        this.updateActivity(stringGuildId);

        const queue = this.player.nodes.get(guildId);
        if (!queue || !queue.node.isPlaying() || queue.node.isPaused()) {
            return false;
        }

        queue.node.pause();
        return true;
    }

    /**
     * Reprend la lecture
     * @param guildId L'ID du serveur
     * @returns true si la reprise a réussi, false sinon
     */
    public resume(guildId: GuildResolvable): boolean {
        if (!this.isInitialized()) return false;

        const stringGuildId = guildId instanceof Guild ? guildId.id : String(guildId);
        this.updateActivity(stringGuildId);

        const queue = this.player.nodes.get(guildId);
        if (!queue || !queue.node.isPaused()) {
            return false;
        }

        queue.node.resume();
        return true;
    }

    /**
     * Passe à la piste suivante
     * @param guildId L'ID du serveur
     * @returns true si le saut a réussi, false sinon
     */
    public skip(guildId: GuildResolvable): boolean {
        if (!this.isInitialized()) return false;

        const stringGuildId = guildId instanceof Guild ? guildId.id : String(guildId);
        this.updateActivity(stringGuildId);

        const queue = this.player.nodes.get(guildId);
        if (!queue || (!queue.node.isPlaying() && queue.tracks.size === 0)) {
            return false;
        }

        queue.node.skip();
        return true;
    }

    /**
     * Arrête la lecture et quitte le canal vocal
     * @param guildId L'ID du serveur
     * @returns true si l'arrêt a réussi, false sinon
     */
    public stop(guildId: GuildResolvable): boolean {
        if (!this.isInitialized()) return false;

        const stringGuildId = guildId instanceof Guild ? guildId.id : String(guildId);

        const queue = this.player.nodes.get(guildId);
        if (!queue) {
            return false;
        }

        queue.delete();
        this.cleanupGuildCache(stringGuildId);
        return true;
    }

    /**
     * Modifie le volume de lecture
     * @param guildId L'ID du serveur
     * @param volume Le niveau de volume (0-100)
     * @returns true si le changement a réussi, false sinon
     */
    public setVolume(guildId: GuildResolvable, volume: number): boolean {
        if (!this.isInitialized()) return false;

        const stringGuildId = guildId instanceof Guild ? guildId.id : String(guildId);
        this.updateActivity(stringGuildId);

        const queue = this.player.nodes.get(guildId);
        if (!queue) {
            return false;
        }

        const safeVolume = Math.max(0, Math.min(100, volume));
        queue.node.setVolume(safeVolume);
        return true;
    }

    /**
     * Récupère les informations de la file d'attente
     * @param guildId L'ID du serveur
     * @returns Informations sur la file d'attente ou null si aucune
     */
    public getQueue(guildId: GuildResolvable): QueueInfo | null {
        if (!this.isInitialized()) return null;

        const stringGuildId = guildId instanceof Guild ? guildId.id : String(guildId);
        this.updateActivity(stringGuildId);

        const queue = this.player.nodes.get(guildId);
        if (!queue) {
            return null;
        }

        let totalMs = 0;
        if (queue.currentTrack && queue.currentTrack.durationMS) {
            totalMs += queue.currentTrack.durationMS;
        }

        queue.tracks.data.forEach(track => {
            if (track.durationMS) {
                totalMs += track.durationMS;
            }
        });

        const totalSeconds = Math.floor(totalMs / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        let formattedDuration = '';
        if (hours > 0) {
            formattedDuration += `${hours}h `;
        }
        formattedDuration += `${minutes}m ${seconds}s`;

        return {
            currentTrack: queue.currentTrack,
            tracks: queue.tracks.data,
            totalDuration: formattedDuration
        };
    }

    /**
     * Récupère des statistiques sur le lecteur musical
     * @returns Statistiques sur l'utilisation du lecteur
     */
    public getStats(): {
        guilds: number;
        memory: {
            rss: string;
            heapTotal: string;
            heapUsed: string;
        }
    } {
        const mem = process.memoryUsage();

        return {
            guilds: this.guildCache.size,
            memory: {
                rss: `${Math.round(mem.rss / 1024 / 1024)}MB`,
                heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
                heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`
            }
        };
    }
}