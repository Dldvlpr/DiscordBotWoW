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

interface QueueInfo {
    currentTrack: Track | null;
    tracks: Track[];
    totalDuration: string;
}

export class MusicPlayer {
    private initialized = false;
    private readonly player: Player;
    private readonly logger: Logger;
    private readonly guildCaches = new Map<string, { lastActivity: number }>();
    private readonly inactivityCleanupInterval: NodeJS.Timeout;
    private lastError: Error | null = null;
    private initializationPromise: Promise<void> | null = null;

    constructor(client: Client) {
        this.logger = new Logger('MusicPlayer');
        this.player = new Player(client);
        this.inactivityCleanupInterval = setInterval(() => {
            this.cleanupInactiveGuilds();
        }, 10 * 60 * 1000);
    }

    public isInitialized(): boolean {
        return this.initialized;
    }

    public async initialize(): Promise<void> {
        if (this.initialized) return;

        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = this._initialize();

        try {
            await this.initializationPromise;
        } finally {
            this.initializationPromise = null;
        }
    }

    private async _initialize(): Promise<void> {
        try {
            this.logger.info("Initialisation du lecteur audio...");
            this.setupEventListeners();
            this.initialized = true;
            this.logger.info("MusicPlayer initialisé avec succès!");
        } catch (error) {
            this.lastError = error instanceof Error ? error : new Error(String(error));
            this.logger.error('Erreur critique lors de l\'initialisation:', error);
            throw error;
        }
    }

    private setupEventListeners(): void {
        this.player.events.on('playerStart', (queue, track) => {
            this.updateActivity(queue.guild.id);
            this.sendNowPlayingMessage(queue, track);
        });

        this.player.events.on('audioTrackAdd', (queue, track) => {
            this.logger.info(`Piste ajoutée: "${track.title}" sur ${queue.guild.name}`);
        });

        this.player.events.on('disconnect', (queue) => {
            this.logger.info(`Déconnexion du canal vocal sur ${queue.guild.name}`);
        });

        this.player.events.on('emptyQueue', (queue) => {
            this.logger.info(`File d'attente vide pour ${queue.guild.name}`);
        });

        this.player.events.on('emptyChannel', (queue) => {
            this.logger.info(`Canal vocal vide pour ${queue.guild.name}`);
        });

        this.player.events.on('error', (queue, error) => {
            this.lastError = error;
            this.logger.error(`Erreur de lecture dans ${queue.guild.name}:`, error);

            const metadata = queue.metadata as { channel: TextChannel } | undefined;
            if (metadata?.channel) {
                metadata.channel.send(`⚠️ Erreur de lecture: ${error.message}`)
                    .catch(err => this.logger.error('Erreur lors de l\'envoi du message:', err));
            }
        });

        this.player.events.on('debug', (queue, message) => {
            this.logger.debug(`Player debug [${queue?.guild?.name || 'Unknown'}]: ${message}`);
        });
    }

