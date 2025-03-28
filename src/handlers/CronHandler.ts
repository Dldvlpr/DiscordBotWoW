import { Client } from 'discord.js';
import { CronJob as CronJobJs } from 'cron';
import { BaseHandler } from './BaseHandler';
import { CronJob as CronJobModel } from '../models/cronJob';
import { RaidHelperEvent } from '../models/raidHelperEvent';
import { GuildInstance } from '../models/guildInstance';
import { TextChannel } from 'discord.js';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export class CronHandler extends BaseHandler {
    private cronJobs: Map<string, CronJobJs> = new Map();

    constructor(client: Client) {
        super(client);
    }

    async initialize(): Promise<void> {
        try {
            if (!this.client.isReady()) {
                await new Promise<void>((resolve) => {
                    this.client.once('ready', () => resolve());
                });
            }

            this.logger.info('Initializing scheduled tasks...');

            this.stopAllJobs();

            const activeJobs = await CronJobModel.findAll({
                where: { isActive: true },
                include: [{
                    model: RaidHelperEvent,
                    as: 'raidHelperEvents'
                }]
            });

            for (const job of activeJobs) {
                this.scheduleCronJob(job);
            }

            this.logger.info(`${this.cronJobs.size} scheduled tasks initialized.`);
        } catch (error) {
            this.logger.error('Error initializing scheduled tasks:', error);
            throw error;
        }
    }

    /**
     * Reinitialize all scheduled tasks
     * Useful when cron jobs are updated in the database
     */
    async refreshJobs(): Promise<void> {
        await this.initialize();
    }

    /**
     * Stop all cron jobs and clear the map
     */
    stopAllJobs(): void {
        for (const [_, job] of this.cronJobs) {
            job.stop();
        }
        this.cronJobs.clear();
    }

    private scheduleCronJob(cronJobModel: CronJobModel): void {
        const job = new CronJobJs(
            cronJobModel.schedule,
            async () => {
                try {
                    await this.executeCronJob(cronJobModel);
                } catch (error) {
                    this.logger.error(`Error executing task ${cronJobModel.name}:`, error);
                }
            },
            null,
            true,
            'Europe/Paris'
        );

        this.cronJobs.set(cronJobModel.id, job);
        this.logger.debug(`Scheduled task ${cronJobModel.name} (${cronJobModel.id})`);
    }

    private async executeCronJob(cronJobModel: CronJobModel): Promise<void> {
        try {
            if (cronJobModel.categoryId) {
                await this.createTextChannel(cronJobModel);
                return;
            }

            const raidHelperEvent = await RaidHelperEvent.findOne({
                where: { cronJobId: cronJobModel.id }
            });

            if (raidHelperEvent) {
                await this.createRaidHelperEvent(raidHelperEvent);
                return;
            }

            this.logger.warn(`No action defined for task ${cronJobModel.name}`);
        } catch (error) {
            this.logger.error(`Error executing task ${cronJobModel.name}:`, error);
        }
    }

    private async createTextChannel(cronJobModel: CronJobModel): Promise<void> {
        try {
            const guildInstance = await GuildInstance.findByPk(cronJobModel.guildInstanceId);
            if (!guildInstance) return;

            const guild = await this.client.guilds.fetch(guildInstance.guildId);
            if (!guild) return;

            const today = new Date();
            const channelName = `${cronJobModel.name}-${format(today, 'yyyy-MM-dd')}`;

            const channel = await guild.channels.create({
                name: channelName,
                type: 0,
                parent: cronJobModel.categoryId
            });

            this.logger.info(`Channel created: ${channel.name} in ${guild.name}`);
        } catch (error) {
            this.logger.error(`Error creating channel:`, error);
            throw error;
        }
    }

    private async createRaidHelperEvent(raidHelperEvent: RaidHelperEvent): Promise<void> {
        try {
            const channel = await this.client.channels.fetch(raidHelperEvent.channelId!) as TextChannel;
            if (!channel) {
                this.logger.error(`Channel not found for RaidHelper event ${raidHelperEvent.id}`);
                return;
            }

            const today = new Date();
            const formattedDate = format(today, 'dd-MMMM-yyyy', { locale: fr });
            const formattedTime = raidHelperEvent.raidTime || '20:00';

            let command = `/raidhelper create`;

            if (raidHelperEvent.raidTemplateId) {
                command += ` template:${raidHelperEvent.raidTemplateId}`;
            }

            command += ` title:${raidHelperEvent.raidName} ${formattedDate}`;

            if (raidHelperEvent.raidDescription) {
                command += ` description:${raidHelperEvent.raidDescription}`;
            }

            command += ` time:${formattedTime}`;

            await channel.send(command);

            this.logger.info(`RaidHelper command sent in ${channel.name}: ${command}`);
        } catch (error) {
            this.logger.error(`Error creating RaidHelper event:`, error);
            throw error;
        }
    }
}