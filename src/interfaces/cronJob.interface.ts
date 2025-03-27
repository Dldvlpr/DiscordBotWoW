export interface CronJobInterface {
    id: string;
    name: string;
    description?: string;
    schedule: string;
    isActive: boolean;
    categoryId?: string;
    guildInstanceId: string;
    createdAt?: Date;
    updatedAt?: Date;
}