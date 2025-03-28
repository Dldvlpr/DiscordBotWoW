import { Client, Collection } from 'discord.js';
import { Command } from "../commands/Command";
import { PingCommand } from '../commands/PingCommand';
import { CreateTextChanCommand } from "../commands/CreateTextChanCommand";
import { WelcomeCommand } from '../commands/WelcomeCommand';
import { CreateRaidHelperCommand } from '../commands/CreateRaidHelperCommand';
import { ApplicationFormCommand } from '../commands/ApplicationFormCommand';
import { BaseHandler } from './BaseHandler';

export class CommandHandler extends BaseHandler {
    private commands: Collection<string, Command>;

    constructor(client: Client) {
        super(client);
        this.commands = new Collection();
    }

    async initialize(): Promise<void> {
        this.loadCommands();
        this.logger.info(`Loaded ${this.commands.size} commands`);
    }

    private loadCommands(): void {
        const commandList = [
            new PingCommand(),
            new CreateTextChanCommand(),
            new WelcomeCommand(),
            new CreateRaidHelperCommand(),
            new ApplicationFormCommand()
        ];

        for (const command of commandList) {
            this.commands.set(command.name.toLowerCase(), command);
            this.logger.debug(`Loaded command: ${command.name}`);
        }
    }

    /**
     * Add a command dynamically to the handler
     * @param command Command instance to add
     */
    public addCommand(command: Command): void {
        this.commands.set(command.name.toLowerCase(), command);
        this.logger.debug(`Added command dynamically: ${command.name}`);
    }

    /**
     * Get all registered commands
     * @returns Array of Command instances
     */
    public getCommands(): Command[] {
        return Array.from(this.commands.values());
    }

    /**
     * Get a command by name
     * @param name Command name
     * @returns Command instance or undefined if not found
     */
    public getCommand(name: string): Command | undefined {
        return this.commands.get(name.toLowerCase());
    }
}
