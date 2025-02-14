import { DataTypes, Model } from "sequelize";
import {sequelize} from "../database/database";
import CronJob from "./CronJob";

class CronLog extends Model {
    public id!: string;
    public cronJobId!: string;
    public executedAt!: Date;
    public status!: string;
    public message!: string;
}

export function initCronLog() {
CronLog.init(
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
                model: CronJob,
                key: "id",
            },
        },
        executedAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
        status: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        message: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: "cron_logs",
        timestamps: false,
    }
)}

export default CronLog;