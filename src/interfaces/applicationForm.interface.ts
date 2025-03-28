export interface ApplicationFormInterface {
    id: string;
    guildInstanceId: string;
    title: string;
    description?: string;
    isActive: boolean;
    notificationChannelId?: string;
    applicationChannelId?: string;
    reviewRoleId?: string;
    successMessage?: string;
    rejectMessage?: string;
    acceptedRoleId?: string;
    createdAt?: Date;
    updatedAt?: Date;
}