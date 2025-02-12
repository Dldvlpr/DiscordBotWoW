import { ChatInputCommandInteraction, Client } from "discord.js";

export abstract class Command {
    protected constructor(public name: string) {}

    abstract execute(interaction: ChatInputCommandInteraction, client: Client): Promise<void>;
}
