export interface RaidHelperEventInterface {
    id: string;
    cronJobId: string;
    raidName: string;
    raidDescription?: string;
    raidTime?: string;
    maxParticipants?: number;
    channelId?: string;
    raidTemplateId?: string;
    createdAt?: Date;
    updatedAt?: Date;
}