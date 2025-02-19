import { DataTypes, Model, Sequelize } from 'sequelize';

export class CronLog extends Model {
    public id!: number;
    public message!: string;
    public cronJobId!: number;
}

export function initCronLog(sequelize: Sequelize): void {
    CronLog.init(
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            message: {
                type: DataTypes.TEXT,
                allowNull: false,
            },
            cronJobId: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
        },
        {
            sequelize,
            tableName: 'cron_logs',
            timestamps: true,
        }
    );
}

export default CronLog;