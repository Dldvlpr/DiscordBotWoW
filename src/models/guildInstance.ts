import { DataTypes, Model } from 'sequelize';
import db from "../models/index";
import { CronJob } from './cronJob';
import {GuildInstanceInterface} from "../interfaces/guildInstance.interface";

export class GuildInstance extends Model<GuildInstanceInterface> implements GuildInstanceInterface {
    public id!: string;
    public guildId!: string;
    public guildName?: string;
}

GuildInstance.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        guildId: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        guildName: {
            type: DataTypes.STRING,
            allowNull: true
        }
    },
    {
        sequelize: db.sequelize,
        modelName: 'GuildInstance',
        tableName: 'guild_instance',
        timestamps: true
    }
);

GuildInstance.hasMany(CronJob, {
    foreignKey: 'guildInstanceId',
    as: 'cronJobs'
});
CronJob.belongsTo(GuildInstance, {
    foreignKey: 'guildInstanceId',
    as: 'guildInstance'
});
