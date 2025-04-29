import {
    Client,
    VoiceChannel,
    TextChannel,
    EmbedBuilder,
    GuildResolvable,
    Snowflake
} from 'discord.js';
import { Player, QueryType, Track, GuildQueue } from 'discord-player';
import { Logger } from '../utils/Logger';

/**
 * Interface pour stocker les informations de cache de musique par serveur
 */
interface GuildMusicCache {
    currentTrack: Track | null;
    nextTrack: Track | null;
    alternativeUrls: Map<string, string[]>;
    currentUrlIndex: Map<string, number>;
    lastActivity: number;
}

/**
 * Interface pour la sortie de getQueue
 */
interface QueueInfo {
    currentTrack: Track | null;
    tracks: Track[];
    totalDuration: string;
}

/**
 * Classe principale pour gérer la lecture de musique
 */
export class MusicPlayer {
    private readonly player: Player;
    private readonly logger: Logger;
    private readonly guildCache: Map<string, GuildMusicCache> = new Map();
    private readonly inactivityCleanupInterval: NodeJS.Timeout;

    private readonly INACTIVITY_CLEANUP_MS = 15 * 60 * 1000;

    constructor(client: Client) {
        this.logger = new Logger('MusicPlayer');
        this.player = new Player(client);

        this.player.extractors.loadDefault();

        this.setupEventListeners();

        this.inactivityCleanupInterval = setInterval(() => {
            this.cleanupInactiveGuilds();
        }, 5 * 60 * 1000);
    }

    private setupEventListeners(): void {
        this.player.events.on('playerStart', (queue, track) => {
            this.updateActivity(queue.guild.id);
            this.sendNowPlayingMessage(queue, track);

            const cache = this.getGuildCache(queue.guild.id);
            cache.currentUrlIndex.set(track.id, 0);
        });

        // Fin d'une piste
        this.player.events.on('trackEnd', (queue, track) => {
            this.updateActivity(queue.guild.id);
            const cache = this.getGuildCache(queue.guild.id);

            // Nettoyer les URLs de la piste terminée
            cache.alternativeUrls.delete(track.id);
            cache.currentUrlIndex.delete(track.id);

            // La piste suivante devient la piste actuelle
            if (cache.nextTrack && cache.nextTrack.id !== track.id) {
                cache.currentTrack = cache.nextTrack;
                cache.nextTrack = null;
            } else {
                cache.currentTrack = null;
            }

            // Précharger la prochaine piste
            this.preloadNextTrack(queue);
        });

        // File d'attente vide
        this.player.events.on('emptyQueue', (queue) => {
            this.logger.debug(`File d'attente vide pour ${queue.guild.id}`);
            // Ne pas nettoyer immédiatement, laisser le nettoyage périodique s'en charger
        });

        // Canal vocal vide
        this.player.events.on('emptyChannel', (queue) => {
            this.logger.debug(`Canal vocal vide pour ${queue.guild.id}`);
            this.cleanupGuildCache(queue.guild.id);
        });

        // Gestionnaire d'erreurs
        this.player.events.on('error', (queue, error) => {
            this.logger.error(`Erreur dans ${queue.guild.id}: ${error.message}`);

            // Essayer de basculer vers une URL alternative
            const cache = this.getGuildCache(queue.guild.id);
            const currentTrack = queue.currentTrack;

            if (currentTrack && this.tryAlternativeUrl(queue, currentTrack.id)) {
                const metadataChannel = queue.metadata?.channel as TextChannel;
                if (metadataChannel) {
                    metadataChannel.send('⚠️ Problème détecté, tentative de récupération...')
                        .catch(err => this.logger.error('Erreur lors de l\'envoi du message:', err));
                }
            }
        });

        this.player.events.on('connectionDestroy', (queue) => {
            this.cleanupGuildCache(queue.guild.id);
        });
    }

