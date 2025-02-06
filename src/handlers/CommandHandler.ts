import { Collection, CommandInteraction, Client } from "discord.js";
import { Command } from "../commands/Command";
import { PingCommand } from "../commands/PingCommand";

export class CommandHandler {
    private commands: Collection<string, Command> = new Collection();

    constructor() {
        this.loadCommands();
    }

    private loadCommands() {
        const commandsArray: Command[] = [new PingCommand()];
        for (const command of commandsArray) {
            this.commands.set(command.name, command);
        }
    }

    async handle(interaction: CommandInteraction, client: Client) {
        if (!interaction.isChatInputCommand()) return;

        const command = this.commands.get(interaction.commandName);
        if (command) {
            await command.execute(interaction, client);
        }
    }

    getCommands() {
        return this.commands;
    }
}
