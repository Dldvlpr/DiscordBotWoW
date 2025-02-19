import { DataTypes, Model } from 'sequelize';
import db from "./index";

export class CronJob extends Model {}

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
            unique: true,
        },
        description: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        schedule: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        guildInstanceId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'guild_instance',
                key: 'id'
            }
        }
    },
    {
        sequelize: db.sequelize,
        tableName: 'cron_jobs',
        timestamps: true,
    }
);

db.sequelize.sync()
    .then(() => console.log('Table cron_jobs synchronisée'))
    .catch((err: Error) => console.error('Erreur de synchronisation (cron_jobs) :', err));
