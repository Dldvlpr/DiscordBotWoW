import { DataTypes, Model, Optional } from 'sequelize';
import db from "./index";
import { ApplicationAnswer } from './applicationAnswer';

interface FormQuestionAttributes {
    id: string;
    applicationFormId: string;
    questionText: string;
    questionType: 'text' | 'select' | 'checkbox' | 'number';
    options?: string[];
    isRequired: boolean;
    order: number;
    createdAt: Date;
    updatedAt: Date;
}

interface FormQuestionCreationAttributes extends Optional<FormQuestionAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class FormQuestion extends Model<FormQuestionAttributes, FormQuestionCreationAttributes> implements FormQuestionAttributes {
    public id!: string;
    public applicationFormId!: string;
    public questionText!: string;
    public questionType!: 'text' | 'select' | 'checkbox' | 'number';
    public options?: string[];
    public isRequired!: boolean;
    public order!: number;
    public createdAt!: Date;
    public updatedAt!: Date;

    public readonly answers?: ApplicationAnswer[];
}

FormQuestion.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        applicationFormId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'application_forms',
                key: 'id'
            },
            onDelete: 'CASCADE'
        },
        questionText: {
            type: DataTypes.TEXT,
            allowNull: false,
            validate: {
                notEmpty: {
                    msg: "Le texte de la question ne peut pas être vide"
                }
            }
        },
        questionType: {
            type: DataTypes.ENUM('text', 'select', 'checkbox', 'number'),
            allowNull: false,
            defaultValue: 'text',
            validate: {
                isIn: {
                    args: [['text', 'select', 'checkbox', 'number']],
                    msg: "Le type de question doit être 'text', 'select', 'checkbox' ou 'number'"
                }
            }
        },
        options: {
            type: DataTypes.JSON,
            allowNull: true,
            validate: {
                hasOptionsIfNeeded(value: string[] | null) {
                    if ((this.questionType === 'select' || this.questionType === 'checkbox') && (!value || value.length < 2)) {
                        throw new Error("Les questions de type 'select' ou 'checkbox' doivent avoir au moins 2 options");
                    }
                }
            }
        },
        isRequired: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        order: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
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
        tableName: 'form_questions',
        timestamps: true,
    }
);

export default FormQuestion;