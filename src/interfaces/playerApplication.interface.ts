export interface PlayerApplicationInterface {
    id: string;
    applicationFormId: string;
    userId: string;
    username: string;
    status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
    reviewerId?: string;
    reviewerName?: string;
    reviewComment?: string;
    reviewedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}