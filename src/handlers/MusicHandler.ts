import { Client } from 'discord.js';
import { BaseHandler } from './BaseHandler';
import { MusicPlayer } from '../audio/MusicPlayer';

export class MusicHandler extends BaseHandler {
    private readonly musicPlayer: MusicPlayer;

    constructor(client: Client) {
        super(client);
        this.musicPlayer = new MusicPlayer(client);
    }

    async initialize(): Promise<void> {
        try {
            await this.musicPlayer.initialize();
            this.logger.info('Music handler initialized');
        } catch (error) {
            this.logger.error('Failed to initialize music handler:', error);
            throw error;
        }
    }

    getMusicPlayer(): MusicPlayer {
        return this.musicPlayer;
    }
}