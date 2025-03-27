export interface WelcomeMessageInterface {
    id: string;
    guildInstanceId: string;
    message: string;
    isEnabled: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}