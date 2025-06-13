import { Client, TextChannel } from 'discord.js';
import { CronJob } from '../models/cronJob';
import { GuildInstance } from '../models/guildInstance';
import CronJobService from './CronJobService';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface TextChannelFormatOptions {
    baseChannelName: string;
    includeDate: boolean;
    dateFormat: string;
    startDate?: string | null;
    hour: number;
    minute: number;
}

class TextChannelJobService {
    async createJob(
        guildInstanceId: string,
        day: string,
        interval: number,
        options: TextChannelFormatOptions,
        categoryId: string
    ): Promise<CronJob> {
        const schedule = CronJobService.buildCronSchedule(day, interval, options.hour, options.minute);
        const exists = await CronJobService.jobExists({
            guildInstanceId,
            name: options.baseChannelName,
            schedule,
            categoryId
        });
        if (exists) {
            throw new Error('JOB_EXISTS');
        }
        return CronJobService.createTextChannelJob(
            guildInstanceId,
            options.baseChannelName,
            JSON.stringify(options),
            schedule,
            categoryId
        );
    }

    formatChannelName(baseName: string, includeDate: boolean, dateFormat: string, customDate?: Date): string {
        if (!includeDate) {
            return baseName;
        }
        try {
            const date = customDate || new Date();
            const formatted = format(date, dateFormat, { locale: fr });
            return `${baseName}-${formatted}`;
        } catch {
            const fallback = format(new Date(), 'yyyy-MM-dd');
            return `${baseName}-${fallback}`;
        }
    }

    async executeJob(job: CronJob, client: Client): Promise<void> {
        const guildInstance = await GuildInstance.findByPk(job.guildInstanceId);
        if (!guildInstance || !job.categoryId) return;
        const guild = await client.guilds.fetch(guildInstance.guildId);
        let options: TextChannelFormatOptions = {
            baseChannelName: job.name,
            includeDate: true,
            dateFormat: 'yyyy-MM-dd',
            startDate: null,
            hour: 12,
            minute: 0
        };
        try {
            if (job.description && job.description.startsWith('{')) {
                options = JSON.parse(job.description);
            }
        } catch {
            // ignore parsing error
        }

        const name = this.formatChannelName(options.baseChannelName, options.includeDate, options.dateFormat);
        await guild.channels.create({ name, type: 0, parent: job.categoryId });
    }
}

export default new TextChannelJobService();