    private updateActivity(guildId: string): void {
        this.guildCaches.set(guildId, { lastActivity: Date.now() });
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
                    { name: 'Demandé par', value: track.requestedBy?.username || 'Inconnu', inline: true }
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

    private cleanupInactiveGuilds(): void {
        const now = Date.now();
        for (const [guildId, cache] of this.guildCaches.entries()) {
            if (now - cache.lastActivity > 30 * 60 * 1000) {
                this.guildCaches.delete(guildId);

                try {
                    const queue = this.player.nodes.get(guildId);
                    if (queue && !queue.node.isPlaying()) {
                        queue.delete();
                    }
                } catch (e) {
                    // Ignore errors during cleanup
                }
            }
        }
    }

    public destroy(): void {
        clearInterval(this.inactivityCleanupInterval);
        this.guildCaches.clear();
        this.player.destroy();
        this.initialized = false;
        this.logger.info('Ressources du lecteur musical libérées');
    }

    /**
     * Extraire l'artiste et le titre d'une URL YouTube si disponible
     * Cette fonction utilise des expressions régulières pour extraire le titre
     */
    private extractInfoFromYouTubeUrl(url: string): { searchTerm: string } {
        try {
            // Extraire le titre depuis l'URL si présent (après le paramètre 'v=' et avant un éventuel '&')
            const videoId = url.includes('youtu.be/')
                ? url.split('youtu.be/')[1].split(/[?&]/)[0]
                : url.includes('watch?v=')
                    ? url.split('watch?v=')[1].split(/[?&]/)[0]
                    : '';

            // Préparer un terme de recherche général basé sur l'ID
            const searchTerm = videoId
                ? `youtube ${videoId}`
                : url.replace(/https?:\/\/(www\.)?youtube\.com\/|https?:\/\/youtu\.be\//, '')
                    .replace(/[?&].*$/, '')
                    .replace(/-|_/g, ' ')
                    .trim();

            return { searchTerm };
        } catch (error) {
            // En cas d'erreur, retourner l'URL elle-même comme terme de recherche
            return { searchTerm: url };
        }
    }

    /**
     * Extraire l'artiste et le titre d'une URL Spotify
     */
    private extractInfoFromSpotifyUrl(url: string): { searchTerm: string } {
        try {
            // Extraire l'ID de piste (après 'track/' et avant un éventuel '?')
            const trackId = url.match(/track\/([a-zA-Z0-9]+)/)?.[1] || '';

            // Préparer un terme de recherche
            const searchTerm = trackId
                ? `spotify track ${trackId}`
                : url.replace(/https?:\/\/open\.spotify\.com\/.*?\//, '')
                    .replace(/[?&].*$/, '')
                    .replace(/-|_/g, ' ')
                    .trim();

            return { searchTerm };
        } catch (error) {
            // En cas d'erreur, retourner l'URL comme terme de recherche
            return { searchTerm: url };
        }
    }

    public async play(voiceChannel: VoiceChannel, query: string, textChannel: TextChannel): Promise<Track> {
        if (!this.isInitialized()) {
            try {
                await this.initialize();
            } catch (error) {
                this.logger.error("Échec de l'initialisation du MusicPlayer:", error);
                throw new Error(`Le lecteur de musique n'est pas disponible: ${(error as Error).message}`);
            }
        }

        if (!voiceChannel || !textChannel) {
            throw new Error('Canal vocal ou textuel non spécifié');
        }

        this.updateActivity(voiceChannel.guild.id);
        this.logger.info(`Lecture demandée pour "${query}" dans ${voiceChannel.guild.name}`);

        // Détecter le type d'URL et préparer des informations de secours
        let searchInfo = { searchTerm: query };
        let source = 'unknown';

        if (query.includes('youtube.com') || query.includes('youtu.be')) {
            searchInfo = this.extractInfoFromYouTubeUrl(query);
            source = 'youtube';
        } else if (query.includes('spotify.com') || query.includes('open.spotify')) {
            searchInfo = this.extractInfoFromSpotifyUrl(query);
            source = 'spotify';
        }

        try {
            // Tentative 1: Lecture via Discord Player standard (peut maintenant utiliser des extracteurs)
            this.logger.debug(`Tentative de lecture avec Discord Player: ${query}`);

            const result = await this.player.play(voiceChannel, query, {
                nodeOptions: {
                    metadata: { channel: textChannel },
                    leaveOnEmpty: true,
                    leaveOnEmptyCooldown: 300000,
                    leaveOnEnd: false,
                    bufferingTimeout: 20000,
                    selfDeaf: true,
                },
                searchEngine: QueryType.AUTO,
                requestedBy: textChannel.client.user as User
            });

            if (!result || !result.track) {
                throw new Error(`Aucun résultat trouvé pour "${query}"`);
            }

            this.logger.info(`Lecture réussie: "${result.track.title}" (${result.track.url})`);
            return result.track;
        } catch (error) {
            this.lastError = error instanceof Error ? error : new Error(String(error));
            this.logger.error(`Erreur lors de la lecture:`, error);

            // Vérifier si l'erreur est liée à une limitation d'API (429)
            const isRateLimited = error instanceof Error &&
                (error.message.includes('429') || error.message.includes('Too Many Requests'));

            if (isRateLimited) {
                this.logger.warn('Limitation de taux détectée (429). Utilisation de méthode alternative...');
            }

            // Tentative 2: Recherche directe au lieu d'utiliser l'URL
            try {
                this.logger.debug(`Tentative de recherche par terme: "${searchInfo.searchTerm}"`);

                // Choisir le moteur de recherche en fonction du type détecté
                const searchEngine = source === 'youtube'
                    ? QueryType.YOUTUBE_SEARCH
                    : source === 'spotify'
                        ? QueryType.AUTO
                        : QueryType.AUTO;

                const searchResult = await this.player.search(searchInfo.searchTerm, {
                    requestedBy: textChannel.client.user as User,
                    searchEngine: searchEngine
                });

                if (searchResult.tracks.length > 0) {
                    this.logger.debug(`Recherche réussie, lecture du résultat: ${searchResult.tracks[0].title}`);

                    // Message informant de l'utilisation d'une méthode alternative
                    if (isRateLimited) {
                        await textChannel.send({
                            content: `⚠️ En raison de limitations d'API, je dois utiliser une méthode alternative pour lire cette piste.`
                        }).catch(() => {}); // Ignorer les erreurs d'envoi
                    }

                    const result = await this.player.play(voiceChannel, searchResult.tracks[0], {
                        nodeOptions: {
                            metadata: { channel: textChannel },
                            leaveOnEmpty: true,
                            leaveOnEmptyCooldown: 300000,
                            leaveOnEnd: false,
                            bufferingTimeout: 20000,
                            selfDeaf: true,
                        },
                        requestedBy: textChannel.client.user as User
                    });

                    return result.track;
                }
            } catch (searchError) {
                this.logger.error(`Échec de la recherche alternative:`, searchError);
            }

            // Tentative 3: Recherche plus générique avec moins de spécificité
            try {
                // Construire un terme de recherche très générique
                let genericTerm;

                if (source === 'youtube') {
                    genericTerm = 'music ' + searchInfo.searchTerm.replace(/youtube|video|watch/gi, '').trim();
                } else if (source === 'spotify') {
                    genericTerm = 'music ' + searchInfo.searchTerm.replace(/spotify|track/gi, '').trim();
                } else {
                    genericTerm = 'music ' + query.split(' ').slice(0, 3).join(' ');
                }

                this.logger.debug(`Tentative de recherche générique: "${genericTerm}"`);

                const genericSearch = await this.player.search(genericTerm, {
                    requestedBy: textChannel.client.user as User,
                    searchEngine: QueryType.AUTO
                });

                if (genericSearch.tracks.length > 0) {
                    this.logger.debug(`Recherche générique réussie, lecture: ${genericSearch.tracks[0].title}`);

                    await textChannel.send({
                        content: `⚠️ Impossible de trouver exactement ce que vous demandez. Lecture de: **${genericSearch.tracks[0].title}** à la place.`
                    }).catch(() => {});

                    const result = await this.player.play(voiceChannel, genericSearch.tracks[0], {
                        nodeOptions: {
                            metadata: { channel: textChannel },
                            leaveOnEmpty: true,
                            leaveOnEmptyCooldown: 300000,
                            leaveOnEnd: false,
                            bufferingTimeout: 20000,
                            selfDeaf: true,
                        },
                        requestedBy: textChannel.client.user as User
                    });

                    return result.track;
                }
            } catch (genericError) {
                this.logger.error(`Échec de la recherche générique:`, genericError);
            }

            throw new Error(`Impossible de lire cette piste, même avec les méthodes alternatives. Veuillez essayer avec un autre lien ou une recherche directe.`);
        }
    }

    public pause(guildId: GuildResolvable): boolean {
        if (!this.isInitialized()) return false;
        this.updateActivity(guildId instanceof Guild ? guildId.id : String(guildId));

        try {
            const queue = this.player.nodes.get(guildId);
            if (!queue || !queue.node.isPlaying()) return false;
            queue.node.pause();
            return true;
        } catch (error) {
            this.logger.error(`Erreur lors de la mise en pause:`, error);
            return false;
        }
    }

    public resume(guildId: GuildResolvable): boolean {
        if (!this.isInitialized()) return false;
        this.updateActivity(guildId instanceof Guild ? guildId.id : String(guildId));

        try {
            const queue = this.player.nodes.get(guildId);
            if (!queue || queue.node.isPlaying()) return false;
            queue.node.resume();
            return true;
        } catch (error) {
            this.logger.error(`Erreur lors de la reprise:`, error);
            return false;
        }
    }

    public skip(guildId: GuildResolvable): boolean {
        if (!this.isInitialized()) return false;
        this.updateActivity(guildId instanceof Guild ? guildId.id : String(guildId));

        try {
            const queue = this.player.nodes.get(guildId);
            if (!queue || !queue.node.isPlaying()) return false;
            queue.node.skip();
            return true;
        } catch (error) {
            this.logger.error(`Erreur lors du saut:`, error);
            return false;
        }
    }

    public stop(guildId: GuildResolvable): boolean {
        if (!this.isInitialized()) return false;
        const stringGuildId = guildId instanceof Guild ? guildId.id : String(guildId);

        try {
            const queue = this.player.nodes.get(guildId);
            if (!queue) return false;
            queue.delete();
            this.guildCaches.delete(stringGuildId);
            return true;
        } catch (error) {
            this.logger.error(`Erreur lors de l'arrêt:`, error);
            return false;
        }
    }

    public setVolume(guildId: GuildResolvable, volume: number): boolean {
        if (!this.isInitialized()) return false;
        this.updateActivity(guildId instanceof Guild ? guildId.id : String(guildId));

        try {
            const queue = this.player.nodes.get(guildId);
            if (!queue) return false;
            const safeVolume = Math.max(0, Math.min(100, volume));
            queue.node.setVolume(safeVolume);
            return true;
        } catch (error) {
            this.logger.error(`Erreur lors du réglage du volume:`, error);
            return false;
        }
    }

    public getQueue(guildId: GuildResolvable): QueueInfo | null {
        if (!this.isInitialized()) return null;
        this.updateActivity(guildId instanceof Guild ? guildId.id : String(guildId));

        try {
            const queue = this.player.nodes.get(guildId);
            if (!queue) return null;

            let totalMs = 0;
            if (queue.currentTrack && queue.currentTrack.durationMS) {
                totalMs += queue.currentTrack.durationMS;
            }

            queue.tracks.data.forEach(track => {
                if (track.durationMS) totalMs += track.durationMS;
            });

            const totalSeconds = Math.floor(totalMs / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;

            let formattedDuration = '';
            if (hours > 0) formattedDuration += `${hours}h `;
            formattedDuration += `${minutes}m ${seconds}s`;

            return {
                currentTrack: queue.currentTrack,
                tracks: queue.tracks.data,
                totalDuration: formattedDuration
            };
        } catch (error) {
            this.logger.error(`Erreur lors de la récupération de la file d'attente:`, error);
            return null;
        }
    }

    public getStatus(): {
        initialized: boolean;
        activeGuilds: number;
        lastError: string | null;
    } {
        return {
            initialized: this.initialized,
            activeGuilds: this.guildCaches.size,
            lastError: this.lastError ? this.lastError.message : null
        };
    }
}