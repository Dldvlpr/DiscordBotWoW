import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { Client, GatewayIntentBits } from 'discord.js';
import { CommandHandler } from './handlers/CommandHandler';
import { EventHandler } from './handlers/EventHandler';
import { Logger, LogLevel } from './utils/Logger';
import db from './models';
import { initializeRepositories } from './repositories/initialize';
import { RaidResetService } from './services/RaidResetService';
import { MusicPlayer } from './audio/MusicPlayer';

export class Bot {
    private readonly client: Client;
    private readonly commandHandler: CommandHandler;
    private readonly eventHandler: EventHandler;
    private readonly logger: Logger;
    private readonly raidResetService: RaidResetService;
    private readonly musicPlayer: MusicPlayer;

    constructor() {
        this.logger = new Logger('Bot');

        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildVoiceStates,
            ]
        });

        this.musicPlayer = new MusicPlayer(this.client);
        this.commandHandler = new CommandHandler(this.client, this.musicPlayer);
        this.eventHandler = new EventHandler(this.client, this.commandHandler);
        this.raidResetService = new RaidResetService(this.client);
    }

    public async start(): Promise<void> {
        try {
            this.logger.info("Connecting to database...");
            await db.sequelize.authenticate();
            this.logger.info("Database connection successful.");

            this.logger.info("Synchronizing models with database...");
            await db.sequelize.sync({ alter: true });
            this.logger.info("Model synchronization complete.");

            this.logger.info("Initializing repositories...");
            initializeRepositories();
            this.logger.info("Repositories initialized successfully.");

            this.logger.info("Initializing music player...");
            await this.musicPlayer.initialize();
            this.logger.info("Music player initialized successfully!");

            this.logger.info("Initializing command handler...");
            await this.commandHandler.initialize();
            this.logger.info("Command handler initialized successfully.");

            this.logger.info("Initializing event handler...");
            await this.eventHandler.initialize();
            this.logger.info("Event handler initialized successfully.");

            this.logger.info("Starting Raid Reset timer service...");
            this.raidResetService.start();
            this.logger.info("Raid Reset timer service started successfully!");
        } catch (error) {
            this.logger.error("Error during startup:", error);
            throw error;
        }
    }
}