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