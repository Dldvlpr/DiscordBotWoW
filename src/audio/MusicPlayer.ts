import {
    Client,
    VoiceChannel,
    TextChannel,
    EmbedBuilder,
    GuildResolvable,
    Guild,
    User
} from 'discord.js';
import { Player, QueryType, Track, GuildQueue } from 'discord-player';
import { Logger } from '../utils/Logger';
// Import direct de ytdl-core
import ytdl from 'ytdl-core';

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
    private initializationPromise: Promise<void> | null = null;

    private readonly INACTIVITY_CLEANUP_MS = 15 * 60 * 1000;
    private extractorsLoaded: boolean = false;

    constructor(client: Client) {
        this.logger = new Logger('MusicPlayer');

        // Configuration de base - gardons-la simple
        this.player = new Player(client);

        this.setupEventListeners();

        this.inactivityCleanupInterval = setInterval(() => {
            this.cleanupInactiveGuilds();
        }, 5 * 60 * 1000);
    }

    /**
     * Vérifie si le MusicPlayer est initialisé
     */
    public isInitialized(): boolean {
        return this.initialized;
    }

    /**
     * Initialise le MusicPlayer
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

            // Vérification de ytdl-core
            try {
                const version = ytdl.version;
                this.logger.info(`Version de ytdl-core: ${version}`);

                // Test rapide de l'API ytdl-core
                const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
                const info = await ytdl.getBasicInfo(testUrl);
                this.logger.info(`Test ytdl-core réussi: ${info.videoDetails.title}`);
            } catch (ytdlError) {
                this.logger.error(`Problème avec ytdl-core: ${ytdlError}`);
            }

            // Enregistrement des extracteurs
            try {
                // Utilisons le système d'extracteurs natif
                const { YtdlExtractor } = await import('@discord-player/extractor/dist/YtdlExtractor');
                await this.player.extractors.register(YtdlExtractor);
                this.logger.info("Extracteur ytdl enregistré avec succès");
            } catch (error) {
                this.logger.warn(`Erreur lors de l'enregistrement de l'extracteur ytdl: ${error}`);
                this.logger.info("Tentative de continuer sans extracteur spécifique");
            }

            this.initialized = true;
            this.extractorsLoaded = true;
        } catch (error) {
            this.logger.error('Erreur critique lors de l\'initialisation:', error);
            throw new Error(`Échec de l'initialisation: ${(error as Error).message || 'Erreur inconnue'}`);
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

            const metadata = queue.metadata as { channel: TextChannel } | undefined;
            if (metadata?.channel) {
                metadata.channel.send(`⚠️ Erreur de lecture: ${error.message}`)
                    .catch(err => this.logger.error('Erreur lors de l\'envoi du message:', err));
            }

            // Essayer une URL alternative si disponible
            const currentTrack = queue.currentTrack;
            if (currentTrack && this.tryAlternativeUrl(queue, currentTrack.id)) {
                if (metadata?.channel) {
                    metadata.channel.send('🔄 Problème détecté, tentative de récupération avec une source alternative...')
                        .catch(err => this.logger.error('Erreur lors de l\'envoi du message:', err));
                }
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
            // Pour l'instant, juste stocker l'URL originale
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

    /**
     * Méthode directe utilisant ytdl-core pour les URL YouTube
     */
    private async playYouTubeDirectly(voiceChannel: VoiceChannel, videoUrl: string, textChannel: TextChannel): Promise<Track | null> {
        try {
            this.logger.info(`Tentative de lecture YouTube directe pour ${videoUrl}`);

            // Extraire l'ID vidéo
            let videoId = '';
            if (videoUrl.includes('youtu.be/')) {
                videoId = videoUrl.split('youtu.be/')[1].split(/[?&]/)[0];
            } else if (videoUrl.includes('watch?v=')) {
                videoId = videoUrl.split('watch?v=')[1].split(/[?&]/)[0];
            } else {
                videoId = videoUrl; // Assumer que c'est déjà un ID
            }

            if (!videoId) {
                throw new Error("Impossible d'extraire l'ID vidéo");
            }

            // Obtenir des informations directement avec ytdl-core
            const info = await ytdl.getBasicInfo(`https://www.youtube.com/watch?v=${videoId}`);

            if (!info || !info.videoDetails) {
                throw new Error("Impossible d'obtenir les informations de la vidéo");
            }

            // Utiliser la fonction de recherche du Player avec le titre exact
            const searchResult = await this.player.search(info.videoDetails.title, {
                requestedBy: textChannel.client.user as User
            });

            if (searchResult.tracks.length > 0) {
                // Créer une file d'attente avec le premier résultat
                const result = await this.player.play(voiceChannel, searchResult.tracks[0], {
                    nodeOptions: {
                        metadata: {
                            channel: textChannel
                        },
                        leaveOnEnd: false,
                        leaveOnEmpty: true,
                        leaveOnEmptyCooldown: 300000,
                        bufferingTimeout: 30000,
                    },
                    requestedBy: textChannel.client.user as User
                });

                return result.track;
            }

            return null;
        } catch (error) {
            this.logger.error(`Erreur lors de la lecture YouTube directe: ${error}`);
            return null;
        }
    }

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

        // 1. D'abord, détectons si c'est une URL YouTube
        const isYouTubeUrl = query.includes('youtube.com') || query.includes('youtu.be');

        if (isYouTubeUrl) {
            try {
                // 2. Essayons d'abord la méthode directe avec ytdl-core
                const directResult = await this.playYouTubeDirectly(voiceChannel, query, textChannel);
                if (directResult) {
                    const cache = this.getGuildCache(voiceChannel.guild.id);
                    cache.currentTrack = directResult;
                    return directResult;
                }
            } catch (directError) {
                this.logger.warn(`Échec de la lecture directe: ${directError}`);
                // Continuez avec la méthode standard ci-dessous
            }
        }

        try {
            // 3. Méthode standard avec recherche
            const result = await this.player.play(voiceChannel, query, {
                nodeOptions: {
                    metadata: {
                        channel: textChannel
                    },
                    leaveOnEnd: false,
                    leaveOnEmpty: true,
                    leaveOnEmptyCooldown: 300000,
                    bufferingTimeout: 30000,
                },
                searchEngine: QueryType.AUTO,
                requestedBy: textChannel.client.user as User
            });

            if (!result || !result.track) {
                throw new Error(`Aucun résultat trouvé pour "${query}"`);
            }

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

            // 4. Si c'est une URL YouTube, essayons une approche différente
            if (isYouTubeUrl) {
                try {
                    // 4.1 Extraction de la vidéo par recherche par titre
                    let videoId = '';
                    if (query.includes('youtu.be/')) {
                        videoId = query.split('youtu.be/')[1].split(/[?&]/)[0];
                    } else if (query.includes('watch?v=')) {
                        videoId = query.split('watch?v=')[1].split(/[?&]/)[0];
                    }

                    if (videoId) {
                        this.logger.info(`Tentative de recherche générique pour l'ID: ${videoId}`);

                        // Approche 1: recherche par titre
                        try {
                            const info = await ytdl.getBasicInfo(`https://www.youtube.com/watch?v=${videoId}`);
                            if (info && info.videoDetails && info.videoDetails.title) {
                                const searchResult = await this.player.search(info.videoDetails.title, {
                                    requestedBy: textChannel.client.user as User
                                });

                                if (searchResult.tracks.length > 0) {
                                    const result = await this.player.play(voiceChannel, searchResult.tracks[0], {
                                        nodeOptions: {
                                            metadata: {
                                                channel: textChannel
                                            },
                                            leaveOnEnd: false,
                                            leaveOnEmpty: true,
                                            leaveOnEmptyCooldown: 300000,
                                            bufferingTimeout: 30000,
                                        },
                                        requestedBy: textChannel.client.user as User
                                    });

                                    const cache = this.getGuildCache(voiceChannel.guild.id);
                                    cache.currentTrack = result.track;
                                    return result.track;
                                }
                            }
                        } catch (titleError) {
                            this.logger.error(`Échec de recherche par titre: ${titleError}`);
                        }

                        // Approche 2: recherche simple avec l'ID
                        try {
                            const searchTerm = `music ${videoId.replace(/-/g, ' ')}`;
                            this.logger.info(`Tentative de recherche simple: ${searchTerm}`);

                            const searchResult = await this.player.search(searchTerm, {
                                requestedBy: textChannel.client.user as User
                            });

                            if (searchResult.tracks.length > 0) {
                                const result = await this.player.play(voiceChannel, searchResult.tracks[0], {
                                    nodeOptions: {
                                        metadata: {
                                            channel: textChannel
                                        },
                                        leaveOnEnd: false,
                                        leaveOnEmpty: true,
                                        leaveOnEmptyCooldown: 300000,
                                        bufferingTimeout: 30000,
                                    },
                                    requestedBy: textChannel.client.user as User
                                });

                                const cache = this.getGuildCache(voiceChannel.guild.id);
                                cache.currentTrack = result.track;
                                return result.track;
                            }
                        } catch (simpleError) {
                            this.logger.error(`Échec de recherche simple: ${simpleError}`);
                        }
                    }
                } catch (finalError) {
                    this.logger.error(`Échec de toutes les approches de récupération: ${finalError}`);
                }
            }

            // Si nous arrivons ici, c'est que toutes les tentatives ont échoué
            throw new Error(`Impossible de lire cette piste. Essayez avec un autre lien ou une recherche par mots-clés.`);
        }
    }

    public pause(guildId: GuildResolvable): boolean {
        if (!this.isInitialized()) return false;

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
        if (!this.isInitialized()) return false;

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
        if (!this.isInitialized()) return false;

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