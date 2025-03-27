import { DataTypes, Model, Optional } from 'sequelize';
import db from "./index";
import { RaidHelperEventInterface } from "../interfaces/raidHelperEvent.interface";
import { CronJob } from './cronJob';

interface RaidHelperEventCreationAttributes extends Optional<RaidHelperEventInterface, 'id'> {}

export class RaidHelperEvent extends Model<RaidHelperEventInterface, RaidHelperEventCreationAttributes> implements RaidHelperEventInterface {
    public id!: string;
    public cronJobId!: string;
    public raidName!: string;
    public raidDescription?: string;
    public raidTime?: string;
    public maxParticipants?: number;
    public channelId?: string;
    public raidTemplateId?: string;
    public createdAt!: Date;
    public updatedAt!: Date;

    public readonly cronJob?: CronJob;
}

RaidHelperEvent.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        cronJobId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'cron_jobs',
                key: 'id'
            },
            onDelete: 'CASCADE'
        },
        raidName: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: {
                    msg: "Le nom du raid ne peut pas être vide"
                },
                len: {
                    args: [1, 100],
                    msg: "Le nom du raid doit faire entre 1 et 100 caractères"
                }
            }
        },
        raidDescription: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        raidTime: {
            type: DataTypes.STRING,
            allowNull: true,
            validate: {
                is: {
                    args: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
                    msg: "L'heure du raid doit être au format HH:MM"
                }
            }
        },
        maxParticipants: {
            type: DataTypes.INTEGER,
            allowNull: true,
            validate: {
                min: {
                    args: [1],
                    msg: "Le nombre maximum de participants doit être au moins 1"
                },
                max: {
                    args: [1000],
                    msg: "Le nombre maximum de participants ne peut pas dépasser 1000"
                }
            }
        },
        channelId: {
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
        raidTemplateId: {
            type: DataTypes.STRING,
            allowNull: true,
        }
    },
    {
        sequelize: db.sequelize,
        tableName: 'raid_helper_events',
        timestamps: true,
        hooks: {
            beforeValidate: (instance: RaidHelperEvent) => {
                if (instance.channelId === '') {
                    instance.channelId = undefined;
                }
                if (instance.raidTemplateId === '') {
                    instance.raidTemplateId = undefined;
                }
            }
        }
    }
);

export default RaidHelperEvent;