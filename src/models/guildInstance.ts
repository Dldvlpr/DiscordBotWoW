import { DataTypes, Model } from 'sequelize';
import db from "./index";
import { CronJob } from './cronJob';

interface GuildInstanceAttributes {
    id: string;
    guildId: string;
    guildName?: string;
}

export class GuildInstance extends Model<GuildInstanceAttributes> implements GuildInstanceAttributes {
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

db.sequelize.sync()
    .then(() => console.log('Table guild_instance synchronisée'))
    .catch((err: Error) => console.error('Erreur de synchronisation (guild_instance) :', err));
