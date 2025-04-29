import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { Client, GatewayIntentBits } from 'discord.js';
import config from './config/config';
import { CommandHandler } from './handlers/CommandHandler';
import { EventHandler } from './handlers/EventHandler';
import { Logger, LogLevel } from './utils/Logger';
import db from './models';
import { initializeRepositories } from './repositories/initialize';
import { RaidResetService } from './services/RaidResetService';
import { MusicHandler } from './handlers/MusicHandler';
import { MusicPlayer } from './audio/MusicPlayer';

const env = (process.env.NODE_ENV as 'development' | 'test' | 'production') || 'development';

export class Bot {
    private readonly client: Client;
    private readonly commandHandler: CommandHandler;
    private readonly eventHandler: EventHandler;
    private readonly logger: Logger;
    private readonly dbName: string;
    private readonly raidResetService: RaidResetService;
    private readonly musicHandler: MusicHandler;
    private readonly musicPlayer: MusicPlayer;

    constructor() {
        this.logger = new Logger('Bot');

        if (env === 'development') {
            Logger.setLogLevel(LogLevel.DEBUG);
        } else {
            Logger.setLogLevel(LogLevel.INFO);
        }

        if (!process.env.DB_NAME) {
            this.logger.error("DB_NAME environment variable is missing.");
            process.exit(1);
        }
        this.dbName = process.env.DB_NAME;

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
        this.musicHandler = new MusicHandler(this.client, this.musicPlayer);
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

            this.logger.info("Initializing music handler...");
            await this.musicHandler.initialize();
            this.logger.info("Music handler initialized successfully!");

            this.logger.info("Initializing command handler...");
            await this.commandHandler.initialize();
            this.logger.info("Command handler initialized successfully.");

            this.logger.info("Initializing event handler...");
            await this.eventHandler.initialize();
            this.logger.info("Event handler initialized successfully.");

            this.logger.info("Connecting Discord bot...");
            await this.client.login(config[env].discord.token);
            this.logger.info("Bot connected successfully!");

            this.logger.info("Starting Raid Reset timer service...");
            this.raidResetService.start();
            this.logger.info("Raid Reset timer service started successfully!");
        } catch (error) {
            this.logger.error("Error during startup:", error);
            throw error;
        }
    }
}