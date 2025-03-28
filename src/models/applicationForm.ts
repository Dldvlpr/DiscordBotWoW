import { DataTypes, Model, Optional } from 'sequelize';
import db from "./index";
import { FormQuestion } from './formQuestion';
import { PlayerApplication } from './playerApplication';

interface ApplicationFormAttributes {
    id: string;
    guildInstanceId: string;
    title: string;
    description?: string | null;
    isActive: boolean;
    notificationChannelId?: string | null;
    applicationChannelId?: string | null;
    reviewRoleId?: string | null;
    successMessage?: string | null;
    rejectMessage?: string | null;
    acceptedRoleId?: string | null;
    createdAt: Date;
    updatedAt: Date;
}

interface ApplicationFormCreationAttributes extends Optional<ApplicationFormAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class ApplicationForm extends Model<ApplicationFormAttributes, ApplicationFormCreationAttributes> implements ApplicationFormAttributes {
    public id!: string;
    public guildInstanceId!: string;
    public title!: string;
    public description?: string | null;
    public isActive!: boolean;
    public notificationChannelId?: string | null;
    public applicationChannelId?: string | null;
    public reviewRoleId?: string | null;
    public successMessage?: string | null;
    public rejectMessage?: string | null;
    public acceptedRoleId?: string | null;
    public createdAt!: Date;
    public updatedAt!: Date;

    public readonly questions?: FormQuestion[];
    public readonly applications?: PlayerApplication[];
}

ApplicationForm.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        guildInstanceId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'guild_instance',
                key: 'id'
            },
            onDelete: 'CASCADE'
        },
        title: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: {
                    msg: "Le titre du formulaire ne peut pas être vide"
                },
                len: {
                    args: [1, 100],
                    msg: "Le titre doit faire entre 1 et 100 caractères"
                }
            }
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        notificationChannelId: {
            type: DataTypes.STRING,
            allowNull: true,
            validate: {
                isValidDiscordId(value: string | null) {
                    if (value !== null && !/^\d{17,19}$/.test(value)) {
                        throw new Error("L'ID de canal doit être un identifiant Discord valide");
                    }
                }
            }
        },
        applicationChannelId: {
            type: DataTypes.STRING,
            allowNull: true,
            validate: {
                isValidDiscordId(value: string | null) {
                    if (value !== null && !/^\d{17,19}$/.test(value)) {
                        throw new Error("L'ID de canal doit être un identifiant Discord valide");
                    }
                }
            }
        },
        reviewRoleId: {
            type: DataTypes.STRING,
            allowNull: true,
            validate: {
                isValidDiscordId(value: string | null) {
                    if (value !== null && !/^\d{17,19}$/.test(value)) {
                        throw new Error("L'ID de rôle doit être un identifiant Discord valide");
                    }
                }
            }
        },
        successMessage: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        rejectMessage: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        acceptedRoleId: {
            type: DataTypes.STRING,
            allowNull: true,
            validate: {
                isValidDiscordId(value: string | null) {
                    if (value !== null && !/^\d{17,19}$/.test(value)) {
                        throw new Error("L'ID de rôle doit être un identifiant Discord valide");
                    }
                }
            }
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
        tableName: 'application_forms',
        timestamps: true,
        hooks: {
            beforeValidate: (instance: ApplicationForm) => {
                if (instance.notificationChannelId === '') {
                    instance.notificationChannelId = null;
                }
                if (instance.applicationChannelId === '') {
                    instance.applicationChannelId = null;
                }
                if (instance.reviewRoleId === '') {
                    instance.reviewRoleId = null;
                }
                if (instance.acceptedRoleId === '') {
                    instance.acceptedRoleId = null;
                }
            }
        }
    }
);

export default ApplicationForm;