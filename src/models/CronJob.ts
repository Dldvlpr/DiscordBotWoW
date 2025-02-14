import { DataTypes, Model } from "sequelize";
import {sequelize} from "../database/database";

class CronJob extends Model {
    public id!: string;
    public name!: string;
    public command!: string;
    public schedule!: string;
    public isActive!: boolean;
    public lastRunAt?: Date;
}

export function initCronJob() {
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
        },
        command: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        schedule: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        lastRunAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: "cron_jobs",
        timestamps: true,
    }
);
}

export default CronJob;