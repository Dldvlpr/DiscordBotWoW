import { Client, Collection } from 'discord.js';
import {Command} from "../commands/Command";
import { PingCommand } from '../commands/PingCommand';
import {CreateTextChanCommand} from "../commands/CreateTextChanCommand";

export class CommandHandler {
    private commands: Collection<string, Command>;

    constructor() {
        this.commands = new Collection();
        this.loadCommands();
    }

    private loadCommands(): void {
        const commandList = [
            new PingCommand(),
            new CreateTextChanCommand()
        ];

        for (const command of commandList) {
            this.commands.set(command.name, command);
        }
    }

    public getCommands(): Command[] {
        return Array.from(this.commands.values());
    }

    public getCommand(name: string): Command | undefined {
        return this.commands.get(name);
    }
}