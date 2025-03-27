import { DataTypes, Model, Optional } from 'sequelize';
import db from "./index";
import { CronJobInterface } from "../interfaces/cronJob.interface";
import { GuildInstance } from './guildInstance';

interface CronJobCreationAttributes extends Optional<CronJobInterface, 'id'> {}

export class CronJob extends Model<CronJobInterface, CronJobCreationAttributes> implements CronJobInterface {
    public id!: string;
    public name!: string;
    public description?: string;
    public schedule!: string;
    public isActive!: boolean;
    public categoryId?: string;
    public guildInstanceId!: string;
    public createdAt!: Date;
    public updatedAt!: Date;

    public readonly guildInstance?: GuildInstance;
}

CronJob.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: {
                    msg: "Le nom de la tâche ne peut pas être vide"
                },
                len: {
                    args: [1, 100],
                    msg: "Le nom de la tâche doit faire entre 1 et 100 caractères"
                }
            }
        },
        description: {
            type: DataTypes.STRING,
            allowNull: true,
            validate: {
                len: {
                    args: [0, 255],
                    msg: "La description ne peut pas dépasser 255 caractères"
                }
            }
        },
        schedule: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: {
                    msg: "Le planning cron ne peut pas être vide"
                },
                isCronExpression(value: string) {
                    const cronRegex = /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/;
                    if (!cronRegex.test(value)) {
                        throw new Error('Expression cron invalide');
                    }
                }
            }
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        categoryId: {
            type: DataTypes.STRING,
            allowNull: true,
            validate: {
                isValidDiscordId(value: string | null) {
                    if (value !== null && !/^\d{17,19}$/.test(value)) {
                        throw new Error("L'ID de catégorie doit être un identifiant Discord valide");
                    }
                }
            }
        },
        guildInstanceId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'guild_instance',
                key: 'id'
            },
            onDelete: 'CASCADE'
        }
    },
    {
        sequelize: db.sequelize,
        tableName: 'cron_jobs',
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ['name', 'guildInstanceId']
            }
        ],
        hooks: {
            beforeValidate: (instance: CronJob) => {
                if (instance.categoryId === '') {
                    instance.categoryId = undefined;
                }
            }
        }
    }
);

export default CronJob;