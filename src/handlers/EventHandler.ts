import { Client, Events, Interaction } from 'discord.js';
import { BaseHandler } from './BaseHandler';
import { CommandHandler } from './CommandHandler';
import { MemberHandler } from './MemberHandler';
import { CronHandler } from './CronHandler';
import {MusicPlayer} from "../audio/MusicPlayer";

export class EventHandler extends BaseHandler {
    private commandHandler: CommandHandler;
    private memberHandler: MemberHandler;
    private cronHandler: CronHandler;
    private readonly musicPlayer: MusicPlayer;

    constructor(client: Client, commandHandler: CommandHandler) {
        super(client);
        this.commandHandler = commandHandler;
        this.memberHandler = new MemberHandler(client);
        this.cronHandler = new CronHandler(client);
        this.musicPlayer = new MusicPlayer(client);
    }

    async initialize(): Promise<void> {
        this.registerClientEvents();
        await this.memberHandler.initialize();
        await this.cronHandler.initialize();
        this.logger.info('Event handler initialized successfully');
    }

    private registerClientEvents(): void {
        this.client.once(Events.ClientReady, () => {
            this.logger.info(`Bot ready! Logged in as ${this.client.user?.tag}`);
        });

        this.client.on(Events.InteractionCreate, async (interaction) => {
            if (interaction.isChatInputCommand()) {
                await this.handleCommandInteraction(interaction);
            }
        });

        this.client.on(Events.GuildMemberAdd, async (member) => {
            try {
                await this.memberHandler.handleNewMember(member);
            } catch (error) {
                this.logger.error('Error handling new member:', error);
            }
        });
    }

    private async handleCommandInteraction(interaction: Interaction): Promise<void> {
        if (!interaction.isChatInputCommand()) return;

        const command = this.commandHandler.getCommand(interaction.commandName);
        if (!command) return;

        try {
            await command.execute(interaction, this.client);
        } catch (error) {
            this.logger.error(`Error executing command ${interaction.commandName}:`, error);

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: 'An error occurred while executing this command.',
                    ephemeral: true
                }).catch(e => this.logger.error('Error sending follow-up:', e));
            } else {
                await interaction.reply({
                    content: 'An error occurred while executing this command.',
                    ephemeral: true
                }).catch(e => this.logger.error('Error sending reply:', e));
            }
        }
    }
}