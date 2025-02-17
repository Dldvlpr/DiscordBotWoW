import { DataTypes, Model, Sequelize } from 'sequelize';

export class CronJob extends Model {
    public id!: number;
    public name!: string;
    public schedule!: string;
    public isActive!: boolean;
}

export function initCronJob(sequelize: Sequelize): void {
    CronJob.init(
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false,
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
        },
        {
            sequelize,
            tableName: 'cron_jobs',
            timestamps: true,
        }
    );
}

export default CronJob;