    private getGuildCache(guildId: string): GuildMusicCache {
        if (!this.guildCache.has(guildId)) {
            this.guildCache.set(guildId, {
                currentTrack: null,
                nextTrack: null,
                alternativeUrls: new Map(),
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

    private tryAlternativeUrl(queue: GuildQueue, trackId: string): boolean {
        const cache = this.getGuildCache(queue.guild.id);
        const urls = cache.alternativeUrls.get(trackId);

        if (!urls || urls.length <= 1) {
            return false;
        }

        let currentIndex = cache.currentUrlIndex.get(trackId) || 0;
        currentIndex = (currentIndex + 1) % urls.length;
        cache.currentUrlIndex.set(trackId, currentIndex);

        this.logger.debug(`Tentative d'URL alternative ${currentIndex + 1}/${urls.length} pour ${trackId}`);

        try {
            const currentTrack = queue.currentTrack;
            if (currentTrack && currentTrack.id === trackId) {
                queue.node.skip();
                return true;
            }
        } catch (e) {
            this.logger.error(`Échec de la tentative d'URL alternative: ${e}`);
        }

        return false;
    }

    private async preloadNextTrack(queue: GuildQueue): Promise<void> {
        if (!queue || queue.tracks.size === 0) return;

        const nextTrack = queue.tracks.data[0];
        if (!nextTrack) return;

        const cache = this.getGuildCache(queue.guild.id);
        cache.nextTrack = nextTrack;

        this.fetchAlternativeUrls(queue.guild.id, nextTrack).catch(e => {
            this.logger.error(`Échec du préchargement des URLs pour ${nextTrack.title}: ${e}`);
        });
    }

    private async fetchAlternativeUrls(guildId: string, track: Track): Promise<string[] | undefined> {
        const cache = this.getGuildCache(guildId);

        if (cache.alternativeUrls.has(track.id)) {
            return cache.alternativeUrls.get(track.id);
        }

        try {
            const urls = [track.url];

            cache.alternativeUrls.set(track.id, urls);
            cache.currentUrlIndex.set(track.id, 0);

            return urls;
        } catch (error) {
            this.logger.error(`Erreur lors de la récupération d'URLs alternatives: ${error}`);
            const fallbackUrls = [track.url];
            cache.alternativeUrls.set(track.id, fallbackUrls);
            cache.currentUrlIndex.set(track.id, 0);
            return fallbackUrls;
        }
    }

    private sendNowPlayingMessage(queue: GuildQueue, track: Track): void {
        try {
            const metadata = queue.metadata;
            if (!metadata || !metadata.channel) {
                this.logger.warn("Impossible d'envoyer le message 'Now Playing' - métadonnées manquantes");
                return;
            }

            const textChannel = metadata.channel as TextChannel;

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
     * Libère toutes les ressources lors de l'arrêt du bot
     */
    public destroy(): void {
        clearInterval(this.inactivityCleanupInterval);
        this.guildCache.clear();
        this.player.destroy();
        this.logger.info('Ressources du lecteur musical libérées');
    }

    /**
     * Joue une piste audio dans un canal vocal
     * @param voiceChannel Le canal vocal où jouer la musique
     * @param query La requête ou URL à jouer
     * @param textChannel Le canal texte pour les notifications
     * @returns La piste jouée
     */
    public async play(voiceChannel: VoiceChannel, query: string, textChannel: TextChannel): Promise<Track> {
        if (!voiceChannel || !textChannel) {
            throw new Error('Canal vocal ou textuel non spécifié');
        }

        this.updateActivity(voiceChannel.guild.id);

        try {
            const result = await this.player.play(voiceChannel, query, {
                nodeOptions: {
                    metadata: {
                        channel: textChannel
                    },
                    leaveOnEnd: false,
                    leaveOnEmpty: true,
                    leaveOnEmptyCooldown: 300000,
                    bufferingTimeout: 15000
                },
                searchEngine: QueryType.AUTO
            });

            const cache = this.getGuildCache(voiceChannel.guild.id);
            cache.currentTrack = result.track;

            await this.fetchAlternativeUrls(voiceChannel.guild.id, result.track);

            const queue = this.player.nodes.get(voiceChannel.guild.id);
            if (queue) {
                await this.preloadNextTrack(queue);
            }

            return result.track;
        } catch (error) {
            this.logger.error(`Erreur de lecture: ${error}`);
            throw error;
        }
    }

    /**
     * Met en pause la lecture
     * @param guildId L'ID du serveur
     * @returns true si la pause a réussi, false sinon
     */
    public pause(guildId: GuildResolvable): boolean {
        this.updateActivity(String(guildId));

        const queue = this.player.nodes.get(guildId);
        if (!queue || !queue.node.isPlaying()) {
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
        this.updateActivity(String(guildId));

        const queue = this.player.nodes.get(guildId);
        if (!queue || queue.node.isPlaying()) {
            return false;
        }

        queue.node.resume();
        return true;
    }

    /**
     * Passe à la piste suivante
     * @param guildId L'ID du serveur
     * @returns true si le skip a réussi, false sinon
     */
    public skip(guildId: GuildResolvable): boolean {
        this.updateActivity(String(guildId));

        const queue = this.player.nodes.get(guildId);
        if (!queue || !queue.node.isPlaying()) {
            return false;
        }

        queue.node.skip();
        return true;
    }

    /**
     * Arrête la lecture et vide la file
     * @param guildId L'ID du serveur
     * @returns true si l'arrêt a réussi, false sinon
     */
    public stop(guildId: GuildResolvable): boolean {
        const queue = this.player.nodes.get(guildId);
        if (!queue) {
            return false;
        }

        queue.delete();
        this.cleanupGuildCache(String(guildId));
        return true;
    }

    /**
     * Définit le volume de lecture
     * @param guildId L'ID du serveur
     * @param volume Le niveau de volume (0-100)
     * @returns true si le réglage a réussi, false sinon
     */
    public setVolume(guildId: GuildResolvable, volume: number): boolean {
        this.updateActivity(String(guildId));

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
     * @returns Les informations de la file ou null si aucune file active
     */
    public getQueue(guildId: GuildResolvable): QueueInfo | null {
        this.updateActivity(String(guildId));

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
     * Récupère des statistiques sur l'utilisation du lecteur
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