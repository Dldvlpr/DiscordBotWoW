import { Client, GuildMember } from 'discord.js';
import { BaseHandler } from './BaseHandler';
import { GuildInstance } from '../models/guildInstance';
import { WelcomeMessage } from '../models/welcomeMessage';

export class MemberHandler extends BaseHandler {
    constructor(client: Client) {
        super(client);
    }

    async initialize(): Promise<void> {
        this.logger.info('Member handler initialized');
    }

    async handleNewMember(member: GuildMember): Promise<void> {
        try {
            const guildInstance = await GuildInstance.findOne({
                where: { guildId: member.guild.id }
            });

            if (!guildInstance) return;

            const welcomeMessage = await WelcomeMessage.findOne({
                where: {
                    guildInstanceId: guildInstance.id,
                    isEnabled: true
                }
            });

            if (!welcomeMessage) return;

            const formattedMessage = this.formatWelcomeMessage(welcomeMessage.message, member);

            try {
                await member.send(formattedMessage);
                this.logger.info(`Welcome message sent to ${member.user.tag}`);
            } catch (dmError) {
                this.logger.error(`Unable to send DM to ${member.user.tag}:`, dmError);
            }
        } catch (error) {
            this.logger.error('Error handling new member:', error);
            throw error;
        }
    }

    private formatWelcomeMessage(message: string, member: GuildMember): string {
        return message
            .replace(/{user}/g, member.user.username)
            .replace(/{usermention}/g, `<@${member.id}>`)
            .replace(/{server}/g, member.guild.name);
    }
}