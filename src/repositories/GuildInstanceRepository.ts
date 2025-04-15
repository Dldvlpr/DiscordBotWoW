import { GuildInstance } from '../models/guildInstance';
import { GenericRepository } from './GenericRepository';

export class GuildInstanceRepository extends GenericRepository<GuildInstance, string> {
    constructor() {
        super(GuildInstance);
    }

    async findByGuildId(guildId: string): Promise<GuildInstance | null> {
        return GuildInstance.findOne({
            where: { guildId }
        });
    }

    async findOrCreate(guildId: string, guildName?: string): Promise<GuildInstance> {
        const [instance] = await GuildInstance.findOrCreate({
            where: { guildId },
            defaults: {
                guildId,
                guildName
            }
        });
        return instance;
    }
}