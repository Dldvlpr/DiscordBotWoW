export interface FormQuestionInterface {
    id: string;
    applicationFormId: string;
    questionText: string;
    questionType: 'text' | 'select' | 'checkbox' | 'number';
    options?: string[];
    isRequired: boolean;
    order: number;
    createdAt?: Date;
    updatedAt?: Date;
}