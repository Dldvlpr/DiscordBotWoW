import { Client, Collection } from 'discord.js';
import { Command } from "../commands/Command";
import { PingCommand } from '../commands/PingCommand';
import { CreateTextChanCommand } from "../commands/CreateTextChanCommand";
import { WelcomeCommand } from '../commands/WelcomeCommand';
import { CreateRaidHelperCommand } from '../commands/CreateRaidHelperCommand';

export class CommandHandler {
    private commands: Collection<string, Command>;

    constructor() {
        this.commands = new Collection();
        this.loadCommands();
    }

    private loadCommands(): void {
        const commandList = [
            new PingCommand(),
            new CreateTextChanCommand(),
            new WelcomeCommand(),
            new CreateRaidHelperCommand()
        ];

        for (const command of commandList) {
            this.commands.set(command.name.toLowerCase(), command);
        }
    }

    public getCommands(): Command[] {
        return Array.from(this.commands.values());
    }

    public getCommand(name: string): Command | undefined {
        return this.commands.get(name.toLowerCase());
    }
}