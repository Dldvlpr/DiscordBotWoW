import { DataTypes, Model, Optional } from 'sequelize';
import db from "./index";

interface ApplicationAnswerAttributes {
    id: string;
    playerApplicationId: string;
    questionId: string;
    answerText?: string;
    answerValue?: any;
    createdAt: Date;
    updatedAt: Date;
}

interface ApplicationAnswerCreationAttributes extends Optional<ApplicationAnswerAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class ApplicationAnswer extends Model<ApplicationAnswerAttributes, ApplicationAnswerCreationAttributes> implements ApplicationAnswerAttributes {
    public id!: string;
    public playerApplicationId!: string;
    public questionId!: string;
    public answerText?: string;
    public answerValue?: any;
    public createdAt!: Date;
    public updatedAt!: Date;
}

ApplicationAnswer.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        playerApplicationId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'player_applications',
                key: 'id'
            },
            onDelete: 'CASCADE'
        },
        questionId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'form_questions',
                key: 'id'
            },
            onDelete: 'CASCADE'
        },
        answerText: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        answerValue: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        }
    },
    {
        sequelize: db.sequelize,
        tableName: 'application_answers',
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ['playerApplicationId', 'questionId'],
                name: 'application_answer_application_question_unique'
            }
        ]
    }
);

export default ApplicationAnswer;