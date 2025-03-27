import { DataTypes, Model } from 'sequelize';
import db from "./index";
import { CronJob } from './cronJob';

export class RaidHelperEvent extends Model {
    public id!: string;
    public cronJobId!: string;
    public raidName!: string;
    public raidDescription?: string;
    public raidTime?: string;
    public maxParticipants?: number;
    public channelId?: string;
    public raidTemplateId?: string;
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
            }
        },
        raidName: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        raidDescription: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        raidTime: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        maxParticipants: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        channelId: {
            type: DataTypes.STRING,
            allowNull: true,
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
    }
);

// Relations
CronJob.hasMany(RaidHelperEvent, {
    foreignKey: 'cronJobId',
    as: 'raidHelperEvents'
});
RaidHelperEvent.belongsTo(CronJob, {
    foreignKey: 'cronJobId',
    as: 'cronJob'
});

export default RaidHelperEvent;