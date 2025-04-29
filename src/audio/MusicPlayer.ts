import {
    Client,
    VoiceChannel,
    TextChannel,
    EmbedBuilder,
    GuildResolvable,
    Snowflake,
    Guild
} from 'discord.js';
import { Player, QueryType, Track, GuildQueue } from 'discord-player';
import { Logger } from '../utils/Logger';
import { DefaultExtractors } from '@discord-player/extractor';

interface GuildMusicCache {
    currentTrack: Track | null;
    nextTrack: Track | null;
    alternativeUrls: Map<string, string[]>;
    currentUrlIndex: Map<string, number>;
    lastActivity: number;
}

interface QueueInfo {
    currentTrack: Track | null;
    tracks: Track[];
    totalDuration: string;
}

export class MusicPlayer {
    private initialized = false;
    private readonly player: Player;
    private readonly logger: Logger;
    private readonly guildCache: Map<string, GuildMusicCache> = new Map();
    private readonly inactivityCleanupInterval: NodeJS.Timeout;

    private readonly INACTIVITY_CLEANUP_MS = 15 * 60 * 1000;
    private extractorsLoaded: boolean = false;

    constructor(client: Client) {
        this.logger = new Logger('MusicPlayer');
        this.player = new Player(client);

        this.setupEventListeners();

        this.inactivityCleanupInterval = setInterval(() => {
            this.cleanupInactiveGuilds();
        }, 5 * 60 * 1000);
    }

    public async initialize(): Promise<void> {
        try {
            if (this.initialized) return;
            await this.player.extractors.loadMulti(DefaultExtractors);
            this.initialized = true;
            this.logger.info("Extracteurs chargés");
        } catch (error) {
            this.logger.error('Erreur lors du chargement des extracteurs:', error);
            throw error;
        }
    }

    private setupEventListeners(): void {
        this.player.events.on('playerStart', (queue, track) => {
            this.updateActivity(queue.guild.id);
            this.sendNowPlayingMessage(queue, track);

            const cache = this.getGuildCache(queue.guild.id);
            cache.currentUrlIndex.set(track.id, 0);
        });

        this.player.events.on('audioTrackRemove', (queue, track) => {
            this.updateActivity(queue.guild.id);
            const cache = this.getGuildCache(queue.guild.id);

            cache.alternativeUrls.delete(track.id);
            cache.currentUrlIndex.delete(track.id);

            if (cache.nextTrack && cache.nextTrack.id !== track.id) {
                cache.currentTrack = cache.nextTrack;
                cache.nextTrack = null;
            } else {
                cache.currentTrack = null;
            }

            this.preloadNextTrack(queue);
        });

        this.player.events.on('emptyQueue', (queue) => {
            this.logger.debug(`File d'attente vide pour ${queue.guild.id}`);
        });

        this.player.events.on('emptyChannel', (queue) => {
            this.logger.debug(`Canal vocal vide pour ${queue.guild.id}`);
            this.cleanupGuildCache(queue.guild.id);
        });

        this.player.events.on('error', (queue, error) => {
            this.logger.error(`Erreur dans ${queue.guild.id}: ${error.message}`);

            const cache = this.getGuildCache(queue.guild.id);
            const currentTrack = queue.currentTrack;

            if (currentTrack && this.tryAlternativeUrl(queue, currentTrack.id)) {
                const metadata = queue.metadata as { channel: TextChannel } | undefined;
                if (metadata?.channel) {
                    metadata.channel.send('⚠️ Problème détecté, tentative de récupération...')
                        .catch(err => this.logger.error('Erreur lors de l\'envoi du message:', err));
                }
            }
        });

        this.player.events.on('connection', (queue) => {
            this.logger.debug(`Connexion établie dans ${queue.guild.id}`);
        });

        this.player.events.on('disconnect', (queue) => {
            this.logger.debug(`Déconnecté du canal vocal dans ${queue.guild.id}`);
            this.cleanupGuildCache(queue.guild.id);
        });

        this.player.events.on('debug', (queue, message) => {
            if (message.includes('error') || message.includes('connexion')) {
                this.logger.debug(`Debug dans ${queue.guild.id}: ${message}`);
            }
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

    public destroy(): void {
        clearInterval(this.inactivityCleanupInterval);
        this.guildCache.clear();
        this.player.destroy();
        this.logger.info('Ressources du lecteur musical libérées');
    }

    public async play(voiceChannel: VoiceChannel, query: string, textChannel: TextChannel): Promise<Track> {
        if (!this.extractorsLoaded) {
            throw new Error('Le lecteur de musique n\'est pas encore initialisé');
        }

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

    public pause(guildId: GuildResolvable): boolean {
        if (!this.extractorsLoaded) return false;

        const stringGuildId = guildId instanceof Guild ? guildId.id : String(guildId);
        this.updateActivity(stringGuildId);

        const queue = this.player.nodes.get(guildId);
        if (!queue || !queue.node.isPlaying()) {
            return false;
        }

        queue.node.pause();
        return true;
    }

    public resume(guildId: GuildResolvable): boolean {
        if (!this.extractorsLoaded) return false;

        const stringGuildId = guildId instanceof Guild ? guildId.id : String(guildId);
        this.updateActivity(stringGuildId);

        const queue = this.player.nodes.get(guildId);
        if (!queue || queue.node.isPlaying()) {
            return false;
        }

        queue.node.resume();
        return true;
    }

    public skip(guildId: GuildResolvable): boolean {
        if (!this.extractorsLoaded) return false;

        const stringGuildId = guildId instanceof Guild ? guildId.id : String(guildId);
        this.updateActivity(stringGuildId);

        const queue = this.player.nodes.get(guildId);
        if (!queue || !queue.node.isPlaying()) {
            return false;
        }

        queue.node.skip();
        return true;
    }

    public stop(guildId: GuildResolvable): boolean {
        if (!this.extractorsLoaded) return false;

        const stringGuildId = guildId instanceof Guild ? guildId.id : String(guildId);

        const queue = this.player.nodes.get(guildId);
        if (!queue) {
            return false;
        }

        queue.delete();
        this.cleanupGuildCache(stringGuildId);
        return true;
    }

    public setVolume(guildId: GuildResolvable, volume: number): boolean {
        if (!this.extractorsLoaded) return false;

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

    public getQueue(guildId: GuildResolvable): QueueInfo | null {
        if (!this.extractorsLoaded) return null;

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