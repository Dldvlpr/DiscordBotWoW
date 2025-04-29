import { Client, Collection } from 'discord.js';
import { Logger } from '../utils/Logger';
import { Command } from '../commands/Command';
import { PingCommand } from '../commands/PingCommand';
import { WelcomeCommand } from '../commands/WelcomeCommand';
import { CreateTextChanCommand } from '../commands/CreateTextChanCommand';
import { CreateRaidHelperCommand } from '../commands/CreateRaidHelperCommand';
import { ApplicationFormCommand } from '../commands/ApplicationFormCommand';
import { HasAdministratorCommand } from "../commands/HasAdministratorCommand";
import { MusicCommand } from "../commands/MusicCommand";
import { MusicPlayer } from '../audio/MusicPlayer';

export class CommandHandler {
    private commands: Collection<string, Command>;
    private readonly client: Client;
    private readonly logger: Logger;
    private readonly musicPlayer: MusicPlayer;

    constructor(client: Client, musicPlayer: MusicPlayer) {
        this.client = client;
        this.commands = new Collection();
        this.logger = new Logger('CommandHandler');
        this.musicPlayer = musicPlayer;
    }

    async initialize(): Promise<void> {
        try {
            this.logger.info('Initializing command handler...');

            this.registerCommand(new PingCommand());
            this.registerCommand(new WelcomeCommand());
            this.registerCommand(new CreateTextChanCommand());
            this.registerCommand(new CreateRaidHelperCommand());
            this.registerCommand(new ApplicationFormCommand());
            this.registerCommand(new HasAdministratorCommand());
            this.registerCommand(new MusicCommand(this.musicPlayer));

            this.logger.info(`Registered ${this.commands.size} commands`);
        } catch (error) {
            this.logger.error('Error initializing command handler:', error);
            throw error;
        }
    }

    private registerCommand(command: Command): void {
        if (this.commands.has(command.name)) {
            this.logger.warn(`Command with name '${command.name}' is already registered. Skipping.`);
            return;
        }

        this.commands.set(command.name, command);
        this.logger.debug(`Registered command: ${command.name}`);
    }

    /**
     * Get a command by name
     * @param name The name of the command to get
     * @returns The command, or undefined if not found
     */
    getCommand(name: string): Command | undefined {
        return this.commands.get(name);
    }

    /**
     * Get all registered commands
     * @returns An array of all commands
     */
    getCommands(): Command[] {
        return Array.from(this.commands.values());
    }
}