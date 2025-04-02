import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { Client, GatewayIntentBits } from 'discord.js';
import config from './config/config';
import { CommandHandler } from './handlers/CommandHandler';
import { EventHandler } from './handlers/EventHandler';
import { Logger, LogLevel } from './utils/Logger';
import db from './models';

const env = (process.env.NODE_ENV as 'development' | 'test' | 'production') || 'development';

export class Bot {
    private readonly client: Client;
    private readonly commandHandler: CommandHandler;
    private readonly eventHandler: EventHandler;
    private readonly logger: Logger;
    private readonly dbName: string;

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
            ]
        });

        this.commandHandler = new CommandHandler(this.client);
        this.eventHandler = new EventHandler(this.client, this.commandHandler);
    }

    public async start(): Promise<void> {
        try {
            this.logger.info("Connecting to database...");
            await db.sequelize.authenticate();
            this.logger.info("Database connection successful.");

            this.logger.info("Synchronizing models with database...");
            await db.sequelize.sync({ alter: true });
            this.logger.info("Model synchronization complete.");

            this.logger.info("Initializing command handler...");
            await this.commandHandler.initialize();
            this.logger.info("Command handler initialized successfully.");

            this.logger.info("Initializing event handler...");
            await this.eventHandler.initialize();
            this.logger.info("Event handler initialized successfully.");

            this.logger.info("Connecting Discord bot...");
            await this.client.login(config[env].discord.token);
            this.logger.info("Bot connected successfully!");
        } catch (error) {
            this.logger.error("Error during startup:", error);
            throw error;
        }
    }}