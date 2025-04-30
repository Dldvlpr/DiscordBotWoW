import { Client } from 'discord.js';
import { BaseHandler } from './BaseHandler';
import { MusicPlayer } from '../audio/MusicPlayer';

export class MusicHandler extends BaseHandler {
    private readonly musicPlayer: MusicPlayer;

    constructor(client: Client, musicPlayer: MusicPlayer) {
        super(client);
        this.musicPlayer = musicPlayer;
    }

    async initialize(): Promise<void> {
        try {
            if (!this.musicPlayer.isInitialized()) {
                this.logger.info('Initialisation du lecteur de musique...');
                await this.musicPlayer.initialize();
            }

            this.logger.info('Music handler initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize music handler:', error);
            this.logger.warn('Music player will attempt to initialize when a music command is used');
        }
    }

    getMusicPlayer(): MusicPlayer {
        return this.musicPlayer;
    }
}