import { GuildInstanceRepository } from './GuildInstanceRepository';
import { CronJobRepository } from './CronJobRepository';

export const repositories = {
    guildInstance: new GuildInstanceRepository(),
    cronJob: new CronJobRepository(),
};

export { GuildInstanceRepository } from './GuildInstanceRepository';
export { CronJobRepository } from './CronJobRepository';
