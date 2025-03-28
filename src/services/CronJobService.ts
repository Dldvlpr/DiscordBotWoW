import { CronJob } from '../models/cronJob';
import { RaidHelperEvent } from '../models/raidHelperEvent';
import { Logger } from '../utils/Logger';

export class CronJobService {
    private logger: Logger;

    constructor() {
        this.logger = new Logger('CronJobService');
    }

    async getActiveJobs(): Promise<CronJob[]> {
        try {
            return await CronJob.findAll({
                where: { isActive: true },
                include: [{
                    model: RaidHelperEvent,
                    as: 'raidHelperEvents'
                }]
            });
        } catch (error) {
            this.logger.error('Error retrieving active cron jobs:', error);
            throw error;
        }
    }

    async createTextChannelJob(
        guildInstanceId: string,
        name: string,
        description: string,
        schedule: string,
        categoryId: string
    ): Promise<CronJob> {
        try {
            return await CronJob.create({
                name,
                description,
                schedule,
                isActive: true,
                categoryId,
                guildInstanceId
            });
        } catch (error) {
            this.logger.error('Error creating text channel job:', error);
            throw error;
        }
    }

    async createRaidHelperJob(
        guildInstanceId: string,
        jobName: string,
        jobDescription: string,
        schedule: string,
        raidDetails: {
            raidName: string,
            raidDescription?: string,
            raidTime?: string,
            maxParticipants?: number,
            channelId: string,
            raidTemplateId?: string
        }
    ): Promise<{ job: CronJob, event: RaidHelperEvent }> {
        try {
            const job = await CronJob.create({
                name: jobName,
                description: jobDescription,
                schedule: schedule,
                isActive: true,
                guildInstanceId: guildInstanceId
            });

            const event = await RaidHelperEvent.create({
                cronJobId: job.id,
                raidName: raidDetails.raidName,
                raidDescription: raidDetails.raidDescription,
                raidTime: raidDetails.raidTime,
                maxParticipants: raidDetails.maxParticipants,
                channelId: raidDetails.channelId,
                raidTemplateId: raidDetails.raidTemplateId
            });

            return { job, event };
        } catch (error) {
            this.logger.error('Error creating RaidHelper job:', error);
            throw error;
        }
    }

    async jobExists(criteria: Partial<CronJob>): Promise<boolean> {
        try {
            const count = await CronJob.count({
                where: criteria
            });
            return count > 0;
        } catch (error) {
            this.logger.error('Error checking job existence:', error);
            throw error;
        }
    }

    async toggleJobStatus(jobId: string, active: boolean): Promise<boolean> {
        try {
            const [updated] = await CronJob.update(
                { isActive: active },
                { where: { id: jobId } }
            );
            return updated > 0;
        } catch (error) {
            this.logger.error('Error toggling job status:', error);
            throw error;
        }
    }

    async deleteJob(jobId: string): Promise<boolean> {
        try {
            const deleted = await CronJob.destroy({
                where: { id: jobId }
            });
            return deleted > 0;
        } catch (error) {
            this.logger.error('Error deleting job:', error);
            throw error;
        }
    }

    buildCronSchedule(day: string, interval: number, hour: number = 12, minute: number = 0): string {
        const dayLower = day.toLowerCase();
        const dayAbbrMap: { [key: string]: string } = {
            monday: "1",
            tuesday: "2",
            wednesday: "3",
            thursday: "4",
            friday: "5",
            saturday: "6",
            sunday: "0",
            everyday: "*",
            lundi: "1",
            mardi: "2",
            mercredi: "3",
            jeudi: "4",
            vendredi: "5",
            samedi: "6",
            dimanche: "0",
        };

        const dayValue = dayLower in dayAbbrMap ? dayAbbrMap[dayLower] : "*";
        return `${minute} ${hour} */${interval} * ${dayValue}`;
    }
}

export default new CronJobService();