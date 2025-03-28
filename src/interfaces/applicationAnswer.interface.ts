export interface ApplicationAnswerInterface {
    id: string;
    playerApplicationId: string;
    questionId: string;
    answerText?: string;
    answerValue?: any;
    createdAt?: Date;
    updatedAt?: Date;
}