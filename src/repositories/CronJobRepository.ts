import {Op, WhereOptions} from 'sequelize';
import { CronJob } from '../models/cronJob';
import { GenericRepository } from './GenericRepository';
import { RaidHelperEvent } from '../models/raidHelperEvent';
import {CronJobInterface} from "../interfaces/cronJob.interface";

export class CronJobRepository extends GenericRepository<CronJob, string> {
    constructor() {
        super(CronJob);
    }

    async findActive(): Promise<CronJob[]> {
        return this.model.findAll({
            where: { isActive: true }
        });
    }

    async findActiveWithRaidHelperEvents(): Promise<CronJob[]> {
        return this.model.findAll({
            where: { isActive: true },
            include: [{
                model: RaidHelperEvent,
                as: 'raidHelperEvents'
            }]
        });
    }

    async findByGuildId(guildInstanceId: string): Promise<CronJob[]> {
        return this.model.findAll({
            where: { guildInstanceId }
        });
    }

    async findTextChannelJobs(guildInstanceId: string): Promise<CronJob[]> {
        const whereCondition = {
            guildInstanceId,
            categoryId: {
                [Op.ne]: null
            }
        } as unknown as WhereOptions<CronJobInterface>;

        return this.model.findAll({
            where: whereCondition
        });
    }
}